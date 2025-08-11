import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface DocumentViewerProps {
  documentUrl: string;
  currentSection?: string;
  highlightMappings?: Record<string, Array<{ page: number; coordinates: [number, number, number, number] }>>;
  extractedData?: Record<string, any>;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  currentSection,
  highlightMappings = {},
  extractedData = {}
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'processed'>('original');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize viewer
  useEffect(() => {
    setIsLoading(false);
    if (documentUrl.endsWith('.pdf')) {
      setTotalPages(1); // Default to 1 page for PDF placeholder
    }
  }, [documentUrl]);

  // Placeholder render function - to be replaced with actual PDF.js integration
  const renderPlaceholder = () => {
    return (
      <div className="w-96 h-[500px] bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <div className="font-medium">PDF Preview</div>
          <div className="text-sm mt-2">Page {currentPage} of {totalPages}</div>
          <div className="text-xs mt-2">PDF.js integration in progress</div>
        </div>
      </div>
    );
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  const renderExtractedFields = () => {
    const fields = Object.entries(extractedData || {});
    if (fields.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No extracted data available
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {fields.map(([key, value]) => (
          <div key={key} className="p-3 bg-primary/5 rounded">
            <div className="font-medium capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div className="text-muted-foreground mt-1">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Document Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {documentUrl.split('.').pop()?.toUpperCase() || 'DOC'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {zoom}% zoom
          </span>
          {totalPages > 1 && (
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {totalPages > 1 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Loading Progress */}
      {isLoading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading document...
          </div>
          <Progress value={loadingProgress} className="w-full" />
        </div>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Original Document
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Extracted Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="mt-4">
          <div className="bg-muted rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            {documentUrl.endsWith('.pdf') ? (
              renderPlaceholder()
            ) : (
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <div className="text-muted-foreground">
                  Preview not available for this file type
                </div>
                <Button variant="outline" className="mt-4" asChild>
                  <a href={documentUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <div className="bg-muted rounded-lg p-4 min-h-[400px]">
            <div className="bg-white p-6 rounded shadow">
              <h4 className="font-medium mb-4">Extracted Information</h4>
              {renderExtractedFields()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Section Mapping */}
      {currentSection && highlightMappings[currentSection] && (
        <div className="bg-primary/5 rounded-lg p-3">
          <div className="text-sm font-medium">Current Section Mapping</div>
          <div className="text-xs text-muted-foreground mt-1">
            This form section corresponds to highlighted areas in the original document
          </div>
        </div>
      )}
    </div>
  );
};