/**
 * OCR Test Dashboard
 * Tests OCR improvements against baseline extraction results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Eye, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface OCRTestResult {
  documentId: string;
  fileName: string;
  beforeOCR: {
    textLength: number;
    confidence: number;
    extractedFields: number;
    processingTime: number;
  };
  afterOCR: {
    textLength: number;
    confidence: number;
    extractedFields: number;
    processingTime: number;
    ocrUsed: boolean;
  };
  improvement: {
    textLengthGain: number;
    confidenceGain: number;
    fieldsGain: number;
    timeImpact: number;
  };
}

export default function OCRTestDashboard() {
  const [testResults, setTestResults] = useState<OCRTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Load available test documents
  const loadAvailableDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_documents')
        .select('id, file_name, file_size, category, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAvailableDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load test documents",
        variant: "destructive"
      });
    }
  };

  // Run baseline extraction without OCR
  const runBaselineExtraction = async (documentId: string): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        disableOCR: true // Flag to disable OCR for baseline
      }
    });

    if (error) throw error;
    return data;
  };

  // Run improved extraction with OCR
  const runImprovedExtraction = async (documentId: string): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        forceOCR: true // Flag to enable OCR testing
      }
    });

    if (error) throw error;
    return data;
  };

  // Run OCR comparison test
  const runOCRTest = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select documents to test",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const results: OCRTestResult[] = [];

    for (let i = 0; i < selectedDocuments.length; i++) {
      const documentId = selectedDocuments[i];
      const doc = availableDocuments.find(d => d.id === documentId);
      
      try {
        // Run baseline extraction
        console.log(`Testing document ${i + 1}/${selectedDocuments.length}: ${doc?.file_name}`);
        
        const baselineResult = await runBaselineExtraction(documentId);
        const improvedResult = await runImprovedExtraction(documentId);

        const testResult: OCRTestResult = {
          documentId,
          fileName: doc?.file_name || 'Unknown',
          beforeOCR: {
            textLength: baselineResult.summary?.textLength || 0,
            confidence: baselineResult.extractedData?.confidence || 0,
            extractedFields: baselineResult.summary?.extractedFields || 0,
            processingTime: baselineResult.summary?.processingTime || 0
          },
          afterOCR: {
            textLength: improvedResult.summary?.textLength || 0,
            confidence: improvedResult.extractedData?.confidence || 0,
            extractedFields: improvedResult.summary?.extractedFields || 0,
            processingTime: improvedResult.summary?.processingTime || 0,
            ocrUsed: improvedResult.summary?.ocrUsed || false
          },
          improvement: {
            textLengthGain: 0,
            confidenceGain: 0,
            fieldsGain: 0,
            timeImpact: 0
          }
        };

        // Calculate improvements
        testResult.improvement.textLengthGain = 
          ((testResult.afterOCR.textLength - testResult.beforeOCR.textLength) / Math.max(testResult.beforeOCR.textLength, 1)) * 100;
        testResult.improvement.confidenceGain = 
          testResult.afterOCR.confidence - testResult.beforeOCR.confidence;
        testResult.improvement.fieldsGain = 
          testResult.afterOCR.extractedFields - testResult.beforeOCR.extractedFields;
        testResult.improvement.timeImpact = 
          testResult.afterOCR.processingTime - testResult.beforeOCR.processingTime;

        results.push(testResult);
        setTestResults([...results]);
        setProgress(((i + 1) / selectedDocuments.length) * 100);

      } catch (error) {
        console.error(`Error testing document ${documentId}:`, error);
        toast({
          title: "Test Error",
          description: `Failed to test ${doc?.file_name}: ${error.message}`,
          variant: "destructive"
        });
      }
    }

    setIsRunning(false);
    toast({
      title: "OCR Testing Complete",
      description: `Tested ${results.length} documents with OCR improvements`,
    });
  };

  // Calculate overall statistics
  const calculateStats = () => {
    if (testResults.length === 0) return null;

    const stats = {
      documentsWithOCR: testResults.filter(r => r.afterOCR.ocrUsed).length,
      averageTextGain: testResults.reduce((sum, r) => sum + r.improvement.textLengthGain, 0) / testResults.length,
      averageConfidenceGain: testResults.reduce((sum, r) => sum + r.improvement.confidenceGain, 0) / testResults.length,
      averageFieldsGain: testResults.reduce((sum, r) => sum + r.improvement.fieldsGain, 0) / testResults.length,
      successRate: (testResults.filter(r => r.improvement.confidenceGain > 0).length / testResults.length) * 100
    };

    return stats;
  };

  const stats = calculateStats();

  React.useEffect(() => {
    loadAvailableDocuments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OCR Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Test OCR improvements against baseline extraction results
          </p>
        </div>
        <Button onClick={runOCRTest} disabled={isRunning || selectedDocuments.length === 0}>
          {isRunning ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Run OCR Test
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Testing Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Test Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDocuments.includes(doc.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => {
                  setSelectedDocuments(prev =>
                    prev.includes(doc.id)
                      ? prev.filter(id => id !== doc.id)
                      : [...prev, doc.id]
                  );
                }}
              >
                <div className="space-y-2">
                  <div className="font-medium text-sm truncate">{doc.file_name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {doc.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(doc.file_size / 1024)}KB
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Selected {selectedDocuments.length} documents for testing
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OCR Usage Rate</p>
                  <p className="text-2xl font-bold">
                    {Math.round((stats.documentsWithOCR / testResults.length) * 100)}%
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Text Gain</p>
                  <p className="text-2xl font-bold">
                    {stats.averageTextGain > 0 ? '+' : ''}{Math.round(stats.averageTextGain)}%
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence Gain</p>
                  <p className="text-2xl font-bold">
                    {stats.averageConfidenceGain > 0 ? '+' : ''}{Math.round(stats.averageConfidenceGain * 100)}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{Math.round(stats.successRate)}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Document</th>
                    <th className="text-left p-2">OCR Used</th>
                    <th className="text-left p-2">Text Length</th>
                    <th className="text-left p-2">Confidence</th>
                    <th className="text-left p-2">Fields</th>
                    <th className="text-left p-2">Time Impact</th>
                    <th className="text-left p-2">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result) => (
                    <tr key={result.documentId} className="border-b">
                      <td className="p-2">
                        <div className="truncate max-w-xs">{result.fileName}</div>
                      </td>
                      <td className="p-2">
                        {result.afterOCR.ocrUsed ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {result.beforeOCR.textLength} → {result.afterOCR.textLength}
                          </div>
                          <div className={`text-xs font-medium ${
                            result.improvement.textLengthGain > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.improvement.textLengthGain > 0 ? '+' : ''}{Math.round(result.improvement.textLengthGain)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {Math.round(result.beforeOCR.confidence * 100)}% → {Math.round(result.afterOCR.confidence * 100)}%
                          </div>
                          <div className={`text-xs font-medium ${
                            result.improvement.confidenceGain > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.improvement.confidenceGain > 0 ? '+' : ''}{Math.round(result.improvement.confidenceGain * 100)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {result.beforeOCR.extractedFields} → {result.afterOCR.extractedFields}
                          </div>
                          <div className={`text-xs font-medium ${
                            result.improvement.fieldsGain > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.improvement.fieldsGain > 0 ? '+' : ''}{result.improvement.fieldsGain}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className={`text-xs ${
                          result.improvement.timeImpact > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {result.improvement.timeImpact > 0 ? '+' : ''}{Math.round(result.improvement.timeImpact)}ms
                        </div>
                      </td>
                      <td className="p-2">
                        {result.improvement.confidenceGain > 0.1 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : result.improvement.confidenceGain < -0.1 ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-300" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}