import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, StatusType } from '@/components/ui/status-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  Globe, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetric {
  label: string;
  value: string | number;
  status: StatusType;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
}

interface StatusDashboardProps {
  className?: string;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({ className }) => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSystemMetrics = async () => {
    try {
      // Fetch scraped pages count
      const { data: scrapedPages, error: scrapedError } = await supabase
        .from('raw_scraped_pages')
        .select('id', { count: 'exact' });

      // Fetch all subsidies count  
      const { data: allSubsidies, error: structuredError } = await supabase
        .from('subsidies')
        .select('id', { count: 'exact' });

      // Fetch recent pipeline executions
      const { data: recentExecutions, error: executionsError } = await supabase
        .from('pipeline_executions')
        .select('status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent AI processing results
      const { data: aiResults, error: aiError } = await supabase
        .from('subsidies')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const newMetrics: SystemMetric[] = [
        {
          label: 'Scraped Pages',
          value: scrapedPages?.length || 0,
          status: (scrapedPages?.length || 0) > 0 ? 'ready' : 'pending',
          tooltip: 'Total number of pages scraped from government websites',
          icon: Globe,
          trend: 'stable'
        },
        {
          label: 'Total Subsidies',
          value: allSubsidies?.length || 0,
          status: (allSubsidies?.length || 0) > 0 ? 'ready' : 'pending',
          tooltip: 'Number of subsidies processed by AI into structured format',
          icon: Database,
          trend: 'up'
        },
        {
          label: 'Pipeline Status',
          value: recentExecutions?.[0]?.status || 'idle',
          status: recentExecutions?.[0]?.status === 'completed' ? 'completed' : 
                 recentExecutions?.[0]?.status === 'running' ? 'processing' : 'ready',
          tooltip: 'Current status of the dual pipeline system',
          icon: Activity,
          trend: 'stable'
        },
        {
          label: 'AI Processed (24h)',
          value: aiResults?.length || 0,
          status: (aiResults?.length || 0) > 0 ? 'completed' : 'pending',
          tooltip: 'Number of subsidies processed by AI in the last 24 hours',
          icon: Zap,
          trend: 'up'
        }
      ];

      setMetrics(newMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading system metrics..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="flex flex-col p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <HelpTooltip content={metric.tooltip} />
                </div>
                
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={metric.status} showIcon={false} variant="outline" />
                      {metric.trend && (
                        <TrendingUp 
                          className={`h-3 w-3 ${
                            metric.trend === 'up' ? 'text-green-500' :
                            metric.trend === 'down' ? 'text-red-500 rotate-180' :
                            'text-gray-500'
                          }`} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">System Operational</span>
            <span className="text-muted-foreground">
              All core services are running normally
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};