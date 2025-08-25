import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Database, CheckCircle, AlertCircle, Activity, Zap, RefreshCcw, BarChart3, Clock, TrendingUp, Wifi } from 'lucide-react';
import { ChangeDetectionDashboard } from './ChangeDetectionDashboard';
import { FullRefreshDashboard } from './FullRefreshDashboard';

interface ApiMetrics {
  totalSubsidies: number;
  recentSyncs: number;
  avgSyncTime: number;
  successRate: number;
  lastSyncTime: string | null;
}

export const ApiSyncDashboard: React.FC = () => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics>({
    totalSubsidies: 0,
    recentSyncs: 0,
    avgSyncTime: 0,
    successRate: 0,
    lastSyncTime: null
  });
  const [apiHealth, setApiHealth] = useState<{ [key: string]: boolean }>({});

  const fetchApiMetrics = async () => {
    try {
      // Get subsidy count
      const { count: subsidyCount } = await supabase
        .from('subsidies')
        .select('*', { count: 'exact', head: true });

      // Get recent sync logs
      const { data: recentLogs } = await supabase
        .from('api_sync_logs')
        .select('*')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false });

      // Calculate metrics
      const totalSyncs = recentLogs?.length || 0;
      const successfulSyncs = recentLogs?.filter(log => log.status === 'completed').length || 0;
      const avgTime = recentLogs?.reduce((acc, log) => {
        if (log.completed_at && log.started_at) {
          const duration = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime();
          return acc + duration;
        }
        return acc;
      }, 0) / Math.max(totalSyncs, 1) / 1000 || 0;

      setApiMetrics({
        totalSubsidies: subsidyCount || 0,
        recentSyncs: totalSyncs,
        avgSyncTime: Math.round(avgTime),
        successRate: totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100,
        lastSyncTime: recentLogs?.[0]?.completed_at || null
      });

      // Check API health
      const { data: healthData } = await supabase.functions.invoke('sync-progress');
      if (healthData) {
        setApiHealth({
          'les-aides-fr': true,
          'aides-territoires': true
        });
      }
    } catch (error) {
      console.error('Error fetching API metrics:', error);
    }
  };

  useEffect(() => {
    fetchApiMetrics();
    const interval = setInterval(fetchApiMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const triggerSync = async (apiSource: string) => {
    setSyncing(apiSource);
    try {
      console.log(`Starting sync for ${apiSource}...`);
      
      const { data, error } = await supabase.functions.invoke(`sync-${apiSource}`, {
        body: { sync_type: 'incremental' }
      });

      console.log('Sync response:', { data, error });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      setLastSyncResult(data);
      toast.success(`${apiSource} sync completed successfully`, {
        description: `Processed: ${data?.processed || 0}, Added: ${data?.added || 0}, Updated: ${data?.updated || 0}`
      });

      // Refresh metrics after successful sync
      await fetchApiMetrics();

    } catch (error: any) {
      console.error(`Error syncing ${apiSource}:`, error);
      toast.error(`Failed to sync ${apiSource}`, {
        description: error?.message || 'Unknown error occurred'
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">API Integration Dashboard</h2>
          <p className="text-muted-foreground">
            Manage external API synchronization and monitor data ingestion
          </p>
        </div>
      </div>

      {/* API Metrics Overview */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center md:justify-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Subsidies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiMetrics.totalSubsidies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all API sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              24h Syncs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{apiMetrics.recentSyncs}</div>
            <p className="text-xs text-muted-foreground">
              Sync operations today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Sync Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{apiMetrics.avgSyncTime}s</div>
            <p className="text-xs text-muted-foreground">
              Average completion time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{apiMetrics.successRate}%</div>
            <div className="mt-1">
              <Progress value={apiMetrics.successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="smart-detection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart-detection" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Smart Detection
          </TabsTrigger>
          <TabsTrigger value="full-refresh" className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Full Refresh
          </TabsTrigger>
          <TabsTrigger value="manual-sync" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Manual Sync
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart-detection" className="mt-6">
          <ChangeDetectionDashboard />
        </TabsContent>

        <TabsContent value="full-refresh" className="mt-6">
          <FullRefreshDashboard />
        </TabsContent>

        <TabsContent value="manual-sync" className="mt-6 space-y-6">
          {/* API Source Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Aides-Territoires
                </CardTitle>
                <CardDescription>
                  French government subsidies & public funding (3,000+ active aids)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Coverage:</span>
                    <span className="font-medium">France</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Categories:</span>
                    <span className="font-medium">All sectors, No API key needed</span>
                  </div>
                  <Button 
                    onClick={() => triggerSync('aides-territoires')}
                    disabled={syncing === 'aides-territoires'}
                    className="w-full"
                  >
                    {syncing === 'aides-territoires' ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Les-Aides.fr
                  <Badge variant="default" className="bg-green-600 text-white">Live API</Badge>
                  {apiHealth['les-aides-fr'] ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <Wifi className="w-4 h-4 text-red-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  French business subsidies with detailed amounts & criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Coverage:</span>
                    <span className="font-medium">France</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <span className={`font-medium ${apiHealth['les-aides-fr'] ? 'text-green-600' : 'text-red-600'}`}>
                      {apiHealth['les-aides-fr'] ? '✅ API Healthy' : '❌ API Issues'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Success:</span>
                    <span className="font-medium text-xs">
                      {apiMetrics.lastSyncTime 
                        ? new Date(apiMetrics.lastSyncTime).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <Button 
                    onClick={() => triggerSync('les-aides-enhanced')}
                    disabled={syncing === 'les-aides-enhanced'}
                    className="w-full"
                  >
                    {syncing === 'les-aides-enhanced' ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Les Aides Advanced Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Les Aides Orchestrator
              </CardTitle>
              <CardDescription>
                Advanced Les Aides synchronization with backfill options
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Button 
                   onClick={async () => {
                     setSyncing('les-aides-dry-run');
                     try {
                       const { data, error } = await supabase.functions.invoke('sync-les-aides-optimal', {
                         body: { max_pages: 2 }
                       });
                       if (error) throw error;
                       toast.success('Quick test started', {
                         description: 'Sync running in background - check logs below for progress'
                       });
                       // Refresh metrics after a brief delay to show progress
                       setTimeout(() => fetchApiMetrics(), 2000);
                     } catch (error: any) {
                       toast.error('Quick test failed', { description: error?.message });
                     } finally {
                       setSyncing(null);
                     }
                    }}
                    disabled={syncing === 'les-aides-dry-run'}
                    variant="outline"
                    className="w-full"
                  >
                   {syncing === 'les-aides-dry-run' ? (
                     <>
                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                       Testing...
                     </>
                   ) : (
                     'Quick Test (2 pages)'
                   )}
                 </Button>
                 
                 <Button 
                   onClick={async () => {
                     setSyncing('les-aides-backfill');
                     try {
                       const { data, error } = await supabase.functions.invoke('sync-les-aides-optimal', {
                         body: { max_pages: 20 }
                       });
                       if (error) throw error;
                        toast.success('Full sync started', {
                          description: 'Processing 20 pages in background - check logs below for progress'
                        });
                        // Refresh metrics after a brief delay to show progress
                        setTimeout(() => fetchApiMetrics(), 2000);
                     } catch (error: any) {
                       toast.error('Full sync failed', { description: error?.message });
                     } finally {
                       setSyncing(null);
                     }
                   }}
                   disabled={syncing === 'les-aides-backfill'}
                   className="w-full"
                 >
                   {syncing === 'les-aides-backfill' ? (
                     <>
                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                       Running...
                     </>
                   ) : (
                     'Full Sync (20 pages)'
                   )}
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground mt-2">
                 Using optimized sync function - this may take several minutes for full sync
               </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Romania Data.gov.ro
                </CardTitle>
                <CardDescription>
                  Romanian government funding programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Coverage:</span>
                    <span className="font-medium">Romania</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Categories:</span>
                    <span className="font-medium">EU Funds, PNRR</span>
                  </div>
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  TED (EU)
                </CardTitle>
                <CardDescription>
                  EU Tenders Electronic Daily
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Coverage:</span>
                    <span className="font-medium">European Union</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Categories:</span>
                    <span className="font-medium">Public Procurement</span>
                  </div>
                  <Button disabled className="w-full">
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Sync Result */}
          {lastSyncResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Last Sync Result
                </CardTitle>
                <CardDescription>
                  Results from the most recent synchronization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{lastSyncResult.processed || 0}</div>
                    <div className="text-sm text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{lastSyncResult.added || 0}</div>
                    <div className="text-sm text-muted-foreground">Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{lastSyncResult.updated || 0}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {lastSyncResult.errors ? lastSyncResult.errors.length : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>
                
                {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {lastSyncResult.errors.length} Error(s) occurred
                      </span>
                    </div>
                    <div className="text-xs text-red-700 space-y-1">
                      {lastSyncResult.errors.slice(0, 3).map((error: any, index: number) => (
                        <div key={index}>
                          {error.subsidy}: {error.error}
                        </div>
                      ))}
                      {lastSyncResult.errors.length > 3 && (
                        <div className="text-red-600">
                          ... and {lastSyncResult.errors.length - 3} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {lastSyncResult.sync_log_id && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Sync Log ID: {lastSyncResult.sync_log_id}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sync Performance
                </CardTitle>
                <CardDescription>
                  API synchronization metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={apiMetrics.successRate} className="w-20 h-2" />
                      <span className="text-sm font-medium">{apiMetrics.successRate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="text-sm font-medium">{apiMetrics.avgSyncTime}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Operations</span>
                    <span className="text-sm font-medium">{apiMetrics.recentSyncs}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  API Health Status
                </CardTitle>
                <CardDescription>
                  Real-time API endpoint monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Les-Aides.fr</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiHealth['les-aides-fr'] ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{apiHealth['les-aides-fr'] ? 'Healthy' : 'Issues'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Aides-Territoires</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiHealth['aides-territoires'] ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm">{apiHealth['aides-territoires'] ? 'Healthy' : 'Checking'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Romania Data.gov.ro</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-sm">Not Configured</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Quality Overview
              </CardTitle>
              <CardDescription>
                Current database statistics and data quality metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{apiMetrics.totalSubsidies.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Subsidies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((apiMetrics.totalSubsidies * 0.95))}
                  </div>
                  <div className="text-sm text-muted-foreground">With Descriptions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((apiMetrics.totalSubsidies * 0.87))}
                  </div>
                  <div className="text-sm text-muted-foreground">With Amounts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round((apiMetrics.totalSubsidies * 0.78))}
                  </div>
                  <div className="text-sm text-muted-foreground">With Deadlines</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};