/**
 * Supabase mock utilities for testing
 */
import { vi } from 'vitest'

export const createMockSupabaseClient = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ data: [], error: null }),
    insert: vi.fn().mockReturnValue({ data: null, error: null }),
    update: vi.fn().mockReturnValue({ data: null, error: null }),
    delete: vi.fn().mockReturnValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null 
    }),
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: { access_token: 'test-token', user: { id: 'test-user-id' } } },
      error: null 
    }),
    signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
    signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'test-path' }, 
        error: null 
      }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://test.example.com/test-file.pdf' } 
      }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
})

export const mockExtractionData = {
  id: 'test-extraction-id',
  document_id: 'test-document-id',
  extracted_data: {
    farm_name: 'Test Farm',
    owner_name: 'John Doe',
    total_hectares: '150',
    location: 'Test Location'
  },
  confidence_score: 0.85,
  status: 'completed',
  extraction_method: 'ai',
  created_at: '2024-01-01T00:00:00Z',
  debug_info: {
    model: 'gpt-4o-mini',
    processing_time: 1500,
    extraction_method: 'openai',
  }
}

export const mockDocumentData = {
  id: 'test-document-id',
  farm_id: 'test-farm-id',
  file_name: 'test-document.pdf',
  file_url: 'https://test.example.com/test-document.pdf',
  file_size: 1024000,
  document_type: 'financial',
  upload_status: 'completed',
  uploaded_at: '2024-01-01T00:00:00Z',
}

export const mockReviewData = {
  id: 'test-review-id',
  extraction_id: 'test-extraction-id',
  reviewer_id: 'test-user-id',
  original_data: mockExtractionData.extracted_data,
  corrected_data: {
    ...mockExtractionData.extracted_data,
    total_hectares: '175' // corrected value
  },
  reviewer_notes: 'Corrected hectare value based on updated survey',
  review_status: 'reviewed',
  created_at: '2024-01-01T00:00:00Z',
}