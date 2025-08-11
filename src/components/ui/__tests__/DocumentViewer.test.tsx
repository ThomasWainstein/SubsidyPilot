import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentViewer } from '../DocumentViewer';

// Mock the PDF viewer hook
const mockUsePdfViewer = {
  state: {
    isLoaded: false,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    layer: 'original' as const,
    isLoading: false,
    error: null,
  },
  metrics: {
    firstPageRenderMs: 0,
    pageRenderMs: 0,
    dpi: 1,
    scale: 1.0,
    cacheSize: 0,
    evictions: 0,
  },
  canvasRef: { current: null },
  load: vi.fn(),
  goToPage: vi.fn(),
  setScale: vi.fn(),
  toggleLayer: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('@/hooks/usePdfViewer', () => ({
  usePdfViewer: () => mockUsePdfViewer
}));

// Mock import.meta.env for feature flag
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: false,
    VITE_ENABLE_PDF_VIEWER: 'false'
  }
});

describe('DocumentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render disabled state when feature flag is off', () => {
    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    expect(screen.getByText('PDF Viewer Coming Soon')).toBeDefined();
    expect(screen.getByText('Advanced PDF viewing features are being developed in Phase F')).toBeDefined();
  });

  it('should render enabled state when feature flag is on', () => {
    // Enable feature flag
    Object.defineProperty(import.meta, 'env', {
      value: {
        DEV: true,
        VITE_ENABLE_PDF_VIEWER: 'true'
      }
    });

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    expect(screen.getByText('Document Viewer')).toBeDefined();
    expect(screen.getByText('No document loaded')).toBeDefined();
  });

  it('should show loading state', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state.isLoading = true;

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    expect(screen.getByText('Loading document...')).toBeDefined();
  });

  it('should show error state', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state.error = 'Failed to load PDF';
    mockUsePdfViewer.state.isLoading = false;

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    expect(screen.getByText('Failed to load document')).toBeDefined();
    expect(screen.getByText('Failed to load PDF')).toBeDefined();
  });

  it('should render navigation controls when loaded', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      isLoaded: true,
      totalPages: 10,
      currentPage: 3,
      error: null,
      isLoading: false,
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    expect(screen.getByText('3 / 10')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined(); // Scale badge
  });

  it('should handle page navigation clicks', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      isLoaded: true,
      totalPages: 10,
      currentPage: 3,
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    // Find navigation buttons and click them
    const prevButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-chevron-left')
    );
    const nextButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-chevron-right')
    );

    if (prevButton) {
      fireEvent.click(prevButton);
      expect(mockUsePdfViewer.goToPage).toHaveBeenCalledWith(2);
    }

    if (nextButton) {
      fireEvent.click(nextButton);
      expect(mockUsePdfViewer.goToPage).toHaveBeenCalledWith(4);
    }
  });

  it('should handle zoom controls', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      isLoaded: true,
      scale: 1.0,
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    // Find zoom buttons
    const zoomInButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-zoom-in')
    );
    const zoomOutButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('lucide-zoom-out')
    );

    if (zoomInButton) {
      fireEvent.click(zoomInButton);
      expect(mockUsePdfViewer.setScale).toHaveBeenCalledWith(1.2);
    }

    if (zoomOutButton) {
      fireEvent.click(zoomOutButton);
      expect(mockUsePdfViewer.setScale).toHaveBeenCalled();
    }
  });

  it('should handle layer toggle', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      layer: 'original',
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf"
        enableFeatures={{ translation: true }}
      />
    );

    const originalButton = screen.getByText('Original');
    fireEvent.click(originalButton);
    expect(mockUsePdfViewer.toggleLayer).toHaveBeenCalledWith('original');
  });

  it('should render thumbnails when enabled', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      isLoaded: true,
      totalPages: 3,
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf"
        enableFeatures={{ thumbnails: true }}
      />
    );

    expect(screen.getByText('Page 1')).toBeDefined();
    expect(screen.getByText('Page 2')).toBeDefined();
    expect(screen.getByText('Page 3')).toBeDefined();
  });

  it('should have proper accessibility attributes', () => {
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: true, VITE_ENABLE_PDF_VIEWER: 'true' }
    });

    mockUsePdfViewer.state = {
      ...mockUsePdfViewer.state,
      isLoaded: true,
      totalPages: 10,
      currentPage: 5,
    };

    render(
      <DocumentViewer 
        documentId="test-doc" 
        documentUrl="https://example.com/test.pdf" 
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('Page 5 of 10');
  });
});