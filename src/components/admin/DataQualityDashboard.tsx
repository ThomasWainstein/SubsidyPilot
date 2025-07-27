// Data Quality Dashboard Component for Admin Interface
// Phase 4 Implementation: Administrative and monitoring tools

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  FileText,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { assessSubsidyQuality, SubsidyQualityReport, generateReprocessingCandidates } from '@/utils/dataQuality';

interface DataQualityStats {
  totalSubsidies: number;
  highQuality: number;
  needsReview: number;
  criticalIssues: number;
  averageScore: number;
  recentlyProcessed: number;
  pendingReprocessing: number;
  extractionErrors: number;
}

interface QualityTrend {
  date: string;
  averageScore: number;
  totalProcessed: number;
  errorCount: number;
}

const DataQualityDashboard: React.FC = () => {
  const [stats, setStats] = useState<DataQualityStats | null>(null);
  const [qualityReports, setQualityReports] = useState<SubsidyQualityReport[]>([]);
  const [trends, setTrends] = useState<QualityTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [selectedSubsidy, setSelectedSubsidy] = useState<string | null>(null);

  useEffect(() => {
    fetchQualityData();
  }, []);

  const fetchQualityData = async () => {
    try {
      setLoading(true);
      
      // Fetch all subsidies
      const { data: subsidies, error } = await supabase
        .from('subsidies_structured')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate quality reports
      const reports = subsidies?.map(assessSubsidyQuality) || [];
      setQualityReports(reports);

      // Calculate stats
      const totalSubsidies = reports.length;
      const highQuality = reports.filter(r => r.overallScore >= 80).length;
      const needsReview = reports.filter(r => r.overallScore < 70).length;
      const criticalIssues = reports.filter(r => r.issues.some(i => i.severity === 'critical')).length;
      const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / totalSubsidies;
      
      // Mock recent data - in real implementation, fetch from logs
      const recentlyProcessed = reports.filter(r => {
        // Mock: subsidies processed in last 24h
        return Math.random() > 0.8; 
      }).length;

      const pendingReprocessing = generateReprocessingCandidates(reports).length;

      setStats({
        totalSubsidies,
        highQuality,
        needsReview,
        criticalIssues,
        averageScore,
        recentlyProcessed,
        pendingReprocessing,
        extractionErrors: reports.filter(r => r.extractionCompleteness < 50).length
      });

      // Generate mock trends
      generateMockTrends();

    } catch (error) {
      console.error('Error fetching quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockTrends = () => {
    const mockTrends: QualityTrend[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      mockTrends.push({
        date: date.toISOString().split('T')[0],
        averageScore: 65 + Math.random() * 25, // Random between 65-90
        totalProcessed: Math.floor(Math.random() * 20) + 5,
        errorCount: Math.floor(Math.random() * 5)
      });
    }
    
    setTrends(mockTrends);
  };

  const handleReprocessBatch = async () => {
    if (!qualityReports.length) return;
    
    setReprocessing(true);
    
    try {
      const candidateIds = generateReprocessingCandidates(qualityReports);
      
      // In real implementation, trigger Edge function to reprocess
      console.log('Would reprocess subsidies:', candidateIds);
      
      // Mock success
      setTimeout(() => {
        setReprocessing(false);
        fetchQualityData(); // Refresh data
      }, 3000);
      
    } catch (error) {
      console.error('Error triggering reprocessing:', error);
      setReprocessing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading quality data...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load data quality information.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and improve subsidy data extraction quality
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchQualityData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handleReprocessBatch}
            disabled={reprocessing}
            variant="default"
          >
            {reprocessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Reprocess Low Quality
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subsidies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubsidies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentlyProcessed} processed recently
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore.toFixed(1)}%
            </div>
            <Progress value={stats.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Quality</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.highQuality}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.highQuality / stats.totalSubsidies) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needsReview}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingReprocessing} pending reprocessing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Quality Issues</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="manual">Manual Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>
                  Breakdown of subsidies by quality score ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Excellent (80-100%)</span>
                    <Badge variant="default">{stats.highQuality}</Badge>
                  </div>
                  <Progress value={(stats.highQuality / stats.totalSubsidies) * 100} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Good (60-79%)</span>
                    <Badge variant="secondary">
                      {stats.totalSubsidies - stats.highQuality - stats.needsReview}
                    </Badge>
                  </div>
                  <Progress 
                    value={((stats.totalSubsidies - stats.highQuality - stats.needsReview) / stats.totalSubsidies) * 100} 
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Needs Review (&lt;60%)</span>
                    <Badge variant="destructive">{stats.needsReview}</Badge>
                  </div>
                  <Progress value={(stats.needsReview / stats.totalSubsidies) * 100} />
                </div>
              </CardContent>
            </Card>

            {/* Recent Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Issues</CardTitle>
                <CardDescription>
                  Latest quality issues requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qualityReports
                    .filter(r => r.issues.some(i => i.severity === 'critical'))
                    .slice(0, 5)
                    .map(report => (
                      <div key={report.subsidyId} className="flex items-start gap-3 p-3 border rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            Critical issues found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.issues.filter(i => i.severity === 'critical').length} critical issues
                          </p>
                          <div className="flex gap-2">
                            <Badge variant="destructive" className="text-xs">
                              Score: {report.overallScore}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Issues by Subsidy</CardTitle>
              <CardDescription>
                Detailed view of subsidies with quality issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {qualityReports
                  .filter(r => r.overallScore < 80)
                  .sort((a, b) => a.overallScore - b.overallScore)
                  .slice(0, 20)
                  .map(report => (
                    <div key={report.subsidyId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getScoreBadgeVariant(report.overallScore)}>
                              {report.overallScore}% Quality
                            </Badge>
                            <Badge variant="outline">
                              {report.extractionCompleteness}% Complete
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            ID: {report.subsidyId.substring(0, 8)}...
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubsidy(
                            selectedSubsidy === report.subsidyId ? null : report.subsidyId
                          )}
                        >
                          {selectedSubsidy === report.subsidyId ? 'Hide' : 'Details'}
                        </Button>
                      </div>
                      
                      {selectedSubsidy === report.subsidyId && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <h4 className="font-medium text-sm">Issues:</h4>
                          {report.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Badge 
                                variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-xs mt-0.5"
                              >
                                {issue.severity}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-sm">{issue.message}</p>
                                {issue.suggestedFix && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    💡 {issue.suggestedFix}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Trends (Last 30 Days)</CardTitle>
              <CardDescription>
                Track quality improvements over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                📈 Trend chart would be implemented here with a charting library
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Review Queue</CardTitle>
              <CardDescription>
                Subsidies requiring manual correction or validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Manual Review Interface</AlertTitle>
                <AlertDescription>
                  This interface would allow admins to manually correct extraction errors, 
                  validate AI outputs, and override quality scores.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataQualityDashboard;