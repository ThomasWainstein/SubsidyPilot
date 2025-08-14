import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bug, Loader2 } from 'lucide-react';

export const AIV2FunctionTester = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const testV2Function = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    const startTime = Date.now();
    console.log('🧪 Testing ai-content-processor-v2 with detailed monitoring...');
    
    try {
      toast.info('🧪 Testing V2 function - check console for details...');
      
      // Set up timeout detection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Function call timed out after 30 seconds'));
        }, 30000);
      });
      
      console.log('📡 Calling ai-content-processor-v2...');
      
      const functionPromise = supabase.functions.invoke('ai-content-processor-v2', {
        body: {
          run_id: crypto.randomUUID(),
          test_mode: true,
          debug: true,
          limit: 1 // Process only 1 page for testing
        }
      });
      
      const result = await Promise.race([functionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Function completed in ${duration}ms`);
      console.log('✅ Result:', result);
      
      setTestResult({ success: true, result, duration });
      toast.success(`✅ V2 Function test completed in ${duration}ms`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ Function failed after ${duration}ms`);
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorType = 'Unknown error';
      if (error.message?.includes('timed out')) {
        errorType = '🕒 Function hanging - likely OpenAI API timeout';
      } else if (error.message?.includes('Failed to fetch')) {
        errorType = '🌐 Network/Authentication issue';
      } else if (error.message?.includes('Function returned an error')) {
        errorType = '⚡ Function runtime error';
      }
      
      setTestResult({ success: false, error, duration, errorType });
      toast.error(`❌ V2 Function test failed: ${errorType}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-orange-500" />
          V2 Function Debugger
        </CardTitle>
        <CardDescription>
          Test the ai-content-processor-v2 function with detailed error monitoring and timeout detection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={testV2Function}
            disabled={isTesting}
            className="w-full"
            variant="outline"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing V2 Function...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Test V2 Function (Debug Mode)
              </>
            )}
          </Button>
          
          {testResult && (
            <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="space-y-2">
                <div className="font-semibold">
                  {testResult.success ? '✅ Test Passed' : '❌ Test Failed'}
                </div>
                <div className="text-sm">
                  Duration: {testResult.duration}ms
                </div>
                {testResult.errorType && (
                  <div className="text-sm text-red-600">
                    Error Type: {testResult.errorType}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Check browser console for detailed logs
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};