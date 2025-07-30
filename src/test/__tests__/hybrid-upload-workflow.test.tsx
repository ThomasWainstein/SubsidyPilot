import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@/test/utils';
import { createMockSupabaseClient } from '@/test/mocks/supabase';
import { useTempDocumentUpload } from '@/hooks/useTempDocumentUpload';
import useHybridExtraction from '@/hooks/useHybridExtraction';
import FullExtractionReview from '@/components/review/FullExtractionReview';
import SmartFormPrefill from '@/components/farm/SmartFormPrefill';
import { useFarmDocumentExtractions } from '@/hooks/useDocumentExtractions';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient()
}));
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));
vi.mock('@/hooks/useDocumentExtractions', () => ({
  useFarmDocumentExtractions: vi.fn()
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });

const mockExtraction = {
  id: 'ext1',
  document_id: 'doc1',
  farm_documents: { file_name: 'test.pdf' },
  extracted_data: { farmName: 'Extracted Farm', confidence: 0.9 }
};

describe('Hybrid upload workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes document and shares data with review and prefill components', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        extractedFields: { farmName: 'Extracted Farm' },
        confidence: 0.9,
        source: 'merged',
        fieldsCount: 1
      },
      error: null
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTempDocumentUpload(), { wrapper });
    const { result: hybrid } = renderHook(() => useHybridExtraction(), { wrapper });

    let docId = '';
    await act(() => {
      docId = result.current.addDocument(file);
      result.current.updateDocument(docId, {
        upload_status: 'completed',
        file_url: 'https://example.com/test.pdf'
      });
    });

    await act(async () => {
      await hybrid.current.extractFromDocument('https://example.com/test.pdf', docId);
    });

    act(() => {
      result.current.updateDocument(docId, {
        extraction_status: 'completed',
        extraction_data: { farmName: 'Extracted Farm', confidence: 0.9 }
      });
    });

    (useFarmDocumentExtractions as unknown as vi.Mock).mockReturnValue({
      data: [mockExtraction],
      isLoading: false
    });

    render(
      <SmartFormPrefill farmId="farm1" onApplyExtraction={vi.fn()} />,
      { wrapper }
    );

    expect(screen.getByText(/smart prefill available/i)).toBeDefined();

    render(
      <FullExtractionReview
        documentId={docId}
        extraction={mockExtraction}
        farmId="farm1"
        onSave={vi.fn()}
        onApplyToForm={vi.fn()}
      />, { wrapper }
    );

    expect(screen.getByDisplayValue('Extracted Farm')).toBeDefined();
  });

  it('handles network errors from hybrid extraction', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockRejectedValueOnce(new Error('network down'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTempDocumentUpload(), { wrapper });
    const { result: hybrid } = renderHook(() => useHybridExtraction(), { wrapper });

    let docId = '';
    await act(() => {
      docId = result.current.addDocument(file);
      result.current.updateDocument(docId, {
        upload_status: 'completed',
        file_url: 'https://example.com/test.pdf'
      });
    });

    await act(async () => {
      await expect(hybrid.current.extractFromDocument('https://example.com/test.pdf', docId)).rejects.toThrow('network down');
    });

    act(() => {
      result.current.updateDocument(docId, { extraction_status: 'failed' });
    });

    (useFarmDocumentExtractions as unknown as vi.Mock).mockReturnValue({ data: [], isLoading: false });

    render(
      <SmartFormPrefill farmId="farm1" onApplyExtraction={vi.fn()} />,
      { wrapper }
    );

    expect(screen.getByText(/no ai-extracted data available/i)).toBeDefined();
  });

  it('handles extraction function errors', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'service failed' }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTempDocumentUpload(), { wrapper });
    const { result: hybrid } = renderHook(() => useHybridExtraction(), { wrapper });

    let docId = '';
    await act(() => {
      docId = result.current.addDocument(file);
      result.current.updateDocument(docId, {
        upload_status: 'completed',
        file_url: 'https://example.com/test.pdf'
      });
    });

    await act(async () => {
      await expect(hybrid.current.extractFromDocument('https://example.com/test.pdf', docId)).rejects.toThrow('Extraction function error: service failed');
    });

    act(() => {
      result.current.updateDocument(docId, { extraction_status: 'failed' });
    });

    (useFarmDocumentExtractions as unknown as vi.Mock).mockReturnValue({ data: [], isLoading: false });

    render(
      <SmartFormPrefill farmId="farm1" onApplyExtraction={vi.fn()} />,
      { wrapper }
    );

    expect(screen.getByText(/no ai-extracted data available/i)).toBeDefined();
  });
});
