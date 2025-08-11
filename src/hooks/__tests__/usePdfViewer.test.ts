import { renderHook, act } from '@testing-library/react';
import { usePdfViewer } from '../usePdfViewer';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'mock-token' } }
    })
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
    VITE_ENABLE_PDF_VIEWER: 'true'
  }
});

describe('usePdfViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePdfViewer());

    expect(result.current.state).toEqual({
      isLoaded: false,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      layer: 'original',
      isLoading: false,
      error: null,
    });

    expect(result.current.metrics).toEqual({
      firstPageRenderMs: 0,
      pageRenderMs: 0,
      dpi: 1,
      scale: 1.0,
      cacheSize: 0,
      evictions: 0,
    });
  });

  it('should load PDF successfully', async () => {
    const { result } = renderHook(() => usePdfViewer());

    await act(async () => {
      await result.current.load('https://example.com/test.pdf');
    });

    expect(result.current.state.isLoaded).toBe(true);
    expect(result.current.state.totalPages).toBe(10); // Mock implementation
    expect(result.current.state.currentPage).toBe(1);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBe(null);
  });

  it('should handle load errors gracefully', async () => {
    // Mock fetch to throw an error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePdfViewer());

    await act(async () => {
      await result.current.load('https://example.com/invalid.pdf');
    });

    expect(result.current.state.isLoaded).toBe(false);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBe('Network error');
  });

  it('should navigate to valid pages', async () => {
    const { result } = renderHook(() => usePdfViewer());

    // Load PDF first
    await act(async () => {
      await result.current.load('https://example.com/test.pdf');
    });

    // Navigate to page 3
    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.state.currentPage).toBe(3);
  });

  it('should not navigate to invalid pages', async () => {
    const { result } = renderHook(() => usePdfViewer());

    // Load PDF first
    await act(async () => {
      await result.current.load('https://example.com/test.pdf');
    });

    const initialPage = result.current.state.currentPage;

    // Try to navigate to invalid pages
    act(() => {
      result.current.goToPage(0); // Below minimum
    });
    expect(result.current.state.currentPage).toBe(initialPage);

    act(() => {
      result.current.goToPage(999); // Above maximum
    });
    expect(result.current.state.currentPage).toBe(initialPage);
  });

  it('should update scale within valid range', () => {
    const { result } = renderHook(() => usePdfViewer());

    act(() => {
      result.current.setScale(1.5);
    });
    expect(result.current.state.scale).toBe(1.5);

    // Test boundaries
    act(() => {
      result.current.setScale(0.3); // Below minimum
    });
    expect(result.current.state.scale).toBe(1.5); // Should not change

    act(() => {
      result.current.setScale(3.0); // Above maximum
    });
    expect(result.current.state.scale).toBe(1.5); // Should not change

    act(() => {
      result.current.setScale(2.0); // Valid maximum
    });
    expect(result.current.state.scale).toBe(2.0);
  });

  it('should toggle layer correctly', () => {
    const { result } = renderHook(() => usePdfViewer());

    expect(result.current.state.layer).toBe('original');

    act(() => {
      result.current.toggleLayer('translated');
    });
    expect(result.current.state.layer).toBe('translated');

    act(() => {
      result.current.toggleLayer('original');
    });
    expect(result.current.state.layer).toBe('original');
  });

  it('should dispose resources correctly', async () => {
    const { result } = renderHook(() => usePdfViewer());

    // Load PDF first
    await act(async () => {
      await result.current.load('https://example.com/test.pdf');
    });

    expect(result.current.state.isLoaded).toBe(true);

    // Dispose resources
    act(() => {
      result.current.dispose();
    });

    expect(result.current.state).toEqual({
      isLoaded: false,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      layer: 'original',
      isLoading: false,
      error: null,
    });

    expect(result.current.metrics).toEqual({
      firstPageRenderMs: 0,
      pageRenderMs: 0,
      dpi: 1,
      scale: 1.0,
      cacheSize: 0,
      evictions: 0,
    });
  });

  it('should handle feature flag disabled', async () => {
    // Mock feature flag as disabled
    Object.defineProperty(import.meta, 'env', {
      value: {
        DEV: false,
        VITE_ENABLE_PDF_VIEWER: 'false'
      }
    });

    const { result } = renderHook(() => usePdfViewer());

    await act(async () => {
      await result.current.load('https://example.com/test.pdf');
    });

    expect(result.current.state.isLoaded).toBe(false);
    expect(result.current.state.error).toBe('PDF viewer is currently disabled in production mode');
  });

  it('should handle specific PDF error types', async () => {
    const testCases = [
      { error: 'PasswordException', expected: 'This PDF is password-protected.' },
      { error: 'InvalidPDFException', expected: 'The file is corrupted or unsupported.' },
      { error: 'MissingPDFException', expected: "We couldn't download this file. Try again." },
    ];

    for (const testCase of testCases) {
      global.fetch = vi.fn().mockRejectedValue(new Error(testCase.error));

      const { result } = renderHook(() => usePdfViewer());

      await act(async () => {
        await result.current.load('https://example.com/test.pdf');
      });

      expect(result.current.state.error).toBe(testCase.expected);
    }
  });
});