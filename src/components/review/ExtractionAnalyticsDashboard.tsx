import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useReviewStatistics, useDocumentsForReview } from '@/hooks/useDocumentReview';
import { formatDistanceToNow } from 'date-fns';

interface ExtractionAnalyticsDashboardProps {
  farmId: string;
}

const ExtractionAnalyticsDashboard = ({ farmId }: ExtractionAnalyticsDashboardProps) => {
  const { data: stats } = useReviewStatistics(farmId);
  const { data: documents = [] } = useDocumentsForReview(farmId);

  const handleExportCSV = () => {
    const csvData = documents.map(doc => ({
      fileName: doc.file_name,
      category: doc.category,
      uploadDate: doc.uploaded_at,
      extractionStatus: doc.extraction?.status || 'pending',
      confidence: doc.extraction?.confidence_score || 0,
      fieldsExtracted: doc.extraction?.extracted_data ? Object.keys(doc.extraction.extracted_data).length : 0,
      reviewPriority: doc.reviewPriority,
      needsReview: doc.needsReview
    }));

    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      farmId,
      statistics: stats,
      documents: documents.map(doc => ({
        id: doc.id,
        fileName: doc.file_name,
        category: doc.category,
        uploadDate: doc.uploaded_at,
        extraction: doc.extraction ? {
          status: doc.extraction.status,
          confidence: doc.extraction.confidence_score,
          extractedData: doc.extraction.extracted_data,
          extractionType: doc.extraction.extraction_type,
          createdAt: doc.extraction.created_at
        } : null,
        reviewStatus: {
          needsReview: doc.needsReview,
          priority: doc.reviewPriority
        }
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRecentActivity = () => {
    return documents
      .filter(doc => doc.extraction)
      .sort((a, b) => new Date(b.extraction!.created_at).getTime() - new Date(a.extraction!.created_at).getTime())
      .slice(0, 5);
  };

  const getExtractionTypeStats = () => {
    const typeStats: Record<string, number> = {};
    documents.forEach(doc => {
      if (doc.extraction?.extraction_type) {
        typeStats[doc.extraction.extraction_type] = (typeStats[doc.extraction.extraction_type] || 0) + 1;
      }
    });
    return typeStats;
  };

  const getCategoryStats = () => {
    const categoryStats: Record<string, { total: number; avgConfidence: number; needsReview: number }> = {};
    
    documents.forEach(doc => {
      const category = doc.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, avgConfidence: 0, needsReview: 0 };
      }
      
      categoryStats[category].total++;
      if (doc.extraction?.confidence_score) {
        categoryStats[category].avgConfidence += doc.extraction.confidence_score;
      }
      if (doc.needsReview) {
        categoryStats[category].needsReview++;
      }
    });

    // Calculate averages
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.avgConfidence = stats.total > 0 ? stats.avgConfidence / stats.total : 0;
    });

    return categoryStats;
  };

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Extraction Analytics</h2>
          <p className="text-muted-foreground">Monitor and export extraction performance data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.completedReviews / stats.total) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Confidence</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageConfidence)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                  <p className="text-2xl font-bold">{stats.needsReview}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Processed</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(getCategoryStats()).map(([category, stats]) => (
                <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium capitalize">{category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {stats.total} documents • {Math.round(stats.avgConfidence)}% avg confidence
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={stats.needsReview > 0 ? "destructive" : "default"}>
                      {stats.needsReview} need review
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Extraction Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Extraction Methods Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(getExtractionTypeStats()).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{type}</h4>
                    <p className="text-sm text-muted-foreground">
                      {count} document{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {documents.length > 0 ? Math.round((count / documents.length) * 100) : 0}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Extraction Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRecentActivity().map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm">{doc.file_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {doc.extraction?.extraction_type} • {doc.extraction?.confidence_score}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={doc.needsReview ? "destructive" : "default"} className="text-xs">
                      {doc.extraction?.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(doc.extraction!.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExtractionAnalyticsDashboard;