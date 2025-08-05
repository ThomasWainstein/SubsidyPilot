import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye,
  FileText
} from 'lucide-react';

interface DocumentViewerProps {
  documentUrl: string;
  currentSection?: string;
  highlightMappings?: Record<string, Array<{ page: number; coordinates: [number, number, number, number] }>>;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  currentSection,
  highlightMappings = {}
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'processed'>('original');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="space-y-4">
      {/* Document Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            PDF
          </Badge>
          <span className="text-sm text-muted-foreground">
            {zoom}% zoom
          </span>
        </div>
        
        <div className="flex items-center gap-1">
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

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Original PDF
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Processed View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="mt-4">
          <div className="bg-muted rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            {/* PDF Viewer Component */}
            <div 
              className="bg-white shadow-lg rounded"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            >
              {/* Placeholder for PDF viewer */}
              <div className="w-96 h-[500px] bg-white border flex items-center justify-center text-muted-foreground">
                PDF Document Viewer
                <br />
                <span className="text-sm">
                  {documentUrl}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <div className="bg-muted rounded-lg p-4 min-h-[400px]">
            <div className="bg-white p-6 rounded shadow">
              <h4 className="font-medium mb-4">Extracted Form Structure</h4>
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-primary/5 rounded">
                  <div className="font-medium">Section 1: Personal Information</div>
                  <div className="text-muted-foreground mt-1">
                    Fields: Name, Address, Contact Details
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded">
                  <div className="font-medium">Section 2: Farm Details</div>
                  <div className="text-muted-foreground mt-1">
                    Fields: Farm Size, Crop Types, Location
                  </div>
                </div>
                <div className="p-3 bg-primary/5 rounded">
                  <div className="font-medium">Section 3: Financial Information</div>
                  <div className="text-muted-foreground mt-1">
                    Fields: Revenue, Investment Amount, Co-financing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Section Mapping */}
      {currentSection && highlightMappings[currentSection] && (
        <div className="bg-primary/5 rounded-lg p-3">
          <div className="text-sm font-medium">Current Section Mapping</div>
          <div className="text-xs text-muted-foreground mt-1">
            This form section corresponds to highlighted areas in the original PDF
          </div>
        </div>
      )}
    </div>
  );
};