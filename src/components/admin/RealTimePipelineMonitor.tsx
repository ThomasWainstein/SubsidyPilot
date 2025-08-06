import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Settings, 
  BarChart3, 
  Eye, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw,
  Bot,
  Globe,
  FileText,
  Database
} from 'lucide-react';

interface PipelineStage {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metrics: {
    pages_discovered?: number;
    pages_scraped?: number;
    subsidies_extracted?: number;
    forms_generated?: number;
    success_rate?: number;
    processing_time_ms?: number;
    error_count?: number;
  };
  error_details: string[];
  started_at: string;
  completed_at?: string;
}

interface BusinessValue {
  subsidies_available_to_farmers: number;
  forms_ready_for_application: number;
  data_quality_score: number;
}

interface PipelineExecution {
  pipeline_id: string;
  execution_type: string;
  stages: PipelineStage[];
  overall_status: 'success' | 'partial_success' | 'failed';
  total_processing_time_ms: number;
  business_value_delivered: BusinessValue;
  next_steps: string[];
}

interface PipelineConfig {
  max_pages: number;
  quality_threshold: number;
  enable_romanian: boolean;
  enable_forms: boolean;
  batch_size: number;
}

export default function RealTimePipelineMonitor() {
  const [currentExecution, setCurrentExecution] = useState<PipelineExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<PipelineConfig>({
    max_pages: 25,
    quality_threshold: 0.4,
    enable_romanian: true,
    enable_forms: true,
    batch_size: 5
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [activeStage, setActiveStage] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [executionHistory, setExecutionHistory] = useState<PipelineExecution[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Load recent pipeline executions
  useEffect(() => {
    const loadPipelineHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('pipeline_executions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Transform the data to match our interface
        const transformedData = (data || []).map(execution => ({
          pipeline_id: execution.id,
          execution_type: execution.execution_type,
          stages: [{
            stage: execution.execution_type,
            status: execution.status as 'pending' | 'running' | 'completed' | 'failed',
            metrics: {
              pages_discovered: (execution.metrics as any)?.pages_discovered || execution.batch_size || 0,
              pages_scraped: (execution.metrics as any)?.pages_scraped || execution.processed_count || 0,
              subsidies_extracted: execution.success_count || 0,
              forms_generated: (execution.metrics as any)?.forms_generated || 0,
              success_rate: execution.processed_count ? Math.round((execution.success_count || 0) / execution.processed_count * 100) : 0,
              processing_time_ms: execution.completed_at ? 
                new Date(execution.completed_at).getTime() - new Date(execution.started_at || execution.created_at).getTime() : 0,
              error_count: execution.failure_count || 0
            },
            error_details: [],
            started_at: execution.started_at || execution.created_at,
            completed_at: execution.completed_at
          }],
          overall_status: execution.status === 'completed' ? 'success' as const : 
                         execution.status === 'failed' ? 'failed' as const : 'partial_success' as const,
          total_processing_time_ms: execution.completed_at ? 
            new Date(execution.completed_at).getTime() - new Date(execution.started_at || execution.created_at).getTime() : 0,
          business_value_delivered: {
            subsidies_available_to_farmers: execution.success_count || 0,
            forms_ready_for_application: Math.floor((execution.success_count || 0) * 0.3),
            data_quality_score: execution.success_count ? Math.round((execution.success_count / (execution.processed_count || 1)) * 100) : 0
          },
          next_steps: execution.status === 'failed' ? ['Review error logs', 'Retry with adjusted parameters'] : 
                     execution.status === 'completed' ? ['Review extracted data', 'Validate forms'] : []
        }));
        
        setExecutionHistory(transformedData);
      } catch (error) {
        console.error('Failed to load pipeline history:', error);
      }
    };

    loadPipelineHistory();
  }, []);

  const runPipeline = async (type: string) => {
    if (isRunning) return;

    setIsRunning(true);
    setActiveStage('initializing');
    addLog(`🚀 Starting ${type} pipeline with ${config.max_pages} max pages`);

    try {
      const { data, error } = await supabase.functions.invoke('dual-pipeline-orchestrator', {
        body: {
          action: type,
          max_pages: config.max_pages,
          execution_config: {
            quality_threshold: config.quality_threshold,
            enable_romanian: config.enable_romanian,
            enable_forms: config.enable_forms,
            batch_size: config.batch_size
          }
        }
      });

      if (error) throw error;

      setCurrentExecution(data.detailed_result);
      addLog(`✅ Pipeline completed: ${data.detailed_result.business_value_delivered.subsidies_available_to_farmers} subsidies available`);
      
      // Show business value summary
      const bv = data.detailed_result.business_value_delivered;
      addLog(`📊 Business Value: ${bv.subsidies_available_to_farmers} subsidies, ${bv.forms_ready_for_application} forms, ${bv.data_quality_score}% quality`);

      // Add to history
      setExecutionHistory(prev => [data.detailed_result, ...prev.slice(0, 9)]);

      toast.success(`Pipeline completed successfully! ${bv.subsidies_available_to_farmers} subsidies now available to farmers.`);

    } catch (error: any) {
      addLog(`❌ Pipeline failed: ${error.message}`);
      toast.error(`Pipeline failed: ${error.message}`);
      console.error('Pipeline error:', error);
    } finally {
      setIsRunning(false);
      setActiveStage('');
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial_success': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const calculateOverallProgress = () => {
    if (!currentExecution || currentExecution.stages.length === 0) return 0;
    
    const completedStages = currentExecution.stages.filter(s => s.status === 'completed').length;
    return (completedStages / currentExecution.stages.length) * 100;
  };

  const getStageDisplayIcon = (stageName: string) => {
    switch (stageName) {
      case 'harvesting': return <Globe className="h-4 w-4" />;
      case 'processing': return <Bot className="h-4 w-4" />;
      case 'form_generation': return <FileText className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pipeline Configuration
            <HelpTooltip content="Configure pipeline parameters to optimize performance for your specific needs. Lower quality thresholds capture more data but may include lower-quality entries." />
          </CardTitle>
          <CardDescription>
            Configure execution parameters for optimal performance and data quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Pages per Country
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={config.max_pages}
                onChange={(e) => setConfig(prev => ({ ...prev, max_pages: parseInt(e.target.value) || 25 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Threshold
              </label>
              <input
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={config.quality_threshold}
                onChange={(e) => setConfig(prev => ({ ...prev, quality_threshold: parseFloat(e.target.value) || 0.4 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.batch_size}
                onChange={(e) => setConfig(prev => ({ ...prev, batch_size: parseInt(e.target.value) || 5 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>
            
            <div className="flex flex-col space-y-2 pt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enable_romanian}
                  onChange={(e) => setConfig(prev => ({ ...prev, enable_romanian: e.target.checked }))}
                  disabled={isRunning}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Enable Romanian</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enable_forms}
                  onChange={(e) => setConfig(prev => ({ ...prev, enable_forms: e.target.checked }))}
                  disabled={isRunning}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Generate Forms</span>
              </label>
            </div>
          </div>

          {/* Pipeline Control Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => runPipeline('start_full_pipeline')}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Start Full Pipeline'}
            </Button>
            
            <Button
              onClick={() => runPipeline('harvest_french')}
              disabled={isRunning}
              variant="outline"
              className="px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🇫🇷 French Only
            </Button>
            
            <Button
              onClick={() => runPipeline('process_ai')}
              disabled={isRunning}
              variant="outline"
              className="px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🤖 AI Processing
            </Button>

            <Button
              onClick={() => runPipeline('generate_forms')}
              disabled={isRunning}
              variant="outline"
              className="px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📝 Generate Forms
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Execution Status */}
      {currentExecution && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pipeline Execution: {currentExecution.pipeline_id.split('-').pop()}
              </CardTitle>
              
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(currentExecution.overall_status)}`}>
                {currentExecution.overall_status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Overall Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{calculateOverallProgress().toFixed(0)}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-2" />
            </div>

            {/* Business Value Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Subsidies Available</p>
                    <p className="text-2xl font-bold text-green-900">
                      {currentExecution.business_value_delivered.subsidies_available_to_farmers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Forms Ready</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {currentExecution.business_value_delivered.forms_ready_for_application}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Quality Score</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentExecution.business_value_delivered.data_quality_score}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage-by-Stage Progress */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Pipeline Stages</h4>
              
              {currentExecution.stages.map((stage, index) => (
                <div key={`${stage.stage}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStageIcon(stage.status)}
                      {getStageDisplayIcon(stage.stage)}
                      <span className="font-medium capitalize">
                        {stage.stage.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {stage.completed_at && stage.started_at ? 
                        formatDuration(new Date(stage.completed_at).getTime() - new Date(stage.started_at).getTime()) :
                        stage.status === 'running' ? 'In progress...' : 'Pending'
                      }
                    </div>
                  </div>

                  {/* Stage Metrics */}
                  {Object.keys(stage.metrics).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {Object.entries(stage.metrics).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{value}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stage Errors */}
                  {stage.error_details.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-600">
                          <div className="font-medium">Issues:</div>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {stage.error_details.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Processing Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Processing Time:</span>
                <span>{formatDuration(currentExecution.total_processing_time_ms)}</span>
              </div>
            </div>

            {/* Next Steps */}
            {currentExecution.next_steps.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Recommended Next Steps:</h5>
                <ul className="space-y-1">
                  {currentExecution.next_steps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-sm text-gray-600">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Live Pipeline Logs
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="bg-black rounded-lg p-4 h-64 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-400">Waiting for pipeline activity...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-green-400 mb-1">
                  {log}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pipeline History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Pipeline Executions
          </CardTitle>
          <CardDescription>
            Historical view of pipeline runs with business value delivered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executionHistory.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              Pipeline execution history will appear here after running pipelines.
              <br />
              Each execution will show: timestamp, duration, success rate, and business value delivered.
            </div>
          ) : (
            <div className="space-y-3">
              {executionHistory.map((execution, index) => (
                <div key={execution.pipeline_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {execution.pipeline_id.split('-').pop()}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs ${getStatusColor(execution.overall_status)}`}>
                        {execution.overall_status.replace('_', ' ')}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDuration(execution.total_processing_time_ms)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {execution.business_value_delivered.subsidies_available_to_farmers}
                      </div>
                      <div className="text-gray-500">Subsidies</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {execution.business_value_delivered.forms_ready_for_application}
                      </div>
                      <div className="text-gray-500">Forms</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">
                        {execution.business_value_delivered.data_quality_score}%
                      </div>
                      <div className="text-gray-500">Quality</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}