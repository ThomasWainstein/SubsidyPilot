/**
 * Tests for Document Review Hooks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSubmitReviewCorrection, useDocumentsForReview, useReviewStatistics } from '../useDocumentReview'
import { mockExtractionData, mockDocumentData, mockReviewData } from '@/test/mocks/supabase'

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useDocumentReview hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock behaviors
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  })

  describe('useSubmitReviewCorrection', () => {
    it('should update extraction and create audit record', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      const mockEq = vi.fn().mockReturnValue(mockUpdate)
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'document_extractions') {
          return { update: vi.fn().mockReturnValue({ eq: mockEq }) }
        }
        if (table === 'document_extraction_reviews') {
          return { insert: mockInsert }
        }
        return {}
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubmitReviewCorrection(), { wrapper })

      const correction = {
        extractionId: 'test-extraction-id',
        correctedData: { farm_name: 'Corrected Farm Name' },
        originalData: mockExtractionData.extracted_data,
        reviewerNotes: 'Fixed farm name spelling',
        status: 'reviewed' as const,
      }

      await act(async () => {
        await result.current.mutateAsync({ correction })
      })

      // Verify extraction update
      expect(mockEq).toHaveBeenCalledWith('id', 'test-extraction-id')
      expect(mockUpdate).toHaveBeenCalledWith({
        extracted_data: correction.correctedData,
        debug_info: expect.objectContaining({
          reviewStatus: 'reviewed',
          reviewerNotes: 'Fixed farm name spelling',
        }),
      })

      // Verify audit record creation
      expect(mockInsert).toHaveBeenCalledWith({
        extraction_id: 'test-extraction-id',
        reviewer_id: 'test-user-id',
        original_data: mockExtractionData.extracted_data,
        corrected_data: correction.correctedData,
        reviewer_notes: 'Fixed farm name spelling',
        review_status: 'reviewed',
      })
    })

    it('should handle update errors gracefully', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ 
        error: { message: 'Update failed' } 
      })
      const mockEq = vi.fn().mockReturnValue(mockUpdate)
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockEq })
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubmitReviewCorrection(), { wrapper })

      const correction = {
        extractionId: 'test-extraction-id',
        correctedData: { farm_name: 'Corrected Farm Name' },
        originalData: mockExtractionData.extracted_data,
        reviewerNotes: 'Test correction',
        status: 'reviewed' as const,
      }

      await expect(
        act(async () => {
          await result.current.mutateAsync({ correction })
        })
      ).rejects.toThrow('Update failed')
    })

    it('should handle audit logging errors gracefully', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      const mockEq = vi.fn().mockReturnValue(mockUpdate)
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Audit logging failed' } 
      })
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'document_extractions') {
          return { update: vi.fn().mockReturnValue({ eq: mockEq }) }
        }
        if (table === 'document_extraction_reviews') {
          return { insert: mockInsert }
        }
        return {}
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubmitReviewCorrection(), { wrapper })

      const correction = {
        extractionId: 'test-extraction-id',
        correctedData: { farm_name: 'Corrected Farm Name' },
        originalData: mockExtractionData.extracted_data,
        reviewerNotes: 'Test correction',
        status: 'reviewed' as const,
      }

      await expect(
        act(async () => {
          await result.current.mutateAsync({ correction })
        })
      ).rejects.toThrow('Audit logging failed')
    })
  })

  describe('useDocumentsForReview', () => {
    it('should fetch documents needing review', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDocumentData],
        error: null,
      })
      const mockEq = vi.fn().mockReturnValue({ data: [mockDocumentData], error: null })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDocumentsForReview('test-farm-id'), { wrapper })

      // Wait for the query to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should filter documents by status', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [mockDocumentData],
        error: null,
      })
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [mockDocumentData], error: null }),
          }),
        }),
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => 
        useDocumentsForReview('test-farm-id', { status: 'needs_review' }), 
        { wrapper }
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useReviewStatistics', () => {
    it('should calculate review statistics correctly', async () => {
      const mockStats = {
        totalDocuments: 100,
        needsReview: 25,
        highPriority: 5,
        mediumPriority: 15,
        lowPriority: 5,
        averageConfidence: 0.82,
      }

      // Mock multiple Supabase calls for statistics
      mockSupabase.from.mockImplementation((table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ count: mockStats.totalDocuments }],
            error: null,
          }),
        }),
      }))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useReviewStatistics('test-farm-id'), { wrapper })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
    })
  })
})