import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Download, TestTube, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExtractionResult {
  formFields: any[];
  accuracy: number;
  processingTime: number;
  errors: string[];
  extractedText?: string;
}

export const SubsidyDocumentExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [results, setResults] = useState<ExtractionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Test URLs for real French subsidy documents
  const testDocuments = [
    {
      name: "CAP Strategic Plan 2023-2027",
      url: "https://agriculture.gouv.fr/sites/default/files/documents/psp_france_2023-2027_vf.pdf"
    },
    {
      name: "FEADER Rural Development",
      url: "https://agriculture.gouv.fr/sites/default/files/documents/feader-2023-formulaire-aide.pdf"
    },
    {
      name: "Organic Farming Support",
      url: "https://www.franceagrimer.fr/content/download/65432/document/formulaire-bio-2024.pdf"
    }
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const extractFromDocument = async (documentUrl: string) => {
    setIsExtracting(true);
    setResults(null);
    setLogs([]);
    
    try {
      addLog('🚀 Starting subsidy document extraction...');
      addLog(`📄 Processing: ${documentUrl}`);
      
      // Test actual document extraction capability
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('extract-subsidy-form-fields', {
        body: {
          documentUrl,
          extractionType: 'subsidy_application_form',
          testMode: true
        }
      });

      const processingTime = Date.now() - startTime;

      if (error) {
        addLog(`❌ Extraction failed: ${error.message}`);
        toast.error(`Extraction failed: ${error.message}`);
        return;
      }

      addLog(`✅ Extraction completed in ${processingTime}ms`);
      
      // Analyze extraction quality
      const formFields = data?.formFields || [];
      const accuracy = data?.confidence || 0;
      const errors = data?.errors || [];

      addLog(`📊 Found ${formFields.length} form fields`);
      addLog(`🎯 Confidence score: ${accuracy}%`);
      
      if (errors.length > 0) {
        addLog(`⚠️ ${errors.length} extraction errors detected`);
      }

      const result: ExtractionResult = {
        formFields,
        accuracy,
        processingTime,
        errors,
        extractedText: data?.extractedText
      };

      setResults(result);
      
      if (accuracy >= 85) {
        toast.success(`High-quality extraction: ${accuracy}% accuracy`);
      } else if (accuracy >= 70) {
        toast.success(`Moderate extraction: ${accuracy}% accuracy`);
      } else {
        toast.error(`Low-quality extraction: ${accuracy}% accuracy`);
      }

    } catch (error) {
      addLog(`❌ System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('System error during extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;
    
    const data = {
      timestamp: new Date().toISOString(),
      documentUrl: testUrl,
      results,
      logs
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subsidy-extraction-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-500" />
            Subsidy Document Field Extraction - Proof of Concept
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Testing Phase:</strong> This validates whether we can extract form fields from real subsidy documents 
                with sufficient accuracy to build application forms.
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testUrl">Document URL</Label>
              <Input
                id="testUrl"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Enter PDF URL to test extraction..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Quick Test Documents</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {testDocuments.map((doc, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setTestUrl(doc.url)}
                    disabled={isExtracting}
                  >
                    {doc.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={() => extractFromDocument(testUrl)}
              disabled={isExtracting || !testUrl}
              className="flex items-center gap-2"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              {isExtracting ? 'Extracting Fields...' : 'Test Form Field Extraction'}
            </Button>
            
            {results && (
              <Button 
                variant="outline"
                onClick={downloadResults}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extraction Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg max-h-48 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Analysis */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Extraction Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    results.accuracy >= 85 ? 'text-green-600' : 
                    results.accuracy >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {results.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{results.formFields.length}</div>
                  <div className="text-sm text-muted-foreground">Form Fields Found</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{results.processingTime}ms</div>
                  <div className="text-sm text-muted-foreground">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    results.errors.length === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {results.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Extraction Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Form Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                {results.formFields.length > 0 ? (
                  <div className="space-y-2">
                    {results.formFields.map((field, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded border">
                        <div className="font-medium text-sm">{field.label || `Field ${index + 1}`}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {field.type} | Required: {field.required ? 'Yes' : 'No'}
                        </div>
                        {field.description && (
                          <div className="text-xs text-gray-600 mt-1">{field.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No form fields extracted. This indicates the document may not be a form 
                    or the extraction algorithm needs improvement.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Technical Assessment */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Feasibility Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                results.accuracy >= 85 ? 'bg-green-50 border-green-200' : 
                results.accuracy >= 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              }`}>
                <h4 className="font-medium mb-2">Form Extraction</h4>
                <p className="text-sm">
                  {results.accuracy >= 85 ? '✅ Ready for production' :
                   results.accuracy >= 70 ? '⚠️ Needs improvement' : '❌ Not viable yet'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg border ${
                results.formFields.length >= 5 ? 'bg-green-50 border-green-200' : 
                results.formFields.length >= 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              }`}>
                <h4 className="font-medium mb-2">Field Coverage</h4>
                <p className="text-sm">
                  {results.formFields.length >= 5 ? '✅ Comprehensive coverage' :
                   results.formFields.length >= 2 ? '⚠️ Partial coverage' : '❌ Insufficient fields'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg border ${
                results.processingTime <= 10000 ? 'bg-green-50 border-green-200' : 
                results.processingTime <= 30000 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              }`}>
                <h4 className="font-medium mb-2">Performance</h4>
                <p className="text-sm">
                  {results.processingTime <= 10000 ? '✅ Fast processing' :
                   results.processingTime <= 30000 ? '⚠️ Acceptable speed' : '❌ Too slow'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};