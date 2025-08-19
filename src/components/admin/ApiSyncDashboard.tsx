import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface SyncLog {
  id: string;
  api_source: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_added: number;
  records_updated: number;
  errors: any;
  started_at: string;
  completed_at: string | null;
}

export const ApiSyncDashboard: React.FC = () => {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('api_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      toast.error('Failed to load sync logs');
    }
  };

  const triggerSync = async (apiSource: string) => {
    setSyncing(apiSource);
    try {
      const { data, error } = await supabase.functions.invoke(`sync-${apiSource}`, {
        body: { sync_type: 'incremental' }
      });

      if (error) throw error;

      toast.success(`${apiSource} sync completed successfully`, {
        description: `Processed: ${data.processed}, Added: ${data.added}, Updated: ${data.updated}`
      });

      // Refresh logs after sync
      await fetchSyncLogs();
    } catch (error) {
      console.error(`Error syncing ${apiSource}:`, error);
      toast.error(`Failed to sync ${apiSource}`, {
        description: error.message
      });
    } finally {
      setSyncing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>;
      case 'completed_with_errors':
        return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          With Errors
        </Badge>;
      case 'failed':
        return <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'Running...';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
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
        <Button onClick={fetchSyncLogs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* API Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Les-Aides.fr
            </CardTitle>
            <CardDescription>
              French agricultural funding database
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
                <span className="font-medium">Agriculture, Bio, Equipment</span>
              </div>
              <Button 
                onClick={() => triggerSync('les-aides')}
                disabled={syncing === 'les-aides'}
                className="w-full"
              >
                {syncing === 'les-aides' ? (
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

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Sync History
          </CardTitle>
          <CardDescription>
            Monitor API synchronization jobs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sync history available</p>
              <p className="text-sm">Trigger a sync to see results here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {syncLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium capitalize">{log.api_source}</h4>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(log.started_at, log.completed_at)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processed:</span>
                      <div className="font-medium">{log.records_processed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Added:</span>
                      <div className="font-medium text-green-600">{log.records_added}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <div className="font-medium text-blue-600">{log.records_updated}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started:</span>
                      <div className="font-medium">
                        {new Date(log.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {log.errors && log.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                          {log.errors.length} Error(s)
                        </span>
                      </div>
                      <div className="text-xs text-red-700 space-y-1">
                        {log.errors.slice(0, 3).map((error: any, index: number) => (
                          <div key={index}>
                            {error.subsidy}: {error.error}
                          </div>
                        ))}
                        {log.errors.length > 3 && (
                          <div className="text-red-600">
                            ... and {log.errors.length - 3} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};