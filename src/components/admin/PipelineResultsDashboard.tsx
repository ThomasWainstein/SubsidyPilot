import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatusBadge } from '@/components/ui/status-badge';

interface PipelineResult {
  total_scraped: number;
  total_processed: number;
  total_subsidies: number;
  recent_activity: {
    scraped_today: number;
    processed_today: number;
    success_rate: number;
  };
}

export const PipelineResultsDashboard = () => {
  const [results, setResults] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async () => {
    try {
      setRefreshing(true);

      // Get scraped pages count
      const { data: scrapedPages, error: scrapedError } = await supabase
        .from('raw_scraped_pages')
        .select('id, status, created_at', { count: 'exact' });

      // Get processed subsidies count - now from main subsidies table  
      const { data: processedSubsidies, error: processedError } = await supabase
        .from('subsidies')
        .select('id, created_at', { count: 'exact' });

      // Get total subsidies (including manual ones)
      const { data: allSubsidies, error: subsidiesError } = await supabase
        .from('subsidies')
        .select('id', { count: 'exact' });

      if (scrapedError || processedError || subsidiesError) {
        throw new Error('Failed to fetch pipeline results');
      }

      // Calculate today's activity
      const today = new Date().toISOString().split('T')[0];
      const scrapedToday = scrapedPages?.filter(p => p.created_at.startsWith(today)).length || 0;
      const processedToday = processedSubsidies?.filter(s => s.created_at.startsWith(today)).length || 0;
      
      const totalScraped = scrapedPages?.length || 0;
      const totalProcessed = processedSubsidies?.length || 0;
      const successRate = totalScraped > 0 ? Math.round((totalProcessed / totalScraped) * 100) : 0;

      setResults({
        total_scraped: totalScraped,
        total_processed: totalProcessed,
        total_subsidies: allSubsidies?.length || 0,
        recent_activity: {
          scraped_today: scrapedToday,
          processed_today: processedToday,
          success_rate: successRate
        }
      });

    } catch (error) {
      console.error('Error fetching pipeline results:', error);
      toast.error('Failed to load pipeline results');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner text="Loading pipeline results..." />
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Unable to load pipeline results</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline Results & Activity
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchResults}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Overall Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Database className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">{results.total_scraped}</div>
            <div className="text-sm text-muted-foreground">Pages Scraped</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{results.total_processed}</div>
            <div className="text-sm text-muted-foreground">AI Processed</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">{results.total_subsidies}</div>
            <div className="text-sm text-muted-foreground">Total Subsidies</div>
          </div>
        </div>

        {/* Processing Success Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Processing Success Rate</span>
            <span className="text-sm text-muted-foreground">{results.recent_activity.success_rate}%</span>
          </div>
          <Progress value={results.recent_activity.success_rate} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {results.total_processed} of {results.total_scraped} pages successfully processed by AI
          </div>
        </div>

        <Separator />

        {/* Today's Activity */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Today's Activity
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm">Pages Scraped</span>
              <Badge variant="outline">{results.recent_activity.scraped_today}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm">AI Processed</span>
              <Badge variant="outline">{results.recent_activity.processed_today}</Badge>
            </div>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge 
                status={results.recent_activity.success_rate >= 80 ? 'completed' : 
                       results.recent_activity.success_rate >= 50 ? 'warning' : 'error'} 
              />
              <span className="text-sm font-medium">
                Pipeline Status: {results.recent_activity.success_rate >= 80 ? 'Excellent' : 
                                 results.recent_activity.success_rate >= 50 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/admin', '_blank')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          </div>
        </div>

        {/* Next Steps Guidance */}
        {results.total_scraped > 0 && results.total_processed === 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Ready for AI Processing</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  You have {results.total_scraped} scraped pages ready for AI processing. 
                  Click "Process Scraped Pages with AI" to extract structured subsidies.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date().toLocaleTimeString()} • Auto-refreshes every 30 seconds
        </div>
      </CardContent>
    </Card>
  );
};