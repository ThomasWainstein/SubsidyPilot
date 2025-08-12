/**
 * Test component for the Universal Harvester system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlayIcon, RefreshCcwIcon, DatabaseIcon, FileTextIcon, TableIcon, LinkIcon } from 'lucide-react';

interface ScrapeResults {
  success: boolean;
  run_id: string;
  results: {
    bundles_created: number;
    blocks_extracted: number;
    documents_found: number;
    sites_processed: Array<{
      site: string;
      bundles: number;
      blocks: number;
      documents: number;
      urls_processed: string[];
    }>;
    errors: string[];
  };
}

export function UniversalHarvesterTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ScrapeResults | null>(null);
  const [progress, setProgress] = useState(0);

  const runScraping = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    
    try {
      toast.info('🌾 Starting Universal Harvester...', {
        description: 'Scraping 10 pages from each French site'
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const response = await supabase.functions.invoke('enhanced-universal-scraper', {
        body: {
          sites: ['franceagrimer', 'lesaides'],
          pages_per_site: 10
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as ScrapeResults;
      setResults(data);

      if (data.success) {
        toast.success('✅ Scraping completed!', {
          description: `${data.results.bundles_created} bundles, ${data.results.blocks_extracted} blocks extracted`
        });
      } else {
        toast.error('❌ Scraping failed', {
          description: 'Check the results for error details'
        });
      }

    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('❌ Scraping failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setProgress(0);
    } finally {
      setIsRunning(false);
    }
  };

  const viewDatabase = async () => {
    try {
      // Check pipeline runs
      const { data: pipelineRuns, error: pipelineError } = await supabase
        .from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Check raw scraped pages
      const { data: scrapedPages, error: scrapedError } = await supabase
        .from('raw_scraped_pages')
        .select('id, source_url, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Check subsidies structured (main output)
      const { data: subsidiesStructured, error: subsidiesError } = await supabase
        .from('subsidies_structured')
        .select('id, title, url, created_at, run_id')
        .order('created_at', { ascending: false })
        .limit(5);

      // Check AI content runs
      const { data: aiRuns, error: aiError } = await supabase
        .from('ai_content_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      console.log('Pipeline runs:', pipelineRuns);
      console.log('Recent scraped pages:', scrapedPages);
      console.log('Subsidies structured:', subsidiesStructured);
      console.log('AI content runs:', aiRuns);
      
      if (pipelineError) console.error('Pipeline error:', pipelineError);
      if (scrapedError) console.error('Scraped pages error:', scrapedError);
      if (subsidiesError) console.error('Subsidies error:', subsidiesError);
      if (aiError) console.error('AI runs error:', aiError);

      toast.info('📊 Database data logged to console');
    } catch (error) {
      console.error('Database fetch error:', error);
      toast.error('Failed to fetch database data');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="h-5 w-5" />
            Universal Harvester Test
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the new verbatim-first scraping system on French subsidy sites
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={runScraping} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCcwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {isRunning ? 'Scraping...' : 'Start Scraping'}
            </Button>
            
            <Button 
              onClick={viewDatabase} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <DatabaseIcon className="h-4 w-4" />
              View Database
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Harvesting content...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Target Sites:</strong>
              <ul className="mt-1 space-y-1">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">FranceAgrimer</Badge>
                  <span className="text-muted-foreground">10 pages</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">les-aides.fr</Badge>
                  <span className="text-muted-foreground">10 pages</span>
                </li>
              </ul>
            </div>
            <div>
              <strong>Extraction Features:</strong>
              <ul className="mt-1 space-y-1">
                <li className="flex items-center gap-2">
                  <FileTextIcon className="h-3 w-3" />
                  <span>Verbatim content blocks</span>
                </li>
                <li className="flex items-center gap-2">
                  <TableIcon className="h-3 w-3" />
                  <span>Table structure preservation</span>
                </li>
                <li className="flex items-center gap-2">
                  <LinkIcon className="h-3 w-3" />
                  <span>Document link extraction</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <span className="text-green-600">✅ Scraping Results</span>
              ) : (
                <span className="text-red-600">❌ Scraping Failed</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {results.results.bundles_created}
                </div>
                <div className="text-sm text-muted-foreground">Bundles Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {results.results.blocks_extracted}
                </div>
                <div className="text-sm text-muted-foreground">Content Blocks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {results.results.documents_found}
                </div>
                <div className="text-sm text-muted-foreground">Documents Found</div>
              </div>
            </div>

            {results.results.sites_processed.map((site, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold capitalize">{site.site}</h4>
                    <Badge variant="secondary">
                      {site.bundles} bundles
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Blocks: {site.blocks}</div>
                    <div>Documents: {site.documents}</div>
                  </div>
                  <div className="mt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        URLs processed ({site.urls_processed.length})
                      </summary>
                      <ul className="mt-1 space-y-1 ml-4">
                        {site.urls_processed.map((url, i) => (
                          <li key={i} className="truncate">{url}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))}

            {results.results.errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive text-sm">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {results.results.errors.map((error, index) => (
                      <li key={index} className="text-destructive">{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}