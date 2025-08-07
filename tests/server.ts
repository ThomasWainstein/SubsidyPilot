import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock handlers for Supabase API calls
export const handlers = [
  // Mock authentication endpoints
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'authenticated'
        }
      },
      error: null
    })
  }),

  // Mock database queries
  http.get('*/rest/v1/farms*', () => {
    return HttpResponse.json([
      {
        id: 'test-farm-id',
        name: 'Test Farm',
        user_id: 'test-user-id',
        address: '123 Test Street',
        total_hectares: 100
      }
    ])
  }),

  // Mock document extractions
  http.get('*/rest/v1/document_extractions*', () => {
    return HttpResponse.json([
      {
        id: 'test-extraction-id',
        document_id: 'test-document-id',
        extracted_data: { farm_name: 'Test Farm' },
        confidence_score: 0.85,
        status: 'completed'
      }
    ])
  }),

  // Mock subsidies
  http.get('*/rest/v1/subsidies*', () => {
    return HttpResponse.json([
      {
        id: 'test-subsidy-id',
        code: 'TEST-001',
        title: { fr: 'Test Subsidy' },
        description: { fr: 'Test subsidy description' },
        agency: 'Test Agency'
      }
    ])
  })
]

export const server = setupServer(...handlers)