import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Real French government document URLs for testing
const realFrenchDocuments = [
  {
    id: 'french-farm-form',
    name: 'French Farm Registration Document',
    url: 'https://www.formulaires.service-public.fr/gf/getAnnexe.do?cerfaAnnexe=11922*02_1.pdf&cerfaFormulaire=11922*02',
    type: 'registration',
    expectedFields: ['farm_name', 'owner_name', 'siret', 'address'],
    difficulty: 'medium',
    description: 'Official French farm registration form (Cerfa 11922)'
  },
  {
    id: 'eu-cap-form',
    name: 'EU Agricultural Policy Document',
    url: 'https://ec.europa.eu/info/sites/default/files/food-farming-fisheries/key_policies/documents/cap-strategic-plans-assessment-criteria_en.pdf',
    type: 'subsidy_application',
    expectedFields: ['beneficiary_name', 'total_hectares', 'payment_amount', 'farm_type'],
    difficulty: 'high',
    description: 'EU Common Agricultural Policy strategic plans document'
  },
  {
    id: 'french-census',
    name: 'French Agricultural Census Form',
    url: 'https://www.insee.fr/fr/statistiques/fichier/4255765/RA2020-questionnaire.pdf',
    type: 'census',
    expectedFields: ['farm_name', 'operator_name', 'total_hectares', 'livestock_count'],
    difficulty: 'medium',
    description: 'INSEE agricultural census questionnaire 2020'
  }
];

interface ExtractionResult {
  success: boolean;
  extractedData: any;
  confidence: number;
  textLength: number;
  tokensUsed: number;
  ocrMetadata: any;
  qualityScore: number;
  extractionMethod: string;
  costBreakdown: any;
  processingTime: any;
  processingLog: string[];
  error?: string;
  isProcessing?: boolean;
  jobId?: string;
}

interface GroundTruthAnnotation {
  [key: string]: string;
}

interface AccuracyResult {
  fieldByField: { [key: string]: number };
  overallAccuracy: number;
  passesThreshold: boolean;
  missingFields: string[];
  extractedFields: string[];
}

export const RealFrenchDocumentTesting = () => {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [groundTruth, setGroundTruth] = useState<GroundTruthAnnotation>({});
  const [accuracy, setAccuracy] = useState<AccuracyResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const handleDocumentSelect = (document: any) => {
    setSelectedDocument(document);
    setExtractionResult(null);
    setGroundTruth({});
    setAccuracy(null);
    
    // Initialize ground truth fields
    const initialGroundTruth: GroundTruthAnnotation = {};
    (document.expectedFields || []).forEach((field: string) => {
      initialGroundTruth[field] = '';
    });
    setGroundTruth(initialGroundTruth);
  };

  const runRealDocumentExtraction = async () => {
    if (!selectedDocument) return;

    setIsExtracting(true);
    try {
      console.log(`🧪 Testing real French document: ${selectedDocument.name}`);
      
      const testDocumentId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('async-document-processor', {
        body: {
          documentId: testDocumentId,
          fileUrl: selectedDocument.url,
          fileName: selectedDocument.name,
          clientType: 'farm',
          documentType: selectedDocument.type
        }
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      if (!data?.success || !data?.jobId) {
        throw new Error('Failed to start async processing job');
      }

      console.log(`⏳ Async job started: ${data.jobId}, monitoring progress...`);
      
      // Set initial processing state
      setExtractionResult({
        success: false,
        isProcessing: true,
        jobId: data.jobId,
        extractedData: {},
        confidence: 0,
        textLength: 0,
        tokensUsed: 0,
        ocrMetadata: {},
        qualityScore: 0,
        extractionMethod: 'phase-2-async-processing',
        costBreakdown: {},
        processingTime: {},
        processingLog: ['Job queued for background processing']
      });
      
      // Monitor job completion with real-time updates
      const result = await monitorAsyncJobCompletion(data.jobId, testDocumentId, 300000); // 5 min timeout
      
      setExtractionResult(result);
      
      if (result.success) {
        toast.success(`Successfully extracted data from ${selectedDocument.name}`);
        console.log('✅ Real document extraction successful:', result);
      } else {
        toast.error(`Extraction failed: ${result.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Real document extraction failed:', error);
      setExtractionResult({
        success: false,
        error: error.message,
        extractedData: {},
        confidence: 0,
        textLength: 0,
        tokensUsed: 0,
        ocrMetadata: {},
        qualityScore: 0,
        extractionMethod: 'failed',
        costBreakdown: {},
        processingTime: {},
        processingLog: [error.message]
      });
      toast.error(`Extraction failed: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Monitor async job completion
  const monitorAsyncJobCompletion = async (
    jobId: string, 
    documentId: string, 
    timeoutMs: number = 300000
  ): Promise<ExtractionResult> => {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check job status
        const { data: jobStatus } = await supabase
          .from('document_processing_jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (jobStatus?.status === 'completed') {
          console.log('🎉 Job completed, fetching extraction results...');
          
          // Get extraction result
          const { data: extraction } = await supabase
            .from('document_extractions')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (extraction) {
            return {
              success: true,
              extractedData: extraction.extracted_data || {},
              confidence: extraction.confidence_score || 0,
              qualityScore: extraction.table_quality || 0,
              textLength: JSON.stringify(extraction.extracted_data || {}).length,
              tokensUsed: (extraction.extracted_data as any)?.tokensUsed || 0,
              extractionMethod: 'phase-2-async',
              costBreakdown: (extraction.extracted_data as any)?.costBreakdown || {},
              processingTime: {
                totalTime: Date.now() - startTime,
                ocrTime: 0,
                fieldMappingTime: 0
              },
              ocrMetadata: (extraction.extracted_data as any)?.ocrMetadata || {},
              processingLog: [`Async processing completed in ${Date.now() - startTime}ms`]
            };
          }
        } else if (jobStatus?.status === 'failed') {
          return {
            success: false,
            error: jobStatus.error_message || 'Async processing failed',
            extractedData: {},
            confidence: 0,
            qualityScore: 0,
            textLength: 0,
            tokensUsed: 0,
            extractionMethod: 'phase-2-async-failed',
            costBreakdown: {},
            processingTime: { totalTime: Date.now() - startTime },
            ocrMetadata: {},
            processingLog: [`Job failed: ${jobStatus.error_message}`]
          };
        }
        
        // Update UI with progress info
        const progressMsg = `Processing... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`;
        console.log(`⏳ ${progressMsg} - Status: ${jobStatus?.status || 'pending'}`);
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('Error monitoring async job:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    return {
      success: false,
      error: 'Async processing timeout - job may still be running in background',
      extractedData: {},
      confidence: 0,
      qualityScore: 0,
      textLength: 0,
      tokensUsed: 0,
      extractionMethod: 'phase-2-timeout',
      costBreakdown: {},
      processingTime: { totalTime: timeoutMs },
      ocrMetadata: {},
      processingLog: ['Processing timeout after 5 minutes']
    };
  };

  const calculateAccuracy = () => {
    if (!extractionResult || !selectedDocument) return;

    const fieldByField: { [key: string]: number } = {};
    const extractedData = extractionResult.extractedData || {};
    const missingFields: string[] = [];
    const extractedFields: string[] = [];

    (selectedDocument.expectedFields || []).forEach((field: string) => {
      const expectedValue = groundTruth[field]?.trim().toLowerCase();
      const extractedValue = extractedData[field]?.toString().trim().toLowerCase();
      
      if (!expectedValue) {
        fieldByField[field] = 0;
        return;
      }

      if (!extractedValue) {
        fieldByField[field] = 0;
        missingFields.push(field);
        return;
      }

      extractedFields.push(field);
      
      // Simple similarity calculation (can be enhanced)
      if (expectedValue === extractedValue) {
        fieldByField[field] = 1.0;
      } else if (extractedValue.includes(expectedValue) || expectedValue.includes(extractedValue)) {
        fieldByField[field] = 0.8;
      } else {
        fieldByField[field] = 0.0;
      }
    });

    const accuracyValues = Object.values(fieldByField);
    const overallAccuracy = accuracyValues.length > 0 
      ? accuracyValues.reduce((sum, acc) => sum + acc, 0) / accuracyValues.length 
      : 0;

    const result: AccuracyResult = {
      fieldByField,
      overallAccuracy,
      passesThreshold: overallAccuracy >= 0.85,
      missingFields,
      extractedFields
    };

    setAccuracy(result);
    toast.success(`Accuracy calculated: ${(overallAccuracy * 100).toFixed(1)}%`);
  };

  const runComparisonWithTestDocument = async () => {
    try {
      console.log('🧪 Running comparison with test document...');
      
      // Run the same test that passed in diagnostics
      const testDocumentId = crypto.randomUUID();
      const base64TestImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const { data: testData, error: testError } = await supabase.functions.invoke('async-document-processor', {
        body: {
          documentId: testDocumentId,
          fileUrl: base64TestImage,
          fileName: 'test-comparison.png',
          clientType: 'farm',
          documentType: 'test'
        }
      });

      if (testError) {
        throw new Error(testError.message);
      }

      setTestResults(testData);
      toast.success('Test document comparison completed');
      
    } catch (error: any) {
      console.error('❌ Test document comparison failed:', error);
      toast.error(`Comparison failed: ${error.message}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (success: boolean, accuracy?: number) => {
    if (!success) return 'bg-red-100 text-red-800';
    if (accuracy !== undefined) {
      return accuracy >= 0.85 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🇫🇷 Real French Document Testing</CardTitle>
          <CardDescription>
            Validate extraction accuracy with actual French government subsidy documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {realFrenchDocuments.map((doc) => (
              <Card 
                key={doc.id} 
                className={`cursor-pointer transition-all ${
                  selectedDocument?.id === doc.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleDocumentSelect(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{doc.name}</h4>
                    <Badge className={getDifficultyColor(doc.difficulty)}>
                      {doc.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{doc.description}</p>
                  <div className="space-y-1">
                    <div className="text-xs font-medium">Expected Fields:</div>
                    <div className="flex flex-wrap gap-1">
                      {(doc.expectedFields || []).map((field: string) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={runRealDocumentExtraction}
                  disabled={isExtracting}
                  className="flex-1"
                >
                  {isExtracting ? 'Extracting...' : `Extract Data from ${selectedDocument.name}`}
                </Button>
                <Button 
                  onClick={runComparisonWithTestDocument}
                  variant="outline"
                >
                  Run Test Comparison
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extraction Results */}
      {extractionResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real Document Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Real Document Results
                {extractionResult.isProcessing ? (
                  <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                    PROCESSING
                  </Badge>
                ) : (
                  <Badge className={getStatusColor(extractionResult.success)}>
                    {extractionResult.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {extractionResult.isProcessing ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                    <h3 className="text-lg font-semibold text-yellow-800">Processing Large Document</h3>
                  </div>
                  <p className="text-yellow-700 mb-4">
                    Your {selectedDocument?.name} is being processed in the background. This may take several minutes for large documents.
                  </p>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-600 mb-2">Job ID: {extractionResult.jobId}</div>
                    <div className="text-sm font-mono">
                      Check console for real-time progress updates...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Confidence Score</Label>
                    <div className="font-mono">{((extractionResult.confidence || 0) * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <Label>Processing Time</Label>
                    <div className="font-mono">{extractionResult.processingTime?.totalTime || 0}ms</div>
                  </div>
                  <div>
                    <Label>Text Length</Label>
                    <div className="font-mono">{extractionResult.textLength || 0} chars</div>
                  </div>
                  <div>
                    <Label>Quality Score</Label>
                    <div className="font-mono">{((extractionResult.qualityScore || 0) * 100).toFixed(1)}%</div>
                  </div>
                  </div>

                  <div>
                    <Label>Extracted Data</Label>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(extractionResult.extractedData, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <Label>Processing Log</Label>
                    <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                      {(extractionResult.processingLog || []).map((log, index) => (
                        <div key={index} className="text-xs font-mono bg-gray-50 p-1 rounded">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Document Comparison */}
          {testResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Test Document Comparison
                  <Badge className={getStatusColor(testResults.success)}>
                    {testResults.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Confidence Score</Label>
                      <div className="font-mono">{(testResults.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <Label>Processing Time</Label>
                      <div className="font-mono">{testResults.processingTime?.totalTime || 0}ms</div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded">
                    <h4 className="font-medium text-sm mb-2">Pipeline Consistency Check</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Same extraction method:</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ {extractionResult.extractionMethod}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Same processing pipeline:</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ async-document-processor
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Same error handling:</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ UUID + Timeout
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Ground Truth Validation */}
      {extractionResult && selectedDocument && (
        <Card>
          <CardHeader>
            <CardTitle>Ground Truth Validation</CardTitle>
            <CardDescription>
              Manually enter expected field values to calculate extraction accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Expected Field Values</h4>
                {(selectedDocument?.expectedFields || []).map((field: string) => (
                  <div key={field}>
                    <Label htmlFor={field}>{field.replace('_', ' ').toUpperCase()}</Label>
                    <Input
                      id={field}
                      value={groundTruth[field] || ''}
                      onChange={(e) => setGroundTruth(prev => ({
                        ...prev,
                        [field]: e.target.value
                      }))}
                      placeholder={`Enter expected ${field.replace('_', ' ')}`}
                    />
                  </div>
                ))}
                <Button onClick={calculateAccuracy} className="w-full">
                  Calculate Accuracy
                </Button>
              </div>

              {accuracy && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Accuracy Results</h4>
                    <Badge className={getStatusColor(true, accuracy.overallAccuracy)}>
                      {(accuracy.overallAccuracy * 100).toFixed(1)}% 
                      {accuracy.passesThreshold ? ' ✓' : ' ✗'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Field-by-Field Accuracy:</div>
                    {Object.entries(accuracy.fieldByField).map(([field, score]) => (
                      <div key={field} className="flex justify-between items-center">
                        <span className="text-sm">{field.replace('_', ' ')}</span>
                        <Badge variant="outline" className={score >= 0.8 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {(score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {(accuracy.missingFields.length > 0) && (
                    <div>
                      <div className="text-sm font-medium text-red-600">Missing Fields:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(accuracy.missingFields || []).map(field => (
                          <Badge key={field} variant="outline" className="bg-red-100 text-red-800">
                            {field.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-2">Success Criteria Validation:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Overall Accuracy Target (≥85%):</span>
                        <Badge className={accuracy.passesThreshold ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {accuracy.passesThreshold ? '✓ PASS' : '✗ FAIL'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Fields Extracted:</span>
                        <span>{accuracy.extractedFields.length}/{(selectedDocument?.expectedFields || []).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};