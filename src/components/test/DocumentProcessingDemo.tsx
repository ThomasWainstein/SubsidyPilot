import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentProcessingDemoProps {
  className?: string;
}

const DocumentProcessingDemo: React.FC<DocumentProcessingDemoProps> = ({ className }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const testDocumentProcessing = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResults(null);
    
    try {
      console.log('🚀 Starting document processing test...');
      
      toast({
        title: "Testing Document Processing",
        description: "Processing documents from subsidies database..."
      });

      setProgress(30);
      
      // Call the document processing function
      const { data, error } = await supabase.functions.invoke('process-subsidy-documents', {
        body: { 
          action: 'download_all',
          forceReprocess: true
        }
      });

      setProgress(70);

      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      console.log('✅ Document processing completed:', data);
      
      setProgress(100);
      setResults(data);

      toast({
        title: "Processing Complete",
        description: `Processed ${data?.totalSubsidies || 0} subsidies with ${data?.documentsFound || 0} documents`
      });

    } catch (error) {
      console.error('❌ Document processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
      setResults({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('document_extraction_status' as any)
        .select('*')
        .limit(5);
        
      console.log('Database check result:', { data, error });
      
      if (error) {
        toast({
          title: "Database Check",
          description: `Query error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Database Status",
          description: `Found ${data?.length || 0} extraction status records`
        });
        setResults({ dbCheck: data || [] });
      }
    } catch (error) {
      console.error('Database check error:', error);
      toast({
        title: "Database Check Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>🔧 Document Processing Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test document download and processing pipeline
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={testDocumentProcessing}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Test Pipeline'}
          </Button>
          <Button 
            variant="outline"
            onClick={checkDatabaseStatus}
            disabled={isProcessing}
          >
            Check DB Status
          </Button>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            
            {results.error ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                <strong>Error:</strong> {results.error}
              </div>
            ) : results.dbCheck ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <strong>Database Status:</strong> {results.dbCheck.length} records found
                {results.dbCheck.length > 0 && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(results.dbCheck[0], null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Total Subsidies: <Badge variant="secondary">{results.totalSubsidies || 0}</Badge></div>
                <div>Documents Found: <Badge variant="secondary">{results.documentsFound || 0}</Badge></div>
                <div>Documents Processed: <Badge variant="secondary">{results.documentsDownloaded || 0}</Badge></div>
                <div>Errors: <Badge variant="secondary">{results.errors?.length || 0}</Badge></div>
              </div>
            )}
            
            {results.errors && results.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-destructive">Errors:</h5>
                <ul className="text-xs text-destructive space-y-1">
                  {results.errors.slice(0, 3).map((error: string, i: number) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Console Log Section */}
            <div className="mt-4">
              <h5 className="font-medium text-sm">Console Output:</h5>
              <div className="text-xs bg-gray-100 p-2 rounded font-mono">
                Check browser console for detailed processing logs
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentProcessingDemo;