import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText,
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  Download,
  Settings
} from 'lucide-react';
import { useSchemaExtraction } from '@/hooks/useSchemaExtraction';

interface SchemaExtractionStatusProps {
  subsidyId: string;
  title?: string;
  autoRefresh?: boolean;
  showDetails?: boolean;
}

const getStatusIcon = (status: string, isLoading: boolean) => {
  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
  }

  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case 'not_extracted':
    default:
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
  }
};

const getStatusText = (status: string, isLoading: boolean) => {
  if (isLoading) return 'Extracting...';
  
  switch (status) {
    case 'completed': return 'Schema Ready';
    case 'failed': return 'Extraction Failed';
    case 'processing': return 'Extracting...';
    case 'not_extracted':
    default: return 'Not Extracted';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'failed': return 'destructive';
    case 'processing': return 'secondary';
    case 'not_extracted':
    default: return 'outline';
  }
};

export const SchemaExtractionStatus: React.FC<SchemaExtractionStatusProps> = ({
  subsidyId,
  title = "Application Form Schema",
  autoRefresh = true,
  showDetails = true
}) => {
  const { extractionStatus, isLoading, extractSchema, refreshStatus } = useSchemaExtraction();

  // Load status on mount and when subsidyId changes
  useEffect(() => {
    if (subsidyId && autoRefresh) {
      refreshStatus(subsidyId);
    }
  }, [subsidyId, autoRefresh, refreshStatus]);

  const handleManualExtract = () => {
    extractSchema(subsidyId, true);
  };

  const handleRefreshStatus = () => {
    refreshStatus(subsidyId);
  };

  const isExtractionNeeded = extractionStatus.status === 'not_extracted' || extractionStatus.status === 'failed';
  const canExtract = !isLoading && subsidyId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(extractionStatus.status)}>
              {getStatusIcon(extractionStatus.status, isLoading)}
              <span className="ml-1">{getStatusText(extractionStatus.status, isLoading)}</span>
            </Badge>
            
            {!isLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshStatus}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Status Description */}
          <div className="text-sm text-muted-foreground">
            {extractionStatus.status === 'completed' && (
              <p>
                Form schema has been successfully extracted with{' '}
                <span className="font-medium">{extractionStatus.fieldCount || 0} fields</span>
                {extractionStatus.coveragePercentage && (
                  <span> ({extractionStatus.coveragePercentage}% coverage)</span>
                )}
              </p>
            )}
            {extractionStatus.status === 'processing' && (
              <p>Analyzing subsidy documents and extracting form requirements...</p>
            )}
            {extractionStatus.status === 'failed' && (
              <p>Schema extraction encountered an error. You can try extracting manually.</p>
            )}
            {extractionStatus.status === 'not_extracted' && (
              <p>No form schema has been extracted yet. Automatic extraction will run in the background, or you can trigger it manually.</p>
            )}
          </div>

          {/* Error Message */}
          {extractionStatus.status === 'failed' && extractionStatus.error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Extraction Error:</strong> {extractionStatus.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Details */}
          {extractionStatus.status === 'completed' && showDetails && extractionStatus.schema && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Form Sections:</span>
                  <span className="ml-2">{Object.keys(extractionStatus.schema.sections || {}).length}</span>
                </div>
                <div>
                  <span className="font-medium">Total Fields:</span>
                  <span className="ml-2">{extractionStatus.fieldCount || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Required Documents:</span>
                  <span className="ml-2">{extractionStatus.schema.required_documents?.length || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <span className="ml-2">
                    {extractionStatus.lastUpdated ? 
                      new Date(extractionStatus.lastUpdated).toLocaleDateString() : 
                      'Unknown'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {isExtractionNeeded && (
              <Button
                onClick={handleManualExtract}
                disabled={!canExtract}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                {isLoading ? 'Extracting...' : 'Manually Extract Schema'}
              </Button>
            )}

            {extractionStatus.status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleManualExtract()}
                  disabled={!canExtract}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-extract Schema
                </Button>
                
                {extractionStatus.schema && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(extractionStatus.schema, null, 2)], 
                        { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `schema-${subsidyId}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Schema
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Processing Info */}
          {extractionStatus.status === 'processing' && (
            <Alert>
              <Loader2 className="w-4 h-4 animate-spin" />
              <AlertDescription>
                Schema extraction is in progress. This may take up to 30 seconds. 
                The page will automatically update when complete.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};