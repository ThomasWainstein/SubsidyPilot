import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCcw, Download, X } from 'lucide-react';

/**
 * Service Worker Provider with update notifications and offline status
 */
export const ServiceWorkerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const handleUpdate = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      console.log('PWA install result:', result);
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {children}
      
      {/* Update Available Notification */}
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="max-w-sm">
            <RefreshCcw className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>New update available!</span>
              <div className="flex gap-2 ml-2">
                <Button size="sm" onClick={handleUpdate}>
                  Update
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setUpdateAvailable(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Offline Status */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm">
          You're offline. Some features may not be available.
        </div>
      )}

      {/* PWA Install Prompt */}
      {installPrompt && (
        <div className="fixed bottom-4 left-4 z-50">
          <Alert className="max-w-sm">
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Install AgriTool app?</span>
              <div className="flex gap-2 ml-2">
                <Button size="sm" onClick={handleInstallApp}>
                  Install
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setInstallPrompt(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};