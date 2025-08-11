import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';

interface PipelineHealth {
  hour: string;
  runs: number;
  pages_scraped: number;
  ai_pages_processed: number;
  ai_successful: number;
  ai_failed: number;
  runs_completed: number;
  runs_no_content: number;
}

interface HarvestQuality {
  source_site: string;
  pages: number;
  avg_len: number;
  ge_1k: number;
  pct_ge_1k: number;
  pct_with_markdown: number;
}

interface AIYield {
  run_id: string;
  model: string;
  last_ended: string;
  pages_seen: number;
  pages_eligible: number;
  pages_processed: number;
  subsidies_created: number;
  errors_count: number;
}

interface OrphanPages {
  source_site: string;
  orphan_pages: number;
  last_seen: string;
}

interface AIErrors {
  error_type: string;
  errors: number;
  first_seen: string;
  last_seen: string;
}

export const ObservabilityDashboard: React.FC = () => {
  const { UI_OBSERVABILITY_ENABLED } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth[]>([]);
  const [harvestQuality, setHarvestQuality] = useState<HarvestQuality[]>([]);
  const [aiYield, setAIYield] = useState<AIYield[]>([]);
  const [orphanPages, setOrphanPages] = useState<OrphanPages[]>([]);
  const [aiErrors, setAIErrors] = useState<AIErrors[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchObservabilityData = async () => {
    setLoading(true);
    try {
      const [healthData, errorData] = await Promise.all([
        supabase.rpc('get_pipeline_health_24h'),
        supabase.rpc('get_ai_errors_last_24h')
      ]);

      // Transform data to match expected TypeScript interfaces
      setPipelineHealth(healthData.data?.map((h: any) => ({
        hour: new Date(h.started_at).getHours().toString(),
        runs: 1,
        pages_scraped: h.total_pages || 0,
        ai_pages_processed: h.processed_pages || 0,
        ai_successful: Math.max(0, (h.total_pages || 0) - (h.failed_pages || 0)),
        ai_failed: h.failed_pages || 0,
        runs_completed: h.status === 'completed' ? 1 : 0,
        runs_no_content: (h.total_pages || 0) === 0 ? 1 : 0
      })) || []);
      
      // Set empty arrays for now - these views were removed
      setHarvestQuality([]);
      setAIYield([]);
      setOrphanPages([]);
      
      setAIErrors(errorData.data?.map((e: any) => ({
        error_type: e.stage || 'unknown',
        errors: 1, // Each record represents one error
        first_seen: e.created_at || new Date().toISOString(),
        last_seen: e.created_at || new Date().toISOString()
      })) || []);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching observability data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (UI_OBSERVABILITY_ENABLED) {
      fetchObservabilityData();
    }
  }, [UI_OBSERVABILITY_ENABLED]);

  if (!UI_OBSERVABILITY_ENABLED) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Observability dashboard is disabled</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalRuns24h = pipelineHealth.reduce((sum, h) => sum + h.runs, 0);
  const totalCompleted24h = pipelineHealth.reduce((sum, h) => sum + h.runs_completed, 0);
  const totalNoContent24h = pipelineHealth.reduce((sum, h) => sum + h.runs_no_content, 0);
  const totalOrphans = orphanPages.reduce((sum, o) => sum + o.orphan_pages, 0);
  const totalAIErrors24h = aiErrors.reduce((sum, e) => sum + e.errors, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Observability</h2>
          <p className="text-muted-foreground">
            Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </div>
        <Button onClick={fetchObservabilityData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Runs (24h)</p>
                <p className="text-2xl font-bold">{totalRuns24h}</p>
                <p className="text-xs text-muted-foreground">
                  {totalCompleted24h} completed, {totalNoContent24h} no content
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Harvest Sources</p>
                <p className="text-2xl font-bold">{harvestQuality.length}</p>
                <p className="text-xs text-muted-foreground">
                  Active sources today
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orphan Pages</p>
                <p className="text-2xl font-bold text-orange-600">{totalOrphans}</p>
                <p className="text-xs text-muted-foreground">
                  Last 6 hours
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Errors (24h)</p>
                <p className={`text-2xl font-bold ${totalAIErrors24h > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalAIErrors24h}
                </p>
                <p className="text-xs text-muted-foreground">
                  Error instances
                </p>
              </div>
              {totalAIErrors24h > 0 ? (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Harvest Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Harvest Quality by Source (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {harvestQuality.map((quality) => (
              <div key={quality.source_site} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{quality.source_site}</p>
                  <p className="text-sm text-muted-foreground">
                    {quality.pages} pages • Avg {quality.avg_len} chars
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={quality.pct_ge_1k > 70 ? "default" : "destructive"}>
                    {quality.pct_ge_1k}% ≥1k chars
                  </Badge>
                  <Badge variant={quality.pct_with_markdown > 50 ? "default" : "secondary"}>
                    {quality.pct_with_markdown}% markdown
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Yield */}
      <Card>
        <CardHeader>
          <CardTitle>AI Yield by Run (Last 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {aiYield.slice(0, 10).map((yield_data) => (
              <div key={yield_data.run_id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium font-mono text-sm">{yield_data.run_id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {yield_data.model} • {yield_data.last_ended ? 
                      formatDistanceToNow(new Date(yield_data.last_ended), { addSuffix: true }) : 
                      'In progress'
                    }
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{yield_data.pages_processed}</p>
                    <p className="text-muted-foreground">Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-green-600">{yield_data.subsidies_created}</p>
                    <p className="text-muted-foreground">Subsidies</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-red-600">{yield_data.errors_count}</p>
                    <p className="text-muted-foreground">Errors</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orphan Pages & AI Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Orphan Pages (6h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orphanPages.length > 0 ? (
              <div className="space-y-2">
                {orphanPages.map((orphan) => (
                  <div key={orphan.source_site} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{orphan.source_site}</p>
                      <p className="text-sm text-muted-foreground">
                        Last seen {formatDistanceToNow(new Date(orphan.last_seen), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="destructive">{orphan.orphan_pages}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No orphan pages detected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              AI Errors (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiErrors.length > 0 ? (
              <div className="space-y-2">
                {aiErrors.map((error) => (
                  <div key={error.error_type} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{error.error_type}</p>
                      <p className="text-sm text-muted-foreground">
                        First: {formatDistanceToNow(new Date(error.first_seen), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="destructive">{error.errors}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No AI errors detected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};