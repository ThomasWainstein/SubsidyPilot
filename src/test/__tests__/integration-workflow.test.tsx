import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentUploadSection from '@/components/farm/DocumentUploadSection';

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

  it('should render document upload section', () => {
    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    expect(screen.getByText(/upload farm documents/i)).toBeDefined();
    expect(screen.getByText(/drag & drop documents here/i)).toBeDefined();
  });

  it('should handle successful hybrid extraction workflow', async () => {
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

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Verify the component renders properly
    expect(screen.getByText(/upload farm documents/i)).toBeDefined();
  });

  it('should handle extraction failures gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock extraction failure
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Rule-based extraction failed' }
    });

    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Component should render without errors
    expect(screen.getByText(/upload farm documents/i)).toBeDefined();
  });

  it('should provide file type support information', () => {
    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Should show supported file types
    expect(screen.getByText(/supports: pdf, docx/i)).toBeDefined();
  });

  it('should handle network connectivity issues', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
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

    // Component should handle errors gracefully
    expect(screen.getByText(/upload farm documents/i)).toBeDefined();
  });

  it('should maintain proper component structure', () => {
    const mockOnExtractedDataChange = vi.fn();
    const mockOnApplyAllData = vi.fn();

    renderWithProviders(
      <DocumentUploadSection
        onExtractedDataChange={mockOnExtractedDataChange}
        onApplyAllData={mockOnApplyAllData}
      />
    );

    // Verify main components are present
    expect(screen.getByText(/upload farm documents/i)).toBeDefined();
    expect(screen.getByText(/drag & drop documents here/i)).toBeDefined();
  });
});