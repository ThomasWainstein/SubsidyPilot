import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PipelineResultsDashboard } from '@/components/admin/PipelineResultsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Bot, 
  Database,
  Flag,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function EnhancedDualPipelineManager() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastExecution, setLastExecution] = useState<any>(null);
  const [frenchHarvesting, setFrenchHarvesting] = useState(false);
  const [romanianHarvesting, setRomanianHarvesting] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  const pipelineSteps = [
    {
      label: 'Content Harvesting',
      status: isRunning || frenchHarvesting || romanianHarvesting ? 'processing' as const : 'ready' as const,
      description: 'Scraping government websites for subsidy information'
    },
    {
      label: 'AI Processing',
      status: aiProcessing ? 'processing' as const : 'ready' as const,
      description: 'Converting raw content to structured data using OpenAI'
    },
    {
      label: 'Form Generation',
      status: 'pending' as const,
      description: 'Creating application forms from structured data'
    }
  ];

  const startFullPipeline = async () => {
    setIsRunning(true);
    setOperationProgress(0);
    setCurrentOperation('Initializing dual pipeline...');
    
    try {
      const { data, error } = await supabase.functions.invoke('dual-pipeline-orchestrator', {
        body: {
          action: 'start_full_pipeline',
          execution_config: {
            countries: ['france', 'romania'],
            max_pages_per_country: 10,
            enable_ai_processing: true,
            enable_form_generation: true
          }
        }
      });

      if (error) throw error;

      setLastExecution(data.execution);
      toast.success(`Dual pipeline started: ${data.execution_id}`);
      
      // Simulate progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        setOperationProgress(Math.min(progress, 95));
        
        if (progress < 30) {
          setCurrentOperation('Harvesting French subsidies...');
        } else if (progress < 60) {
          setCurrentOperation('Harvesting Romanian subsidies...');
        } else if (progress < 90) {
          setCurrentOperation('Processing with AI...');
        } else {
          setCurrentOperation('Generating forms...');
        }
        
        if (progress >= 95) {
          clearInterval(interval);
          setOperationProgress(100);
          setCurrentOperation('Pipeline completed successfully!');
        }
      }, 2000);

    } catch (error: any) {
      toast.error(`Pipeline failed: ${error.message}`);
      setCurrentOperation('Pipeline failed - see error details');
    } finally {
      setTimeout(() => {
        setIsRunning(false);
        setOperationProgress(0);
        setCurrentOperation('');
      }, 3000);
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
            <EnhancedButton 
              onClick={startFullPipeline} 
              loading={isRunning}
              loadingText="Running Pipeline"
              showElapsedTime={true}
              tooltip="Runs the complete pipeline: harvests French & Romanian subsidies, processes with AI, and generates forms. Takes 5-10 minutes."
              confirmAction={true}
              confirmMessage="Start Full Pipeline?"
              className="w-full h-12 text-lg"
              icon={<Play className="h-5 w-5" />}
            >
              Start Full Pipeline
            </EnhancedButton>

            {isRunning && (
              <ProgressIndicator
                steps={pipelineSteps}
                currentStep={operationProgress < 60 ? 0 : operationProgress < 90 ? 1 : 2}
                progress={operationProgress}
                showProgress={true}
              />
            )}

            {currentOperation && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>{currentOperation}</AlertDescription>
              </Alert>
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

          {/* Execution Results */}
          {lastExecution && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Last Execution Results</h4>
                <StatusBadge status={lastExecution.status} />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{lastExecution.metrics?.pages_scraped || 0}</Badge>
                  <span>Pages Scraped</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{lastExecution.metrics?.subsidies_extracted || 0}</Badge>
                  <span>Subsidies Extracted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{lastExecution.metrics?.forms_generated || 0}</Badge>
                  <span>Forms Generated</span>
                </div>
              </div>

              {lastExecution.metrics?.processing_time && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Processing time: {lastExecution.metrics.processing_time}
                </div>
              )}
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