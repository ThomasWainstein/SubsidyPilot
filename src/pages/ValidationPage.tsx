import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealDocumentTesting } from '@/components/RealDocumentTesting';
import { ProductionHealthDashboard } from '@/components/ProductionHealthDashboard';
import { LesAidesDocumentTester } from '@/components/LesAidesDocumentTester';
import { AlternativeDocumentStrategy } from '@/components/AlternativeDocumentStrategy';
import { EnhancedSystemValidationSummary } from '@/components/EnhancedSystemValidationSummary';
import { PhaseValidationDiagnostics } from '@/components/PhaseValidationDiagnostics';
import { RealFrenchDocumentTesting } from '@/components/RealFrenchDocumentTesting';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, FileCheck, Target, TrendingUp } from 'lucide-react';

interface TestResult {
  id: string;
  type: 'diagnostic' | 'french_doc' | 'manual_test' | 'health_check';
  name: string;
  status: 'completed' | 'failed' | 'running';
  accuracy?: number;
  timestamp: string;
  details?: any;
}

export default function ValidationPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState('diagnostics');

  const phase1AStatus = {
    google_cloud_api: 'configured',
    real_documents: 'in_progress', 
    ground_truth: 'pending',
    accuracy_target: 'pending'
  };

  const addTestResult = useCallback((result: Omit<TestResult, 'id' | 'timestamp'>) => {
    const newResult: TestResult = {
      ...result,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
    
    // Auto-switch to results tab after adding a result
    if (result.status === 'completed') {
      setTimeout(() => setActiveTab('results'), 1000);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Phase 2 Async Processing Dashboard</h1>
        <p className="text-muted-foreground">
          Phase 2 async processing eliminates stack overflow issues with advanced background processing
        </p>
      </div>

      {/* Phase 1A Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Phase 1A Progress</CardTitle>
          <CardDescription>
            Current status of production readiness validation components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Google Cloud API</p>
              {getStatusBadge(phase1AStatus.google_cloud_api)}
              <p className="text-xs text-muted-foreground">Vision API key configured</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Real Documents</p>
              {getStatusBadge(phase1AStatus.real_documents)}
              <p className="text-xs text-muted-foreground">French subsidy forms collection</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ground Truth</p>
              {getStatusBadge(phase1AStatus.ground_truth)}
              <p className="text-xs text-muted-foreground">Manual annotation needed</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">85% Accuracy Target</p>
              {getStatusBadge(phase1AStatus.accuracy_target)}
              <p className="text-xs text-muted-foreground">Requires testing completion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="diagnostics">🔍 Diagnostics</TabsTrigger>
          <TabsTrigger value="real-docs">🇫🇷 French Docs</TabsTrigger>
          <TabsTrigger value="testing">Manual Testing</TabsTrigger>
          <TabsTrigger value="health">Production Health</TabsTrigger>
          <TabsTrigger value="validation">System Validation</TabsTrigger>
          <TabsTrigger value="results" className="relative">
            Test Results
            {testResults.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {testResults.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics">
          <PhaseValidationDiagnostics />
        </TabsContent>

        <TabsContent value="real-docs">
          <RealFrenchDocumentTesting onTestResult={addTestResult} />
        </TabsContent>

        <TabsContent value="testing">
          <RealDocumentTesting />
        </TabsContent>

        <TabsContent value="health">
          <ProductionHealthDashboard />
        </TabsContent>

        <TabsContent value="validation">
          <EnhancedSystemValidationSummary />
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-6">
            {/* Results Summary */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Test Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {testResults.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {testResults.filter(r => r.status === 'completed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {testResults.filter(r => r.status === 'failed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {testResults.filter(r => r.accuracy && r.accuracy >= 85).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Above 85%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Phase 1A Test Results
                </CardTitle>
                <CardDescription>
                  Real accuracy measurements and validation outcomes from all testing components
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Test Results Yet</h3>
                    <p>Run tests in other tabs to see results here:</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <div>• Run diagnostics in the "🔍 Diagnostics" tab</div>
                      <div>• Test French documents in the "🇫🇷 French Docs" tab</div>
                      <div>• Upload your own documents in the "Manual Testing" tab</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {result.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : result.status === 'failed' ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
                            )}
                            <div>
                              <h4 className="font-medium">{result.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {result.type.replace('_', ' ')} • {new Date(result.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.accuracy !== undefined && (
                              <Badge variant={result.accuracy >= 85 ? 'default' : 'secondary'}>
                                {result.accuracy}% accuracy
                              </Badge>
                            )}
                            <Badge variant={result.status === 'completed' ? 'default' : result.status === 'failed' ? 'destructive' : 'secondary'}>
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                        
                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}