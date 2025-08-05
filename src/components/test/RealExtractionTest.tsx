import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Download, Play } from 'lucide-react';
import { testRealExtractionPipeline, checkQAResults, generateAuditReport } from '@/utils/testRealExtraction';
import { toast } from 'sonner';

export const RealExtractionTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [qaResults, setQAResults] = useState<any[]>([]);
  const [auditReport, setAuditReport] = useState<any>(null);

  const runPipelineTest = async () => {
    setIsRunning(true);
    try {
      toast.info('🚀 Commencer le test du pipeline d\'extraction...');
      const pipelineResults = await testRealExtractionPipeline();
      setResults(pipelineResults);
      
      // Check QA results
      const qaData = await checkQAResults();
      if (Array.isArray(qaData)) {
        setQAResults(qaData);
      }
      
      toast.success('✅ Test du pipeline terminé');
    } catch (error) {
      console.error('Pipeline test failed:', error);
      toast.error('❌ Échec du test du pipeline');
    } finally {
      setIsRunning(false);
    }
  };

  const generateReport = async () => {
    try {
      const report = await generateAuditReport();
      if (report) {
        setAuditReport(report);
        toast.success('📊 Rapport d\'audit généré');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('❌ Échec de la génération du rapport');
    }
  };

  const downloadReport = () => {
    if (!auditReport) return;
    
    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Pipeline d'Extraction Réel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runPipelineTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? '⏳ En cours...' : '🚀 Lancer le Test'}
            </Button>
            <Button 
              onClick={generateReport} 
              variant="outline"
              className="flex items-center gap-2"
            >
              📊 Générer Rapport
            </Button>
            {auditReport && (
              <Button 
                onClick={downloadReport} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Résultats du Pipeline</h3>
              {results.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm break-all">{result.url}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            {result.success ? 'Succès' : 'Échec'}
                          </Badge>
                          {result.extraction && (
                            <Badge variant="outline">
                              {result.extraction.sections?.length || 0} sections
                            </Badge>
                          )}
                          {result.extraction && (
                            <Badge variant="outline">
                              {result.extraction.documents?.length || 0} docs
                            </Badge>
                          )}
                          {result.qa && (
                            <Badge variant={result.qa.qa_pass ? "default" : "secondary"}>
                              QA: {result.qa.qa_pass ? 'PASS' : 'FAIL'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {qaResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Résultats QA en Base</h3>
              <div className="grid gap-2">
                {qaResults.slice(0, 5).map((qa, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm font-mono truncate flex-1">{qa.source_url}</span>
                    <div className="flex gap-2">
                      <Badge variant={qa.qa_pass ? "default" : "destructive"}>
                        {qa.qa_pass ? 'PASS' : 'FAIL'}
                      </Badge>
                      <Badge variant="outline">
                        {qa.completeness_score}% complet
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {auditReport && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rapport d'Audit</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{auditReport.total_extractions}</div>
                    <div className="text-sm text-muted-foreground">Total Extractions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{auditReport.qa_pass_rate}</div>
                    <div className="text-sm text-muted-foreground">Taux QA Pass</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-orange-600">{auditReport.admin_required}</div>
                    <div className="text-sm text-muted-foreground">Admin Requis</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">{auditReport.avg_completeness}%</div>
                    <div className="text-sm text-muted-foreground">Complétude Moy.</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};