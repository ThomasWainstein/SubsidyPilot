import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSubmitReviewCorrection } from '../useDocumentReview'
import { vi, describe, it, expect } from 'vitest'

const queryClient = new QueryClient()
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(QueryClientProvider, { client: queryClient }, children)

const eqMock = vi.fn().mockResolvedValue({ error: null })
const updateMock = vi.fn(() => ({ eq: eqMock }))
const insertMock = vi.fn().mockResolvedValue({ error: null })
const getUserMock = vi.fn().mockResolvedValue({ data: { user: { id: 'user-id' } } })

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'document_extractions') return { update: updateMock }
      if (table === 'document_extraction_reviews') return { insert: insertMock }
      return {}
    },
    auth: {
      getUser: getUserMock,
    },
  },
}))

describe('useSubmitReviewCorrection', () => {
  it('updates extractions and logs audit record', async () => {
    const { result } = renderHook(() => useSubmitReviewCorrection(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        correction: {
          extractionId: '123',
          correctedData: { foo: 'bar' },
          originalData: { foo: 'old' },
          reviewerNotes: 'note',
          status: 'reviewed',
        },
      })
    })

    expect(updateMock).toHaveBeenCalledWith({
      extracted_data: { foo: 'bar' },
      debug_info: expect.objectContaining({
        reviewStatus: 'reviewed',
        reviewerNotes: 'note',
      }),
    })
    expect(eqMock).toHaveBeenCalledWith('id', '123')
    expect(insertMock).toHaveBeenCalledWith({
      extraction_id: '123',
      reviewer_id: 'user-id',
      original_data: { foo: 'old' },
      corrected_data: { foo: 'bar' },
      reviewer_notes: 'note',
      review_status: 'reviewed',
    })
  })
})
