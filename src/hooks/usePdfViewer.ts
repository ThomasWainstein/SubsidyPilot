import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Feature flags - enable in development only
const ENABLE_PDF_VIEWER = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PDF_VIEWER === 'true';

// PDF.js types - will be properly typed when pdfjs-dist is available
type PDFDocumentProxy = any;
type PDFPageProxy = any;

export interface PdfViewerState {
  isLoaded: boolean;
  currentPage: number;
  totalPages: number;
  scale: number;
  layer: 'original' | 'translated';
  isLoading: boolean;
  error: string | null;
}

interface PdfViewerMetrics {
  firstPageRenderMs: number;
  pageRenderMs: number;
  dpi: number;
  scale: number;
  cacheSize: number;
  evictions: number;
}

export interface UsePdfViewerReturn {
  state: PdfViewerState;
  metrics: PdfViewerMetrics;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  load: (url: string) => Promise<void>;
  goToPage: (pageNumber: number) => void;
  setScale: (scale: number) => void;
  toggleLayer: (layer: 'original' | 'translated') => void;
  dispose: () => void;
}

export function usePdfViewer(): UsePdfViewerReturn {
  const [state, setState] = useState<PdfViewerState>({
    isLoaded: false,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    layer: 'original',
    isLoading: false,
    error: null
  });

  const [metrics, setMetrics] = useState<PdfViewerMetrics>({
    firstPageRenderMs: 0,
    pageRenderMs: 0,
    dpi: window.devicePixelRatio || 1,
    scale: 1.0,
    cacheSize: 0,
    evictions: 0,
  });

  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCache = useRef<Map<number, ImageData>>(new Map());
  const maxCacheSize = 5;

  // Initialize PDF.js worker when component mounts
  useEffect(() => {
    if (ENABLE_PDF_VIEWER) {
      // TODO: Configure PDF.js worker when pdfjs-dist is available
      // import('pdfjs-dist').then((pdfjsLib) => {
      //   pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
      // });
      console.log('📋 PDF.js viewer enabled in development mode');
    }
  }, []);

  const evictFromCache = useCallback(() => {
    if (pdfCache.current.size >= maxCacheSize) {
      const oldestKey = pdfCache.current.keys().next().value;
      pdfCache.current.delete(oldestKey);
      setMetrics(prev => ({ ...prev, evictions: prev.evictions + 1, cacheSize: pdfCache.current.size }));
    }
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocumentRef.current || !canvasRef.current || !ENABLE_PDF_VIEWER) {
      console.log('📋 PDF rendering skipped - viewer disabled or document not loaded');
      return;
    }

    const startTime = performance.now();
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // TODO: Implement actual PDF rendering when pdfjs-dist is available
      // const page: PDFPageProxy = await pdfDocumentRef.current.getPage(pageNumber);
      // const viewport = page.getViewport({ scale: state.scale * metrics.dpi });
      // 
      // const canvas = canvasRef.current;
      // const context = canvas.getContext('2d');
      // if (!context) throw new Error('Could not get canvas context');
      // 
      // canvas.height = viewport.height;
      // canvas.width = viewport.width;
      // canvas.style.width = `${viewport.width / metrics.dpi}px`;
      // canvas.style.height = `${viewport.height / metrics.dpi}px`;
      // 
      // await page.render({
      //   canvasContext: context,
      //   viewport: viewport
      // }).promise;

      // Mock rendering delay for development
      await new Promise(resolve => setTimeout(resolve, 200));

      const renderTime = performance.now() - startTime;
      const isFirstPage = pageNumber === 1 && metrics.firstPageRenderMs === 0;
      
      setMetrics(prev => ({
        ...prev,
        firstPageRenderMs: isFirstPage ? renderTime : prev.firstPageRenderMs,
        pageRenderMs: renderTime,
        scale: state.scale,
        cacheSize: pdfCache.current.size,
      }));

      setState(prev => ({ ...prev, currentPage: pageNumber, isLoading: false }));
      
      console.log(`📄 Rendered page ${pageNumber} in ${renderTime.toFixed(2)}ms`);
      
      // Log metrics to window for debugging
      if ((window as any).__metrics) {
        (window as any).__metrics.pdf = metrics;
      }
      
    } catch (error) {
      console.error('❌ PDF render error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to render page' 
      }));
    }
  }, [state.scale, metrics.dpi, metrics.firstPageRenderMs]);

  const load = useCallback(async (url: string) => {
    console.log(`📥 Loading PDF from: ${url}`);
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!ENABLE_PDF_VIEWER) {
      console.log('📋 PDF viewer disabled in production mode');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'PDF viewer is currently disabled in production mode'
      }));
      return;
    }

    try {
      // Get auth token for Supabase storage access
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token 
        ? { 'Authorization': `Bearer ${session.access_token}` }
        : {};

      // TODO: Implement PDF.js document loading when pdfjs-dist is available
      // const response = await fetch(url, { headers: authHeaders });
      // if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      // 
      // const arrayBuffer = await response.arrayBuffer();
      // const pdfjsLib = await import('pdfjs-dist');
      // const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      // pdfDocumentRef.current = pdf;

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockPdf = {
        numPages: 10,
        getPage: async (pageNum: number) => ({
          getViewport: (options: any) => ({
            width: 612,
            height: 792,
            ...options
          }),
          render: () => ({ promise: Promise.resolve() })
        }),
        cleanup: () => console.log('📋 Mock PDF cleanup')
      };

      pdfDocumentRef.current = mockPdf as any;

      setState(prev => ({
        ...prev,
        isLoaded: true,
        totalPages: mockPdf.numPages,
        currentPage: 1,
        isLoading: false,
      }));

      // Render first page
      await renderPage(1);

    } catch (error) {
      console.error('❌ PDF load error:', error);
      let errorMessage = 'Failed to load PDF';
      
      if (error instanceof Error) {
        if (error.message.includes('PasswordException')) {
          errorMessage = 'This PDF is password-protected.';
        } else if (error.message.includes('InvalidPDFException')) {
          errorMessage = 'The file is corrupted or unsupported.';
        } else if (error.message.includes('MissingPDFException')) {
          errorMessage = "We couldn't download this file. Try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isLoaded: false,
        totalPages: 0,
        currentPage: 1,
      }));
    }
  }, [renderPage]);

  const goToPage = useCallback((pageNumber: number) => {
    if (!state.isLoaded || pageNumber < 1 || pageNumber > state.totalPages) {
      return;
    }
    
    console.log('📄 Navigating to page:', pageNumber);
    evictFromCache();
    renderPage(pageNumber);
  }, [state.isLoaded, state.totalPages, renderPage, evictFromCache]);

  const setScale = useCallback((scale: number) => {
    if (scale < 0.5 || scale > 2.0) return;
    
    console.log('🔍 Setting scale:', scale);
    setState(prev => ({ ...prev, scale }));
    
    if (state.isLoaded && state.currentPage) {
      renderPage(state.currentPage);
    }
  }, [state.isLoaded, state.currentPage, renderPage]);

  const toggleLayer = useCallback((layer: 'original' | 'translated') => {
    console.log('🔄 Toggling layer:', layer);
    setState(prev => ({ ...prev, layer }));
    
    // TODO: Implement layer toggling for translated content overlay
    // This would render translated text overlay on top of original content
  }, []);

  const dispose = useCallback(() => {
    console.log('🧹 Disposing PDF viewer resources');
    
    if (pdfDocumentRef.current) {
      // TODO: Call pdf.cleanup() when pdfjs-dist is available
      // pdfDocumentRef.current.cleanup();
      pdfDocumentRef.current = null;
    }
    
    pdfCache.current.clear();
    
    setState({
      isLoaded: false,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      layer: 'original',
      isLoading: false,
      error: null,
    });

    setMetrics({
      firstPageRenderMs: 0,
      pageRenderMs: 0,
      dpi: window.devicePixelRatio || 1,
      scale: 1.0,
      cacheSize: 0,
      evictions: 0,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    state,
    metrics,
    canvasRef,
    load,
    goToPage,
    setScale,
    toggleLayer,
    dispose
  };
}