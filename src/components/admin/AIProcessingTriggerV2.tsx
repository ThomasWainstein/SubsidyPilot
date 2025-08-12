import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Play, Loader2, Zap } from 'lucide-react';

export const AIProcessingTriggerV2 = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerV2Processing = async () => {
    setIsProcessing(true);
    
    try {
      toast.info('🚀 Starting V2 Comprehensive AI processing...');
      
      const manualRunId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('ai-content-processor-v2', {
        body: {
          run_id: manualRunId,
          test_mode: true // Process recent pages for testing
        }
      });

      if (error) {
        console.error('V2 AI processor error:', error);
        throw error;
      }
      
      console.log('V2 AI processing response:', data);
      
      if (data?.success) {
        toast.success(`✅ V2 Processing completed! Created ${data.subsidies_created || 0} comprehensive subsidies from ${data.pages_processed || 0} pages`);
      } else {
        toast.error(`❌ V2 Processing failed: ${data?.error || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      console.error('V2 AI processing error:', error);
      toast.error(`❌ V2 Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          V2 Comprehensive AI Processing
        </CardTitle>
        <CardDescription>
          <strong>NEW!</strong> Extracts all 10 comprehensive categories: Core ID, Dates, Eligibility, Funding, Project Scope, Application Process, Evaluation, Documents, Meta, and Compliance data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Extracts:</strong> 70+ fields including reference codes, detailed timelines, comprehensive eligibility criteria, funding breakdowns, evaluation processes, form detection, and compliance requirements.</p>
          </div>
          
          <Button 
            onClick={triggerV2Processing}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing with V2 AI...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test V2 Comprehensive Processing
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};