/**
 * Cloud Run Document Processing Test Page
 * Dedicated page for testing the Google Cloud Run integration
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Cloud, Zap, Activity, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DocumentUploadCloudRun } from '@/components/DocumentUploadCloudRun';
import { useCloudRunProcessing } from '@/hooks/useCloudRunProcessing';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';

const CloudRunTestPage: React.FC = () => {
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [serviceHealth, setServiceHealth] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const { checkServiceHealth, getServiceInfo } = useCloudRunProcessing();

  useEffect(() => {
    // Check service health and info on page load
    handleHealthCheck();
    handleGetServiceInfo();
  }, []);

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkServiceHealth();
      setServiceHealth(health);
      
      if (health.healthy) {
        toast.success(`Service is healthy (${health.responseTime}ms response time)`);
      } else {
        toast.error(`Service health check failed: ${health.error}`);
      }
    } catch (error) {
      console.error('Health check error:', error);
      setServiceHealth({ healthy: false, error: 'Health check failed' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleGetServiceInfo = async () => {
    try {
      const info = await getServiceInfo();
      setServiceInfo(info);
    } catch (error) {
      console.error('Failed to get service info:', error);
    }
  };

  const handleExtractionComplete = (data: any) => {
    console.log('Extraction completed:', data);
    setExtractionResult(data);
    toast.success('Document extraction completed successfully!');
  };

  const handleExtractionError = (error: string) => {
    console.error('Extraction error:', error);
    toast.error(`Extraction failed: ${error}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Cloud Run Document Processing</h1>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Advanced AI
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground">
              Test the Google Cloud Run subsidypilot-form-parser service integration
            </p>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Service Status
                </CardTitle>
                <Button
                  onClick={handleHealthCheck}
                  disabled={isCheckingHealth}
                  variant="outline"
                  size="sm"
                >
                  {isCheckingHealth ? 'Checking...' : 'Check Health'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceHealth && (
                <div className="flex items-center gap-3">
                  {serviceHealth.healthy ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {serviceHealth.healthy ? 'Service is healthy' : 'Service unavailable'}
                    </p>
                    {serviceHealth.responseTime && (
                      <p className="text-sm text-muted-foreground">
                        Response time: {serviceHealth.responseTime}ms
                      </p>
                    )}
                    {serviceHealth.error && (
                      <p className="text-sm text-red-600">{serviceHealth.error}</p>
                    )}
                  </div>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Endpoint:</strong> https://subsidypilot-form-parser-838836299668.europe-west1.run.app
                  <br />
                  <strong>Region:</strong> europe-west1 (Belgium)
                  <br />
                  <strong>Processing Timeout:</strong> 5 minutes
                </AlertDescription>
              </Alert>

              {serviceInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium">Service Information</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(serviceInfo, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Document Upload & Processing</TabsTrigger>
              <TabsTrigger value="results">Extraction Results</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Subsidy Application */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Subsidy Application Documents</h3>
                  <DocumentUploadCloudRun
                    documentType="subsidy_application"
                    onComplete={handleExtractionComplete}
                    onError={handleExtractionError}
                  />
                </div>

                {/* Policy Documents */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">EU Policy Documents</h3>
                  <DocumentUploadCloudRun
                    documentType="policy_document"
                    onComplete={handleExtractionComplete}
                    onError={handleExtractionError}
                  />
                </div>
              </div>

              <Separator />

              {/* Financial Documents */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Financial Documents</h3>
                <DocumentUploadCloudRun
                  documentType="financial"
                  onComplete={handleExtractionComplete}
                  onError={handleExtractionError}
                />
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Extraction Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {extractionResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Extraction Successful</span>
                        <Badge variant="secondary">
                          {Object.keys(extractionResult).length} fields extracted
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Extracted Data:</h4>
                        <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                          {JSON.stringify(extractionResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No extraction results yet</p>
                      <p className="text-sm">Upload a document to see results here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Testing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Best Test Documents:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• PDF forms with structured text</li>
                    <li>• EU agricultural subsidy applications</li>
                    <li>• Financial statements and invoices</li>
                    <li>• Policy documents with tables</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Expected Processing Times:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Simple forms: 30-60 seconds</li>
                    <li>• Complex PDFs: 1-3 minutes</li>
                    <li>• Large documents: 3-5 minutes</li>
                    <li>• Image-heavy docs: 2-4 minutes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CloudRunTestPage;