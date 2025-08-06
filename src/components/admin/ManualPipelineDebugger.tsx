import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const ManualPipelineDebugger = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const debugPipeline = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);
    
    try {
      addLog('🚀 Starting manual pipeline debug...');
      
      // Step 1: Test FranceAgriMer harvester directly
      addLog('📡 Testing FranceAgriMer harvester...');
      
      const { data: harvestData, error: harvestError } = await supabase.functions.invoke('franceagrimer-harvester', {
        body: {
          action: 'scrape',
          max_pages: 2,
          force_reprocess: true
        }
      });

      if (harvestError) {
        addLog(`❌ Harvest error: ${harvestError.message}`);
        throw new Error(`Harvest failed: ${harvestError.message}`);
      }

      addLog(`✅ Harvest response: ${JSON.stringify(harvestData)}`);

      // Step 2: Check scraped pages
      const { data: scrapedPages, error: pagesError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (pagesError) {
        addLog(`❌ Error fetching scraped pages: ${pagesError.message}`);
      } else {
        addLog(`📄 Found ${scrapedPages?.length || 0} scraped pages`);
        if (scrapedPages && scrapedPages.length > 0) {
          addLog(`📝 Sample page: ${scrapedPages[0].source_url}`);
        }
      }

      // Step 3: If we have pages, test enhanced extraction
      if (scrapedPages && scrapedPages.length > 0) {
        const testPage = scrapedPages[0];
        addLog(`🔧 Testing enhanced extraction on: ${testPage.source_url}`);
        
        const { data: extractionData, error: extractionError } = await supabase.functions.invoke('enhanced-franceagrimer-extraction', {
          body: {
            url: testPage.source_url,
            forceReprocess: true
          }
        });

        if (extractionError) {
          addLog(`⚠️ Enhanced extraction warning: ${extractionError.message}`);
        } else {
          addLog(`✅ Enhanced extraction success: ${JSON.stringify(extractionData)}`);
        }
      }

      // Step 4: Check final results
      const { data: finalSubsidies } = await supabase
        .from('subsidies_structured')
        .select('*')
        .order('created_at', { ascending: false });

      addLog(`🎯 Final result: ${finalSubsidies?.length || 0} subsidies in database`);

      setResults({
        harvested: harvestData,
        scraped_pages: scrapedPages?.length || 0,
        subsidies: finalSubsidies?.length || 0,
        sample_subsidy: finalSubsidies?.[0] || null
      });

      addLog('✅ Debug pipeline completed successfully!');
      toast.success('Debug pipeline completed!');

    } catch (error) {
      addLog(`❌ Pipeline debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Pipeline Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={debugPipeline}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running Debug...' : 'Debug Pipeline Issues'}
          </Button>
        </div>

        {logs.length > 0 && (
          <Card className="bg-black text-green-400 font-mono text-sm">
            <CardHeader>
              <CardTitle className="text-lg text-green-400">Debug Console</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">{log}</div>
              ))}
            </CardContent>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.scraped_pages}</div>
                  <div className="text-sm text-muted-foreground">Pages Scraped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.subsidies}</div>
                  <div className="text-sm text-muted-foreground">Subsidies Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.sample_subsidy ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-muted-foreground">Sample Data</div>
                </div>
              </div>
              
              {results.sample_subsidy && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">Sample Subsidy:</h4>
                  <p className="text-sm mt-1">{results.sample_subsidy.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Method: {results.sample_subsidy.audit?.extraction_method || 'unknown'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};