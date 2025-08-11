import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { StatusBadge, StatusType } from '@/components/ui/status-badge';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PipelineResultsDashboard } from '@/components/admin/PipelineResultsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { usePipelineRun } from '@/hooks/usePipelineRun';
import { toast } from 'sonner';
import { 
  Play, 
  Bot, 
  Database,
  Flag,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  X,
  FileText
} from 'lucide-react';

export default function EnhancedDualPipelineManager() {
  const { run, loading, error, start, cancel, isActive, isStarting } = usePipelineRun();
  const [frenchHarvesting, setFrenchHarvesting] = useState(false);
  const [romanianHarvesting, setRomanianHarvesting] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Map pipeline status to StatusType
  const mapPipelineStatusToStatusType = (pipelineStatus: string): StatusType => {
    switch (pipelineStatus) {
      case 'queued': return 'pending';
      case 'running': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'error';
      case 'canceled': return 'cancelled';
      default: return 'pending';
    }
  };

  // Derive UI state from pipeline run
  const getStageStatus = (stage: string): StatusType => {
    if (!run) return 'ready';
    
    const currentStageIndex = ['init', 'harvest', 'ai', 'forms', 'done'].indexOf(run.stage);
    const targetStageIndex = ['init', 'harvest', 'ai', 'forms', 'done'].indexOf(stage);
    
    if (run.status === 'failed' && currentStageIndex >= targetStageIndex) return 'error';
    if (run.status === 'completed' && stage !== 'done') return 'completed';
    if (currentStageIndex > targetStageIndex) return 'completed';
    if (currentStageIndex === targetStageIndex && run.status === 'running') return 'processing';
    if (currentStageIndex < targetStageIndex) return 'pending';
    
    return 'ready';
  };

  const pipelineSteps = [
    {
      label: 'Content Harvesting',
      status: getStageStatus('harvest'),
      description: 'Scraping government websites for subsidy information'
    },
    {
      label: 'AI Processing', 
      status: getStageStatus('ai'),
      description: 'Converting raw content to structured data using OpenAI'
    },
    {
      label: 'Form Generation',
      status: getStageStatus('forms'),
      description: 'Creating application forms from structured data'
    }
  ];

  const getCurrentStepIndex = () => {
    if (!run) return 0;
    return ['init', 'harvest', 'ai', 'forms', 'done'].indexOf(run.stage);
  };

  const getOperationMessage = () => {
    if (!run) return '';
    
    if (run.status === 'failed') return `Pipeline failed at ${run.stage} stage`;
    if (run.status === 'completed') return 'Pipeline completed successfully!';
    if (run.status === 'canceled') return 'Pipeline was canceled';
    
    switch (run.stage) {
      case 'init': return 'Initializing pipeline...';
      case 'harvest': return 'Harvesting content from government websites...';
      case 'ai': return 'Processing content with AI...';
      case 'forms': return 'Generating application forms...';
      case 'done': return 'Pipeline completed!';
      default: return 'Processing...';
    }
  };

  const startFullPipeline = async () => {
    try {
      await start({
        countries: ['france', 'romania'],
        max_pages_per_country: 10,
        enable_ai_processing: true,
        enable_form_generation: true
      });
      
      toast.success('Dual pipeline started successfully!');
    } catch (error: any) {
      toast.error(`Pipeline failed to start: ${error.message}`);
    }
  };

  const handleCancel = async () => {
    try {
      await cancel();
      toast.info('Pipeline canceled');
    } catch (error: any) {
      toast.error(`Failed to cancel pipeline: ${error.message}`);
    }
  };

  const triggerHarvesting = async (country: string) => {
    const setHarvesting = country === 'france' ? setFrenchHarvesting : setRomanianHarvesting;
    setHarvesting(true);
    
    try {
      const functionName = country === 'france' ? 'franceagrimer-harvester' : 'afir-harvester';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'scrape', max_pages: 5 }
      });

      if (error) throw error;
      toast.success(`${country} harvesting completed: ${data.pages_scraped} pages`);
    } catch (error: any) {
      toast.error(`${country} harvesting failed: ${error.message}`);
    } finally {
      setHarvesting(false);
    }
  };

  const triggerAIProcessing = async () => {
    setAiProcessing(true);
    
    try {
      toast.info('🤖 Starting AI processing of scraped pages...');
      
      const { data, error } = await supabase.functions.invoke('ai-content-processor', {
        body: {
          source: 'all',
          session_id: `manual-trigger-${Date.now()}`,
          quality_threshold: 0.6
        }
      });

      if (error) throw error;
      
      if (data.successful > 0) {
        toast.success(`✅ AI processing completed: ${data.successful} subsidies processed successfully!`);
      } else if (data.failed > 0) {
        toast.warning(`⚠️ AI processing completed with issues: ${data.failed} pages failed to process`);
      } else {
        toast.info(`ℹ️ AI processing completed: ${data.message || 'No new pages to process'}`);
      }
      
    } catch (error: any) {
      console.error('AI processing error:', error);
      toast.error(`❌ AI processing failed: ${error.message}`);
    } finally {
      setAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Results Dashboard */}
      <PipelineResultsDashboard />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔄 Enhanced Dual Pipeline System
            <HelpTooltip content="The dual pipeline first harvests content from government websites, then processes it with AI to create structured subsidy data and application forms." />
          </CardTitle>
          <CardDescription>
            Manage the complete AgriTool dual pipeline: content harvesting → AI processing → form generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Main Pipeline Control */}
          <div className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Pipeline Control Button */}
            {!isActive && !isStarting ? (
              <EnhancedButton 
                onClick={startFullPipeline} 
                loading={loading}
                loadingText="Loading Pipeline"
                tooltip="Runs the complete pipeline: harvests French & Romanian subsidies, processes with AI, and generates forms. Takes 5-10 minutes."
                confirmAction={true}
                confirmMessage="Start Full Pipeline?"
                className="w-full h-12 text-lg"
                icon={<Play className="h-5 w-5" />}
              >
                Start Full Pipeline
              </EnhancedButton>
            ) : (
              <div className="space-y-2">
                <EnhancedButton 
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isStarting || run?.status === 'completed'}
                  className="w-full h-12 text-lg"
                  icon={<X className="h-5 w-5" />}
                >
                  {isStarting ? 'Starting...' : run?.status === 'completed' ? 'Completed' : 'Cancel Pipeline'}
                </EnhancedButton>
                
                {run && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Run ID: {run.id}</span>
                    <span>Status: <StatusBadge status={mapPipelineStatusToStatusType(run.status)} /></span>
                  </div>
                )}
              </div>
            )}

            {/* Progress Indicator */}
            {isActive && (
              <ProgressIndicator
                steps={pipelineSteps}
                currentStep={getCurrentStepIndex()}
                progress={run?.progress || 0}
                showProgress={true}
              />
            )}

            {/* Operation Status */}
            {isActive && (
              <Alert className={run?.status === 'failed' ? 'border-destructive' : ''}>
                <Clock className="h-4 w-4" />
                <AlertDescription>{getOperationMessage()}</AlertDescription>
              </Alert>
            )}

            {/* Pipeline Stats */}
            {run?.stats && Object.keys(run.stats).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                {run.stats.pages_scraped && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{run.stats.pages_scraped}</div>
                    <div className="text-sm text-muted-foreground">Pages Scraped</div>
                  </div>
                )}
                {run.stats.subsidies_extracted && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{run.stats.subsidies_extracted}</div>
                    <div className="text-sm text-muted-foreground">Subsidies Extracted</div>
                  </div>
                )}
                {run.stats.forms_generated && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{run.stats.forms_generated}</div>
                    <div className="text-sm text-muted-foreground">Forms Generated</div>
                  </div>
                )}
                {run?.progress && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{run.progress}%</div>
                    <div className="text-sm text-muted-foreground">Progress</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual Harvest Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedButton 
              variant="outline" 
              onClick={() => triggerHarvesting('france')}
              loading={frenchHarvesting}
              loadingText="Harvesting"
              showElapsedTime={true}
              tooltip="Scrapes FranceAgriMer website for new agricultural subsidies. Typically finds 20-50 pages. Takes 2-5 minutes."
              icon={<Flag className="h-4 w-4" />}
            >
              🇫🇷 Harvest French Subsidies
            </EnhancedButton>
            
            <EnhancedButton 
              variant="outline" 
              onClick={() => triggerHarvesting('romania')}
              loading={romanianHarvesting}
              loadingText="Harvesting"
              showElapsedTime={true}
              tooltip="Scrapes AFIR website for Romanian agricultural subsidies. Typically finds 30-70 pages. Takes 3-7 minutes."
              icon={<Flag className="h-4 w-4" />}
            >
              🇷🇴 Harvest Romanian Subsidies
            </EnhancedButton>
          </div>

          {/* AI Processing Control */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Processing
              </h4>
              <HelpTooltip content="Converts raw scraped content into structured subsidy data using OpenAI. Extracts titles, descriptions, eligibility criteria, deadlines, and more." />
            </div>
            
            <EnhancedButton 
              variant="outline" 
              onClick={triggerAIProcessing} 
              loading={aiProcessing}
              loadingText="Processing"
              showElapsedTime={true}
              tooltip="Processes all raw scraped pages with AI to extract structured subsidy information. Takes 3-8 minutes depending on content volume."
              className="w-full"
              icon={<Database className="h-4 w-4" />}
            >
              Process Scraped Pages with AI
            </EnhancedButton>
            
            <p className="text-sm text-muted-foreground mt-2">
              Converts raw scraped content into structured subsidy data using OpenAI
            </p>
          </div>

          {/* Last Execution Results */}
          {run && run.status === 'completed' && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Last Execution Results</h4>
                <StatusBadge status={mapPipelineStatusToStatusType(run.status)} />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{run.stats?.pages_scraped || 0}</Badge>
                  <span>Pages Scraped</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{run.stats?.subsidies_extracted || 0}</Badge>
                  <span>Subsidies Extracted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{run.stats?.forms_generated || 0}</Badge>
                  <span>Forms Generated</span>
                </div>
              </div>

              {run.started_at && run.ended_at && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Processing time: {Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                </div>
              )}
            </div>
          )}

          {/* View Logs Link */}
          {run && (
            <div className="flex justify-center">
              <EnhancedButton
                variant="ghost"
                size="sm"
                icon={<FileText className="h-4 w-4" />}
                tooltip="View detailed pipeline logs and metrics"
              >
                View Pipeline Logs
              </EnhancedButton>
            </div>
          )}

          {/* System Health Indicators */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>All systems operational</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Last check: {new Date().toLocaleTimeString()}</span>
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};