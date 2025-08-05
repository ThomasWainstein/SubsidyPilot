import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  RefreshCw,
  FileText,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ArrayProcessingStats {
  totalRecords: number;
  successfulProcessing: number;
  failedProcessing: number;
  methodsUsed: Record<string, number>;
  fieldStats: Record<string, {
    presentCount: number;
    emptyCount: number;
    averageLength: number;
    maxLength: number;
    conversionMethods: Record<string, number>;
  }>;
  recentErrors: Array<{
    fieldName: string;
    originalValue: any;
    error: string;
    timestamp: string;
  }>;
  processingTrends: Array<{
    date: string;
    successRate: number;
    totalProcessed: number;
  }>;
}

const ArrayProcessingMonitor: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<ArrayProcessingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      
      // This would fetch from your array processing audit logs
      // For now, using mock data
      const mockStats: ArrayProcessingStats = {
        totalRecords: 1247,
        successfulProcessing: 1198,
        failedProcessing: 49,
        methodsUsed: {
          'json_parse': 456,
          'csv_split_comma': 312,
          'single_wrap': 234,
          'array_cleanup': 156,
          'numeric_wrap': 89,
          'python_style': 67,
          'empty_string': 34,
          'error_fallback': 49
        },
        fieldStats: {
          'region': {
            presentCount: 1198,
            emptyCount: 23,
            averageLength: 2.3,
            maxLength: 8,
            conversionMethods: {
              'csv_split_comma': 456,
              'json_parse': 234,
              'single_wrap': 123
            }
          },
          'sector': {
            presentCount: 1156,
            emptyCount: 45,
            averageLength: 1.8,
            maxLength: 5,
            conversionMethods: {
              'json_parse': 567,
              'csv_split_comma': 234,
              'single_wrap': 234
            }
          },
          'amount': {
            presentCount: 1087,
            emptyCount: 67,
            averageLength: 1.2,
            maxLength: 3,
            conversionMethods: {
              'numeric_wrap': 789,
              'json_parse': 156,
              'single_wrap': 89
            }
          }
        },
        recentErrors: [
          {
            fieldName: 'amount',
            originalValue: 'invalid_number',
            error: 'Failed to convert to numeric: invalid_number',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            fieldName: 'region',
            originalValue: '[malformed json',
            error: 'JSON parse failed: Unexpected end of JSON input',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          }
        ],
        processingTrends: [
          { date: '2024-01-20', successRate: 96.1, totalProcessed: 234 },
          { date: '2024-01-21', successRate: 94.8, totalProcessed: 267 },
          { date: '2024-01-22', successRate: 95.7, totalProcessed: 289 },
          { date: '2024-01-23', successRate: 96.8, totalProcessed: 312 },
          { date: '2024-01-24', successRate: 96.0, totalProcessed: 298 }
        ]
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching array processing stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch array processing statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Set up automatic refresh
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  const handleReprocessFailures = async () => {
    toast({
      title: "Reprocessing Triggered",
      description: "Array processing failures are being reprocessed. This may take several minutes.",
    });
    
    // This would trigger reprocessing of failed array conversions
    logger.debug('Triggering reprocessing of array failures...');
  };

  if (isLoading || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading array processing statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = (stats.successfulProcessing / stats.totalRecords) * 100;
  const failureRate = (stats.failedProcessing / stats.totalRecords) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Array Processing Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of array field processing and conversion
          </p>
        </div>
        <Button
          onClick={fetchStats}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alert for high failure rate */}
      {failureRate > 5 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Failure Rate Detected</AlertTitle>
          <AlertDescription>
            Array processing failure rate is {failureRate.toFixed(1)}% ({stats.failedProcessing} failures). 
            Consider reviewing the processing pipeline or running batch reprocessing.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.successfulProcessing} / {stats.totalRecords} records
            </p>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Methods</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.methodsUsed).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active conversion methods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Processing</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.failedProcessing}
            </div>
            <p className="text-xs text-muted-foreground">
              Records requiring manual review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Coverage</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.fieldStats).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Array fields monitored
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="methods">Processing Methods</TabsTrigger>
          <TabsTrigger value="fields">Field Statistics</TabsTrigger>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="trends">Processing Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Array Processing Methods Usage</CardTitle>
              <CardDescription>
                Distribution of array conversion methods used in processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.methodsUsed)
                  .sort(([,a], [,b]) => b - a)
                  .map(([method, count]) => {
                    const percentage = (count / stats.totalRecords) * 100;
                    const methodLabels: Record<string, string> = {
                      'json_parse': 'JSON Array Parsing',
                      'csv_split_comma': 'CSV Comma Split',
                      'single_wrap': 'Single Value Wrap',
                      'array_cleanup': 'Array Cleanup',
                      'numeric_wrap': 'Numeric Wrap',
                      'python_style': 'Python-style Parsing',
                      'empty_string': 'Empty String Handling',
                      'error_fallback': 'Error Fallback'
                    };
                    
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{methodLabels[method] || method}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {count} records ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="w-32" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Processing Statistics</CardTitle>
              <CardDescription>
                Detailed statistics for each array field type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Records Present</TableHead>
                    <TableHead>Empty Records</TableHead>
                    <TableHead>Avg Length</TableHead>
                    <TableHead>Max Length</TableHead>
                    <TableHead>Top Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.fieldStats).map(([fieldName, fieldStats]) => {
                    const topMethod = Object.entries(fieldStats.conversionMethods)
                      .sort(([,a], [,b]) => b - a)[0];
                    
                    return (
                      <TableRow key={fieldName}>
                        <TableCell className="font-medium">{fieldName}</TableCell>
                        <TableCell>{fieldStats.presentCount}</TableCell>
                        <TableCell>
                          <span className={fieldStats.emptyCount > 50 ? 'text-yellow-600' : ''}>
                            {fieldStats.emptyCount}
                          </span>
                        </TableCell>
                        <TableCell>{fieldStats.averageLength.toFixed(1)}</TableCell>
                        <TableCell>{fieldStats.maxLength}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {topMethod ? topMethod[0] : 'N/A'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Processing Errors</span>
                <Button onClick={handleReprocessFailures} size="sm">
                  Reprocess Failures
                </Button>
              </CardTitle>
              <CardDescription>
                Recent array processing errors requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentErrors.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>Error Message</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentErrors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="destructive">{error.fieldName}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">
                          {JSON.stringify(error.originalValue)}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">
                          {error.error}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Errors</h3>
                  <p className="text-muted-foreground">
                    Array processing is operating smoothly
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Success Trends</CardTitle>
              <CardDescription>
                Daily processing success rates and volume trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.processingTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{trend.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {trend.totalProcessed} records processed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        trend.successRate > 95 ? 'text-green-600' : 
                        trend.successRate > 90 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {trend.successRate.toFixed(1)}%
                      </p>
                      <Progress 
                        value={trend.successRate} 
                        className="w-24 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArrayProcessingMonitor;