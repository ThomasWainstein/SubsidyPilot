import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentProcessingPipelineProps {
  className?: string;
}

interface ProcessingStats {
  totalSubsidies: number;
  documentsFound: number;
  documentsDownloaded: number;
  schemasGenerated: number;
  errors: string[];
}

const DocumentProcessingPipeline: React.FC<DocumentProcessingPipelineProps> = ({ className }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const startFullPipeline = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      toast({
        title: "Starting Complete Document Pipeline",
        description: "Processing all subsidies for document download and schema generation..."
      });

      // Step 1: Download all documents
      setProgress(20);
      const { data: downloadResult, error: downloadError } = await supabase.functions.invoke(
        'process-subsidy-documents',
        {
          body: { 
            action: 'download_all',
            forceReprocess: true
          }
        }
      );

      if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

      // Step 2: Extract schemas from documents  
      setProgress(50);
      const { data: schemaResult, error: schemaError } = await supabase.functions.invoke(
        'extract-document-schemas',
        {
          body: { 
            action: 'extract_all_schemas',
            formats: ['pdf', 'docx', 'xlsx']
          }
        }
      );

      if (schemaError) throw new Error(`Schema extraction failed: ${schemaError.message}`);

      // Step 3: Generate form schemas
      setProgress(80);
      const { data: formResult, error: formError } = await supabase.functions.invoke(
        'generate-form-schemas', 
        {
          body: {
            action: 'generate_all',
            outputFormat: 'json'
          }
        }
      );

      if (formError) throw new Error(`Form generation failed: ${formError.message}`);

      setProgress(100);
      
      const finalStats: ProcessingStats = {
        totalSubsidies: downloadResult?.totalSubsidies || 0,
        documentsFound: downloadResult?.documentsFound || 0,
        documentsDownloaded: downloadResult?.documentsDownloaded || 0,
        schemasGenerated: formResult?.schemasGenerated || 0,
        errors: [
          ...(downloadResult?.errors || []),
          ...(schemaResult?.errors || []),
          ...(formResult?.errors || [])
        ]
      };

      setStats(finalStats);

      toast({
        title: "Pipeline Complete",
        description: `Processed ${finalStats.totalSubsidies} subsidies, downloaded ${finalStats.documentsDownloaded} documents, generated ${finalStats.schemasGenerated} schemas`
      });

    } catch (error) {
      console.error('Pipeline error:', error);
      toast({
        title: "Pipeline Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testSingleSubsidy = async () => {
    try {
      toast({
        title: "Testing Single Subsidy",
        description: "Running pipeline on one subsidy for validation..."
      });

      const { data: testResult, error } = await supabase.functions.invoke(
        'test-document-pipeline',
        {
          body: { 
            subsidyUrl: 'https://www.franceagrimer.fr/aides/aide-la-plantation-de-vergers-de-fruits-cidre-campagne-20232024',
            fullPipeline: true
          }
        }
      );

      if (error) throw new Error(error.message);

      toast({
        title: "Test Complete",
        description: `Downloaded ${testResult.documentsProcessed} documents, extracted ${testResult.fieldsFound} fields`
      });

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Document Processing Pipeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete pipeline: Download documents → Extract schemas → Generate forms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={startFullPipeline}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Run Full Pipeline'}
          </Button>
          <Button 
            variant="outline"
            onClick={testSingleSubsidy}
            disabled={isProcessing}
          >
            Test Single
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
        {stats && (
          <div className="space-y-3">
            <h4 className="font-medium">Pipeline Results:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Subsidies: <Badge variant="secondary">{stats.totalSubsidies}</Badge></div>
              <div>Documents Found: <Badge variant="secondary">{stats.documentsFound}</Badge></div>
              <div>Documents Downloaded: <Badge variant="secondary">{stats.documentsDownloaded}</Badge></div>
              <div>Schemas Generated: <Badge variant="secondary">{stats.schemasGenerated}</Badge></div>
            </div>
            
            {stats.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-destructive">Errors ({stats.errors.length}):</h5>
                <ul className="text-xs text-destructive space-y-1">
                  {stats.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {stats.errors.length > 5 && (
                    <li>• ... and {stats.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p><strong>Pipeline Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Download all linked documents from subsidies</li>
            <li>Extract text and structure from PDFs/DOCXs/XLSXs</li>
            <li>Generate JSON schemas for application forms</li>
            <li>Store schemas in subsidy_form_schemas table</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentProcessingPipeline;