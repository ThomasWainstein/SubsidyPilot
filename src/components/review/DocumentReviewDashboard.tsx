import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useDocumentsForReview, useReviewStatistics } from '@/hooks/useDocumentReview';

import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import DocumentPreviewModal from './DocumentPreviewModal';
import ReExtractButton from './ReExtractButton';

interface DocumentReviewDashboardProps {
  farmId: string;
}

const DocumentReviewDashboard = ({ farmId }: DocumentReviewDashboardProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [confidenceFilter, setConfidenceFilter] = useState<number | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: documents = [], isLoading } = useDocumentsForReview(farmId, {
    category: categoryFilter || undefined,
    confidence: confidenceFilter
  });

  const { data: stats } = useReviewStatistics(farmId);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !priorityFilter || doc.reviewPriority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string, confidence?: number) => {
    switch (status) {
      case 'completed':
        return confidence && confidence < 70
          ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
          : <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const StatusCell = ({ document }: { document: any }) => {
    const status = document.extraction?.status || 'not_extracted';
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon(status, document.extraction?.confidence_score)}
        <span className="text-sm">{status}</span>
      </div>
    );
  };

  const handleReviewDocument = (documentId: string) => {
    navigate(`/farm/${farmId}/document-review/${documentId}`);
  };

  const handlePreviewDocument = (document: any) => {
    setSelectedDocument(document);
    setShowPreview(true);
  };

  const handleExportData = () => {
    const csvData = documents.map(doc => ({
      fileName: doc.file_name,
      category: doc.category,
      uploadDate: doc.uploaded_at,
      extractionStatus: doc.extraction?.status || 'pending',
      confidence: doc.extraction?.confidence_score || 0,
      needsReview: doc.needsReview,
      priority: doc.reviewPriority
    }));

    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-review-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.needsReview}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">{stats.highPriority}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
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
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Document Review Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/farm/${farmId}/document-review/analytics`)}>
                <Settings className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-muted">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{document.file_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {document.extraction?.extraction_type || 'No extraction'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {document.category}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <StatusCell document={document} />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {document.extraction?.confidence_score || 0}%
                        </span>
                        {document.needsReview && (
                          <Badge variant="destructive" className="text-xs">
                            Review needed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getPriorityColor(document.reviewPriority)}`}
                      >
                        {document.reviewPriority}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(document.uploaded_at), { addSuffix: true })}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewDocument(document)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <ReExtractButton 
                          documentId={document.id}
                          documentName={document.file_name}
                          variant="ghost"
                          size="sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReviewDocument(document.id)}
                          className="h-8 px-3"
                        >
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No documents found
              </h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      <DocumentPreviewModal 
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        document={selectedDocument}
      />
    </div>
  );
};

export default DocumentReviewDashboard;