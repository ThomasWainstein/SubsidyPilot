import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Eye, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ScrapeRun {
  id: string;
  notes: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
  metadata: any;
}

const ScrapeRunsList: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-report?action=runs',
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setRuns(result.runs || []);
      } else {
        throw new Error(result.error || 'Failed to load runs');
      }
    } catch (error) {
      console.error('Failed to load runs:', error);
      toast({
        title: "Error",
        description: `Failed to load runs: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewRun = async () => {
    setStarting(true);
    try {
      const response = await fetch(
        'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-reprocessor?action=start_reprocess',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "New reprocessing run started",
        });
        navigate(`/admin/scrape-report/${result.runId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to start run: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'rolled_back':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'rolled_back':
        return <Badge variant="outline">Rolled Back</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading runs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scrape & Reprocessing Runs</h1>
          <p className="text-gray-600">Monitor and manage document reprocessing runs</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadRuns}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={startNewRun}
            disabled={starting}
          >
            <Play className="h-4 w-4 mr-2" />
            Start New Run
          </Button>
        </div>
      </div>

      {/* Runs List */}
      {runs.length > 0 ? (
        <div className="grid gap-4">
          {runs.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{run.notes || 'Reprocessing Run'}</h3>
                        {getStatusBadge(run.status)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Started:</span>{' '}
                          {new Date(run.started_at).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Duration:</span>{' '}
                          {formatDuration(run.started_at, run.completed_at)}
                          {run.status === 'running' && ' (ongoing)'}
                        </p>
                        {run.completed_at && (
                          <p>
                            <span className="font-medium">Completed:</span>{' '}
                            {new Date(run.completed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 mr-4">
                      ID: {run.id.split('-')[0]}...
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/scrape-report/${run.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Runs Found</h3>
            <p className="text-gray-600 mb-4">No reprocessing runs have been started yet.</p>
            <Button onClick={startNewRun} disabled={starting}>
              <Play className="h-4 w-4 mr-2" />
              Start First Run
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScrapeRunsList;