// 🚀 PERFORMANCE: Dynamic import utilities to reduce initial bundle size

// Lazy load heavy document processing libraries
export const importMammoth = () => import('mammoth');
export const importPdfParse = () => import('pdf-parse');
export const importXlsx = () => import('xlsx');

// Lazy load recharts when needed
export const importRecharts = () => import('recharts');

// Lazy load heavy UI components
export const importChart = () => import('@/components/ui/chart');

// Dynamic import wrapper with error handling
export const dynamicImport = async <T>(
  importFn: () => Promise<any>,
  fallback?: T
): Promise<T> => {
  try {
    const module = await importFn();
    return module.default || module;
  } catch (error) {
    console.warn('Failed to dynamically import module:', error);
    if (fallback) return fallback;
    throw error;
  }
};

// Preload critical chunks when idle
export const preloadCriticalChunks = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload dashboard components when the browser is idle
      import('@/pages/DashboardPage');
      import('@/components/FarmCard');
    });
  }
};