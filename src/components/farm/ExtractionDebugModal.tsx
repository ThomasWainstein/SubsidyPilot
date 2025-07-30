import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Copy, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/components/ui/use-toast';

interface ExtractionDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  extraction: any;
  documentName: string;
}

const ExtractionDebugModal = ({ 
  isOpen, 
  onClose, 
  extraction, 
  documentName 
}: ExtractionDebugModalProps) => {
  const { t } = useLanguage();

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    });
  };

  const handleDownloadDebugInfo = () => {
    const debugData = {
      document: documentName,
      timestamp: new Date().toISOString(),
      extraction: extraction,
      extractedData: extraction.extracted_data,
      debugInfo: extraction.debug_info || extraction.extracted_data?.debugInfo || {},
      rawResponse: extraction.extracted_data?.rawResponse || ''
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-debug-${documentName}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Debug data downloaded",
      description: "Full extraction debug information saved to file",
    });
  };

  // Use the new debug_info column, with fallback to embedded debugInfo
  const debugInfo = extraction?.debug_info || extraction?.extracted_data?.debugInfo || {};
  const extractedFields = Object.keys(extraction?.extracted_data?.extractedFields || {});
  const confidence = extraction?.confidence_score || 0;
  const rawText = debugInfo.rawText || 'No raw text available';
  const rawResponse = extraction?.extracted_data?.rawResponse || 'No OpenAI response available';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Extraction Debug: {documentName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant={confidence > 0.5 ? "default" : "secondary"}>
              {Math.round(confidence * 100)}% Confidence
            </Badge>
            <Badge variant="outline">
              {extractedFields.length} Fields Extracted
            </Badge>
            <Button
              onClick={handleDownloadDebugInfo}
              size="sm"
              variant="outline"
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Debug Data
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
            <TabsTrigger value="raw-text">Raw Text</TabsTrigger>
            <TabsTrigger value="ai-response">AI Response</TabsTrigger>
            <TabsTrigger value="debug">Debug Info</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Extraction Status</h4>
                <div className="flex items-center gap-2">
                  {extraction.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="capitalize">{extraction.status}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Processing Details</h4>
                <div className="text-sm space-y-1">
                  <div>Method: {debugInfo.extractionMethod || 'Unknown'}</div>
                  <div>Language: {debugInfo.detectedLanguage || 'Auto-detected'}</div>
                  <div>Processing Time: {debugInfo.extractionTime || 0}ms</div>
                </div>
              </div>
            </div>

            {extraction.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
                <p className="text-red-700">{extraction.error_message}</p>
              </div>
            )}

            {debugInfo.warnings?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2">Warnings</h4>
                <ul className="text-orange-700 space-y-1">
                  {debugInfo.warnings.map((warning: string, index: number) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="extracted" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Extracted Farm Data</h4>
              <Button
                onClick={() => handleCopyToClipboard(
                  JSON.stringify(extraction.extracted_data, null, 2),
                  'Extracted data'
                )}
                size="sm"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
            </div>
            
            <ScrollArea className="h-96 border rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(extraction.extracted_data, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw-text" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Raw Extracted Text</h4>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {rawText.length} characters
                </Badge>
                <Button
                  onClick={() => handleCopyToClipboard(rawText, 'Raw text')}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-96 border rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {rawText}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai-response" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">OpenAI Raw Response</h4>
              <Button
                onClick={() => handleCopyToClipboard(rawResponse, 'AI response')}
                size="sm"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Response
              </Button>
            </div>
            
            <ScrollArea className="h-96 border rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {rawResponse}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Full Debug Information</h4>
              <Button
                onClick={() => handleCopyToClipboard(
                  JSON.stringify(debugInfo, null, 2),
                  'Debug info'
                )}
                size="sm"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Debug
              </Button>
            </div>
            
            <ScrollArea className="h-96 border rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractionDebugModal;