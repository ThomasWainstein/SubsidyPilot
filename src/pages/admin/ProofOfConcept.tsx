import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TestTube, Database, ExternalLink } from 'lucide-react';
import { SubsidyDocumentExtractor } from '@/components/admin/SubsidyDocumentExtractor';
import { supabase } from '@/integrations/supabase/client';

export default function ProofOfConcept() {
  const [realityCheck, setRealityCheck] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performRealityCheck = async () => {
    setIsLoading(true);
    try {
      // Get actual database state
      const [subsidiesStructured, subsidiesBasic, applicationForms, documentExtractions] = await Promise.all([
        supabase.from('subsidies_structured').select('count', { count: 'exact' }),
        supabase.from('subsidies').select('count', { count: 'exact' }),
        supabase.from('application_forms').select('count', { count: 'exact' }),
        supabase.from('document_extractions').select('status, confidence_score, extraction_type').eq('status', 'completed')
      ]);

      setRealityCheck({
        subsidiesStructured: subsidiesStructured.count || 0,
        subsidiesBasic: subsidiesBasic.count || 0,
        applicationForms: applicationForms.count || 0,
        documentExtractions: documentExtractions.data?.length || 0,
        avgConfidence: documentExtractions.data?.length > 0 
          ? (documentExtractions.data.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / documentExtractions.data.length).toFixed(1)
          : 0,
        extractionTypes: [...new Set(documentExtractions.data?.map(item => item.extraction_type) || [])]
      });
    } catch (error) {
      console.error('Reality check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Critical Reality Check */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            CRITICAL REALITY CHECK: Current Platform Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">CLAIMED vs ACTUAL CAPABILITIES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">❌ CLAIMED (But Not Proven):</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Form field extraction from subsidy PDFs</li>
                    <li>• Dynamic form generation from documents</li>
                    <li>• Government API integration</li>
                    <li>• End-to-end application processing</li>
                    <li>• User validation of integrated experience</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">✅ ACTUAL (Database Evidence):</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={performRealityCheck}
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      {isLoading ? 'Checking...' : 'Get Real Database Numbers'}
                    </Button>
                    
                    {realityCheck && (
                      <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
                        <div>Processed Subsidies: <strong>{realityCheck.subsidiesStructured}</strong></div>
                        <div>Basic Subsidies: <strong>{realityCheck.subsidiesBasic}</strong></div>
                        <div>Application Forms: <strong>{realityCheck.applicationForms}</strong></div>
                        <div>Document Extractions: <strong>{realityCheck.documentExtractions}</strong></div>
                        <div>Avg Confidence: <strong>{realityCheck.avgConfidence}%</strong></div>
                        <div>Types: <strong>{realityCheck.extractionTypes.join(', ') || 'None'}</strong></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">⚠️ CRITICAL GAPS IDENTIFIED:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>1. <strong>Zero subsidy form processing capability</strong> - All extractions are farm documents, not application forms</li>
                <li>2. <strong>No government API integrations</strong> - Cannot submit applications to official systems</li>
                <li>3. <strong>No user validation</strong> - No evidence users want integrated application processing</li>
                <li>4. <strong>No legal research</strong> - Unknown if third-party application processing is allowed</li>
                <li>5. <strong>No business model validation</strong> - No proof users will pay for this service</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proof of Concept Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-500" />
            PHASE 0: Technical Feasibility Proof
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">🎯 ACCEPTANCE CRITERIA:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h5 className="font-medium mb-1">Technical Requirements:</h5>
                  <ul className="space-y-1">
                    <li>• Form field extraction &gt;85% accuracy</li>
                    <li>• Processing time &lt;30 seconds</li>
                    <li>• Handle French government PDFs</li>
                    <li>• Extract validation rules and requirements</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-1">Business Validation:</h5>
                  <ul className="space-y-1">
                    <li>• Survey 50+ farmers about willingness to pay</li>
                    <li>• Test with 10 real potential applicants</li>
                    <li>• Identify at least one government API</li>
                    <li>• Confirm legal compliance in one jurisdiction</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">📋 TEST PLAN:</h4>
              <ol className="text-sm space-y-2">
                <li><strong>1. Document Extraction Test:</strong> Use the tool below to test extraction on 5 real French subsidy PDFs</li>
                <li><strong>2. Form Generation Test:</strong> Generate working React forms from extracted fields</li>
                <li><strong>3. User Testing:</strong> Get 10 farmers to complete generated forms vs. original PDFs</li>
                <li><strong>4. API Research:</strong> Identify government APIs that accept third-party submissions</li>
                <li><strong>5. Legal Analysis:</strong> Research compliance requirements in France</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Proof of Concept Tool */}
      <SubsidyDocumentExtractor />

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 PROCEED ONLY IF PROOF VALIDATES</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h4 className="font-medium text-green-800 mb-2">✅ If Tests Pass (&gt;85% accuracy)</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Build single subsidy pilot</li>
                <li>• Test with real users</li>
                <li>• Validate business model</li>
                <li>• Research legal compliance</li>
              </ul>
            </div>
            
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ If Tests Partial (70-85% accuracy)</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Improve extraction algorithms</li>
                <li>• Test with simpler documents</li>
                <li>• Consider human-assisted processing</li>
                <li>• Reassess technical approach</li>
              </ul>
            </div>
            
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">❌ If Tests Fail (&lt;70% accuracy)</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Pivot to consultation services</li>
                <li>• Focus on document preparation</li>
                <li>• Partner with existing platforms</li>
                <li>• Improve discovery platform</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium mb-2">📊 Success Metrics Dashboard</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-400">0%</div>
                <div className="text-xs text-gray-600">Extraction Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">0</div>
                <div className="text-xs text-gray-600">Forms Generated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">0</div>
                <div className="text-xs text-gray-600">User Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">0</div>
                <div className="text-xs text-gray-600">API Integrations</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Use the extraction tool above to start populating these metrics with real data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* External Resources */}
      <Card>
        <CardHeader>
          <CardTitle>🔗 Research Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Government APIs to Research:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://www.data.gouv.fr/" target="_blank" className="text-blue-600 hover:underline">
                    data.gouv.fr - French Open Data
                  </a>
                </li>
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://www.franceagrimer.fr/" target="_blank" className="text-blue-600 hover:underline">
                    FranceAgriMer APIs
                  </a>
                </li>
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://agriculture.gouv.fr/" target="_blank" className="text-blue-600 hover:underline">
                    Ministry of Agriculture APIs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Legal Compliance Research:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://www.cnil.fr/" target="_blank" className="text-blue-600 hover:underline">
                    CNIL - Data Protection Authority
                  </a>
                </li>
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://www.legifrance.gouv.fr/" target="_blank" className="text-blue-600 hover:underline">
                    Légifrance - Legal Framework
                  </a>
                </li>
                <li>
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  <a href="https://eur-lex.europa.eu/" target="_blank" className="text-blue-600 hover:underline">
                    EU Legal Database
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}