import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface QualityMetrics {
  completeness: number;
  structuralIntegrity: number;
  documentCoverage: number;
  fieldAccuracy: number;
}

interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  autoFixable: boolean;
}

interface ExtractionQualityControlProps {
  subsidyUrl: string;
  extractionData: any;
  qualityMetrics: QualityMetrics;
  issues: QualityIssue[];
  onReextract: (forceReprocess: boolean) => void;
  onManualReview: () => void;
  isExtracting: boolean;
}

export const ExtractionQualityControl: React.FC<ExtractionQualityControlProps> = ({
  subsidyUrl,
  extractionData,
  qualityMetrics,
  issues,
  onReextract,
  onManualReview,
  isExtracting
}) => {
  const overallQuality = Math.round(
    (qualityMetrics.completeness + 
     qualityMetrics.structuralIntegrity + 
     qualityMetrics.documentCoverage + 
     qualityMetrics.fieldAccuracy) / 4
  );

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const criticalIssues = issues.filter(issue => issue.type === 'error');
  const warnings = issues.filter(issue => issue.type === 'warning');
  const canApprove = criticalIssues.length === 0 && overallQuality >= 70;

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contrôle Qualité de l'Extraction</CardTitle>
            <Badge variant={getQualityBadgeVariant(overallQuality)} className="text-lg px-3 py-1">
              {overallQuality}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.completeness)}`}>
                {qualityMetrics.completeness}%
              </div>
              <div className="text-sm text-muted-foreground">Complétude</div>
              <Progress value={qualityMetrics.completeness} className="mt-1" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.structuralIntegrity)}`}>
                {qualityMetrics.structuralIntegrity}%
              </div>
              <div className="text-sm text-muted-foreground">Structure</div>
              <Progress value={qualityMetrics.structuralIntegrity} className="mt-1" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.documentCoverage)}`}>
                {qualityMetrics.documentCoverage}%
              </div>
              <div className="text-sm text-muted-foreground">Documents</div>
              <Progress value={qualityMetrics.documentCoverage} className="mt-1" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(qualityMetrics.fieldAccuracy)}`}>
                {qualityMetrics.fieldAccuracy}%
              </div>
              <div className="text-sm text-muted-foreground">Précision</div>
              <Progress value={qualityMetrics.fieldAccuracy} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Problèmes Détectés ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalIssues.map((issue, index) => (
              <Alert key={`error-${index}`} variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{issue.field}:</strong> {issue.message}
                  {issue.autoFixable && (
                    <Badge variant="outline" className="ml-2">Auto-réparable</Badge>
                  )}
                </AlertDescription>
              </Alert>
            ))}
            
            {warnings.map((issue, index) => (
              <Alert key={`warning-${index}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{issue.field}:</strong> {issue.message}
                  {issue.autoFixable && (
                    <Badge variant="outline" className="ml-2">Auto-réparable</Badge>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extraction Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {canApprove ? (
                  <span className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Extraction Approuvée
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Extraction Nécessite une Révision
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                URL: {subsidyUrl}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReextract(true)}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Re-extraire
              </Button>
              
              {!canApprove && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onManualReview}
                >
                  Révision Manuelle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Exigences de Complétude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Contenu structuré préservé</span>
              {extractionData?.completeness?.hasStructuredContent ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Documents associés extraits</span>
              {extractionData?.completeness?.hasDocuments ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Critères d'éligibilité détaillés</span>
              {extractionData?.completeness?.hasEligibility ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Étapes de candidature claires</span>
              {extractionData?.completeness?.hasApplicationSteps ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};