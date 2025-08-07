import { useEffect, useRef, useCallback } from 'react';

interface CleanupHookReturn {
  addCleanup: (cleanup: () => void) => void;
  addInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  addTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  cleanup: () => void;
}

/**
 * Hook for managing cleanup operations to prevent memory leaks
 * Automatically cleans up on component unmount
 */
export const useCleanup = (): CleanupHookReturn => {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const addInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const id = setInterval(callback, delay);
    intervals.current.add(id);
    
    // Auto-cleanup function
    addCleanup(() => {
      clearInterval(id);
      intervals.current.delete(id);
    });
    
    return id;
  }, [addCleanup]);

  const addTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      callback();
      timeouts.current.delete(id);
    }, delay);
    
    timeouts.current.add(id);
    
    // Auto-cleanup function
    addCleanup(() => {
      clearTimeout(id);
      timeouts.current.delete(id);
    });
    
    return id;
  }, [addCleanup]);

  const cleanup = useCallback(() => {
    // Clear all intervals
    intervals.current.forEach(id => clearInterval(id));
    intervals.current.clear();
    
    // Clear all timeouts
    timeouts.current.forEach(id => clearTimeout(id));
    timeouts.current.clear();
    
    // Run all cleanup functions
    cleanupFunctions.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupFunctions.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    addCleanup,
    addInterval,
    addTimeout,
    cleanup
  };
};

/**
 * Hook specifically for managing intervals with proper cleanup
 */
export const useInterval = (callback: () => void, delay: number | null, deps?: React.DependencyList) => {
  const { addInterval } = useCleanup();
  const savedCallback = useRef<() => void>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay !== null) {
      const id = addInterval(() => {
        savedCallback.current?.();
      }, delay);
      
      return () => clearInterval(id);
    }
  }, [delay, addInterval, ...(deps || [])]);
};

/**
 * Hook for managing async operations with cleanup
 */
export const useAsyncCleanup = () => {
  const abortControllers = useRef<Set<AbortController>>(new Set());
  const { addCleanup } = useCleanup();

  const createAbortableRequest = useCallback(<T>(
    requestFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> => {
    const controller = new AbortController();
    abortControllers.current.add(controller);

    const cleanup = () => {
      controller.abort();
      abortControllers.current.delete(controller);
    };

    addCleanup(cleanup);

    return requestFn(controller.signal).finally(() => {
      abortControllers.current.delete(controller);
    });
  }, [addCleanup]);

  const abortAllRequests = useCallback(() => {
    abortControllers.current.forEach(controller => {
      controller.abort();
    });
    abortControllers.current.clear();
  }, []);

  return {
    createAbortableRequest,
    abortAllRequests
  };
};