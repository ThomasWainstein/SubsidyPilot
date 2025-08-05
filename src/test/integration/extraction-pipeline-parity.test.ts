import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { unifiedExtractionService } from '@/lib/extraction/unified-extraction-service';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn()
        })),
        insert: vi.fn(),
        update: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('@/hooks/useFarms', () => ({
  useFarm: vi.fn(() => ({
    data: {
      id: 'test-farm-id',
      name: 'Test Farm',
      address: 'Test Address',
      user_id: 'test-user-id'
    },
    isLoading: false
  })),
  useUpdateFarm: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
};

describe('Unified Extraction Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UnifiedExtractionService', () => {
    it('should process document extraction correctly', async () => {
      const mockExtractionResult = {
        extractedData: {
          farmName: 'Test Farm',
          address: 'Test Address',
          totalHectares: '50'
        },
        extractionId: 'test-extraction-id',
        confidence: 85,
        category: 'farm_registration'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockExtractionResult,
        error: null
      });

      const result = await unifiedExtractionService.processDocumentExtraction({
        documentId: 'test-doc-id',
        farmId: 'test-farm-id',
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        documentType: 'farm_registration'
      });

      expect(result.success).toBe(true);
      expect(result.extractedData).toEqual(mockExtractionResult.extractedData);
      expect(result.confidence).toBe(85);
      expect(result.mappedData).toBeDefined();
    });

    it('should handle extraction failures gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Extraction failed' }
      });

      const result = await unifiedExtractionService.processDocumentExtraction({
        documentId: 'test-doc-id',
        farmId: 'test-farm-id',
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should apply extraction to farm with different merge strategies', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-farm-id',
                name: 'Old Farm Name',
                address: '',
                total_hectares: null
              },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const extractionData = {
        name: 'New Farm Name',
        address: 'New Address',
        total_hectares: 50
      };

      const result = await unifiedExtractionService.applyExtractionToFarm(
        'test-farm-id',
        extractionData,
        { mergeStrategy: 'merge' }
      );

      expect(result.success).toBe(true);
      expect(result.updatedFields).toContain('address');
      expect(result.updatedFields).toContain('total_hectares');
    });
  });

  describe('Field Mapping Consistency', () => {
    it('should map fields identically for new and existing farms', async () => {
      const mockExtractionData = {
        farmName: 'Test Farm',
        ownerName: 'John Doe',
        address: 'Test Address',
        totalHectares: '50.5',
        legalStatus: 'SRL',
        country: 'Romania',
        activities: ['Vegetables', 'Fruits'],
        livestockPresent: 'true'
      };

      const { mapExtractionToForm } = await import('@/lib/extraction/centralized-mapper');
      const newFarmResult = mapExtractionToForm(mockExtractionData);
      const mappedData = newFarmResult.mappedData as any;

      expect(mappedData.name).toBe('Test Farm');
      expect(mappedData.total_hectares).toBe(50.5);
      expect(mappedData.livestock_present).toBe(true);
    });
  });

  describe('Data Persistence and History', () => {
    it('should handle bulk reprocessing correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'doc1',
                file_name: 'test1.pdf',
                file_url: 'https://example.com/test1.pdf',
                category: 'farm_registration'
              },
              {
                id: 'doc2',
                file_name: 'test2.pdf',
                file_url: 'https://example.com/test2.pdf',
                category: 'financial_statement'
              }
            ],
            error: null
          })
        }))
      } as any);

      const results = await unifiedExtractionService.reprocessFarmDocuments('test-farm-id');

      expect(results.processed).toBe(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Network error'));

      const result = await unifiedExtractionService.processDocumentExtraction({
        documentId: 'test-doc-id',
        farmId: 'test-farm-id',
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});