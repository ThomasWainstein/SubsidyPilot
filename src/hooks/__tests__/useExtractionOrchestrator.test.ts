import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtractionOrchestrator } from '../useExtractionOrchestrator';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test-url.com' } }))
      }))
    },
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'test-doc-id', file_url: 'http://test-url.com' }, 
            error: null 
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ 
            data: { file_url: 'http://test-url.com' }, 
            error: null 
          }))
        }))
      }))
    }))
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}));

// Mock utilities
vi.mock('@/utils/extractionMapping', () => ({
  mapExtractedFields: vi.fn((data) => data),
  validateMappedData: vi.fn(() => ({ isValid: true, missingFields: [], score: 0.8 })),
  calculateExtractionConfidence: vi.fn(() => 0.85),
  mergeExtractionResults: vi.fn((results) => ({ 
    mergedData: { farm_name: 'Test Farm' }, 
    fieldSources: { farm_name: 'extraction_ai-based' } 
  }))
}));

vi.mock('@/utils/productionGuards', () => ({
  validateExtractionDataIntegrity: vi.fn(),
  safeProductionError: vi.fn((error) => error instanceof Error ? error : new Error(String(error)))
}));

describe('useExtractionOrchestrator', () => {
  const mockOptions = {
    farmId: 'test-farm-id',
    onExtractionComplete: vi.fn(),
    onStateChange: vi.fn(),
    autoSync: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.progress).toBe(0);
    expect(result.current.extractionResults).toEqual([]);
    expect(result.current.formData).toEqual({});
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.hasResults).toBe(false);
  });

  it('should process document upload successfully', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    const mockExtractionData = {
      extractedFields: { farm_name: 'Test Farm', owner_name: 'John Doe' },
      source: 'ai-based',
      confidence: 0.85,
      fieldsCount: 2
    };
    
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    await act(async () => {
      await result.current.processDocumentUpload([mockFile], 'general');
    });

    expect(result.current.state.status).toBe('reviewing');
    expect(result.current.hasResults).toBe(true);
    expect(mockOptions.onExtractionComplete).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: 'test.pdf',
          extractedData: { farm_name: 'Test Farm', owner_name: 'John Doe' }
        })
      ])
    );
  });

  it('should handle extraction retry with AI', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    // First, add an extraction result
    const mockExtractionData = {
      extractedFields: { farm_name: 'Original Farm' },
      source: 'rule-based',
      confidence: 0.6,
      fieldsCount: 1
    };
    
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.processDocumentUpload([mockFile], 'general');
    });

    // Now retry with AI
    const aiExtractionData = {
      extractedFields: { farm_name: 'AI Extracted Farm' },
      source: 'ai-based',
      confidence: 0.9,
      fieldsCount: 1
    };
    
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: aiExtractionData,
      error: null
    });

    const documentId = result.current.extractionResults[0]?.documentId;
    
    await act(async () => {
      await result.current.retryExtraction(documentId, true);
    });

    expect(result.current.extractionResults[0].extractedData.farm_name).toBe('AI Extracted Farm');
    expect(result.current.extractionResults[0].source).toBe('ai-based');
  });

  it('should apply review edits and sync to form', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    // Add some extraction results first
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockExtractionData = {
      extractedFields: { farm_name: 'Original Farm' },
      source: 'ai-based',
      confidence: 0.8,
      fieldsCount: 1
    };
    
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    await act(async () => {
      await result.current.processDocumentUpload([mockFile], 'general');
    });

    const documentId = result.current.extractionResults[0]?.documentId;

    // Apply a review edit
    await act(async () => {
      result.current.applyReviewEdit(documentId, 'farm_name', 'Edited Farm Name');
    });

    expect(result.current.reviewEdits[documentId]).toEqual(
      expect.objectContaining({
        farm_name: 'Edited Farm Name'
      })
    );
    expect(result.current.hasPendingEdits).toBe(true);

    // Wait for bi-directional sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(result.current.formData.farm_name).toBe('Edited Farm Name');
  });

  it('should accept extraction and apply to form', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    // Add extraction result
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockExtractionData = {
      extractedFields: { farm_name: 'Test Farm', owner_name: 'John Doe' },
      source: 'ai-based',
      confidence: 0.8,
      fieldsCount: 2
    };
    
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    await act(async () => {
      await result.current.processDocumentUpload([mockFile], 'general');
    });

    const documentId = result.current.extractionResults[0]?.documentId;

    // Accept the extraction
    await act(async () => {
      result.current.acceptExtraction(documentId);
    });

    expect(result.current.reviewEdits[documentId]).toEqual(
      expect.objectContaining({
        farm_name: 'Test Farm',
        owner_name: 'John Doe'
      })
    );
  });

  it('should reject extraction and remove it', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    // Add extraction result
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockExtractionData = {
      extractedFields: { farm_name: 'Test Farm' },
      source: 'ai-based',
      confidence: 0.8,
      fieldsCount: 1
    };
    
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    await act(async () => {
      await result.current.processDocumentUpload([mockFile], 'general');
    });

    expect(result.current.extractionResults).toHaveLength(1);
    
    const documentId = result.current.extractionResults[0]?.documentId;

    // Reject the extraction
    await act(async () => {
      result.current.rejectExtraction(documentId);
    });

    expect(result.current.extractionResults).toHaveLength(0);
    expect(result.current.reviewEdits[documentId]).toBeUndefined();
  });

  it('should reset all state', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    // Add some state
    await act(async () => {
      result.current.updateFormField('test_field', 'test_value');
    });

    expect(result.current.formData.test_field).toBe('test_value');

    // Reset
    await act(async () => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe('idle');
    expect(result.current.extractionResults).toEqual([]);
    expect(result.current.formData).toEqual({});
    expect(result.current.reviewEdits).toEqual({});
  });

  it('should provide sync status', () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    const syncStatus = result.current.getSyncStatus();
    
    expect(syncStatus).toEqual({
      inProgress: false,
      lastSync: 0,
      hasConflicts: false
    });
  });

  it('should update form fields manually', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));
    
    await act(async () => {
      result.current.updateFormField('manual_field', 'manual_value', 'user_input');
    });

    expect(result.current.formData.manual_field).toBe('manual_value');
    expect(result.current.formData.manual_field_source).toBe('user_input');
    expect(result.current.fieldCount).toBe(1);
  });
});