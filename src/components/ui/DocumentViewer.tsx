import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Search,
  Languages,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { usePdfViewer } from '@/hooks/usePdfViewer';

interface DocumentViewerProps {
  documentUrl?: string;
  documentId: string;
  className?: string;
  enableFeatures?: {
    translation?: boolean;
    search?: boolean;
    download?: boolean;
    thumbnails?: boolean;
  };
}

// Feature flag check
const ENABLE_PDF_VIEWER = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PDF_VIEWER === 'true';

export function DocumentViewer({ 
  documentUrl, 
  documentId, 
  className,
  enableFeatures = {
    translation: true,
    search: true,
    download: true,
    thumbnails: true
  }
}: DocumentViewerProps) {
  const { state, metrics, canvasRef, load, goToPage, setScale, toggleLayer, dispose } = usePdfViewer();

  // Early return if feature is disabled
  if (!ENABLE_PDF_VIEWER) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">PDF Viewer Coming Soon</h3>
              <p className="text-muted-foreground">
                Advanced PDF viewing features are being developed in Phase F
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📋 TODO Phase F Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Streaming PDF.js rendering with memory optimization</li>
                <li>Original/Translated layer toggle with OCR overlay</li>
                <li>Thumbnail navigation for quick page jumping</li>
                <li>Text search across document content</li>
                <li>Responsive zoom and pan controls</li>
                <li>Accessibility features for screen readers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    if (documentUrl) {
      load(documentUrl);
    }
    
    return () => {
      dispose();
    };
  }, [documentUrl, load, dispose]);

  const handlePrevPage = () => {
    if (state.currentPage > 1) {
      goToPage(state.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (state.currentPage < state.totalPages) {
      goToPage(state.currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(state.scale * 1.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(state.scale / 1.2, 0.5));
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
  };

  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      {/* Header Controls */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <span>Document Viewer</span>
            {state.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {state.error && <AlertCircle className="w-4 h-4 text-destructive" />}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Layer Toggle */}
            {enableFeatures.translation && (
              <div className="flex items-center space-x-1">
                <Button
                  variant={state.layer === 'original' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleLayer('original')}
                >
                  Original
                </Button>
                <Button
                  variant={state.layer === 'translated' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleLayer('translated')}
                  disabled // TODO Phase F: Enable when translation is ready
                >
                  <Languages className="w-3 h-3 mr-1" />
                  Translated
                </Button>
              </div>
            )}
            
            {/* Download */}
            {enableFeatures.download && (
              <Button variant="outline" size="sm" disabled>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        {state.isLoaded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={state.currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Badge variant="outline">
                {state.currentPage} / {state.totalPages}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={state.currentPage >= state.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={state.scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <div className="w-24">
                <Slider
                  value={[state.scale]}
                  onValueChange={handleScaleChange}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={state.scale >= 3.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Badge variant="secondary" className="text-xs">
                {Math.round(state.scale * 100)}%
              </Badge>
            </div>
            
            {/* Search */}
            {enableFeatures.search && (
              <Button variant="outline" size="sm" disabled>
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      {/* Main Viewer */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        {state.error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-destructive font-medium">Failed to load document</p>
              <p className="text-sm text-muted-foreground">{state.error}</p>
            </div>
          </div>
        ) : state.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </div>
        ) : state.isLoaded ? (
          <div className="flex h-full">
            {/* Thumbnails Sidebar */}
            {enableFeatures.thumbnails && (
              <div className="w-48 border-r bg-muted/30 p-2 overflow-y-auto">
                <div className="space-y-2">
                  {/* TODO Phase F: Implement thumbnail generation */}
                  {Array.from({ length: state.totalPages }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "aspect-[3/4] border rounded cursor-pointer bg-background",
                        "hover:border-primary transition-colors",
                        state.currentPage === i + 1 && "border-primary bg-primary/5"
                      )}
                      onClick={() => goToPage(i + 1)}
                    >
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Page {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Main Canvas */}
            <div className="flex-1 overflow-auto bg-muted/20">
              <div className="flex justify-center p-4">
                <canvas
                  ref={canvasRef}
                  className="border border-muted shadow-sm bg-white"
                  style={{
                    transform: `scale(${state.scale})`,
                    transformOrigin: 'top center'
                  }}
                  role="img"
                  aria-label={`Page ${state.currentPage} of ${state.totalPages}`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto border-2 border-dashed border-muted-foreground/50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-muted-foreground">No document loaded</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}