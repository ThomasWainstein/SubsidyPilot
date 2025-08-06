import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExtractionResult {
  title: string;
  url: string;
  documents_found: number;
  sections_extracted: string[];
}

interface ApiResponse {
  success: boolean;
  subsidies_processed: number;
  total_documents_extracted: number;
  processed_results: ExtractionResult[];
  verbatim_extraction: boolean;
  error?: string;
}

export const VerbatimExtractionTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerVerbatimExtraction = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      console.log('🚀 Triggering enhanced verbatim extraction...');
      
      const response = await fetch(
        'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/ai-content-processor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.w4v6J_4Zt5FqJ-yJfL6_7tQ_HFLyY6Ev4pR4YGrwAm8`
          },
          body: JSON.stringify({
            source: 'franceagrimer',
            page_ids: ['1f0b1368-83ac-4a9e-99e2-138d535bae70'], // FCO page ID
            quality_threshold: 0.1,
            session_id: 'verbatim-test-' + Date.now()
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      console.log('✅ Extraction completed:', data);

      setResults(data);

      if (data.success && data.subsidies_processed > 0) {
        toast.success(`🎉 Successfully extracted ${data.subsidies_processed} subsidies with ${data.total_documents_extracted} documents!`);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        toast.warning('⚠️ Extraction completed but no subsidies were processed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Extraction failed:', errorMessage);
      setError(errorMessage);
      toast.error(`❌ Extraction failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhanced Verbatim French Content Extractor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the enhanced extraction system to get authentic French government content and documents
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={triggerVerbatimExtraction}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting Verbatim Content...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Extract FCO Subsidy (Verbatim)
                </>
              )}
            </Button>
            
            <Badge variant="outline" className="text-xs">
              Target: Fièvre Catarrhale Ovine (dispositif d'avance)
            </Badge>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Extraction Error:</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {results.subsidies_processed}
                    </div>
                    <p className="text-sm text-muted-foreground">Subsidies Processed</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.total_documents_extracted}
                    </div>
                    <p className="text-sm text-muted-foreground">Documents Found</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.verbatim_extraction ? 'YES' : 'NO'}
                    </div>
                    <p className="text-sm text-muted-foreground">Verbatim Extraction</p>
                  </CardContent>
                </Card>
              </div>

              {results.processed_results && results.processed_results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Extracted Content Results:</h3>
                  {results.processed_results.map((result, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium text-sm">Title:</h4>
                            <p className="text-sm bg-muted p-2 rounded">{result.title}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>📄 {result.documents_found} documents</span>
                            <span>📝 {result.sections_extracted.length} sections</span>
                          </div>
                          
                          {result.sections_extracted.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {result.sections_extracted.map((section, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-muted-foreground">URL:</p>
                            <p className="text-xs font-mono bg-muted p-1 rounded">{result.url}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerbatimExtractionTest;