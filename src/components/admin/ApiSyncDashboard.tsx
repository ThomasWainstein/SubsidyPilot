import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';

export const ApiSyncDashboard: React.FC = () => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

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
                <span className="font-medium text-green-600">✅ API Authenticated</span>
              </div>
              <Button 
                onClick={() => triggerSync('les-aides-fixed')}
                disabled={syncing === 'les-aides-fixed'}
                className="w-full"
              >
                {syncing === 'les-aides-fixed' ? (
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
    </div>
  );
};