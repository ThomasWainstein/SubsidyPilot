/**
 * Tests for Document Review Detail Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import DocumentReviewDetail from '../review/DocumentReviewDetail'
import { mockExtractionData, mockDocumentData } from '@/test/mocks/supabase'

// Mock the hooks
vi.mock('@/hooks/useDocumentReview', () => ({
  useDocumentReviewDetail: vi.fn(),
  useSubmitReviewCorrection: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Create test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('DocumentReviewDetail', () => {
  const mockDocumentDetail = {
    ...mockDocumentData,
    extraction: mockExtractionData,
    farm: {
      id: 'test-farm-id',
      name: 'Test Farm',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    const { useDocumentReviewDetail, useSubmitReviewCorrection } = require('@/hooks/useDocumentReview')
    
    useDocumentReviewDetail.mockReturnValue({
      data: mockDocumentDetail,
      isLoading: false,
      error: null,
    })

    useSubmitReviewCorrection.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
  })

  it('should render document details correctly', () => {
    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    expect(screen.getByText('test-document.pdf')).toBeTruthy()
    expect(screen.getByText('Test Farm')).toBeTruthy()
    expect(screen.getByText('financial')).toBeTruthy()
  })

  it('should display extraction data in editable form', () => {
    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    expect(screen.getByDisplayValue('Test Farm')).toBeTruthy()
    expect(screen.getByDisplayValue('John Doe')).toBeTruthy()
    expect(screen.getByDisplayValue('150')).toBeTruthy()
  })

  it('should handle form submission for corrections', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    const { useSubmitReviewCorrection } = require('@/hooks/useDocumentReview')
    
    useSubmitReviewCorrection.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })

    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    // Modify a field
    const farmNameInput = screen.getByDisplayValue('Test Farm')
    fireEvent.change(farmNameInput, { target: { value: 'Corrected Farm Name' } })

    // Add reviewer notes
    const notesTextarea = screen.getByLabelText(/reviewer notes/i)
    fireEvent.change(notesTextarea, { target: { value: 'Corrected farm name' } })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit correction/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        correction: expect.objectContaining({
          extractionId: mockExtractionData.id,
          correctedData: expect.objectContaining({
            farm_name: 'Corrected Farm Name',
          }),
          reviewerNotes: 'Corrected farm name',
          status: 'reviewed',
        }),
      })
    })
  })

  it('should display confidence score with appropriate styling', () => {
    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    const confidenceElement = screen.getByText('85%')
    expect(confidenceElement).toBeTruthy()
    expect(confidenceElement.classList.contains('text-yellow-600')).toBe(true) // Medium confidence styling
  })

  it('should show loading state appropriately', () => {
    const { useDocumentReviewDetail } = require('@/hooks/useDocumentReview')
    
    useDocumentReviewDetail.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    expect(screen.getByText(/loading/i)).toBeTruthy()
  })

  it('should handle error states gracefully', () => {
    const { useDocumentReviewDetail } = require('@/hooks/useDocumentReview')
    
    useDocumentReviewDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load document'),
    })

    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    expect(screen.getByText(/error loading document/i)).toBeTruthy()
  })

  it('should prevent submission when form is invalid', () => {
    const mockMutateAsync = vi.fn()
    const { useSubmitReviewCorrection } = require('@/hooks/useDocumentReview')
    
    useSubmitReviewCorrection.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })

    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    // Clear required field
    const farmNameInput = screen.getByDisplayValue('Test Farm')
    fireEvent.change(farmNameInput, { target: { value: '' } })

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /submit correction/i })
    fireEvent.click(submitButton)

    // Should not call mutation
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('should display extraction metadata correctly', () => {
    const TestWrapper = createTestWrapper()
    
    render(
      <TestWrapper>
        <DocumentReviewDetail documentId="test-document-id" farmId="test-farm-id" />
      </TestWrapper>
    )

    expect(screen.getByText('openai')).toBeTruthy() // extraction method
    expect(screen.getByText(/1.5s/)).toBeTruthy() // processing time
    expect(screen.getByText('gpt-4o-mini')).toBeTruthy() // model used
  })
})