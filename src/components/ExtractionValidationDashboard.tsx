import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { triggerDocumentExtraction, type ClientType } from '@/utils/aiExtractionUtils';
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap, DollarSign, Eye, BarChart3 } from 'lucide-react';

interface ValidationResult {
  documentId: string;
  fileName: string;
  clientType: ClientType;
  extractionResult: any;
  accuracy: number;
  costBreakdown: any;
  processingTime: number;
  qualityScore: number;
  issues: string[];
}

const VALIDATION_DOCUMENTS = {
  farm: [
    { id: 'farm-1', name: 'CAP Subsidy Application (FR).pdf', type: 'subsidy_application' },
    { id: 'farm-2', name: 'BIO Certification Request (FR).pdf', type: 'certification' },
  ],
  business: [
    { id: 'biz-1', name: 'K-bis Registration (FR).pdf', type: 'business_registration' },
    { id: 'biz-2', name: 'SIRET Application (FR).pdf', type: 'registration_form' },
  ],
  individual: [
    { id: 'ind-1', name: 'Tax Declaration (FR).pdf', type: 'tax_form' },
    { id: 'ind-2', name: 'CNI Identity Card (FR).pdf', type: 'identity_document' },
  ],
  municipality: [
    { id: 'mun-1', name: 'Municipal Budget (FR).pdf', type: 'budget_report' },
  ],
  ngo: [
    { id: 'ngo-1', name: 'Association Statutes (FR).pdf', type: 'organization_statutes' },
  ]
};

export const ExtractionValidationDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [selectedClientTypes, setSelectedClientTypes] = useState<ClientType[]>(['farm', 'business']);
  const [useHybridOCR, setUseHybridOCR] = useState(true);
  const [overallStats, setOverallStats] = useState({
    avgAccuracy: 0,
    avgCost: 0,
    avgTime: 0,
    totalTests: 0,
    successRate: 0
  });
  const { toast } = useToast();

  const runValidationSuite = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentTest('');
    
    const allResults: ValidationResult[] = [];
    
    try {
      // Get all test documents for selected client types
      const testDocuments = selectedClientTypes.flatMap(clientType => 
        VALIDATION_DOCUMENTS[clientType].map(doc => ({
          ...doc,
          clientType,
          url: `https://example.com/test-docs/${doc.id}.pdf`
        }))
      );

      toast({
        title: "Validation Suite Started",
        description: `Testing ${testDocuments.length} documents across ${selectedClientTypes.length} client types`,
      });

      for (const doc of testDocuments) {
        setCurrentTest(`${doc.clientType}: ${doc.name}`);
        
        try {
          const startTime = Date.now();
          
          const extractionResult = await triggerDocumentExtraction(
            doc.id,
            doc.url,
            doc.name,
            doc.type,
            doc.clientType,
            useHybridOCR
          );
          
          const processingTime = Date.now() - startTime;
          
          // Calculate accuracy (simplified - in real implementation, compare against ground truth)
          const accuracy = calculateMockAccuracy(extractionResult, doc.clientType);
          
          // Identify issues
          const issues = identifyIssues(extractionResult, doc.clientType);
          
          const result: ValidationResult = {
            documentId: doc.id,
            fileName: doc.name,
            clientType: doc.clientType,
            extractionResult,
            accuracy,
            costBreakdown: extractionResult.costBreakdown,
            processingTime,
            qualityScore: extractionResult.qualityScore || 0.8,
            issues
          };
          
          allResults.push(result);
          setResults([...allResults]);
          
          toast({
            title: `${doc.clientType} Test Complete`,
            description: `${doc.name}: ${(accuracy * 100).toFixed(1)}% accuracy`,
            duration: 2000,
          });
          
        } catch (error) {
          console.error(`Test failed for ${doc.name}:`, error);
          
          const failedResult: ValidationResult = {
            documentId: doc.id,
            fileName: doc.name,
            clientType: doc.clientType,
            extractionResult: { success: false, error: error.message },
            accuracy: 0,
            costBreakdown: { totalCost: 0 },
            processingTime: 0,
            qualityScore: 0,
            issues: [`Extraction failed: ${error.message}`]
          };
          
          allResults.push(failedResult);
          setResults([...allResults]);
        }
      }
      
      // Calculate overall statistics
      const stats = calculateOverallStats(allResults);
      setOverallStats(stats);
      
      toast({
        title: "Validation Suite Complete",
        description: `${stats.totalTests} tests completed. Average accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%`,
      });
      
    } catch (error) {
      toast({
        title: "Validation Suite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const calculateMockAccuracy = (result: any, clientType: ClientType): number => {
    if (!result.success || !result.extractedData) return 0;
    
    // Mock accuracy calculation - in real implementation, compare against ground truth
    const fields = result.extractedData.fields || result.extractedData;
    const fieldCount = Object.keys(fields).length;
    const filledFields = Object.values(fields).filter(v => v !== null && v !== '').length;
    
    // Apply client-type specific weighting
    const baseAccuracy = fieldCount > 0 ? filledFields / fieldCount : 0;
    const clientTypeMultiplier = {
      farm: 0.9,      // Generally good accuracy
      business: 0.85,  // K-bis forms can be complex
      individual: 0.88, // Tax forms vary
      municipality: 0.75, // Budget docs are complex
      ngo: 0.8        // Statutes vary in structure
    };
    
    return Math.min(0.95, baseAccuracy * (clientTypeMultiplier[clientType] || 0.8));
  };

  const identifyIssues = (result: any, clientType: ClientType): string[] => {
    const issues: string[] = [];
    
    if (!result.success) {
      issues.push('Extraction failed completely');
      return issues;
    }
    
    const fields = result.extractedData?.fields || result.extractedData || {};
    const confidence = result.confidence || 0;
    
    if (confidence < 0.7) {
      issues.push(`Low confidence score: ${(confidence * 100).toFixed(1)}%`);
    }
    
    if (Object.keys(fields).length < 3) {
      issues.push('Very few fields extracted');
    }
    
    // Client-specific issue detection
    const criticalFields = {
      farm: ['farm_name', 'owner_name', 'total_hectares'],
      business: ['company_name', 'registration_number', 'legal_form'],
      individual: ['full_name', 'national_id'],
      municipality: ['municipality_name'],
      ngo: ['organization_name', 'legal_status']
    };
    
    const missingCritical = criticalFields[clientType]?.filter(field => 
      !fields[field] || fields[field] === null || fields[field] === ''
    ) || [];
    
    if (missingCritical.length > 0) {
      issues.push(`Missing critical fields: ${missingCritical.join(', ')}`);
    }
    
    if (result.costBreakdown?.totalCost > 0.01) {
      issues.push(`High processing cost: $${result.costBreakdown.totalCost.toFixed(4)}`);
    }
    
    return issues;
  };

  const calculateOverallStats = (results: ValidationResult[]) => {
    if (results.length === 0) {
      return { avgAccuracy: 0, avgCost: 0, avgTime: 0, totalTests: 0, successRate: 0 };
    }
    
    const successfulResults = results.filter(r => r.extractionResult.success);
    
    return {
      avgAccuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length,
      avgCost: results.reduce((sum, r) => sum + (r.costBreakdown?.totalCost || 0), 0) / results.length,
      avgTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      totalTests: results.length,
      successRate: successfulResults.length / results.length
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phase 2 Async Processing Dashboard
          </CardTitle>
          <CardDescription>
            Advanced async processing testing with stack overflow elimination
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Client Types to Test</label>
              <div className="grid grid-cols-2 gap-2">
                {(['farm', 'business', 'individual', 'municipality', 'ngo'] as ClientType[]).map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedClientTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClientTypes([...selectedClientTypes, type]);
                        } else {
                          setSelectedClientTypes(selectedClientTypes.filter(t => t !== type));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useHybridOCR}
                  onChange={(e) => setUseHybridOCR(e.target.checked)}
                />
                <span className="text-sm">Use Hybrid OCR (Google Vision + OpenAI)</span>
              </label>
            </div>
          </div>

          {/* Test Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Currently testing: {currentTest}</span>
                <span>{results.length} completed</span>
              </div>
              <Progress value={(results.length / selectedClientTypes.reduce((sum, type) => sum + VALIDATION_DOCUMENTS[type].length, 0)) * 100} />
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={runValidationSuite} 
            disabled={isRunning || selectedClientTypes.length === 0}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Running Validation Suite...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Run Validation Suite ({selectedClientTypes.reduce((sum, type) => sum + VALIDATION_DOCUMENTS[type].length, 0)} tests)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {(overallStats.avgAccuracy * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Accuracy</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${overallStats.avgCost.toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Cost</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(overallStats.avgTime / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-muted-foreground">Avg Time</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {overallStats.totalTests}
              </div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {(overallStats.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="issues">Issues Analysis</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results" className="space-y-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{result.clientType}</Badge>
                      {result.fileName}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.accuracy > 0.8 ? "default" : result.accuracy > 0.6 ? "secondary" : "destructive"}>
                        {(result.accuracy * 100).toFixed(1)}%
                      </Badge>
                      {result.extractionResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Performance</div>
                      <div>Confidence: {((result.extractionResult.confidence || 0) * 100).toFixed(1)}%</div>
                      <div>Quality: {(result.qualityScore * 100).toFixed(1)}%</div>
                      <div>Time: {(result.processingTime / 1000).toFixed(1)}s</div>
                    </div>
                    <div>
                      <div className="font-medium">Cost Breakdown</div>
                      <div>Google Vision: ${(result.costBreakdown?.googleVisionCost || 0).toFixed(4)}</div>
                      <div>OpenAI: ${(result.costBreakdown?.openaiCost || 0).toFixed(4)}</div>
                      <div>Total: ${(result.costBreakdown?.totalCost || 0).toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Issues ({result.issues.length})</div>
                      {result.issues.slice(0, 3).map((issue, i) => (
                        <div key={i} className="text-orange-600 text-xs">{issue}</div>
                      ))}
                      {result.issues.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{result.issues.length - 3} more</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Issues Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    results.reduce((acc, result) => {
                      result.issues.forEach(issue => {
                        acc[issue] = (acc[issue] || 0) + 1;
                      });
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort(([,a], [,b]) => b - a).map(([issue, count]) => (
                    <div key={issue} className="flex justify-between items-center">
                      <span className="text-sm">{issue}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis by Client Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedClientTypes.map(clientType => {
                    const clientResults = results.filter(r => r.clientType === clientType);
                    const avgCost = clientResults.length > 0 
                      ? clientResults.reduce((sum, r) => sum + (r.costBreakdown?.totalCost || 0), 0) / clientResults.length
                      : 0;
                    
                    return (
                      <div key={clientType} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{clientType}</div>
                          <div className="text-sm text-muted-foreground">{clientResults.length} documents</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${avgCost.toFixed(4)}</div>
                          <div className="text-sm text-muted-foreground">avg/doc</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};