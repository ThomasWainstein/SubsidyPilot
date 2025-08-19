import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Trash2,
  Download,
  BarChart3
} from 'lucide-react';

interface SyncProgress {
  sync_session_id: string;
  total_pages: number;
  pages_completed: number;
  subsidies_processed: number;
  subsidies_added: number;
  current_status: string;
  eta_minutes?: number;
  error_count: number;
  started_at: string;
  updated_at: string;
}

export const FullRefreshDashboard: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [subsidyCount, setSubsidyCount] = useState<number>(0);
  const { toast } = useToast();

  const fetchSubsidyCount = async () => {
    try {
      const { count, error } = await supabase
        .from('subsidies')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setSubsidyCount(count || 0);
    } catch (error) {
      console.error('Error fetching subsidy count:', error);
    }
  };

  const pollProgress = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-progress', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      setProgress(data);

      // Continue polling if still in progress
      if (data?.current_status !== 'completed' && data?.current_status !== 'failed') {
        setTimeout(() => pollProgress(sessionId), 2000); // Poll every 2 seconds
      } else {
        setIsRefreshing(false);
        setCurrentSession(null);
        await fetchSubsidyCount(); // Refresh count when done
        
        if (data?.current_status === 'completed') {
          toast({
            title: "Full Refresh Completed! 🎉",
            description: `Successfully added ${data.subsidies_added} real French subsidies to your database.`,
          });
        }
      }
    } catch (error) {
      console.error('Error polling progress:', error);
    }
  };

  const handlePurgeData = async () => {
    if (!confirm('⚠️ This will backup and delete all existing subsidy data. Are you sure?')) {
      return;
    }

    setIsPurging(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-purge');

      if (error) throw error;

      toast({
        title: "Data Purged Successfully",
        description: `Backed up ${data.backup_info?.backed_up_subsidies || 0} subsidies. Ready for fresh sync.`,
      });

      await fetchSubsidyCount();
    } catch (error: any) {
      console.error('Error purging data:', error);
      toast({
        title: "Purge Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  const handleFullRefresh = async () => {
    if (subsidyCount > 0) {
      if (!confirm(`You currently have ${subsidyCount} subsidies. This will replace them with fresh data from Les-Aides.fr. Continue?`)) {
        return;
      }
    }

    setIsRefreshing(true);
    try {
      // Step 1: Purge old data
      toast({
        title: "Starting Full Refresh",
        description: "Backing up and purging old data...",
      });

      const { data: purgeData, error: purgeError } = await supabase.functions.invoke('data-purge');
      if (purgeError) throw purgeError;

      // Step 2: Start sync
      toast({
        title: "Data Purged",
        description: "Starting sync with Les-Aides.fr...",
      });

      console.log('🔍 About to call les-aides-full-sync function...');
      const { data: syncData, error: syncError } = await supabase.functions.invoke('les-aides-full-sync');
      console.log('📊 Function response:', { syncData, syncError });
      
      if (syncError) {
        console.error('❌ Function call error:', syncError);
        throw syncError;
      }

      if (syncData?.success) {
        toast({
          title: "Full Refresh Completed! 🎉",
          description: `Successfully added ${syncData.summary?.total_added || 0} subsidies from Les-Aides.fr!`,
        });
        
        await fetchSubsidyCount(); // Refresh count
      } else {
        throw new Error(syncData?.error || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Error starting full refresh:', error);
      toast({
        title: "Full Refresh Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubsidyCount();
  }, []);

  const getProgressPercentage = () => {
    if (!progress || !progress.total_pages) return 0;
    return Math.round((progress.pages_completed / progress.total_pages) * 100);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Full Database Refresh</h2>
          <p className="text-muted-foreground">
            Replace your current data with fresh 750+ subsidies from Les-Aides.fr
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{subsidyCount} subsidies currently in database</span>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Current Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subsidyCount}</div>
            <p className="text-xs text-muted-foreground">Total subsidies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Target Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">750+</div>
            <p className="text-xs text-muted-foreground">Real French subsidies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~15</div>
            <p className="text-xs text-muted-foreground">Minutes for full sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Display */}
      {progress && isRefreshing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Sync in Progress
            </CardTitle>
            <CardDescription>
              Session: {currentSession}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.pages_completed}/{progress.total_pages} pages</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-600">{progress.subsidies_processed}</div>
                <div className="text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="font-medium text-green-600">{progress.subsidies_added}</div>
                <div className="text-muted-foreground">Added</div>
              </div>
              <div>
                <div className="font-medium text-red-600">{progress.error_count}</div>
                <div className="text-muted-foreground">Errors</div>
              </div>
              <div>
                <div className="font-medium text-purple-600">
                  {progress.eta_minutes ? `${progress.eta_minutes}m` : 'Calculating...'}
                </div>
                <div className="text-muted-foreground">ETA</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Status: {progress.current_status} • Last updated: {formatTimeAgo(progress.updated_at)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Full Refresh (Recommended)
            </CardTitle>
            <CardDescription>
              Automatically purge old data and sync 750+ fresh subsidies from Les-Aides.fr
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleFullRefresh}
              disabled={isRefreshing || isPurging}
              className="w-full"
              size="lg"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing Database...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Start Full Refresh
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Manual Purge
            </CardTitle>
            <CardDescription>
              Safely backup and clear existing data (without syncing new data)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handlePurgeData}
              disabled={isRefreshing || isPurging}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isPurging ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Purging Data...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Purge Data Only
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> The full refresh will replace all existing subsidy data with fresh, real-time data from Les-Aides.fr. 
          Your current data will be safely backed up before any changes are made. This process typically takes 10-15 minutes and will 
          give you access to 750+ actual French agricultural and business subsidies with real amounts, deadlines, and application URLs.
        </AlertDescription>
      </Alert>
    </div>
  );
};