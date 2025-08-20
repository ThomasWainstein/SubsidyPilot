import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { productionMonitor } from '@/lib/services/production-monitoring';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: {
    total_requests: number;
    success_rate: number;
    average_processing_time: number;
    average_cost: number;
    error_breakdown: Record<string, number>;
    client_type_accuracy: Record<string, number>;
  };
}

interface QuotaStatus {
  service: 'google_vision' | 'openai';
  requests_used: number;
  requests_limit: number;
  cost_used: number;
  cost_limit: number;
  reset_time: string;
}

export function ProductionHealthDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [quotas, setQuotas] = useState<QuotaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load health metrics
      const healthData = await productionMonitor.checkHealthAndAlert();
      setHealth(healthData);

      // Load quota information
      const visionQuota = await productionMonitor.checkQuotaStatus('google_vision');
      const openaiQuota = await productionMonitor.checkQuotaStatus('openai');
      setQuotas([visionQuota, openaiQuota]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/10 text-success border-success/20';
      case 'warning': return 'bg-warning/10 text-warning border-warning/20';
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Production Health Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Status Overview */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              System Status: {health.status.toUpperCase()}
            </CardTitle>
            <CardDescription>
              Overall system health and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health.issues.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issues detected:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {health.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(health.metrics.success_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(health.metrics.average_processing_time / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">Avg Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${health.metrics.average_cost.toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {health.metrics.total_requests}
                </div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="quotas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotas">API Quotas</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy by Client Type</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="quotas">
          <div className="grid gap-4 md:grid-cols-2">
            {quotas.map((quota) => (
              <Card key={quota.service}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{quota.service.replace('_', ' ')}</span>
                    <Badge variant={quota.requests_used / quota.requests_limit > 0.8 ? 'destructive' : 'secondary'}>
                      {((quota.requests_used / quota.requests_limit) * 100).toFixed(1)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Requests Used</span>
                      <span>{quota.requests_used} / {quota.requests_limit}</span>
                    </div>
                    <Progress 
                      value={(quota.requests_used / quota.requests_limit) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Cost Usage</span>
                      <span>${quota.cost_used.toFixed(2)} / ${quota.cost_limit.toFixed(2)}</span>
                    </div>
                    <Progress 
                      value={(quota.cost_used / quota.cost_limit) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {quota.service === 'google_vision' ? 'Resets daily at midnight' : 'Resets every minute'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accuracy">
          {health && (
            <Card>
              <CardHeader>
                <CardTitle>Accuracy by Client Type</CardTitle>
                <CardDescription>
                  Extraction accuracy performance across different client types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(health.metrics.client_type_accuracy).map(([clientType, accuracy]) => (
                    <div key={clientType} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="capitalize font-medium">{clientType}</span>
                        <span className="text-sm">
                          {(accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={accuracy * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Target: 85% | Current: {(accuracy * 100).toFixed(1)}%
                        {accuracy < 0.85 && (
                          <span className="text-warning ml-2">⚠ Below target</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="errors">
          {health && (
            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
                <CardDescription>
                  Breakdown of extraction errors and failure patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(health.metrics.error_breakdown).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                    No errors detected in the current period
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(health.metrics.error_breakdown).map(([errorType, count]) => (
                      <div key={errorType} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium capitalize">
                            {errorType.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {count} occurrence{count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {((count / health.metrics.total_requests) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}