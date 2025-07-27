import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Eye,
  FileText,
  Users,
  TrendingUp,
  Activity,
  Database,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubmissionMetrics {
  totalSubmissions: number;
  pendingValidation: number;
  underReview: number;
  autoApproved: number;
  flaggedForQA: number;
  averageProcessingTime: number;
  rejectionRate: number;
  commonIssues: IssuePattern[];
}

interface IssuePattern {
  category: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface RecentSubmission {
  id: string;
  applicantName: string;
  submittedAt: string;
  status: string;
  validationScore: number;
  flagged: boolean;
  processingTime: number;
  issues: string[];
}

interface SubmissionMonitoringProps {
  refreshInterval?: number;
}

const SubmissionMonitoring: React.FC<SubmissionMonitoringProps> = ({ 
  refreshInterval = 30000 
}) => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SubmissionMetrics>({
    totalSubmissions: 0,
    pendingValidation: 0,
    underReview: 0,
    autoApproved: 0,
    flaggedForQA: 0,
    averageProcessingTime: 0,
    rejectionRate: 0,
    commonIssues: []
  });

  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Mock metrics data - in real implementation, fetch from backend
      const mockMetrics: SubmissionMetrics = {
        totalSubmissions: 1247,
        pendingValidation: 23,
        underReview: 15,
        autoApproved: 856,
        flaggedForQA: 8,
        averageProcessingTime: 142, // minutes
        rejectionRate: 12.5,
        commonIssues: [
          {
            category: 'File Format Issues',
            frequency: 34,
            trend: 'increasing',
            description: 'Invalid or corrupted file uploads',
            impact: 'high'
          },
          {
            category: 'Missing Environmental Reports',
            frequency: 28,
            trend: 'stable',
            description: 'Environmental impact assessments not provided',
            impact: 'high'
          },
          {
            category: 'SIRET Validation Errors',
            frequency: 19,
            trend: 'decreasing',
            description: 'Invalid or missing SIRET numbers',
            impact: 'medium'
          },
          {
            category: 'Financial Document Discrepancies',
            frequency: 15,
            trend: 'stable',
            description: 'Mismatched financial data between forms and uploads',
            impact: 'medium'
          }
        ]
      };

      const mockRecentSubmissions: RecentSubmission[] = [
        {
          id: 'APP-2024-001234',
          applicantName: 'Ferme Dupont SARL',
          submittedAt: new Date(Date.now() - 1800000).toISOString(),
          status: 'pending_validation',
          validationScore: 87,
          flagged: false,
          processingTime: 30,
          issues: []
        },
        {
          id: 'APP-2024-001235',
          applicantName: 'Agriculture Bio Martin',
          submittedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'flagged_qa',
          validationScore: 62,
          flagged: true,
          processingTime: 95,
          issues: ['file_format_error', 'missing_environmental_report']
        },
        {
          id: 'APP-2024-001236',
          applicantName: 'GAEC Les Tournesols',
          submittedAt: new Date(Date.now() - 5400000).toISOString(),
          status: 'auto_approved',
          validationScore: 96,
          flagged: false,
          processingTime: 15,
          issues: []
        }
      ];

      setMetrics(mockMetrics);
      setRecentSubmissions(mockRecentSubmissions);
      setLastRefresh(new Date());

    } catch (error) {
      toast({
        title: "Failed to Load Metrics",
        description: "Could not load submission monitoring data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending_validation: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      under_review: { variant: 'default' as const, icon: Eye, color: 'text-blue-600' },
      flagged_qa: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      auto_approved: { variant: 'secondary' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending_validation;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-red-600" />;
      case 'decreasing': return <TrendingUp className="w-3 h-3 text-green-600 rotate-180" />;
      default: return <Activity className="w-3 h-3 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Submission Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of application submissions and processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={loadMetrics} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingValidation}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(metrics.averageProcessingTime / 60)}h {metrics.averageProcessingTime % 60}m</div>
            <p className="text-xs text-muted-foreground">
              -8% improvement this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rejectionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt;10%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Status Breakdown</CardTitle>
          <CardDescription>
            Current status distribution of all submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.autoApproved}</div>
              <div className="text-sm text-muted-foreground">Auto Approved</div>
              <div className="text-xs text-green-600">
                {((metrics.autoApproved / metrics.totalSubmissions) * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.underReview}</div>
              <div className="text-sm text-muted-foreground">Under Review</div>
              <div className="text-xs text-blue-600">
                {((metrics.underReview / metrics.totalSubmissions) * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{metrics.pendingValidation}</div>
              <div className="text-sm text-muted-foreground">Pending Validation</div>
              <div className="text-xs text-yellow-600">
                {((metrics.pendingValidation / metrics.totalSubmissions) * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{metrics.flaggedForQA}</div>
              <div className="text-sm text-muted-foreground">Flagged for QA</div>
              <div className="text-xs text-red-600">
                {((metrics.flaggedForQA / metrics.totalSubmissions) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Common Issues Analysis</span>
          </CardTitle>
          <CardDescription>
            Frequently occurring submission issues and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.commonIssues.map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{issue.category}</h4>
                    <Badge variant="outline" className={`text-xs ${getImpactColor(issue.impact)}`}>
                      {issue.impact} impact
                    </Badge>
                    {getTrendIcon(issue.trend)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{issue.frequency}</div>
                  <div className="text-xs text-muted-foreground">occurrences</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            Latest application submissions and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validation Score</TableHead>
                <TableHead>Processing Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSubmissions.map((submission) => (
                <TableRow key={submission.id} className={submission.flagged ? 'bg-red-50' : ''}>
                  <TableCell className="font-mono text-xs">{submission.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{submission.applicantName}</span>
                      {submission.flagged && (
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress value={submission.validationScore} className="w-16 h-2" />
                      <span className="text-xs">{submission.validationScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {Math.floor(submission.processingTime / 60)}h {submission.processingTime % 60}m
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileText className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmissionMonitoring;