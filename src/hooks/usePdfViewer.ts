import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Feature flags - enable in development only
const ENABLE_PDF_VIEWER = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PDF_VIEWER === 'true';

// PDF.js types (will be properly typed when available)
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

  const pdfjs = useRef<any>(null);
  const pdfDocumentRef = useRef<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCache = useRef<Map<number, ImageData>>(new Map());
  const maxCacheSize = 5;

  useEffect(() => {
    if (ENABLE_PDF_VIEWER && !pdfjs.current) {
      // Try to load PDF.js dynamically (graceful fallback if not available)
      const loadPdfJs = async () => {
        try {
          // Dynamic import using variable to avoid TypeScript module resolution
          const pdfJsPath = 'pdfjs-dist/build/pdf';
          const pdfjsLib = await import(pdfJsPath);
          pdfjs.current = pdfjsLib;
          
          // Try to set up worker
          try {
            const workerPath = 'pdfjs-dist/build/pdf.worker.min.js?worker';
            const workerModule = await import(workerPath);
            pdfjsLib.GlobalWorkerOptions.workerPort = new workerModule.default();
          } catch (workerError) {
            console.log('📋 PDF.js worker not available, using CDN fallback');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          
          console.log('📋 PDF.js loaded successfully');
        } catch (error) {
          console.log('📋 PDF.js not available - using mock mode');
        }
      };
      
      loadPdfJs();
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

    const start = performance.now();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const page: any = await pdfDocumentRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: state.scale * metrics.dpi });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / metrics.dpi}px`;
      canvas.style.height = `${viewport.height / metrics.dpi}px`;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `Page ${pageNumber} of ${state.totalPages}`);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const elapsed = performance.now() - start;
      const first = pageNumber === 1 && metrics.firstPageRenderMs === 0;
      setMetrics(prev => ({
        ...prev,
        pageRenderMs: elapsed,
        firstPageRenderMs: first ? elapsed : prev.firstPageRenderMs,
        scale: state.scale,
        cacheSize: pdfCache.current.size,
      }));

      setState(prev => ({ ...prev, currentPage: pageNumber, isLoading: false }));
      
      console.log(`📄 Rendered page ${pageNumber} in ${elapsed.toFixed(2)}ms`);
      
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
  }, [state.scale, state.totalPages, metrics.dpi, metrics.firstPageRenderMs]);

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
      const headers: Record<string, string> = session?.access_token 
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
      const buf = await res.arrayBuffer();

      // Use PDF.js if available, otherwise fallback to mock
      let pdf: any;
      if (pdfjs.current) {
        const loadingTask = pdfjs.current.getDocument({ data: buf });
        pdf = await loadingTask.promise;
      } else {
        // Mock fallback for when PDF.js isn't available
        pdf = {
          numPages: 10,
          getPage: async (pageNum: number) => ({
            getViewport: (options: any) => ({ width: 612, height: 792, ...options }),
            render: () => ({ promise: Promise.resolve() })
          })
        };
      }
      
      pdfDocumentRef.current = pdf;

      setState(prev => ({
        ...prev,
        isLoaded: true,
        totalPages: pdf.numPages,
        currentPage: 1,
        isLoading: false,
      }));

      // Render first page
      await renderPage(1);

    } catch (err: any) {
      console.error('❌ PDF load error:', err);
      const msg = 
        /PasswordException/i.test(err?.message) ? 'This PDF is password-protected.' :
        /InvalidPDFException/i.test(err?.message) ? 'The file is corrupted or unsupported.' :
        /MissingPDFException/i.test(err?.message) ? "We couldn't download this file. Try again." :
        err?.message || 'Failed to load PDF';

      setState(prev => ({
        ...prev,
        isLoaded: false,
        isLoading: false,
        error: msg,
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