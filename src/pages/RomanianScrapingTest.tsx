import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RomanianScrapingTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testRomanianScraping = async () => {
    setIsLoading(true);
    try {
      const runId = crypto.randomUUID();
      
      // First test POCU/POC scraper
      toast.info('Starting POCU/POC/POR scraping...');
      const { data: scrapingResult, error: scrapingError } = await supabase.functions.invoke('pocu-poc-scraper', {
        body: {
          action: 'scrape',
          max_pages: 10,
          run_id: runId,
          programs: ['pocu', 'poc', 'por']
        }
      });

      if (scrapingError) {
        throw new Error(`Scraping failed: ${scrapingError.message}`);
      }

      toast.success(`Scraped ${scrapingResult.pages_scraped} pages`);

      // Then test Romanian processor
      toast.info('Processing Romanian subsidies...');
      const { data: processingResult, error: processingError } = await supabase.functions.invoke('romanian-subsidy-processor', {
        body: {
          action: 'process',
          run_id: runId,
          openai_api_key: 'test-key-placeholder' // User will need to provide real key
        }
      });

      if (processingError) {
        throw new Error(`Processing failed: ${processingError.message}`);
      }

      // Get pipeline status
      const { data: statusResult } = await supabase.functions.invoke('romanian-pipeline-monitor', {
        body: {
          action: 'status',
          run_id: runId
        }
      });

      setResults({
        scraping: scrapingResult,
        processing: processingResult,
        status: statusResult
      });

      toast.success('Romanian scraping test completed!');
    } catch (error) {
      console.error('Test failed:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Romanian Scraping System Test</h1>
          <p className="text-muted-foreground">Test POCU, POC, POR scraping and AI processing</p>
        </div>
        <Button 
          onClick={testRomanianScraping} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? 'Running Test...' : 'Start Romanian Test'}
        </Button>
      </div>

      {results && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Scraping Results
                <Badge variant="secondary">{results.scraping?.success ? 'Success' : 'Failed'}</Badge>
              </CardTitle>
              <CardDescription>POCU/POC/POR data collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Pages Scraped:</strong> {results.scraping?.pages_scraped || 0}</p>
                <p><strong>Programs:</strong> {results.scraping?.programs_scraped?.join(', ') || 'None'}</p>
                <p><strong>Run ID:</strong> {results.scraping?.run_id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Processing Results
                <Badge variant="secondary">{results.processing?.success ? 'Success' : 'Failed'}</Badge>
              </CardTitle>
              <CardDescription>AI subsidy extraction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Pages Processed:</strong> {results.processing?.processed_pages || 0}</p>
                <p><strong>Subsidies Created:</strong> {results.processing?.created_subsidies || 0}</p>
                <p><strong>Run ID:</strong> {results.processing?.run_id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pipeline Status
                <Badge variant="secondary">{results.status?.pipeline_healthy ? 'Healthy' : 'Issues'}</Badge>
              </CardTitle>
              <CardDescription>System health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Total Pages:</strong> {results.status?.total_pages || 0}</p>
                <p><strong>Processed:</strong> {results.status?.processed_pages || 0}</p>
                <p><strong>Subsidies:</strong> {results.status?.total_subsidies || 0}</p>
                <p><strong>Errors:</strong> {results.status?.error_count || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
          <CardDescription>Romanian scraping system overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Data Sources</h3>
              <ul className="space-y-1 text-sm">
                <li>• POCU (Human Capital)</li>
                <li>• POC (Competitiveness)</li>
                <li>• POR (Regional)</li>
                <li>• MFE Press Releases</li>
                <li>• EU Funds Portal</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Processing Pipeline</h3>
              <ul className="space-y-1 text-sm">
                <li>• Content scraping</li>
                <li>• AI subsidy extraction</li>
                <li>• Data structuring</li>
                <li>• Quality validation</li>
                <li>• Database storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RomanianScrapingTest;