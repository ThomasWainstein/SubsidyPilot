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
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={extractionStatus.status === 'not_extracted' ? 'secondary' : extractionStatus.status === 'completed' ? 'default' : 'destructive'}
            className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
          >
            {getStatusText(extractionStatus.status, isLoading)}
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

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        {isLoading 
          ? "Extracting form schema..."
          : extractionStatus.status === 'not_extracted' 
            ? "No form schema has been extracted yet. Automatic extraction will run in the background, or you can trigger it manually."
            : extractionStatus.status === 'completed'
              ? `Form schema has been successfully extracted with ${extractionStatus.fieldCount || 0} fields.`
              : "Schema extraction encountered an error. You can try extracting manually."
        }
      </p>

      {/* Action Button */}
      {isExtractionNeeded && (
        <Button
          onClick={handleManualExtract}
          disabled={!canExtract}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Manually Extract Schema
            </>
          )}
        </Button>
      )}
    </div>
  );
};