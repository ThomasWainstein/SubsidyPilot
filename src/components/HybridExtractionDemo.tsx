import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';
import useHybridExtraction from '@/hooks/useHybridExtraction';
import ExtractionMethodToggle from '@/components/review/ExtractionMethodToggle';
import SourceBadge from '@/components/review/SourceBadge';
import ConfidenceBadge from '@/components/review/ConfidenceBadge';

const HybridExtractionDemo: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  
  const {
    extractFromDocument,
    retryWithAI,
    reset,
    isExtracting,
    extractionResult,
    error,
    hasResults,
    isHybridExtraction,
    fieldCount,
    confidence
  } = useHybridExtraction({
    onSuccess: (result) => {
      console.log('Extraction completed:', result);
    },
    onError: (error) => {
      console.error('Extraction failed:', error);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // In a real app, you'd upload the file and get a URL
      // For demo purposes, we'll use a placeholder URL
      const mockUrl = `https://example.com/documents/${file.name}`;
      setDocumentUrl(mockUrl);
    }
  };

  const handleExtract = async () => {
    if (!documentUrl) return;
    
    try {
      await extractFromDocument(documentUrl, 'demo-doc-' + Date.now());
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  const handleRetryWithAI = async () => {
    if (!documentUrl) return;
    
    try {
      await retryWithAI(documentUrl, 'demo-doc-' + Date.now());
    } catch (error) {
      console.error('AI retry failed:', error);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocumentUrl('');
    reset();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-6 h-6" />
            <span>Phase 4: Hybrid Extraction Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <label htmlFor="file-upload" className="block text-sm font-medium">
              Select a farm document to extract data from:
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Choose File</span>
              </Button>
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Extract Button */}
          {selectedFile && !hasResults && (
            <Button
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Data...
                </>
              ) : (
                'Start Hybrid Extraction'
              )}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700 text-sm">{error.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Extraction Results */}
          {hasResults && extractionResult && (
            <div className="space-y-4">
              {/* Method Toggle */}
              <ExtractionMethodToggle
                currentMethod={extractionResult.source === 'error' ? 'rule-based' : extractionResult.source}
                confidence={extractionResult.confidence}
                fieldsCount={extractionResult.fieldsCount}
                onRetryWithAI={handleRetryWithAI}
                isLoading={isExtracting}
              />

              {/* Extracted Fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Extracted Fields ({extractionResult.fieldsCount})</span>
                    <div className="flex items-center space-x-2">
                      <ConfidenceBadge 
                        confidence={extractionResult.confidence}
                        size="md"
                      />
                      <SourceBadge 
                        source={extractionResult.source === 'error' ? 'manual' : extractionResult.source}
                        size="md"
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(extractionResult.extractedFields).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-sm capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="ml-2 text-sm text-gray-700">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {extractionResult.debugInfo?.fieldSources?.[`${key}_source`] && (
                            <SourceBadge 
                              source={extractionResult.debugInfo.fieldSources[`${key}_source`]}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Debug Information */}
              {extractionResult.debugInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Debug Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(extractionResult.debugInfo, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Reset Button */}
              <Button variant="outline" onClick={handleReset} className="w-full">
                Try Another Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">🔄 Hybrid Extraction Pipeline:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li><strong>Rule-based extraction</strong> runs first using pattern matching</li>
              <li><strong>Quality check</strong> evaluates field count, confidence, and mandatory fields</li>
              <li><strong>AI fallback</strong> activates if rule-based extraction is insufficient</li>
              <li><strong>Result merging</strong> combines the best fields from both methods</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">📊 Quality Thresholds:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Minimum 8 fields extracted</li>
              <li>60% minimum confidence score</li>
              <li>Required fields: farm_name, owner_name</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">🏷️ Source Badges:</h4>
            <div className="flex items-center space-x-3">
              <SourceBadge source="rule-based" size="sm" />
              <SourceBadge source="ai-based" size="sm" />
              <SourceBadge source="merged" size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HybridExtractionDemo;