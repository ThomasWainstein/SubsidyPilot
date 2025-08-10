import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  RotateCcw,
  Play,
  XCircle,
  TrendingUp,
  Database,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface KPIData {
  docs_total: number;
  docs_ok: number;
  docs_fail: number;
  docs_pending: number;
  ocr_rate: number;
  avg_latency: number;
  subsidies_parsed: number;
  pages_crawled: number;
  error_rate: number;
  completion_rate: number;
}

interface ReportData {
  runId: string;
  runInfo: any;
  kpis: KPIData;
  topErrors: Array<{ error_type: string; count: number }>;
  worstSamples: Array<any>;
  queueStatus: Array<{ status: string; count: number }>;
  crawlSummary: any;
  generatedAt: string;
}

const ScrapeReportDashboard: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (runId) {
      loadReport();
      // Auto-refresh every 30 seconds if processing
      const interval = setInterval(() => {
        if (reportData?.kpis.docs_pending > 0) {
          loadReport(true);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [runId]);

  const loadReport = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      // Direct fetch to scrape-report function with query parameters
      const response = await fetch(
        `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-report?action=report&run_id=${runId}`,
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

      const reportResult = await response.json();
      
      if (!reportResult.success && reportResult.error) {
        throw new Error(reportResult.error);
      }
      
      setReportData(reportResult);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast({
        title: "Error",
        description: `Failed to load report: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startReprocessing = async () => {
    setProcessing(true);
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
          description: "Reprocessing started successfully",
        });
        navigate(`/admin/scrape-report/${result.runId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to start reprocessing: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const rollbackRun = async () => {
    if (!confirm('Are you sure you want to rollback this run? This will restore the previous version.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-reprocessor?action=rollback&run_id=${runId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Successfully rolled back to previous version",
        });
        loadReport();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to rollback: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await fetch(
        `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-report?action=report&run_id=${runId}&format=csv`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scrape-report-${runId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to download report: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const retryFailedDocument = async (extractionId: string) => {
    try {
      const response = await fetch(
        'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/scrape-report?action=retry',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ extractionId })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Document queued for retry",
        });
        loadReport();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to retry document: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-4">Could not load the report for run {runId}</p>
          <Button onClick={() => navigate('/admin/scrape-reports')}>
            Back to Reports List
          </Button>
        </div>
      </div>
    );
  }

  const { kpis } = reportData;
  const successRate = kpis.docs_total > 0 ? (kpis.docs_ok / kpis.docs_total) * 100 : 0;
  const ocrRate = kpis.ocr_rate * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scrape Report</h1>
          <p className="text-gray-600">Run ID: {runId}</p>
          <p className="text-sm text-gray-500">
            Generated: {new Date(reportData.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadReport()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={downloadCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button
            variant="outline"
            onClick={startReprocessing}
            disabled={processing}
          >
            <Play className="h-4 w-4 mr-2" />
            Start New Run
          </Button>
          <Button
            variant="destructive"
            onClick={rollbackRun}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rollback
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {kpis.docs_pending > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Processing in progress</p>
                <p className="text-sm text-blue-700">
                  {kpis.docs_pending} documents remaining in queue
                </p>
              </div>
              <Progress 
                value={kpis.completion_rate * 100} 
                className="w-32"
              />
              <span className="text-sm text-blue-700 font-medium">
                {(kpis.completion_rate * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.docs_total}</div>
            <p className="text-xs text-muted-foreground">
              Processed documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis.docs_ok} successful, {kpis.docs_fail} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OCR Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ocrRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Documents requiring OCR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(kpis.avg_latency)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Per document processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="samples">Problem Samples</TabsTrigger>
          <TabsTrigger value="queue">Queue Status</TabsTrigger>
          <TabsTrigger value="crawl">Crawl Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Error Types</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.topErrors.length > 0 ? (
                <div className="space-y-3">
                  {reportData.topErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{error.error_type}</p>
                        </div>
                      </div>
                      <Badge variant="destructive">{error.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No errors recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worst Performing Samples</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.worstSamples.length > 0 ? (
                <div className="space-y-3">
                  {reportData.worstSamples.map((sample, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={sample.status === 'completed' ? 'default' : 'destructive'}
                          >
                            {sample.status}
                          </Badge>
                          {sample.ocr_used && (
                            <Badge variant="outline">OCR</Badge>
                          )}
                          <span className="text-sm text-gray-500">
                            {sample.model_used}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-gray-600 truncate">
                          {sample.extracted_data?.metadata?.source_url || 'Unknown URL'}
                        </p>
                        {sample.error_message && (
                          <p className="text-sm text-red-600 mt-1">
                            {sample.error_message}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {sample.latency_ms || 0}ms
                        </p>
                        <p className="text-xs text-gray-500">
                          {sample.pages_processed || 1} page(s)
                        </p>
                        {sample.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={() => retryFailedDocument(sample.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No samples available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extraction Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportData.queueStatus.map((status, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{status.count}</p>
                    <p className="text-sm text-gray-600 capitalize">{status.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crawl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crawl Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{reportData.crawlSummary.totalEvents}</p>
                  <p className="text-sm text-gray-600">Events</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{reportData.crawlSummary.totalPagesFound}</p>
                  <p className="text-sm text-gray-600">Pages Found</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{reportData.crawlSummary.totalDocsFound}</p>
                  <p className="text-sm text-gray-600">Docs Found</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{Math.round(reportData.crawlSummary.avgResponseTime)}ms</p>
                  <p className="text-sm text-gray-600">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScrapeReportDashboard;