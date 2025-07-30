import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  FileText,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    file_name: string;
    file_url: string;
    mime_type?: string;
  } | null;
}

const DocumentPreviewModal = ({ isOpen, onClose, document }: DocumentPreviewModalProps) => {
  const [zoom, setZoom] = useState(100);

  if (!document) return null;

  const isImage = document.mime_type?.startsWith('image/');
  const isPDF = document.mime_type === 'application/pdf';
  const isDocx = document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const renderPreview = () => {
    if (isImage) {
      return (
        <div className="flex justify-center items-center h-full p-4">
          <img 
            src={document.file_url} 
            alt={document.file_name}
            style={{ transform: `scale(${zoom / 100})`, maxWidth: '100%', maxHeight: '100%' }}
            className="object-contain"
          />
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="h-full">
          <iframe
            src={document.file_url}
            className="w-full h-full border-0"
            title={document.file_name}
          />
        </div>
      );
    }

    if (isDocx) {
      return (
        <Card className="h-full">
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">DOCX Preview</h3>
            <p className="text-muted-foreground mb-4">
              DOCX files can't be previewed directly. Click "Open Original" to view in a new tab.
            </p>
            <Button onClick={() => window.open(document.file_url, '_blank')}>
              <FileText className="h-4 w-4 mr-2" />
              Open Original Document
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="h-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
          <p className="text-muted-foreground mb-4">
            This file type cannot be previewed. Click "Download" to view the file.
          </p>
          <Button onClick={() => window.open(document.file_url, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              {document.file_name}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[50px] text-center">{zoom}%</span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
                <Download className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;