import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useDeepExtraction } from '@/hooks/useDeepExtraction';
import { StructuredSubsidyDisplay } from '@/components/subsidy/StructuredSubsidyDisplay';
import { ExtractionQualityControl } from '@/components/subsidy/ExtractionQualityControl';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  List, 
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';

// Test URL from FranceAgriMer with complex structure
const TEST_SUBSIDY_URL = 'https://www.franceagrimer.fr/aides/aide-en-faveur-dinvestissements-realises-pour-la-production-de-plantes-parfum-aromatiques-et';

// Expected structure from the original page
const EXPECTED_STRUCTURE = {
  title: 'Aide en faveur d\'investissements réalisés pour la production de plantes à parfum, aromatiques et médicinales',
  sections: {
    presentation: true,
    objectifs: true,
    pourQui: true,
    quand: true,
    comment: true
  },
  documents: [
    {
      name: 'Annexe 1 matériels D2024-05',
      type: 'pdf',
      size: '29.74 KB',
      url: 'https://www.franceagrimer.fr/sites/default/files/rdd/documents/Annexe1-mat%C3%A9riel_D2024-05_0.pdf'
    },
    {
      name: 'Annexe 2 grille',
      type: 'pdf', 
      size: '41.14 KB',
      url: 'https://www.franceagrimer.fr/sites/default/files/rdd/documents/Annexe2_Grille_D2024-05_2.pdf'
    },
    {
      name: 'Annexe 3 cuma',
      type: 'pdf',
      size: '95.35 KB', 
      url: 'https://www.franceagrimer.fr/sites/default/files/rdd/documents/Annexe3_Cuma_D2024-05_0.pdf'
    },
    {
      name: 'Formulaire n° 15505-03',
      type: 'pdf',
      size: '1.17 MB',
      url: 'https://www.franceagrimer.fr/sites/default/files/rdd/documents/formulaire_15505_03_3.pdf'
    }
  ]
};

interface AuditResult {
  score: number;
  passed: boolean;
  issues: string[];
  completeness: {
    titleMatch: boolean;
    allDocumentsFound: boolean;
    structurePreserved: boolean;
    noWallOfText: boolean;
    sectionsDetected: boolean;
  };
}

export const DeepExtractionAudit: React.FC = () => {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  
  const { 
    startDeepExtraction, 
    isExtracting, 
    extractionResult, 
    error 
  } = useDeepExtraction();

  const loadOriginalContent = async () => {
    setIsLoadingOriginal(true);
    try {
      const response = await fetch('/api/fetch-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: TEST_SUBSIDY_URL })
      });
      const data = await response.text();
      setOriginalContent(data);
    } catch (err) {
      console.error('Failed to load original content:', err);
    } finally {
      setIsLoadingOriginal(false);
    }
  };

  const runExtractionTest = async () => {
    try {
      await startDeepExtraction(TEST_SUBSIDY_URL, true);
    } catch (err) {
      console.error('Extraction test failed:', err);
    }
  };

  const performAudit = () => {
    if (!extractionResult) return;

    const issues: string[] = [];
    let score = 0;

    // Title check
    const titleMatch = extractionResult.title?.toLowerCase().includes('plantes à parfum') ||
                      extractionResult.title?.toLowerCase().includes('aromatiques');
    if (titleMatch) score += 20;
    else issues.push('Title does not match expected content');

    // Documents check
    const extractedDocs = extractionResult.documents || [];
    const expectedDocCount = EXPECTED_STRUCTURE.documents.length;
    const foundDocCount = extractedDocs.length;
    
    if (foundDocCount >= expectedDocCount) {
      score += 30;
    } else {
      issues.push(`Only ${foundDocCount}/${expectedDocCount} documents found`);
    }

    // Check for specific expected documents
    const missingDocs = EXPECTED_STRUCTURE.documents.filter(expectedDoc => 
      !extractedDocs.some(extractedDoc => 
        extractedDoc.name?.toLowerCase().includes(expectedDoc.name.toLowerCase().split(' ')[1])
      )
    );
    if (missingDocs.length > 0) {
      issues.push(`Missing documents: ${missingDocs.map(d => d.name).join(', ')}`);
    }

    // Structure preservation check
    const hasStructuredSections = extractionResult.sections?.length > 0 ||
                                 extractionResult.eligibility?.length > 0 ||
                                 extractionResult.applicationSteps?.length > 0;
    if (hasStructuredSections) score += 25;
    else issues.push('No structured sections detected');

    // Wall of text check
    const hasListStructure = extractionResult.sections?.some((section: any) => 
      section.type === 'list' || section.type === 'numbered_list'
    );
    if (hasListStructure) score += 15;
    else issues.push('No list structures preserved - may be collapsed to wall of text');

    // Completeness indicators
    const completeness = extractionResult.completeness || {};
    if (completeness.hasStructuredContent) score += 10;
    else issues.push('Completeness check failed for structured content');

    const auditResult: AuditResult = {
      score,
      passed: score >= 70 && issues.length === 0,
      issues,
      completeness: {
        titleMatch,
        allDocumentsFound: foundDocCount >= expectedDocCount,
        structurePreserved: hasStructuredSections,
        noWallOfText: hasListStructure,
        sectionsDetected: hasStructuredSections
      }
    };

    setAuditResult(auditResult);
  };

  const generateQualityMetrics = () => {
    if (!extractionResult || !auditResult) {
      return {
        completeness: 0,
        structuralIntegrity: 0,
        documentCoverage: 0,
        fieldAccuracy: 0
      };
    }

    return {
      completeness: auditResult.completeness.titleMatch ? 90 : 30,
      structuralIntegrity: auditResult.completeness.structurePreserved ? 85 : 20,
      documentCoverage: auditResult.completeness.allDocumentsFound ? 95 : 40,
      fieldAccuracy: auditResult.completeness.noWallOfText ? 80 : 25
    };
  };

  const generateQualityIssues = () => {
    if (!auditResult) return [];
    
    return auditResult.issues.map(issue => ({
      type: 'error' as const,
      field: 'Extraction',
      message: issue,
      autoFixable: false
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Deep Extraction Audit & Verification</CardTitle>
          <p className="text-muted-foreground">
            Comprehensive testing of AgriTool's deep extraction pipeline with real FranceAgriMer data
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={loadOriginalContent}
              disabled={isLoadingOriginal}
              variant="outline"
            >
              {isLoadingOriginal ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Load Original Content
            </Button>
            
            <Button 
              onClick={runExtractionTest}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Run Deep Extraction Test
            </Button>
            
            {extractionResult && (
              <Button 
                onClick={performAudit}
                variant="secondary"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Perform Quality Audit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test URL Information */}
      <Card>
        <CardHeader>
          <CardTitle>Test Subsidy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <strong>URL:</strong>{' '}
              <a href={TEST_SUBSIDY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {TEST_SUBSIDY_URL}
              </a>
            </div>
            <div>
              <strong>Expected Documents:</strong> {EXPECTED_STRUCTURE.documents.length} annexes and forms
            </div>
            <div>
              <strong>Expected Structure:</strong> Title, Presentation, Objectifs, Pour qui?, Quand?, Comment?
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
          <TabsTrigger value="extraction">Extracted Data</TabsTrigger>
          <TabsTrigger value="quality">Quality Control</TabsTrigger>
          <TabsTrigger value="documents">Document Analysis</TabsTrigger>
          <TabsTrigger value="audit">Audit Results</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Original FranceAgriMer Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {originalContent ? (
                    <pre className="text-sm whitespace-pre-wrap">{originalContent}</pre>
                  ) : (
                    <p className="text-muted-foreground">Click "Load Original Content" to fetch the source</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AgriTool Extracted JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {extractionResult ? (
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(extractionResult, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">Run extraction test to see results</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="extraction">
          {extractionResult ? (
            <StructuredSubsidyDisplay data={extractionResult} />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No extraction data available. Run the extraction test first.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="quality">
          {extractionResult && auditResult ? (
            <ExtractionQualityControl
              subsidyUrl={TEST_SUBSIDY_URL}
              extractionData={extractionResult}
              qualityMetrics={generateQualityMetrics()}
              issues={generateQualityIssues()}
              onReextract={(force) => runExtractionTest()}
              onManualReview={() => console.info('Manual review requested')}
              isExtracting={isExtracting}
            />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Run extraction and audit to see quality control results.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected Documents (Source)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {EXPECTED_STRUCTURE.documents.map((doc, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{doc.name}</span>
                      <Badge variant="outline">{doc.type.toUpperCase()}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Size: {doc.size}
                    </div>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline block mt-1 truncate"
                    >
                      {doc.url}
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Extracted Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {extractionResult?.documents?.length > 0 ? (
                  <div className="space-y-3">
                    {extractionResult.documents.map((doc: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{doc.name}</span>
                          <Badge variant="outline">{doc.type?.toUpperCase()}</Badge>
                        </div>
                        {doc.size && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Size: {doc.size}
                          </div>
                        )}
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline block mt-1 truncate"
                        >
                          {doc.url}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents extracted yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          {auditResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {auditResult.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Audit Results
                  <Badge variant={auditResult.passed ? "default" : "destructive"}>
                    Score: {auditResult.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Completeness Checklist</h3>
                  <div className="space-y-2">
                    {Object.entries(auditResult.completeness).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {auditResult.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Issues Detected</h3>
                    <div className="space-y-2">
                      {auditResult.issues.map((issue, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{issue}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Verification Requirements</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>✓ All bullets, sub-bullets, and lists preserved as arrays/objects (not text blobs)</p>
                    <p>✓ All 4 expected documents captured with metadata (name, type, size, URL)</p>
                    <p>✓ Hierarchical structure maintained (headings, sections, subsections)</p>
                    <p>✓ No "Not specified" fields when source has content</p>
                    <p>✓ Quality control flags missing or malformed data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Run extraction test and audit to see detailed results.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Extraction Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};