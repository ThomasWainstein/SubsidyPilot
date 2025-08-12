import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Play, Loader2 } from 'lucide-react';

export const AIProcessingTrigger = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerAIProcessing = async () => {
    setIsProcessing(true);
    
    try {
      toast.info('🤖 Starting AI processing of scraped pages...');
      
      // Generate a unique run_id for this manual trigger
      const manualRunId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('ai-content-processor', {
        body: {
          run_id: manualRunId,
          quality_threshold: 0.6,
          min_len: 200,
          model: 'gpt-4o-mini',
          allow_recent_fallback: true
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('AI processing response:', data);
      
      if (data?.success) {
        toast.success(`✅ AI processing completed! Created ${data.subsidies_created || 0} subsidies from ${data.pages_processed || 0} pages`);
      } else {
        toast.error(`❌ AI processing failed: ${data?.error || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      console.error('AI processing error:', error);
      toast.error(`❌ AI processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Content Processing
        </CardTitle>
        <CardDescription>
          Process recently scraped pages with AI to extract structured subsidy data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={triggerAIProcessing}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing with AI...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Process Scraped Pages with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};