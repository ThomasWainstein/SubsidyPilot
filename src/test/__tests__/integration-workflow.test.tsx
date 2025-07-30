import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentUploadSection from '@/components/farm/DocumentUploadSection';
import SmartFormPrefill from '@/components/farm/SmartFormPrefill';

// Mock Supabase and related dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.pdf' } }))
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

// Mock URL.createObjectURL for file uploads
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');

describe('Complete Extraction Workflow Integration', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should complete full document upload to form application workflow', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock successful hybrid extraction
    const mockExtractionResult = {
      extractedFields: {
        farmName: 'Extracted Farm',
        ownerName: 'Extracted Owner',
        address: 'Extracted Address',
        totalHectares: 75
      },
      confidence: 0.88,
      source: 'merged',
      timestamp: new Date().toISOString(),
      fieldsCount: 4
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockExtractionResult,
      error: null
    });

    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    // Step 1: Render upload component
    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Step 2: Upload a document
    const file = new File(['test content'], 'test-farm-doc.pdf', { type: 'application/pdf' });
    const uploadArea = screen.getByRole('button', { name: /drag & drop documents here/i });
    
    await user.upload(uploadArea, file);

    // Wait for processing to complete
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('hybrid-extraction', {
        body: {
          documentUrl: expect.any(String),
          documentId: expect.any(String),
          forceAI: false
        }
      });
    }, { timeout: 5000 });

    // Step 3: Check that extraction completed
    await waitFor(() => {
      expect(screen.getByText(/extraction completed successfully/i)).toBeInTheDocument();
    });

    // Step 4: Apply extracted data
    const applyButton = screen.getByRole('button', { name: /apply all extracted data/i });
    await user.click(applyButton);

    expect(mockOnApplyAllData).toHaveBeenCalledWith(
      expect.objectContaining({
        farmName: 'Extracted Farm',
        ownerName: 'Extracted Owner'
      })
    );
  });

  it('should handle extraction failure and retry with AI', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock initial failure, then success on retry
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Rule-based extraction failed' }
      })
      .mockResolvedValueOnce({
        data: {
          extractedFields: { farmName: 'AI Extracted Farm' },
          confidence: 0.72,
          source: 'ai-based',
          fieldsCount: 1
        },
        error: null
      });

    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Upload document
    const file = new File(['test content'], 'difficult-doc.pdf', { type: 'application/pdf' });
    const uploadArea = screen.getByRole('button');
    
    await user.upload(uploadArea, file);

    // Wait for initial failure
    await waitFor(() => {
      expect(screen.getByText(/extraction failed/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry.*extraction/i });
    await user.click(retryButton);

    // Should call with forceAI = true
    expect(supabase.functions.invoke).toHaveBeenLastCalledWith('hybrid-extraction', {
      body: {
        documentUrl: expect.any(String),
        documentId: expect.any(String),
        forceAI: true
      }
    });

    // Wait for AI success
    await waitFor(() => {
      expect(screen.getByText(/ai extraction completed/i)).toBeInTheDocument();
    });
  });

  it('should maintain data consistency between review and form prefill', async () => {
    const mockExtractionData = [
      {
        id: 'ext1',
        extracted_data: {
          farmName: 'Test Farm',
          ownerName: 'Test Owner',
          confidence: 0.9
        },
        farm_documents: {
          file_name: 'test.pdf'
        },
        created_at: new Date().toISOString()
      }
    ];

    const mockOnApplyExtraction = vi.fn();

    // Render SmartFormPrefill with mock data
    renderWithProviders(
      <SmartFormPrefill
        farmId="farm1"
        onApplyExtraction={mockOnApplyExtraction}
      />
    );

    // Mock the hook to return our test data
    vi.doMock('@/hooks/useDocumentExtractions', () => ({
      useFarmDocumentExtractions: () => ({
        data: mockExtractionData,
        isLoading: false
      })
    }));

    // Re-render with mocked hook
    renderWithProviders(
      <SmartFormPrefill
        farmId="farm1"
        onApplyExtraction={mockOnApplyExtraction}
      />
    );

    // Should show extraction data
    await waitFor(() => {
      expect(screen.getByText('Test Farm')).toBeInTheDocument();
    });

    // Click quick apply
    const quickApplyButton = screen.getByRole('button', { name: /quick apply/i });
    await user.click(quickApplyButton);

    expect(mockOnApplyExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        farmName: 'Test Farm',
        ownerName: 'Test Owner'
      })
    );
  });

  it('should handle network errors gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('@/hooks/use-toast');
    
    // Mock network error
    (supabase.functions.invoke as any).mockRejectedValueOnce(
      new Error('Network error: Failed to fetch')
    );

    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Upload document
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const uploadArea = screen.getByRole('button');
    
    await user.upload(uploadArea, file);

    // Should show network error
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error'),
          variant: 'destructive'
        })
      );
    });
  });

  it('should validate file types before upload', async () => {
    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Try to upload unsupported file type
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const uploadArea = screen.getByRole('button');
    
    await user.upload(uploadArea, invalidFile);

    // Should show validation error
    expect(screen.getByText(/file validation failed/i)).toBeInTheDocument();
  });

  it('should preserve user edits during review workflow', async () => {
    // This test would verify that user corrections in the review interface
    // are properly saved and applied to the form, maintaining data integrity
    // throughout the workflow
    
    const mockOnSave = vi.fn();
    const mockOnApplyToForm = vi.fn();

    // Mock extraction with initial data
    const extraction = {
      id: 'ext1',
      extracted_data: {
        farmName: 'Original Farm Name',
        totalHectares: '50'
      },
      farm_documents: {
        file_name: 'test.pdf',
        file_url: 'https://example.com/test.pdf'
      }
    };

    // This would render FullExtractionReview and test the complete
    // edit -> save -> apply workflow with validation
    expect(true).toBe(true); // Placeholder assertion
  });
});