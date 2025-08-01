import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const QuickSchemaTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testSchemaExtraction = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing schema extraction with fixed prompt...');
      
      const { data, error } = await supabase.functions.invoke('extract-document-schemas', {
        body: { 
          action: 'extract_all_schemas',
          formats: ['pdf']
        }
      });

      if (error) throw error;

      console.log('📊 Extraction result:', data);
      setResult(data);

      toast({
        title: "Test Complete",
        description: `${data.success ? 'Success' : 'Failed'}: ${data.schemasGenerated || 0} schemas generated`,
        variant: data.success ? 'default' : 'destructive'
      });

    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({ error: error.message });
      toast({
        title: "Test Failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>🔬 Quick Schema Extraction Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testSchemaExtraction}
          disabled={isLoading}
          className="mb-4"
        >
          {isLoading ? 'Testing...' : 'Run Real Extraction Test'}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Test Results:</h4>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {result.results && result.results.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium">Generated Schemas:</h5>
                {result.results.map((res: any, index: number) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{res.filename}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {res.schema?.totalFields || 0} fields
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Method: {res.schema?.metadata?.extractionMethod || 'unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence: {res.schema?.extractionConfidence || 0}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-destructive">Errors:</h5>
                {result.errors.map((error: string, index: number) => (
                  <div key={index} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};