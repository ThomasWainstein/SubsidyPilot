/**
 * Component to display document classification insights and statistics
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDocumentClassification } from '@/hooks/useDocumentClassification';
import { AlertTriangle, CheckCircle, TrendingUp, FileText } from 'lucide-react';

interface ClassificationInsightsProps {
  farmId: string;
}

export const ClassificationInsights = ({ farmId }: ClassificationInsightsProps) => {
  const { getClassificationStats } = useDocumentClassification();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await getClassificationStats(farmId);
        setStats(data);
      } catch (error) {
        console.error('Failed to load classification stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (farmId) {
      loadStats();
    }
  }, [farmId, getClassificationStats]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Document Classification Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading insights...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Document Classification Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            No classification data available yet. Upload some documents to see insights.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Document Classification Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Documents Classified</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">AI Accuracy</div>
            <div className="text-2xl font-bold text-primary">{stats.accuracy}%</div>
          </div>
        </div>

        {/* Accuracy Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Classification Accuracy</span>
            <span>{stats.accuracy}%</span>
          </div>
          <Progress value={stats.accuracy} className="h-2" />
        </div>

        {/* Agreement Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Agreements</span>
            </div>
            <Badge variant="secondary">{stats.agreements}</Badge>
          </div>
          
          {stats.disagreements > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Disagreements</span>
              </div>
              <Badge variant="outline">{stats.disagreements}</Badge>
            </div>
          )}
        </div>

        {/* Confidence Level */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Average Confidence</span>
            <span>{stats.averageConfidence}%</span>
          </div>
          <Progress value={stats.averageConfidence} className="h-2" />
        </div>

        {/* Info Message */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="font-medium mb-1">How it works:</div>
          <div>
            Our AI analyzes document content and suggests categories. When you select a different 
            category, we learn from your choice to improve future suggestions.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};