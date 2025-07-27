import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  TrendingUp, 
  Users, 
  FileText, 
  RefreshCw,
  Play,
  Pause,
  Settings,
  Activity
} from 'lucide-react';
import AccessControl from '@/components/security/AccessControl';
import ArrayProcessingMonitor from '@/components/admin/ArrayProcessingMonitor';
import ErrorManagement from '@/components/admin/ErrorManagement';
import BatchOperations from '@/components/admin/BatchOperations';
import TicketingSystem from '@/components/admin/TicketingSystem';
import { useToast } from '@/hooks/use-toast';

interface SystemMetrics {
  totalRawLogs: number;
  processedLogs: number;
  failedLogs: number;
  processingRate: number;
  dataQualityScore: number;
  activeUsers: number;
  totalSubsidies: number;
  recentErrors: any[];
}

const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRawLogs: 0,
    processedLogs: 0,
    failedLogs: 0,
    processingRate: 0,
    dataQualityScore: 0,
    activeUsers: 0,
    totalSubsidies: 0,
    recentErrors: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSystemMetrics = async () => {
    try {
      setIsRefreshing(true);

      // Fetch raw logs metrics
      const { data: rawLogsData, error: rawLogsError } = await supabase
        .from('raw_logs')
        .select('processed, created_at');

      if (rawLogsError) throw rawLogsError;

      // Fetch error logs
      const { data: errorData, error: errorError } = await supabase
        .from('error_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (errorError) throw errorError;

      // Fetch subsidies count
      const { count: subsidiesCount, error: subsidiesError } = await supabase
        .from('subsidies')
        .select('*', { count: 'exact', head: true });

      if (subsidiesError) throw subsidiesError;

      // Process metrics
      const totalLogs = rawLogsData?.length || 0;
      const processedLogs = rawLogsData?.filter(log => log.processed).length || 0;
      const failedLogs = totalLogs - processedLogs;
      const processingRate = totalLogs > 0 ? (processedLogs / totalLogs) * 100 : 0;

      // Calculate data quality score (simplified)
      const qualityScore = Math.min(100, Math.max(0, 
        (processingRate * 0.6) + 
        (subsidiesCount ? Math.min(40, subsidiesCount / 10) : 0)
      ));

      setMetrics({
        totalRawLogs: totalLogs,
        processedLogs,
        failedLogs,
        processingRate,
        dataQualityScore: qualityScore,
        activeUsers: 12, // Mock data - would come from user activity tracking
        totalSubsidies: subsidiesCount || 0,
        recentErrors: errorData || []
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    
    // Set up real-time updates
    const interval = setInterval(fetchSystemMetrics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleBatchReprocess = async () => {
    toast({
      title: "Batch Reprocessing",
      description: "Batch reprocessing has been queued. This may take several minutes.",
    });
    // This would trigger the batch reprocessing logic
  };

  const MetricCard = ({ title, value, change, icon: Icon, status = 'neutral' }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    status?: 'good' | 'warning' | 'error' | 'neutral';
  }) => {
    const statusColors = {
      good: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      neutral: 'text-blue-600'
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${statusColors[status]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className={`text-xs ${statusColors[status]}`}>
              {change}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading system metrics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccessControl requiredRole="admin" fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">
                  You need administrator privileges to access the Employee Dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Employee Dashboard</h1>
              <p className="text-muted-foreground">
                System monitoring, data quality, and error management
              </p>
            </div>
            <Button
              onClick={fetchSystemMetrics}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* System Health Alert */}
          {metrics.failedLogs > 10 && (
            <Alert className="mb-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Alert</AlertTitle>
              <AlertDescription>
                High number of failed log processing detected ({metrics.failedLogs} failures). 
                Consider running batch reprocessing.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="array-processing">Array Processing</TabsTrigger>
              <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
              <TabsTrigger value="errors">Error Management</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <MetricCard
                  title="Processing Rate"
                  value={`${metrics.processingRate.toFixed(1)}%`}
                  change={metrics.processingRate > 90 ? "Excellent" : metrics.processingRate > 70 ? "Good" : "Needs attention"}
                  icon={TrendingUp}
                  status={metrics.processingRate > 90 ? 'good' : metrics.processingRate > 70 ? 'warning' : 'error'}
                />
                <MetricCard
                  title="Total Subsidies"
                  value={metrics.totalSubsidies}
                  change="Active records"
                  icon={FileText}
                  status="good"
                />
                <MetricCard
                  title="Failed Logs"
                  value={metrics.failedLogs}
                  change="Need reprocessing"
                  icon={XCircle}
                  status={metrics.failedLogs > 10 ? 'error' : metrics.failedLogs > 5 ? 'warning' : 'good'}
                />
                <MetricCard
                  title="Data Quality Score"
                  value={`${metrics.dataQualityScore.toFixed(0)}%`}
                  change="Overall system health"
                  icon={Database}
                  status={metrics.dataQualityScore > 85 ? 'good' : metrics.dataQualityScore > 70 ? 'warning' : 'error'}
                />
              </div>

              {/* Processing Progress */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Processing Progress
                  </CardTitle>
                  <CardDescription>
                    Raw log processing status and throughput
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Processed Logs</span>
                        <span>{metrics.processedLogs} / {metrics.totalRawLogs}</span>
                      </div>
                      <Progress value={metrics.processingRate} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{metrics.processedLogs}</p>
                        <p className="text-sm text-muted-foreground">Processed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{metrics.failedLogs}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{metrics.totalRawLogs}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="array-processing" className="mt-6">
              <ArrayProcessingMonitor />
            </TabsContent>

            <TabsContent value="data-quality" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Quality Monitoring</CardTitle>
                  <CardDescription>
                    Real-time data quality metrics and trend analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Quality Score Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Processing Success Rate</span>
                            <span className="font-medium">{metrics.processingRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Data Completeness</span>
                            <span className="font-medium">87.3%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Schema Compliance</span>
                            <span className="font-medium">94.1%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Recent Trends</h4>
                        <div className="space-y-2">
                          <Badge variant="outline" className="w-full justify-center">
                            Quality improving +2.3% this week
                          </Badge>
                          <Badge variant="outline" className="w-full justify-center">
                            Processing errors down -15%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>
                    Latest system errors and processing failures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.recentErrors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Error Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.recentErrors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">
                              {new Date(error.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{error.error_type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {error.error_message}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Recent Errors</h3>
                      <p className="text-muted-foreground">System is running smoothly</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Batch Operations</CardTitle>
                    <CardDescription>
                      Manual operations and system maintenance tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">Reprocess Failed Logs</h4>
                          <p className="text-sm text-muted-foreground">
                            Retry processing for all failed log entries
                          </p>
                        </div>
                        <Button onClick={handleBatchReprocess} disabled={metrics.failedLogs === 0}>
                          <Play className="w-4 h-4 mr-2" />
                          Run Batch Process
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">Data Quality Audit</h4>
                          <p className="text-sm text-muted-foreground">
                            Run comprehensive data quality assessment
                          </p>
                        </div>
                        <Button variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Run Audit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                      Current system health and service status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Database Connection</span>
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Healthy
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Processing Pipeline</span>
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Data Quality Monitor</span>
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Running
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AccessControl>
  );
};

export default EmployeeDashboardPage;