import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { 
  Activity, 
  Pause, 
  Play, 
  Square, 
  SkipForward,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Database,
  Globe,
  TrendingUp,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';

interface PipelineOperation {
  id: string;
  type: 'scraping' | 'ai_processing' | 'form_generation';
  status: 'running' | 'paused' | 'completed' | 'failed' | 'queued';
  country?: 'france' | 'romania';
  progress: number;
  currentTask: string;
  startTime: Date;
  estimatedCompletion?: Date;
  statistics: {
    processed: number;
    successful: number;
    failed: number;
    remaining: number;
    speed: number; // items per minute
  };
  errors: Array<{
    timestamp: Date;
    message: string;
    url?: string;
    severity: 'warning' | 'error';
  }>;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  apiCallsRemaining: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: number;
}

export function RealTimeMonitoring() {
  const [operations, setOperations] = useState<PipelineOperation[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    apiCallsRemaining: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    responseTime: 0
  });
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulate real-time data updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real operation data
      setOperations(prev => prev.map(op => ({
        ...op,
        progress: Math.min(op.progress + Math.random() * 5, 100),
        statistics: {
          ...op.statistics,
          processed: op.statistics.processed + Math.floor(Math.random() * 3),
          speed: 15 + Math.random() * 10
        }
      })));

      // Simulate system metrics
      setSystemMetrics({
        cpuUsage: 20 + Math.random() * 30,
        memoryUsage: 40 + Math.random() * 20,
        apiCallsRemaining: 2800 + Math.floor(Math.random() * 200),
        requestsPerMinute: 45 + Math.floor(Math.random() * 15),
        errorRate: Math.random() * 5,
        responseTime: 200 + Math.random() * 100
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const pauseOperation = (id: string) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, status: 'paused' as const } : op
    ));
  };

  const resumeOperation = (id: string) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, status: 'running' as const } : op
    ));
  };

  const stopOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const skipCurrentTask = (id: string) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { 
        ...op, 
        currentTask: 'Skipping to next task...',
        statistics: {
          ...op.statistics,
          failed: op.statistics.failed + 1,
          remaining: op.statistics.remaining - 1
        }
      } : op
    ));
  };

  const getStatusColor = (status: PipelineOperation['status']) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      case 'queued': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getOperationIcon = (type: PipelineOperation['type']) => {
    switch (type) {
      case 'scraping': return <Globe className="h-4 w-4" />;
      case 'ai_processing': return <Zap className="h-4 w-4" />;
      case 'form_generation': return <Database className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const duration = ((end || new Date()).getTime() - start.getTime()) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatETA = (eta?: Date) => {
    if (!eta) return 'Calculating...';
    const minutes = Math.ceil((eta.getTime() - new Date().getTime()) / 60000);
    return minutes > 0 ? `${minutes}m remaining` : 'Completing...';
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health & Performance
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="CPU Usage"
              value={`${systemMetrics.cpuUsage.toFixed(1)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              color={systemMetrics.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}
            />
            <MetricCard
              title="Memory"
              value={`${systemMetrics.memoryUsage.toFixed(1)}%`}
              icon={<Database className="h-4 w-4" />}
              color={systemMetrics.memoryUsage > 90 ? 'text-red-500' : 'text-green-500'}
            />
            <MetricCard
              title="API Calls Left"
              value={systemMetrics.apiCallsRemaining.toString()}
              icon={<Zap className="h-4 w-4" />}
              color={systemMetrics.apiCallsRemaining < 500 ? 'text-red-500' : 'text-green-500'}
            />
            <MetricCard
              title="Requests/Min"
              value={systemMetrics.requestsPerMinute.toString()}
              icon={<Activity className="h-4 w-4" />}
              color="text-blue-500"
            />
            <MetricCard
              title="Error Rate"
              value={`${systemMetrics.errorRate.toFixed(1)}%`}
              icon={<AlertTriangle className="h-4 w-4" />}
              color={systemMetrics.errorRate > 10 ? 'text-red-500' : 'text-green-500'}
            />
            <MetricCard
              title="Response Time"
              value={`${systemMetrics.responseTime.toFixed(0)}ms`}
              icon={<Clock className="h-4 w-4" />}
              color={systemMetrics.responseTime > 500 ? 'text-red-500' : 'text-green-500'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Active Pipeline Operations
            <HelpTooltip content="Monitor and control all running pipeline operations in real-time. You can pause, resume, or stop operations as needed." />
          </CardTitle>
          <CardDescription>
            {operations.length} active operations • Real-time monitoring and control
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active operations</p>
              <p className="text-sm">Start a pipeline operation to see real-time monitoring</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operations.map((operation) => (
                <OperationCard
                  key={operation.id}
                  operation={operation}
                  onPause={() => pauseOperation(operation.id)}
                  onResume={() => resumeOperation(operation.id)}
                  onStop={() => stopOperation(operation.id)}
                  onSkip={() => skipCurrentTask(operation.id)}
                  onViewDetails={() => setSelectedOperation(operation.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Operation View */}
      {selectedOperation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Operation Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OperationDetails 
              operation={operations.find(op => op.id === selectedOperation)!}
              onClose={() => setSelectedOperation(null)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  color = 'text-foreground' 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color?: string; 
}) {
  return (
    <div className="text-center space-y-2">
      <div className={`${color} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <div className={`font-bold text-lg ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </div>
    </div>
  );
}

function OperationCard({
  operation,
  onPause,
  onResume,
  onStop,
  onSkip,
  onViewDetails
}: {
  operation: PipelineOperation;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(operation.status)}`} />
          {getOperationIcon(operation.type)}
          <div>
            <div className="font-medium flex items-center gap-2">
              {operation.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {operation.country && (
                <Badge variant="outline">
                  {operation.country === 'france' ? '🇫🇷' : '🇷🇴'} {operation.country}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{operation.currentTask}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {operation.status === 'running' && (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-3 w-3" />
            </Button>
          )}
          {operation.status === 'paused' && (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="h-3 w-3" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onSkip}>
            <SkipForward className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={onStop} className="text-destructive">
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{operation.progress.toFixed(1)}%</span>
        </div>
        <Progress value={operation.progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-green-600">{operation.statistics.successful}</div>
          <div className="text-muted-foreground">Successful</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-red-600">{operation.statistics.failed}</div>
          <div className="text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="font-medium">{operation.statistics.remaining}</div>
          <div className="text-muted-foreground">Remaining</div>
        </div>
        <div className="text-center">
          <div className="font-medium">{operation.statistics.speed.toFixed(1)}/min</div>
          <div className="text-muted-foreground">Speed</div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Started: {formatDuration(operation.startTime)}</span>
        <span>ETA: {formatETA(operation.estimatedCompletion)}</span>
      </div>
    </div>
  );
}

function OperationDetails({ 
  operation, 
  onClose 
}: { 
  operation: PipelineOperation; 
  onClose: () => void; 
}) {
  return (
    <Tabs defaultValue="progress">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="progress">Progress</TabsTrigger>
        <TabsTrigger value="errors">Errors</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="progress" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold text-green-600">{operation.statistics.successful}</div>
            <div className="text-sm text-muted-foreground">Processed Successfully</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold text-red-600">{operation.statistics.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{operation.statistics.remaining}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <div className="text-2xl font-bold">{operation.statistics.speed.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Items/Min</div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="errors" className="space-y-4">
        <ScrollArea className="h-64">
          {operation.errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No errors recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {operation.errors.map((error, index) => (
                <Alert key={index} variant={error.severity === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <span>{error.message}</span>
                      <span className="text-xs">{error.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {error.url && (
                      <div className="text-xs text-muted-foreground mt-1">URL: {error.url}</div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="logs" className="space-y-4">
        <ScrollArea className="h-64">
          <div className="font-mono text-sm space-y-1">
            <div>[{new Date().toISOString()}] Operation started</div>
            <div>[{new Date().toISOString()}] Initializing {operation.type}</div>
            <div>[{new Date().toISOString()}] Current task: {operation.currentTask}</div>
            <div>[{new Date().toISOString()}] Progress: {operation.progress.toFixed(1)}%</div>
          </div>
        </ScrollArea>
      </TabsContent>

      <div className="flex justify-end mt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Tabs>
  );
}