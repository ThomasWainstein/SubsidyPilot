import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SchemaExtractionDemoProps {
  className?: string;
}

const SchemaExtractionDemo: React.FC<SchemaExtractionDemoProps> = ({ className }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runSchemaExtraction = async () => {
    setIsExtracting(true);
    setResults(null);
    
    try {
      console.log('🔧 Starting schema extraction...');
      
      toast({
        title: "Extracting Document Schemas",
        description: "Parsing PDFs and generating JSON form schemas..."
      });

      const { data, error } = await supabase.functions.invoke('extract-document-schemas', {
        body: { 
          action: 'extract_all_schemas',
          formats: ['pdf', 'docx', 'xlsx']
        }
      });

      if (error) {
        throw new Error(`Schema extraction failed: ${error.message}`);
      }

      console.log('✅ Schema extraction completed:', data);
      setResults(data);

      toast({
        title: "Schema Extraction Complete",
        description: `Generated ${data?.schemasGenerated || 0} schemas from ${data?.totalDocuments || 0} documents`
      });

    } catch (error) {
      console.error('❌ Schema extraction failed:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
      setResults({ error: error.message });
    } finally {
      setIsExtracting(false);
    }
  };

  const checkStoredSchemas = async () => {
    try {
      const { data, error } = await supabase
        .from('subsidy_form_schemas' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
      console.log('Stored schemas:', { data, error });
      
      if (error) {
        toast({
          title: "Schema Check Failed",
          description: `Query error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Schema Database Status",
          description: `Found ${data?.length || 0} stored schemas`
        });
        setResults({ storedSchemas: data || [] });
      }
    } catch (error) {
      console.error('Schema check error:', error);
      toast({
        title: "Schema Check Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>⚙️ Document Schema Extraction Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Extract form schemas from real subsidy documents
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={runSchemaExtraction}
            disabled={isExtracting}
            className="flex-1"
          >
            {isExtracting ? 'Extracting...' : 'Extract Schemas'}
          </Button>
          <Button 
            variant="outline"
            onClick={checkStoredSchemas}
            disabled={isExtracting}
          >
            Check Stored
          </Button>
        </div>

        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            <h4 className="font-medium">Schema Extraction Results:</h4>
            
            {results.error ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                <strong>Error:</strong> {results.error}
              </div>
            ) : results.storedSchemas ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <strong>Stored Schemas:</strong> {results.storedSchemas.length} found
                </div>
                {results.storedSchemas.map((schema: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 border rounded text-sm">
                    <div className="font-medium">Schema ID: {schema.id}</div>
                    <div>Subsidy ID: {schema.subsidy_id}</div>
                    <div>Version: {schema.version}</div>
                    <div>Created: {new Date(schema.created_at).toLocaleString()}</div>
                    {schema.schema && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">View Schema JSON</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40 border">
                          {JSON.stringify(schema.schema, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Documents Processed: <Badge variant="secondary">{results.totalDocuments || 0}</Badge></div>
                  <div>Schemas Generated: <Badge variant="secondary">{results.schemasGenerated || 0}</Badge></div>
                  <div>Success Rate: <Badge variant="secondary">
                    {results.totalDocuments > 0 ? Math.round((results.schemasGenerated / results.totalDocuments) * 100) : 0}%
                  </Badge></div>
                  <div>Errors: <Badge variant="secondary">{results.errors?.length || 0}</Badge></div>
                </div>
                
                {/* Show actual generated schemas */}
                {results.results && results.results.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium">Generated Schemas:</h5>
                    {results.results.map((result: any, index: number) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                        <div className="font-medium">{result.filename}</div>
                        <div>Schema ID: {result.schemaId}</div>
                        <div>Fields: {result.schema?.totalFields || 0}</div>
                        <div>Confidence: {result.schema?.extractionConfidence || 0}%</div>
                        {result.note && <div className="text-orange-600">Note: {result.note}</div>}
                        
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">View Generated Schema</summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40 border">
                            {JSON.stringify(result.schema, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
                
                {results.errors && results.errors.length > 0 && (
                  <div>
                    <h5 className="font-medium text-destructive">Extraction Errors:</h5>
                    <ul className="text-xs text-destructive space-y-1">
                      {results.errors.map((error: string, i: number) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p><strong>Schema Extraction Process:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Fetch documents from document_extraction_status table</li>
            <li>Parse PDF/DOCX/XLSX content using OpenAI GPT-4</li>
            <li>Generate structured JSON form schemas with fields, validation</li>
            <li>Store schemas in subsidy_form_schemas table</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchemaExtractionDemo;