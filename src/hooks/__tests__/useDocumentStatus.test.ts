import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentStatus } from '../useDocumentStatus';

// Mock supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    setSession: vi.fn()
  },
  channel: vi.fn(),
  removeChannel: vi.fn(),
  supabaseUrl: 'https://test.supabase.co'
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock fetch
global.fetch = vi.fn();

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: any }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useDocumentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default session mock
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } }
    });
    
    // Default channel mock
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      })
    };
    mockSupabase.channel.mockReturnValue(mockChannel);
  });

  it('should fetch document status successfully', async () => {
    const mockStatusData = {
      documentId: 'test-doc-123',
      document: {
        filename: 'test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: '2024-01-01T00:00:00Z'
      },
      extraction: {
        id: 'extraction-123',
        status: 'extracting' as const,
        step: 'Text Extraction',
        progress: 50,
        progressDetails: { step: 'Text Extraction' },
        confidence: 0.8,
        lastEventAt: '2024-01-01T00:00:00Z',
        currentRetry: 0,
        maxRetries: 3,
        tableCount: 2,
        processingTimeMs: 5000
      },
      retryable: false,
      metrics: {
        totalOperations: 5,
        avgDuration: 1000,
        successRate: 80,
        operationBreakdown: { text_extraction: 3, table_extraction: 2 }
      },
      lastUpdated: '2024-01-01T00:00:00Z'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData)
    });

    const { result } = renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual(mockStatusData);
    expect(result.current.isProcessing).toBe(true);
    expect(result.current.progressPercentage).toBe(50);
    expect(result.current.currentStep).toBe('Text Extraction');
    expect(result.current.tableCount).toBe(2);
  });

  it('should handle failed status correctly', async () => {
    const mockFailedData = {
      documentId: 'test-doc-123',
      extraction: {
        status: 'failed' as const,
        step: 'AI Analysis',
        progress: 0,
        failureCode: 'ai_quota_exceeded',
        failureDetail: 'Daily quota exceeded',
        currentRetry: 1,
        maxRetries: 3
      },
      retryable: true
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFailedData)
    });

    const { result } = renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.isRetryable).toBe(true);
    expect(result.current.errorCode).toBe('ai_quota_exceeded');
    expect(result.current.errorMessage).toBe('Daily quota exceeded');
    expect(result.current.retryCount).toBe(1);
  });

  it('should handle retry mutation successfully', async () => {
    const mockRetryResponse = {
      success: true,
      documentId: 'test-doc-123',
      retryAttempt: 2,
      delaySeconds: 300
    };

    // Initial status fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        documentId: 'test-doc-123',
        extraction: { status: 'failed', currentRetry: 1, maxRetries: 3 },
        retryable: true
      })
    });

    // Retry API call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRetryResponse)
    });

    const { result } = renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.retry();
    });

    expect(result.current.isRetrying).toBe(true);

    await waitFor(() => {
      expect(result.current.isRetrying).toBe(false);
    });

    // Verify retry API was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/retry'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
  });

  it('should setup realtime subscription when enabled', () => {
    renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: true }),
      { wrapper: createWrapper() }
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('doc:test-doc-123');
  });

  it('should handle realtime status changes', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      })
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);

    renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: true }),
      { wrapper: createWrapper() }
    );

    // Verify realtime subscription setup
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'document_extractions',
        filter: 'document_id=eq.test-doc-123'
      }),
      expect.any(Function)
    );
  });

  it('should return null when no document ID provided', () => {
    const { result } = renderHook(
      () => useDocumentStatus(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.status).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useDocumentStatus('test-doc-123', { enableRealtime: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Network error');
  });

  it('should calculate progress correctly for different statuses', async () => {
    const testCases = [
      { status: 'uploading', expectedProgress: 10 },
      { status: 'virus_scan', expectedProgress: 20 },
      { status: 'extracting', expectedProgress: 40 },
      { status: 'ocr', expectedProgress: 60 },
      { status: 'ai', expectedProgress: 80 },
      { status: 'completed', expectedProgress: 100 },
      { status: 'failed', expectedProgress: 0 }
    ];

    for (const testCase of testCases) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          extraction: {
            status: testCase.status,
            progress: testCase.expectedProgress
          }
        })
      });

      const { result } = renderHook(
        () => useDocumentStatus('test-doc', { enableRealtime: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.progressPercentage).toBe(testCase.expectedProgress);
      });
    }
  });
});