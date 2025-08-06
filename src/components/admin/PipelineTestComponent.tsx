import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const PipelineTestComponent = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const runCompletePipeline = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      // Step 1: Trigger FranceAgriMer harvester
      setCurrentStep('Starting FranceAgriMer harvester...');
      toast.info('Starting FranceAgriMer data harvest');
      
      const { data: harvestData, error: harvestError } = await supabase.functions.invoke('franceagrimer-harvester', {
        body: {
          action: 'scrape',
          max_pages: 5,
          force_reprocess: true
        }
      });

      if (harvestError) {
        throw new Error(`Harvest failed: ${harvestError.message}`);
      }

      console.log('✅ FranceAgriMer harvest completed:', harvestData);
      setCurrentStep('Harvest completed. Processing extracted data...');
      
      // Step 2: Check what was scraped
      const { data: scrapedPages } = await supabase
        .from('raw_scraped_pages')
        .select('id, source_url, status, attachment_count')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('📄 Scraped pages:', scrapedPages);

      // Step 3: Trigger enhanced extraction on a sample page
      if (scrapedPages && scrapedPages.length > 0) {
        const samplePage = scrapedPages[0];
        setCurrentStep(`Testing enhanced extraction on: ${samplePage.source_url}`);
        
        const { data: extractionData, error: extractionError } = await supabase.functions.invoke('enhanced-franceagrimer-extraction', {
          body: {
            url: samplePage.source_url,
            forceReprocess: true
          }
        });

        if (extractionError) {
          console.warn('Enhanced extraction warning:', extractionError);
        } else {
          console.log('✅ Enhanced extraction completed:', extractionData);
        }
      }

      // Step 4: Get final results
      setCurrentStep('Collecting final results...');
      
      const { data: finalSubsidies } = await supabase
        .from('subsidies_structured')
        .select(`
          id, title, url, agency, description, eligibility, 
          application_method, documents, amount, deadline,
          audit, missing_fields, created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setResults({
        scraped_pages: scrapedPages?.length || 0,
        processed_subsidies: finalSubsidies?.length || 0,
        sample_subsidies: finalSubsidies || [],
        harvest_data: harvestData,
        completion_time: new Date().toISOString()
      });

      setCurrentStep('Pipeline completed successfully!');
      toast.success(`Pipeline completed! Found ${finalSubsidies?.length || 0} subsidies`);

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(`Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Enhanced Pipeline Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={runCompletePipeline}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running Pipeline...' : 'Run Complete Pipeline Test'}
          </Button>
          
          {currentStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              {currentStep}
            </div>
          )}
        </div>

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.scraped_pages}</div>
                  <div className="text-sm text-muted-foreground">Pages Scraped</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{results.processed_subsidies}</div>
                  <div className="text-sm text-muted-foreground">Subsidies Processed</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.sample_subsidies.filter((s: any) => s.audit?.extraction_method === 'enhanced_franceagrimer_v1').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Enhanced Extractions</div>
                </CardContent>
              </Card>
            </div>

            {results.sample_subsidies.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Sample Results:</h3>
                <div className="space-y-3">
                  {results.sample_subsidies.slice(0, 3).map((subsidy: any) => (
                    <Card key={subsidy.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{subsidy.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {subsidy.description?.substring(0, 150)}...
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span>Agency: {subsidy.agency}</span>
                            <span>Documents: {subsidy.documents?.length || 0}</span>
                            <span>Method: {subsidy.audit?.extraction_method || 'standard'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subsidy.audit?.extraction_method === 'enhanced_franceagrimer_v1' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Completed at: {new Date(results.completion_time).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};