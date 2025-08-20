import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Cloud, Database, Terminal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { runImmediateDiagnostics, testGoogleVisionAPIKey, analyzeExtractionErrors, getManualTestingChecklist } from '@/utils/immediateValidation';

interface DiagnosticResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

interface DocumentAccessResult {
  name: string;
  url: string;
  accessible: boolean;
  status?: number;
  contentType?: string;
  error?: string;
}

export const PhaseValidationDiagnostics = () => {
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [results, setResults] = useState<{
    apiTests: DiagnosticResult[];
    documentTests: DocumentAccessResult[];
    workflowTests: DiagnosticResult[];
  }>({
    apiTests: [],
    documentTests: [],
    workflowTests: []
  });

  // Test Google Vision API directly
  const testGoogleVisionAPI = async (): Promise<DiagnosticResult> => {
    const startTime = Date.now();
    try {
      console.log('🧪 Testing Google Vision API directly...');
      
      const { data, error } = await supabase.functions.invoke('hybrid-ocr-extraction', {
        body: {
          documentId: 'test-vision-api',
          fileUrl: 'https://via.placeholder.com/300x200/000000/FFFFFF?text=TEST+DOCUMENT',
          fileName: 'vision-api-test.png',
          clientType: 'farm',
          documentType: 'test'
        }
      });

      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('❌ Google Vision API test failed:', error);
        return {
          name: 'Google Vision API Connection',
          success: false,
          error: error.message || JSON.stringify(error),
          duration
        };
      }

      console.log('✅ Google Vision API test successful:', data);
      return {
        name: 'Google Vision API Connection',
        success: true,
        data,
        duration
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Vision API test exception:', err);
      return {
        name: 'Google Vision API Connection',
        success: false,
        error: err.message || 'Unknown error',
        duration
      };
    }
  };

  // Test document accessibility
  const testDocumentAccess = async (): Promise<DocumentAccessResult[]> => {
    const testDocuments = [
      {
        name: 'CAP Direct Payments Application',
        url: 'https://www.asp-public.fr/sites/default/files/atoms/files/guide_telepac_2024.pdf'
      },
      {
        name: 'Young Farmer Aid Application', 
        url: 'https://www.asp-public.fr/aide-installation-jeunes-agriculteurs'
      },
      {
        name: 'Organic Farming Certification',
        url: 'https://www.agencebio.org/certification/'
      },
      {
        name: 'FEADER Rural Development',
        url: 'https://www.asp-public.fr/feader'
      },
      {
        name: 'BPI Innovation Grant',
        url: 'https://www.bpifrance.fr/nos-solutions/financement/aide-innovation'
      }
    ];

    const results: DocumentAccessResult[] = [];
    
    for (const doc of testDocuments) {
      try {
        console.log(`🔍 Testing document access: ${doc.name}`);
        const response = await fetch(doc.url, { 
          method: 'HEAD',
          mode: 'no-cors' // Handle CORS issues
        });
        
        results.push({
          name: doc.name,
          url: doc.url,
          accessible: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type') || undefined
        });
      } catch (error: any) {
        console.warn(`⚠️ Document access test failed for ${doc.name}:`, error.message);
        results.push({
          name: doc.name,
          url: doc.url,
          accessible: false,
          error: error.message
        });
      }
    }
    
    return results;
  };

  // Test complete workflow
  const testCompleteWorkflow = async (): Promise<DiagnosticResult> => {
    const startTime = Date.now();
    try {
      console.log('🧪 Testing complete document processing workflow...');
      
      // Create a simple test content
      const testContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF';
      const testPDF = new Blob([testContent], { type: 'application/pdf' });
      const fileName = `test-workflow-${Date.now()}.pdf`;

      // 1. Test file upload to Supabase storage
      console.log('📤 Testing file upload...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('farm-documents')
        .upload(`test/${fileName}`, testPDF);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(uploadData.path);

      console.log('🔗 File uploaded, testing extraction with URL:', publicUrlData.publicUrl);

      // 3. Test extraction
      const extractionResult = await supabase.functions.invoke('hybrid-ocr-extraction', {
        body: {
          documentId: 'test-workflow',
          fileUrl: publicUrlData.publicUrl,
          fileName: fileName,
          clientType: 'farm',
          documentType: 'test'
        }
      });

      const duration = Date.now() - startTime;

      // Clean up test file
      await supabase.storage.from('farm-documents').remove([uploadData.path]);

      if (extractionResult.error) {
        return {
          name: 'Complete Workflow Test',
          success: false,
          error: extractionResult.error.message || JSON.stringify(extractionResult.error),
          duration,
          data: { uploadPath: uploadData.path }
        };
      }

      return {
        name: 'Complete Workflow Test',
        success: true,
        duration,
        data: {
          uploadPath: uploadData.path,
          extractionResult: extractionResult.data
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Complete workflow test failed:', error);
      return {
        name: 'Complete Workflow Test',
        success: false,
        error: error.message || 'Unknown error',
        duration
      };
    }
  };

  // Test database connectivity
  const testDatabaseConnectivity = async (): Promise<DiagnosticResult> => {
    const startTime = Date.now();
    try {
      console.log('🧪 Testing database connectivity...');
      
      // Test basic query
      const { data, error } = await supabase
        .from('subsidies')
        .select('id, title')
        .limit(1);

      const duration = Date.now() - startTime;

      if (error) {
        return {
          name: 'Database Connectivity',
          success: false,
          error: error.message,
          duration
        };
      }

      // Test RPC function
      const { data: isAdminData, error: rpcError } = await supabase
        .rpc('is_admin');

      return {
        name: 'Database Connectivity',
        success: !rpcError,
        data: { recordCount: data?.length, isAdmin: isAdminData },
        duration,
        error: rpcError?.message
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        name: 'Database Connectivity',
        success: false,
        error: error.message,
        duration
      };
    }
  };

  const runAllDiagnostics = async () => {
    setDiagnosticsRunning(true);
    toast.info('Running Phase 1A critical diagnostics...');

    try {
      console.log('🚀 Starting Phase 1A Critical Validation Diagnostics...');

      // Run immediate diagnostics from utility
      const immediateResults = await runImmediateDiagnostics();
      
      // Convert to our format
      const apiResults = immediateResults.map(result => ({
        name: result.test,
        success: result.success,
        error: result.error,
        data: result.data,
        duration: 0
      }));

      // Run document access tests
      const documentResults = await testDocumentAccess();

      // Run workflow test (simplified)
      const workflowResults = [await testCompleteWorkflow()];

      setResults({
        apiTests: apiResults,
        documentTests: documentResults,
        workflowTests: workflowResults
      });

      const totalTests = apiResults.length + documentResults.length + workflowResults.length;
      const successfulTests = [
        ...apiResults.filter(r => r.success),
        ...documentResults.filter(r => r.accessible),
        ...workflowResults.filter(r => r.success)
      ].length;

      // Analyze errors
      analyzeExtractionErrors(immediateResults);

      if (successfulTests < totalTests) {
        toast.error(`Critical issues found: ${totalTests - successfulTests} tests failed`);
        console.log('\n🚨 CRITICAL BLOCKING ISSUES DETECTED');
        console.log('📋 Manual Testing Checklist:');
        getManualTestingChecklist().forEach(item => console.log(item));
      } else {
        toast.success(`All systems operational: ${successfulTests}/${totalTests} tests passed`);
      }

    } catch (error: any) {
      toast.error(`Diagnostics failed: ${error.message}`);
      console.error('Diagnostics error:', error);
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => success ? 
    <CheckCircle className="h-4 w-4 text-green-600" /> : 
    <XCircle className="h-4 w-4 text-red-600" />;

  const getStatusBadge = (success: boolean, label?: string) => (
    <Badge variant={success ? 'default' : 'destructive'}>
      {success ? (label || 'PASS') : (label || 'FAIL')}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Phase 1A System Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive testing to identify silent failures and verify all components are working
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <Button 
            onClick={runAllDiagnostics} 
            disabled={diagnosticsRunning}
            className="w-full"
          >
            {diagnosticsRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running Critical Diagnostics...
              </>
            ) : (
              'Run Phase 1A Critical Diagnostics'
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                const apiKey = prompt('Enter your Google Vision API key to test:');
                if (apiKey) {
                  console.clear();
                  testGoogleVisionAPIKey(apiKey);
                }
              }}
              className="flex-1"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Test API Key
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                console.clear();
                console.log('📋 PHASE 1A MANUAL TESTING CHECKLIST:');
                getManualTestingChecklist().forEach(item => console.log(item));
              }}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual Checklist
            </Button>
          </div>
        </div>

        {(results.apiTests.length > 0 || results.documentTests.length > 0 || results.workflowTests.length > 0) && (
          <Tabs defaultValue="api" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                API Tests
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Access
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Workflow Tests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="space-y-4 mt-4">
              {results.apiTests.map((result, index) => (
                <Alert key={index}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <Badge variant="outline">{result.duration}ms</Badge>
                      )}
                      {getStatusBadge(result.success)}
                    </div>
                  </div>
                  {result.error && (
                    <AlertDescription className="mt-2 text-red-600">
                      <strong>Error:</strong> {result.error}
                    </AlertDescription>
                  )}
                  {result.data && (
                    <AlertDescription className="mt-2">
                      <strong>Data:</strong> {JSON.stringify(result.data, null, 2)}
                    </AlertDescription>
                  )}
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              {results.documentTests.map((result, index) => (
                <Alert key={index}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.accessible)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.status && (
                        <Badge variant="outline">HTTP {result.status}</Badge>
                      )}
                      {getStatusBadge(result.accessible)}
                    </div>
                  </div>
                  <AlertDescription className="mt-2">
                    <strong>URL:</strong> <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{result.url}</a>
                  </AlertDescription>
                  {result.contentType && (
                    <AlertDescription>
                      <strong>Content-Type:</strong> {result.contentType}
                    </AlertDescription>
                  )}
                  {result.error && (
                    <AlertDescription className="text-red-600">
                      <strong>Error:</strong> {result.error}
                    </AlertDescription>
                  )}
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="workflow" className="space-y-4 mt-4">
              {results.workflowTests.map((result, index) => (
                <Alert key={index}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <Badge variant="outline">{result.duration}ms</Badge>
                      )}
                      {getStatusBadge(result.success)}
                    </div>
                  </div>
                  {result.error && (
                    <AlertDescription className="mt-2 text-red-600">
                      <strong>Error:</strong> {result.error}
                    </AlertDescription>
                  )}
                  {result.data && (
                    <AlertDescription className="mt-2">
                      <strong>Result:</strong> {JSON.stringify(result.data, null, 2)}
                    </AlertDescription>
                  )}
                </Alert>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};