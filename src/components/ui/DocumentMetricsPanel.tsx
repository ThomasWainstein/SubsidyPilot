import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Table, 
  FileText, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp 
} from 'lucide-react';

interface MetricsData {
  totalOperations: number;
  avgDuration: number;
  successRate: number;
  operationBreakdown: Record<string, number>;
}

interface DocumentMetricsPanelProps {
  metrics: MetricsData;
  tableCount: number;
  processingTimeMs?: number;
  confidence?: number;
  pagesProcessed?: number;
  totalPages?: number;
  className?: string;
}

export function DocumentMetricsPanel({
  metrics,
  tableCount,
  processingTimeMs,
  confidence,
  pagesProcessed,
  totalPages,
  className
}: DocumentMetricsPanelProps) {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.8) return 'text-success';
    if (conf >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Processing Metrics</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Processing Time */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Total Time</span>
            </div>
            <div className="text-lg font-semibold">
              {processingTimeMs ? formatDuration(processingTimeMs) : 'N/A'}
            </div>
          </div>

          {/* Tables Found */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Table className="w-3 h-3" />
              <span>Tables</span>
            </div>
            <div className="text-lg font-semibold">
              {tableCount}
            </div>
          </div>

          {/* Success Rate */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3" />
              <span>Success Rate</span>
            </div>
            <div className={cn("text-lg font-semibold", getSuccessRateColor(metrics.successRate))}>
              {metrics.successRate}%
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>Confidence</span>
            </div>
            <div className={cn("text-lg font-semibold", confidence ? getConfidenceColor(confidence) : "")}>
              {confidence ? `${Math.round(confidence * 100)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Pages Progress */}
        {totalPages && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1 text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>Pages Processed</span>
              </div>
              <span className="font-medium">
                {pagesProcessed || 0} / {totalPages}
              </span>
            </div>
            <Progress 
              value={totalPages > 0 ? ((pagesProcessed || 0) / totalPages) * 100 : 0}
              className="h-2"
            />
          </div>
        )}

        {/* Operation Breakdown */}
        {Object.keys(metrics.operationBreakdown).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Operations</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(metrics.operationBreakdown).map(([operation, count]) => (
                <div key={operation} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {operation.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="pt-3 border-t border-muted">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Avg Duration</span>
              <div className="font-medium">
                {formatDuration(metrics.avgDuration)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Ops</span>
              <div className="font-medium">
                {metrics.totalOperations}
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Warning */}
        {confidence && confidence < 0.6 && (
          <div className="flex items-start space-x-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-warning">
                Low Confidence Score
              </p>
              <p className="text-xs text-warning/80">
                The extracted data may require manual review
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}