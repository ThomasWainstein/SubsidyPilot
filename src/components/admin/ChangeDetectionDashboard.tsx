import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Activity,
  TrendingUp,
  Database
} from 'lucide-react';

interface ApiStatus {
  api_source: string;
  last_check: string;
  last_check_had_changes: boolean;
  change_summary: string;
  check_frequency: string;
  next_check: string;
  polling_enabled: boolean;
  failure_count: number;
  api_currently_available: boolean;
  last_response_time: number;
  hours_since_last_check: number;
  status: string;
}

interface ChangeHistoryItem {
  api_source: string;
  check_timestamp: string;
  changes_detected: boolean;
  change_type: string;
  change_details: any;
  sync_triggered: boolean;
}

export const ChangeDetectionDashboard: React.FC = () => {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get dashboard data
      const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_change_detection_dashboard');
      if (dashboardError) throw dashboardError;
      setApiStatuses(dashboardData || []);

      // Get recent change history
      const { data: historyData, error: historyError } = await supabase
        .from('change_history')
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(10);
      if (historyError) throw historyError;
      setChangeHistory(historyData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load change detection data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkApiNow = async (apiSource: string) => {
    try {
      setChecking(apiSource);
      
      const { data, error } = await supabase.functions.invoke('smart-change-detector', {
        body: { action: 'check_changes', api_source: apiSource }
      });

      if (error) throw error;

      const result = data.results?.[0];
      if (result?.changes_detected) {
        toast({
          title: "Changes Detected!",
          description: `Found changes in ${apiSource}: ${result.change_details ? Object.keys(result.change_details).join(', ') : 'New data available'}`,
        });
      } else {
        toast({
          title: "Check Complete",
          description: `No changes detected in ${apiSource}`,
        });
      }

      // Refresh dashboard data
      await fetchDashboardData();

    } catch (error) {
      console.error('Error checking API:', error);
      toast({
        title: "Check Failed",
        description: `Failed to check ${apiSource}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setChecking(null);
    }
  };

  const checkAllApis = async () => {
    try {
      setChecking('all');
      
      const { data, error } = await supabase.functions.invoke('smart-change-detector', {
        body: { action: 'check_all' }
      });

      if (error) throw error;

      const changesDetected = data.summary?.changes_detected || 0;
      toast({
        title: "Bulk Check Complete",
        description: `Checked ${data.summary?.total_checked || 0} APIs. ${changesDetected} had changes.`,
      });

      await fetchDashboardData();

    } catch (error) {
      console.error('Error checking all APIs:', error);
      toast({
        title: "Bulk Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates
    const channel = supabase
      .channel('change-detection-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'change_detection_state'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'changes_detected':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'check_due':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'changes_detected':
        return 'secondary';
      case 'check_due':
        return 'outline';
      case 'unavailable':
        return 'destructive';
      case 'disabled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatApiName = (apiSource: string) => {
    const names: { [key: string]: string } = {
      'les-aides-fr': 'Les-Aides.fr',
      'romania-open-data': 'Romania Open Data',
      'eu-open-data': 'EU Open Data',
      'aides-territoires': 'Aides-Territoires'
    };
    return names[apiSource] || apiSource;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMins}m ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Change Detection</h2>
          <p className="text-muted-foreground">
            Automatically monitor APIs for new subsidies and changes
          </p>
        </div>
        <Button 
          onClick={checkAllApis} 
          disabled={checking !== null}
          className="min-w-[120px]"
        >
          {checking === 'all' ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check All
            </>
          )}
        </Button>
      </div>

      {/* API Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {apiStatuses.map((api) => (
          <Card key={api.api_source} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(api.status)}
                  <CardTitle className="text-sm font-medium">
                    {formatApiName(api.api_source)}
                  </CardTitle>
                </div>
                <Badge variant={getStatusBadgeVariant(api.status)} className="text-xs">
                  {api.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Last Check:</span>
                  <span>{api.last_check ? formatTimeAgo(api.last_check) : 'Never'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Check:</span>
                  <span>{api.next_check ? formatTimeAgo(api.next_check) : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequency:</span>
                  <span className="capitalize">{api.check_frequency}</span>
                </div>
                {api.last_response_time && (
                  <div className="flex justify-between">
                    <span>Response:</span>
                    <span>{api.last_response_time}ms</span>
                  </div>
                )}
              </div>

              {api.change_summary && api.last_check_had_changes && (
                <Alert className="py-2">
                  <TrendingUp className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    {api.change_summary}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => checkApiNow(api.api_source)}
                disabled={checking !== null || !api.polling_enabled}
              >
                {checking === api.api_source ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-2" />
                    Check Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Change Detection Activity</span>
          </CardTitle>
          <CardDescription>
            Latest checks and detected changes across all APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {changeHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No change detection activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changeHistory.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {item.changes_detected ? (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {formatApiName(item.api_source)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.changes_detected ? (
                          `Changes detected: ${item.change_type}`
                        ) : (
                          'No changes detected'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.sync_triggered && (
                      <Badge variant="secondary" className="text-xs">
                        Sync Triggered
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(item.check_timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};