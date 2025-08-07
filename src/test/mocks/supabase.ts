import { vi } from 'vitest'

/**
 * Mock data for Supabase entities used in tests
 */

export const mockExtractionData = {
  id: 'test-extraction-id',
  document_id: 'test-document-id',
  extracted_data: {
    farm_name: 'Test Farm',
    owner_name: 'John Doe',
    total_hectares: '150',
    legal_status: 'Individual',
    address: '123 Test Street, Test City'
  },
  confidence_score: 0.85,
  status: 'completed',
  extraction_type: 'openai',
  debug_info: {
    model: 'gpt-4o-mini',
    processingTime: '1.5s',
    tokens: 250
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockDocumentData = {
  id: 'test-document-id',
  farm_id: 'test-farm-id',
  file_name: 'test-document.pdf',
  file_url: 'https://example.com/test-document.pdf',
  category: 'financial',
  uploaded_at: '2023-01-01T00:00:00Z',
  file_size: 1024,
  mime_type: 'application/pdf'
}

export const mockFarmData = {
  id: 'test-farm-id',
  user_id: 'test-user-id',
  name: 'Test Farm',
  address: '123 Test Street, Test City',
  total_hectares: 150,
  legal_status: 'Individual',
  department: 'Test Department',
  country: 'France',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockSubsidyData = {
  id: 'test-subsidy-id',
  code: 'TEST-001',
  title: { fr: 'Test Subsidy' },
  description: { fr: 'A test subsidy for agricultural projects' },
  agency: 'Test Agricultural Agency',
  funding_type: 'grant',
  deadline: '2023-12-31',
  status: 'open',
  region: ['Test Region'],
  tags: ['agriculture', 'test'],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockUserData = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  user_type: 'farmer' as const,
  created_at: '2023-01-01T00:00:00Z'
}

export const mockReviewData = {
  id: 'test-review-id',
  extraction_id: 'test-extraction-id',
  reviewer_id: 'test-user-id',
  original_data: { farm_name: 'Original Farm Name' },
  corrected_data: { farm_name: 'Corrected Farm Name' },
  reviewer_notes: 'Fixed spelling error in farm name',
  review_status: 'reviewed',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

// Mock Supabase client functions
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUserData },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUserData },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null })
  },
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: table === 'farms' ? [mockFarmData] :
               table === 'subsidies' ? [mockSubsidyData] :
               table === 'document_extractions' ? [mockExtractionData] :
               table === 'farm_documents' ? [mockDocumentData] : [],
        error: null
      }),
      single: vi.fn().mockResolvedValue({
        data: table === 'farms' ? mockFarmData :
               table === 'subsidies' ? mockSubsidyData :
               table === 'document_extractions' ? mockExtractionData :
               table === 'farm_documents' ? mockDocumentData : null,
        error: null
      })
    })),
    insert: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    }))
  })),
  rpc: vi.fn().mockResolvedValue({
    data: false, // Default: user is not admin
    error: null
  })
})