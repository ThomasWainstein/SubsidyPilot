/**
 * AI Extraction Debug Panel
 * Provides detailed debugging information for AI extraction issues
 * Helps identify where token consumption occurs without effective results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code, 
  Database, 
  Brain, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  Eye,
  Copy
} from 'lucide-react';
import { useAIExtractionTracker } from '@/hooks/useAIExtractionTracker';
import { toast } from 'sonner';

interface AIExtractionDebugPanelProps {
  documentId?: string;
  farmId?: string;
  extractionId?: string;
}

const AIExtractionDebugPanel: React.FC<AIExtractionDebugPanelProps> = ({
  documentId,
  farmId,
  extractionId
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const {
    attempts,
    currentAttempt,
    isLoading,
    getExtractionStats,
    downloadExtractionLog,
    refreshAttempts
  } = useAIExtractionTracker({ documentId, farmId, autoRefresh: true });

  const stats = getExtractionStats();
  const latestAttempt = attempts[0];

  const copyToClipboard = (data: any, label: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success(`${label} copied to clipboard`);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Clock className="h-6 w-6 animate-spin mr-2" />
          Loading extraction data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Extraction Debug Panel
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAttempts}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {latestAttempt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExtractionLog(latestAttempt)}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download Log
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data Flow</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Total Attempts</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Avg Confidence</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.failed}</div>
                </CardContent>
              </Card>
            </div>

            {/* Latest Extraction Summary */}
            {latestAttempt && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Latest Extraction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge className={getStatusColor(latestAttempt.status)}>
                      {latestAttempt.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Confidence:</span>
                    <span className={`font-bold ${
                      latestAttempt.confidence >= 85 ? 'text-green-600' : 
                      latestAttempt.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {latestAttempt.confidence}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Fields Extracted:</span>
                    <span>{latestAttempt.extractedFieldsCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Fields Saved:</span>
                    <span className={latestAttempt.savedFieldsCount > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                      {latestAttempt.savedFieldsCount}
                      {latestAttempt.savedFieldsCount === 0 && ' ⚠️ No data saved!'}
                    </span>
                  </div>

                  {latestAttempt.tokensUsed && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Tokens Used:</span>
                      <span className="font-mono">{latestAttempt.tokensUsed.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Processing Time:</span>
                    <span>{latestAttempt.processingTime || 'N/A'}ms</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Timestamp:</span>
                    <span className="text-sm">{formatTime(latestAttempt.createdAt)}</span>
                  </div>

                  {latestAttempt.errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="text-sm font-medium text-red-800">Error Message:</div>
                      <div className="text-sm text-red-700 mt-1">{latestAttempt.errorMessage}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {latestAttempt && (
              <div className="space-y-4">
                {/* Extracted Data */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Raw Extracted Data</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(latestAttempt.extractedData, 'Extracted data')}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(latestAttempt.extractedData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                {/* Mapped Data */}
                {latestAttempt.mappedData && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Mapped Form Data</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(latestAttempt.mappedData, 'Mapped data')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(latestAttempt.mappedData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Validation Issues */}
                {(latestAttempt.validationErrors?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-red-600">Validation Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {latestAttempt.validationErrors?.map((error, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Unmapped Fields */}
                {(latestAttempt.unmappedFields?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-orange-600">Unmapped Fields</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {latestAttempt.unmappedFields?.map((field, index) => (
                          <Badge key={index} variant="outline" className="text-orange-600">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <Card key={attempt.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(attempt.status)}>
                        {attempt.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {attempt.confidence}% confidence
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(attempt.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span>{attempt.extractedFieldsCount} extracted</span>
                      <span className={attempt.savedFieldsCount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {attempt.savedFieldsCount} saved
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadExtractionLog(attempt)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {attempt.errorMessage && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      {attempt.errorMessage}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div><strong>Document ID:</strong> {documentId || 'N/A'}</div>
                  <div><strong>Farm ID:</strong> {farmId || 'N/A'}</div>
                  <div><strong>Current Attempts:</strong> {attempts.length}</div>
                  <div><strong>Is Tracking:</strong> {currentAttempt ? 'Yes' : 'No'}</div>
                </div>

                {/* Critical Issue Diagnostics */}
                {latestAttempt && latestAttempt.tokensUsed && latestAttempt.savedFieldsCount === 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      Critical Issue Detected
                    </div>
                    <div className="text-sm text-red-700 space-y-1">
                      <p>• AI tokens consumed ({latestAttempt.tokensUsed.toLocaleString()}) but no data saved to farm profile</p>
                      <p>• {latestAttempt.extractedFieldsCount} fields extracted but 0 fields persisted</p>
                      <p>• This indicates a breakdown in the AI → Database → UI pipeline</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium">Pipeline Status</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>AI Extraction:</span>
                        <span className={latestAttempt?.extractedFieldsCount ? 'text-green-600' : 'text-red-600'}>
                          {latestAttempt?.extractedFieldsCount ? '✅ Working' : '❌ Failed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data Mapping:</span>
                        <span className={latestAttempt?.mappedData ? 'text-green-600' : 'text-red-600'}>
                          {latestAttempt?.mappedData ? '✅ Working' : '❌ Failed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database Save:</span>
                        <span className={latestAttempt?.savedFieldsCount ? 'text-green-600' : 'text-red-600'}>
                          {latestAttempt?.savedFieldsCount ? '✅ Working' : '❌ Failed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Resource Usage</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Tokens Used:</span>
                        <span>{latestAttempt?.tokensUsed?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Time:</span>
                        <span>{latestAttempt?.processingTime || 'N/A'}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model Used:</span>
                        <span>{latestAttempt?.model || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIExtractionDebugPanel;