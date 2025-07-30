import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtractionOrchestrator } from '../useExtractionOrchestrator';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('useExtractionOrchestrator', () => {
  const mockOptions = {
    onStateChange: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useExtractionOrchestrator());
    
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.globalError).toBe(null);
    expect(result.current.states).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasCompletedExtractions).toBe(false);
  });

  it('should handle successful extraction', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockExtractionData = {
      extractedFields: { farmName: 'Test Farm', address: 'Test Address' },
      confidence: 0.85,
      source: 'merged',
      timestamp: '2023-01-01T00:00:00Z'
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));

    await act(async () => {
      await result.current.processDocument('doc1', 'https://example.com/doc.pdf');
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.hasCompletedExtractions).toBe(true);
    expect(mockOptions.onComplete).toHaveBeenCalledWith(mockExtractionData.extractedFields);
    
    const docState = result.current.getDocumentState('doc1');
    expect(docState?.status).toBe('completed');
    expect(docState?.confidence).toBe(0.85);
    expect(docState?.source).toBe('merged');
  });

  it('should handle extraction failure', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Extraction failed' }
    });

    const { result } = renderHook(() => useExtractionOrchestrator(mockOptions));

    await act(async () => {
      await result.current.processDocument('doc1', 'https://example.com/doc.pdf');
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.hasErrors).toBe(true);
    expect(mockOptions.onError).toHaveBeenCalled();
    
    const docState = result.current.getDocumentState('doc1');
    expect(docState?.status).toBe('failed');
    expect(docState?.errors).toContain('Extraction failed: Extraction failed');
  });

  it('should handle AI fallback retry', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockExtractionData = {
      extractedFields: { farmName: 'AI Farm' },
      confidence: 0.75,
      source: 'ai-based',
      timestamp: '2023-01-01T00:00:00Z'
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionData,
      error: null
    });

    const { result } = renderHook(() => useExtractionOrchestrator());

    await act(async () => {
      await result.current.retryExtraction('doc1', 'https://example.com/doc.pdf');
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('hybrid-extraction', {
      body: {
        documentUrl: 'https://example.com/doc.pdf',
        documentId: 'doc1',
        forceAI: true
      }
    });
  });

  it('should cancel processing correctly', async () => {
    const { result } = renderHook(() => useExtractionOrchestrator());

    act(() => {
      result.current.cancelProcessing();
    });

    // Should handle gracefully even if no processing is active
    expect(result.current.isProcessing).toBe(false);
  });

  it('should provide accurate statistics', () => {
    const { result } = renderHook(() => useExtractionOrchestrator());

    act(() => {
      result.current.updateDocumentState('doc1', {
        status: 'completed',
        confidence: 0.8
      });
      result.current.updateDocumentState('doc2', {
        status: 'failed',
        confidence: 0.3
      });
      result.current.updateDocumentState('doc3', {
        status: 'extracting',
        confidence: 0.0
      });
    });

    const stats = result.current.getStatistics();
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.processing).toBe(1);
    expect(stats.averageConfidence).toBeCloseTo(0.37, 1);
  });

  it('should validate state transitions', () => {
    const { result } = renderHook(() => useExtractionOrchestrator());

    act(() => {
      result.current.updateDocumentState('doc1', {
        status: 'completed',
        confidence: 0.9
      });
    });

    // Attempt invalid transition from completed to extracting
    act(() => {
      result.current.updateDocumentState('doc1', {
        status: 'extracting'
      });
    });

    // Should remain in completed state
    const docState = result.current.getDocumentState('doc1');
    expect(docState?.status).toBe('completed');
  });

  it('should clear document state', () => {
    const { result } = renderHook(() => useExtractionOrchestrator());

    act(() => {
      result.current.updateDocumentState('doc1', {
        status: 'completed',
        confidence: 0.8
      });
    });

    expect(result.current.getDocumentState('doc1')).toBeTruthy();

    act(() => {
      result.current.clearDocumentState('doc1');
    });

    expect(result.current.getDocumentState('doc1')).toBe(null);
  });
});