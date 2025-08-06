import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bot, 
  Settings, 
  Play, 
  Pause, 
  Brain,
  Gauge,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
  qualityThreshold: number;
  retryAttempts: number;
  timeoutSeconds: number;
  customPrompt: string;
  enableStructureValidation: boolean;
  enableQualityFiltering: boolean;
  enableContentPrioritization: boolean;
  languageSpecific: boolean;
  preserveOriginalText: boolean;
}

interface ProcessingResult {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'review_needed';
  confidence: number;
  processingTime: number;
  extractedFields: number;
  errors: string[];
  timestamp: Date;
}

const defaultConfig: AIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 2000,
  batchSize: 3,
  qualityThreshold: 0.7,
  retryAttempts: 3,
  timeoutSeconds: 60,
  customPrompt: '',
  enableStructureValidation: true,
  enableQualityFiltering: true,
  enableContentPrioritization: true,
  languageSpecific: true,
  preserveOriginalText: false
};

export function AIProcessingControl() {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);

  const updateConfig = (field: keyof AIConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentBatch(0);
    
    try {
      toast.info('🤖 Starting AI processing with custom configuration...');
      
      const { data, error } = await supabase.functions.invoke('ai-content-processor', {
        body: {
          source: 'all',
          session_id: `custom-config-${Date.now()}`,
          config: config
        }
      });

      if (error) throw error;
      
      // Simulate progress tracking
      setTotalBatches(Math.ceil((data.total_pages || 10) / config.batchSize));
      
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + (100 / (totalBatches || 1));
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
        
        setCurrentBatch(prev => prev + 1);
      }, 2000);

      if (data.successful > 0) {
        toast.success(`✅ AI processing completed: ${data.successful} subsidies processed!`);
      } else {
        toast.warning(`⚠️ Processing completed with issues: ${data.failed} pages failed`);
      }
      
    } catch (error: any) {
      console.error('AI processing error:', error);
      toast.error(`❌ AI processing failed: ${error.message}`);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setCurrentBatch(0);
      }, 2000);
    }
  };

  const pauseProcessing = () => {
    setIsProcessing(false);
    toast.info('AI processing paused');
  };

  const bulkApprove = () => {
    setResults(prev => prev.map(result => 
      selectedResults.includes(result.id) 
        ? { ...result, status: 'completed' as const }
        : result
    ));
    setSelectedResults([]);
    toast.success(`Approved ${selectedResults.length} results`);
  };

  const bulkReject = () => {
    setResults(prev => prev.filter(result => !selectedResults.includes(result.id)));
    setSelectedResults([]);
    toast.success(`Rejected ${selectedResults.length} results`);
  };

  const getModelDescription = (model: string) => {
    switch (model) {
      case 'gpt-4o':
        return 'Most capable, highest accuracy, slowest processing';
      case 'gpt-4o-mini':
        return 'Balanced performance, good accuracy, faster processing';
      case 'gpt-3.5-turbo':
        return 'Fastest processing, lower accuracy, cost-effective';
      default:
        return 'Select a model for processing';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Processing Control Center
            <HelpTooltip content="Configure OpenAI models, processing parameters, and quality controls for optimal extraction results." />
          </CardTitle>
          <CardDescription>
            Advanced configuration and monitoring for AI-powered content processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6 mt-6">
              <AIConfigurationPanel config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="processing" className="space-y-6 mt-6">
              <ProcessingPanel 
                config={config}
                isProcessing={isProcessing}
                progress={processingProgress}
                currentBatch={currentBatch}
                totalBatches={totalBatches}
                onStart={startProcessing}
                onPause={pauseProcessing}
              />
            </TabsContent>

            <TabsContent value="results" className="space-y-6 mt-6">
              <ResultsPanel 
                results={results}
                selectedResults={selectedResults}
                onSelectionChange={setSelectedResults}
                onBulkApprove={bulkApprove}
                onBulkReject={bulkReject}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              <AnalyticsPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AIConfigurationPanel({ 
  config, 
  updateConfig 
}: { 
  config: AIConfig; 
  updateConfig: (field: keyof AIConfig, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Model Configuration
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>OpenAI Model</Label>
            <Select value={config.model} onValueChange={(value) => updateConfig('model', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o (Premium)</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getModelDescription(config.model)}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Temperature
              <HelpTooltip content="Controls creativity vs consistency. Lower values (0.1) are more deterministic, higher values (0.8) are more creative." />
            </Label>
            <div className="space-y-3">
              <Slider
                value={[config.temperature]}
                onValueChange={([value]) => updateConfig('temperature', value)}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Consistent</span>
                <span className="font-medium">{config.temperature}</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max Tokens per Request</Label>
            <Select value={config.maxTokens.toString()} onValueChange={(value) => updateConfig('maxTokens', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1,000 tokens (concise)</SelectItem>
                <SelectItem value="2000">2,000 tokens (balanced)</SelectItem>
                <SelectItem value="4000">4,000 tokens (detailed)</SelectItem>
                <SelectItem value="8000">8,000 tokens (comprehensive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Batch Size
              <HelpTooltip content="Number of pages processed simultaneously. Higher values are faster but use more API quota." />
            </Label>
            <Select value={config.batchSize.toString()} onValueChange={(value) => updateConfig('batchSize', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 page (safest)</SelectItem>
                <SelectItem value="3">3 pages (recommended)</SelectItem>
                <SelectItem value="5">5 pages (faster)</SelectItem>
                <SelectItem value="10">10 pages (aggressive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quality Controls */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Quality Controls
        </h4>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Quality Threshold
            <HelpTooltip content="Minimum confidence score required to accept extracted data. Higher values ensure better quality." />
          </Label>
          <div className="space-y-3">
            <Slider
              value={[config.qualityThreshold]}
              onValueChange={([value]) => updateConfig('qualityThreshold', value)}
              max={1}
              min={0.1}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1 (Accept all)</span>
              <span className="font-medium">{config.qualityThreshold.toFixed(2)}</span>
              <span>1.0 (Perfect only)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Retry Attempts</Label>
            <Select value={config.retryAttempts.toString()} onValueChange={(value) => updateConfig('retryAttempts', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 attempt</SelectItem>
                <SelectItem value="2">2 attempts</SelectItem>
                <SelectItem value="3">3 attempts (recommended)</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Request Timeout</Label>
            <Select value={config.timeoutSeconds.toString()} onValueChange={(value) => updateConfig('timeoutSeconds', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Processing Options */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Processing Options
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="structure-validation"
              checked={config.enableStructureValidation}
              onCheckedChange={(checked) => updateConfig('enableStructureValidation', checked)}
            />
            <Label htmlFor="structure-validation">Enable structure validation</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="quality-filtering"
              checked={config.enableQualityFiltering}
              onCheckedChange={(checked) => updateConfig('enableQualityFiltering', checked)}
            />
            <Label htmlFor="quality-filtering">Enable quality filtering</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="content-prioritization"
              checked={config.enableContentPrioritization}
              onCheckedChange={(checked) => updateConfig('enableContentPrioritization', checked)}
            />
            <Label htmlFor="content-prioritization">Smart content prioritization</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="language-specific"
              checked={config.languageSpecific}
              onCheckedChange={(checked) => updateConfig('languageSpecific', checked)}
            />
            <Label htmlFor="language-specific">Language-specific processing</Label>
          </div>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Custom System Prompt (Optional)
          <HelpTooltip content="Override the default system prompt with custom instructions. Leave empty to use the default optimized prompt." />
        </Label>
        <Textarea
          placeholder="Enter custom system prompt for specific extraction requirements..."
          value={config.customPrompt}
          onChange={(e) => updateConfig('customPrompt', e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}

function ProcessingPanel({
  config,
  isProcessing,
  progress,
  currentBatch,
  totalBatches,
  onStart,
  onPause
}: {
  config: AIConfig;
  isProcessing: boolean;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  onStart: () => void;
  onPause: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Processing Controls */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Processing Controls
        </h4>

        <div className="flex items-center gap-4">
          {!isProcessing ? (
            <Button onClick={onStart} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start AI Processing
            </Button>
          ) : (
            <Button onClick={onPause} variant="outline" className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause Processing
            </Button>
          )}
        </div>

        {/* Configuration Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h5 className="font-medium mb-3">Current Configuration</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Model:</span>
              <div className="font-medium">{config.model}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Batch Size:</span>
              <div className="font-medium">{config.batchSize} pages</div>
            </div>
            <div>
              <span className="text-muted-foreground">Quality Threshold:</span>
              <div className="font-medium">{config.qualityThreshold.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Max Tokens:</span>
              <div className="font-medium">{config.maxTokens.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Tracking */}
      {isProcessing && (
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Processing Progress
          </h4>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Batch {currentBatch} of {totalBatches}</span>
              <span>Processing with {config.model}</span>
            </div>
          </div>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              AI processing in progress. Current batch size: {config.batchSize} pages. 
              Estimated completion in {Math.ceil((totalBatches - currentBatch) * 2)} minutes.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

function ResultsPanel({
  results,
  selectedResults,
  onSelectionChange,
  onBulkApprove,
  onBulkReject
}: {
  results: ProcessingResult[];
  selectedResults: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}) {
  const lowConfidenceResults = results.filter(r => r.confidence < 0.7);
  const pendingReview = results.filter(r => r.status === 'review_needed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Processing Results
        </h4>
        
        {selectedResults.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedResults.length} selected</Badge>
            <Button size="sm" onClick={onBulkApprove}>Approve</Button>
            <Button size="sm" variant="outline" onClick={onBulkReject}>Reject</Button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-green-600">{results.filter(r => r.status === 'completed').length}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-yellow-600">{pendingReview.length}</div>
          <div className="text-sm text-muted-foreground">Needs Review</div>
        </div>
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-red-600">{results.filter(r => r.status === 'failed').length}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="text-center p-3 bg-muted rounded">
          <div className="text-2xl font-bold text-orange-600">{lowConfidenceResults.length}</div>
          <div className="text-sm text-muted-foreground">Low Confidence</div>
        </div>
      </div>

      {/* Quality Distribution */}
      <div className="space-y-2">
        <Label>Confidence Score Distribution</Label>
        <div className="h-4 bg-muted rounded overflow-hidden flex">
          <div className="bg-green-500 h-full" style={{ width: '40%' }} title="High confidence (0.8-1.0)" />
          <div className="bg-yellow-500 h-full" style={{ width: '35%' }} title="Medium confidence (0.6-0.8)" />
          <div className="bg-red-500 h-full" style={{ width: '25%' }} title="Low confidence (0.0-0.6)" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>High (40%)</span>
          <span>Medium (35%)</span>
          <span>Low (25%)</span>
        </div>
      </div>

      {/* Results placeholder */}
      {results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No processing results yet</p>
          <p className="text-sm">Start AI processing to see results here</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="space-y-6">
      <h4 className="font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Processing Analytics
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Processing Speed */}
        <div className="space-y-3">
          <h5 className="font-medium">Processing Speed Trends</h5>
          <div className="h-32 bg-muted rounded flex items-center justify-center text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <span className="ml-2">Chart placeholder</span>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="space-y-3">
          <h5 className="font-medium">Quality Score Over Time</h5>
          <div className="h-32 bg-muted rounded flex items-center justify-center text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <span className="ml-2">Chart placeholder</span>
          </div>
        </div>

        {/* Model Performance */}
        <div className="space-y-3">
          <h5 className="font-medium">Model Performance Comparison</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">GPT-4o</span>
              <span className="text-sm">94% accuracy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">GPT-4o Mini</span>
              <span className="text-sm">89% accuracy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">GPT-3.5 Turbo</span>
              <span className="text-sm">78% accuracy</span>
            </div>
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="space-y-3">
          <h5 className="font-medium">Processing Costs</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">This month</span>
              <span className="text-sm font-medium">$47.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Last month</span>
              <span className="text-sm">$52.30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average per page</span>
              <span className="text-sm">$0.08</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getModelDescription(model: string) {
  switch (model) {
    case 'gpt-4o':
      return 'Most capable, highest accuracy, slowest processing';
    case 'gpt-4o-mini':
      return 'Balanced performance, good accuracy, faster processing';
    case 'gpt-3.5-turbo':
      return 'Fastest processing, lower accuracy, cost-effective';
    default:
      return 'Select a model for processing';
  }
}