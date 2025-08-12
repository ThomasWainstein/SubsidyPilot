import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Feature flags - use standardized config
import { FEATURES } from '@/config/environment';
const ENABLE_PDF_VIEWER = FEATURES.DEBUG_LOGGING;

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
  const lastRenderTaskRef = useRef<any | null>(null);
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
    if (!pdfDocumentRef.current || !canvasRef.current || !ENABLE_PDF_VIEWER) return;

    // cancel any in-flight render
    lastRenderTaskRef.current?.cancel();

    const intended = pageNumber;                 // race guard
    setState(p => ({ ...p, isLoading: true, error: null }));

    const page = await pdfDocumentRef.current.getPage(pageNumber);

    // HiDPI: use outputScale + transform for crisper rendering
    const outputScale = metrics.dpi;             // window.devicePixelRatio already in your metrics
    const viewport = page.getViewport({ scale: state.scale });

    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as CanvasRenderingContext2D;
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Physical backing store in device pixels
    const w = Math.floor(viewport.width  * outputScale);
    const h = Math.floor(viewport.height * outputScale);
    canvas.width = w;
    canvas.height = h;

    // CSS size in logical pixels
    canvas.style.width  = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Page ${pageNumber} of ${state.totalPages}`);

    // Use transform instead of scaling the viewport (avoids layout drift)
    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
      transform: [outputScale, 0, 0, outputScale, 0, 0],
    });
    lastRenderTaskRef.current = renderTask;

    try {
      await renderTask.promise;
      if (intended !== pageNumber) return;       // late completion, ignore
      setState(p => ({ ...p, currentPage: pageNumber, isLoading: false }));
    } catch (e: any) {
      if (e?.name === 'RenderingCancelledException') return;
      setState(p => ({ ...p, isLoading: false, error: e?.message || 'Failed to render page' }));
    } finally {
      lastRenderTaskRef.current = null;
      page.cleanup();
    }
  }, [state.scale, state.totalPages, metrics.dpi]);

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
    
    // Cancel any in-flight render task
    lastRenderTaskRef.current?.cancel();
    lastRenderTaskRef.current = null;
    
    if (pdfDocumentRef.current) {
      // Call PDF.js cleanup methods
      try {
        pdfDocumentRef.current.cleanup?.();
        pdfDocumentRef.current.destroy?.();
      } catch (e) {
        console.warn('PDF cleanup warning:', e);
      }
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

  // Re-render on DPR changes (moving between monitors)
  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => {
      setMetrics(m => ({ ...m, dpi: window.devicePixelRatio || 1 }));
      // re-render current page if loaded
      if (state.isLoaded && state.currentPage) void renderPage(state.currentPage);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [state.isLoaded, state.currentPage, renderPage]);

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