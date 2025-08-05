import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  FileText,
  Brain,
  Monitor
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PipelineExecution {
  id: string;
  execution_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  config: any;
  metrics: any;
  error_details: any;
  country?: string;
  batch_size: number;
  processed_count: number;
  success_count: number;
  failure_count: number;
}

interface SystemHealthMetric {
  metric_type: string;
  metric_name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export const PipelineMonitor: React.FC = () => {
  const [executions, setExecutions] = useState<PipelineExecution[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadExecutions();
    loadHealthMetrics();
    loadSystemHealth();
    
    // Set up real-time subscriptions
    const executionChannel = supabase
      .channel('pipeline-executions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pipeline_executions'
      }, (payload) => {
        loadExecutions();
      })
      .subscribe();

    const healthChannel = supabase
      .channel('health-metrics')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_health_metrics'
      }, (payload) => {
        loadHealthMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(executionChannel);
      supabase.removeChannel(healthChannel);
    };
  }, []);

  const loadExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error loading executions:', error);
      toast({
        title: "Error Loading Executions",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const loadHealthMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setHealthMetrics(data || []);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { action: 'health_check' }
      });

      if (error) throw error;
      setSystemHealth(data);
    } catch (error) {
      console.error('Error loading system health:', error);
    }
  };

  const startPipeline = async (type: string, config: any = {}) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { 
          action: `start_${type}`,
          config 
        }
      });

      if (error) throw error;

      toast({
        title: "Pipeline Started",
        description: `${type} pipeline started successfully`,
      });

      loadExecutions();
    } catch (error) {
      toast({
        title: "Pipeline Start Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'scraping': return <Database className="h-4 w-4" />;
      case 'ai_processing': return <Brain className="h-4 w-4" />;
      case 'form_generation': return <FileText className="h-4 w-4" />;
      case 'validation': return <CheckCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (started: string, completed?: string) => {
    const start = new Date(started);
    const end = completed ? new Date(completed) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  const runningExecutions = executions.filter(e => e.status === 'running');
  const recentFailures = executions.filter(e => e.status === 'failed').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {systemHealth?.overall_status === 'healthy' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Healthy</span>
                </>
              )}
              {systemHealth?.overall_status === 'warning' && (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Warning</span>
                </>
              )}
              {systemHealth?.overall_status === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Error</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Pipelines</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningExecutions.length}</div>
            <p className="text-xs text-muted-foreground">
              Active executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executions.length > 0 
                ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 20 executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Failures</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentFailures.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => startPipeline('scraping', { countries: ['romania', 'france'] })}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Start Scraping
            </Button>
            
            <Button 
              onClick={() => startPipeline('ai_processing')}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              AI Processing
            </Button>
            
            <Button 
              onClick={() => startPipeline('form_generation')}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Generate Forms
            </Button>
            
            <Button 
              onClick={loadSystemHealth}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions">Pipeline Executions</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="running">Running Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Pipeline Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getTypeIcon(execution.execution_type)}
                      <div>
                        <div className="font-medium capitalize">
                          {execution.execution_type.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Started: {new Date(execution.started_at).toLocaleString()}
                        </div>
                        {execution.country && (
                          <div className="text-sm text-muted-foreground">
                            Countries: {execution.country}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm">
                          {execution.processed_count > 0 && (
                            <span>{execution.success_count}/{execution.processed_count} successful</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {formatDuration(execution.started_at, execution.completed_at)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusIcon(execution.status)}
                        <Badge variant={getStatusColor(execution.status) as any}>
                          {execution.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {executions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pipeline executions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth?.checks && (
                <div className="space-y-3">
                  {systemHealth.checks.map((check: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        {check.status === 'healthy' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {check.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                        {check.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        <span className="font-medium">{check.component}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {check.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Running Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {runningExecutions.length > 0 ? (
                <div className="space-y-4">
                  {runningExecutions.map((execution) => (
                    <div key={execution.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(execution.execution_type)}
                          <span className="font-medium capitalize">
                            {execution.execution_type.replace('_', ' ')}
                          </span>
                        </div>
                        <Badge variant="default">Running</Badge>
                      </div>
                      
                      {execution.processed_count > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{execution.processed_count}/{execution.batch_size}</span>
                          </div>
                          <Progress 
                            value={(execution.processed_count / execution.batch_size) * 100} 
                          />
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground mt-2">
                        Running for: {formatDuration(execution.started_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks currently running
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts for Failures */}
      {recentFailures.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {recentFailures.length} recent pipeline failures detected. Check the execution logs for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};