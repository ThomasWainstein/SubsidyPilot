import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap,
  Database,
  Globe,
  TrendingUp,
  RefreshCw,
  Settings,
  Wrench,
  Shield
} from 'lucide-react';

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error_message?: string;
  last_checked: string;
  metrics?: Record<string, any>;
}

interface RecoveryAction {
  component: string;
  action: string;
  description: string;
  auto_fix_available: boolean;
}

interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  components: HealthCheckResult[];
  recovery_actions: RecoveryAction[];
  summary: string;
  timestamp: string;
}

export function SystemHealthDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const checkSystemHealth = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-health-monitor', {
        body: { action: 'health_check' }
      });

      if (error) throw error;
      
      if (data?.success) {
        setSystemHealth(data);
      } else {
        throw new Error(data?.error || 'Health check failed');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performAutoRecovery = async () => {
    setIsFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-health-monitor', {
        body: { 
          action: 'auto_recover',
          auto_fix: true
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Auto-Recovery Completed",
          description: `Applied ${data.recovery_applied?.length || 0} fixes`,
          variant: "default"
        });
        // Refresh health check after recovery
        setTimeout(checkSystemHealth, 2000);
      } else {
        throw new Error(data?.error || 'Auto-recovery failed');
      }
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      toast({
        title: "Auto-Recovery Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const fixForeignKeys = async () => {
    setIsFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-health-monitor', {
        body: { action: 'fix_foreign_keys' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Foreign Key Issues Fixed",
          description: `Applied ${data.fixes_applied?.length || 0} database fixes`,
          variant: "default"
        });
        setTimeout(checkSystemHealth, 2000);
      }
    } catch (error) {
      console.error('Foreign key fix failed:', error);
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'ai_processing':
        return <Zap className="h-4 w-4" />;
      case 'raw_data_pipeline':
        return <Activity className="h-4 w-4" />;
      case 'romanian_sources':
      case 'french_sources':
        return <Globe className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health Dashboard
              <HelpTooltip content="Comprehensive monitoring of all AgriTool pipeline components including database health, AI processing, and external source connectivity." />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSystemHealth}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Check Now
              </Button>
            </div>
          </CardTitle>
          {systemHealth && (
            <CardDescription>
              {systemHealth.summary} • Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {systemHealth && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(systemHealth.overall_status)}
                  <div>
                    <div className="font-medium">Overall System Status</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {systemHealth.overall_status}
                    </div>
                  </div>
                </div>
                {systemHealth.recovery_actions.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={performAutoRecovery}
                      disabled={isFixing}
                      className="flex items-center gap-1"
                    >
                      <Wrench className={`h-3 w-3 ${isFixing ? 'animate-spin' : ''}`} />
                      Auto-Fix ({systemHealth.recovery_actions.filter(a => a.auto_fix_available).length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fixForeignKeys}
                      disabled={isFixing}
                      className="flex items-center gap-1"
                    >
                      <Database className="h-3 w-3" />
                      Fix DB Issues
                    </Button>
                  </div>
                )}
              </div>

              {/* Component Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemHealth.components.map((component) => (
                  <Card key={component.component} className="relative">
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(component.status)}`} />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        {getComponentIcon(component.component)}
                        {component.component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Response Time</span>
                        <span>{component.response_time_ms}ms</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Status</span>
                        <Badge variant={component.status === 'healthy' ? 'default' : 'destructive'}>
                          {component.status}
                        </Badge>
                      </div>
                      {component.metrics && (
                        <div className="text-xs space-y-1 pt-2 border-t">
                          {Object.entries(component.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span>{typeof value === 'number' ? value.toFixed(1) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {component.error_message && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {component.error_message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!systemHealth && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Check Now" to run system health diagnostics</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Running comprehensive health check...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Actions */}
      {systemHealth?.recovery_actions && systemHealth.recovery_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Recommended Recovery Actions
            </CardTitle>
            <CardDescription>
              System issues detected that can be automatically or manually resolved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemHealth.recovery_actions.map((action, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getComponentIcon(action.component)}
                    <div>
                      <div className="font-medium">{action.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Component: {action.component.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={action.auto_fix_available ? 'default' : 'secondary'}>
                      {action.auto_fix_available ? 'Auto-Fix Available' : 'Manual Action Required'}
                    </Badge>
                    {action.auto_fix_available && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={action.action === 'fix_foreign_keys' ? fixForeignKeys : performAutoRecovery}
                        disabled={isFixing}
                      >
                        Fix Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Component Metrics */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detailed Component Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="performance">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="errors">Errors & Issues</TabsTrigger>
                <TabsTrigger value="sources">Source Health</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                <ScrollArea className="h-64">
                  {systemHealth.components.map((component) => (
                    <div key={component.component} className="p-3 border-b">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{component.component}</span>
                        <span className="text-sm text-muted-foreground">
                          {component.response_time_ms}ms
                        </span>
                      </div>
                      {component.metrics && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(component.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span>{typeof value === 'number' ? value.toFixed(1) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="errors" className="space-y-4">
                <ScrollArea className="h-64">
                  {systemHealth.components
                    .filter(c => c.error_message || c.status !== 'healthy')
                    .map((component) => (
                      <Alert key={component.component} variant="destructive" className="mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">{component.component}</div>
                          <div className="text-sm mt-1">
                            {component.error_message || `Status: ${component.status}`}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  {systemHealth.components.every(c => !c.error_message && c.status === 'healthy') && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No errors or issues detected</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sources" className="space-y-4">
                <ScrollArea className="h-64">
                  {systemHealth.components
                    .filter(c => c.component.includes('sources'))
                    .map((component) => (
                      <div key={component.component} className="p-3 border rounded-lg mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {component.component.replace('_sources', '').toUpperCase()} Sources
                          </span>
                          <Badge variant={component.status === 'healthy' ? 'default' : 'destructive'}>
                            {component.metrics?.accessibility_rate?.toFixed(1)}% accessible
                          </Badge>
                        </div>
                        {component.metrics && (
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Total Sources:</span>
                              <span>{component.metrics.total_sources}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Accessible:</span>
                              <span>{component.metrics.accessible_sources}</span>
                            </div>
                            {component.metrics.failed_sources && component.metrics.failed_sources.length > 0 && (
                              <div className="mt-2">
                                <span className="text-muted-foreground">Failed Sources:</span>
                                <ul className="list-disc list-inside text-xs mt-1">
                                  {component.metrics.failed_sources.map((url: string, idx: number) => (
                                    <li key={idx} className="text-red-600">{url}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}