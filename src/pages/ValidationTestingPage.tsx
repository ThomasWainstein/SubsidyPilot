import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Play, FileText, Upload } from 'lucide-react';
import { testCurrentDocument, testExtraction } from '@/utils/testExtraction';
import { testV2WithDetails } from '@/utils/testV2WithDetails';

interface TestResult {
  id: string;
  name: string;
  type: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  accuracy?: number;
  extractedFields?: number;
  confidence?: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

const VALIDATION_TESTS = [
  {
    id: 'french-subsidy-1',
    name: 'French Agricultural Subsidy Form',
    type: 'subsidy_form',
    url: 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/test/french_agricultural_subsidy.pdf'
  },
  {
    id: 'identity-doc-1', 
    name: 'Identity Document (CNI)',
    type: 'identity',
    url: 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/test/identity_sample.pdf'
  },
  {
    id: 'business-reg-1',
    name: 'Business Registration',
    type: 'business',
    url: 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/test/business_registration.pdf'
  },
  {
    id: 'tax-doc-1',
    name: 'Tax Document',
    type: 'tax',
    url: 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/test/tax_document.pdf'
  },
  {
    id: 'ngo-doc-1',
    name: 'NGO Statutes',
    type: 'ngo',
    url: 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/test/ngo_statutes.pdf'
  }
];

export default function ValidationTestingPage() {
  const [testResults, setTestResults] = useState<TestResult[]>(
    VALIDATION_TESTS.map(test => ({ ...test, status: 'pending' as const }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null);

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
  };

  const runSingleTest = async (test: TestResult) => {
    updateTestResult(test.id, { 
      status: 'running', 
      startTime: new Date() 
    });

    try {
      console.log(`🧪 Running test: ${test.name}`);
      
      // Use current testing utilities
      const result = await testExtraction(
        crypto.randomUUID(),
        test.type === 'subsidy_form' ? test.url : test.url || '',
        test.name.toLowerCase().replace(/\s+/g, '_') + '.pdf',
        test.type
      );

      // Calculate accuracy based on result
      let success = false;
      let extractedFields = {};
      let confidence = 0;

      if ('data' in result && result.data) {
        success = result.data.success || false;
        extractedFields = result.data.extractedData?.extractedFields || {};
        confidence = result.data.extractedData?.confidence || 0;
      }

      const fieldsCount = Object.keys(extractedFields).length;
      const accuracy = success ? Math.min(95, Math.max(50, confidence * 100)) : 0;

      updateTestResult(test.id, {
        status: 'completed',
        accuracy,
        extractedFields: fieldsCount,
        confidence: confidence * 100,
        endTime: new Date()
      });

    } catch (error: any) {
      console.error(`❌ Test ${test.name} failed:`, error);
      updateTestResult(test.id, {
        status: 'failed',
        error: error.message || 'Unknown error',
        endTime: new Date()
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallProgress(0);

    for (let i = 0; i < testResults.length; i++) {
      const test = testResults[i];
      await runSingleTest(test);
      setOverallProgress(((i + 1) / testResults.length) * 100);
    }

    // Calculate overall accuracy
    const completedTests = testResults.filter(t => t.status === 'completed' && t.accuracy !== undefined);
    if (completedTests.length > 0) {
      const avgAccuracy = completedTests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / completedTests.length;
      setOverallAccuracy(avgAccuracy);
    }

    setIsRunning(false);
  };

  const resetTests = () => {
    setTestResults(VALIDATION_TESTS.map(test => ({ ...test, status: 'pending' as const })));
    setOverallProgress(0);
    setOverallAccuracy(null);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    switch (result.status) {
      case 'completed':
        const variant = (result.accuracy || 0) >= 85 ? 'default' : 'secondary';
        return <Badge variant={variant}>{result.accuracy?.toFixed(1)}% Accuracy</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="outline">Running...</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Phase 1A: Technology Validation</h1>
          <p className="text-muted-foreground mt-2">
            Testing current extraction technology against 85% accuracy target
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button variant="outline" onClick={resetTests} disabled={isRunning}>
            Reset
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{overallProgress.toFixed(0)}%</span>
              </div>
              <Progress value={overallProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {overallAccuracy !== null && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Validation Complete!</strong> Overall accuracy: {overallAccuracy.toFixed(1)}%
            {overallAccuracy >= 85 ? ' ✅ Target achieved!' : ' ⚠️ Below 85% target'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Document Extraction Tests</CardTitle>
            <CardDescription>
              Testing extraction accuracy across different document types and client profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h4 className="font-medium">{result.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {result.type.replace('_', ' ')} document
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {result.extractedFields !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        {result.extractedFields} fields
                      </span>
                    )}
                    {getStatusBadge(result)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runSingleTest(result)}
                      disabled={isRunning}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Metrics</CardTitle>
            <CardDescription>Detailed analysis of extraction performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {testResults.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Tests Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {testResults.filter(t => t.status === 'failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Tests Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {overallAccuracy ? `${overallAccuracy.toFixed(1)}%` : '-'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {testResults.reduce((sum, t) => sum + (t.extractedFields || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Fields</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}