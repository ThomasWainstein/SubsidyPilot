import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function DualPipelineManager() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastExecution, setLastExecution] = useState<any>(null);

  const startFullPipeline = async () => {
    setIsRunning(true);
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
    } catch (error: any) {
      toast.error(`Pipeline failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const triggerHarvesting = async (country: string) => {
    try {
      const functionName = country === 'france' ? 'franceagrimer-harvester' : 'afir-harvester';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'scrape', max_pages: 5 }
      });

      if (error) throw error;
      toast.success(`${country} harvesting completed: ${data.pages_scraped} pages`);
    } catch (error: any) {
      toast.error(`${country} harvesting failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔄 Dual Pipeline System</CardTitle>
          <CardDescription>
            Manage the complete AgriTool dual pipeline: content harvesting → AI processing → form generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={startFullPipeline} 
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? 'Running...' : 'Start Full Pipeline'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => triggerHarvesting('france')}>
              🇫🇷 Harvest French Subsidies
            </Button>
            <Button variant="outline" onClick={() => triggerHarvesting('romania')}>
              🇷🇴 Harvest Romanian Subsidies
            </Button>
          </div>

          {lastExecution && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Last Execution:</h4>
              <div className="space-y-2 text-sm">
                <div>Status: <Badge>{lastExecution.status}</Badge></div>
                <div>Pages Scraped: {lastExecution.metrics.pages_scraped}</div>
                <div>Subsidies Extracted: {lastExecution.metrics.subsidies_extracted}</div>
                <div>Forms Generated: {lastExecution.metrics.forms_generated}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}