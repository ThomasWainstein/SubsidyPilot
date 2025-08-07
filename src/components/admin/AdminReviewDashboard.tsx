import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { prodLogger } from '@/utils/productionLogger';

interface QAResult {
  id: string;
  source_url: string;
  qa_pass: boolean;
  errors: string[];
  warnings: string[];
  missing_fields: string[];
  structure_loss: string[];
  documents_loss: string[];
  admin_required: boolean;
  completeness_score: number;
  structural_integrity_score: number;
  review_data: {
    original_html: string;
    extracted_json: string;
    ui_screenshot?: string;
  };
  qa_timestamp: string;
  admin_status?: 'pending' | 'reviewed' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export const AdminReviewDashboard: React.FC = () => {
  const [qaResults, setQaResults] = useState<QAResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<QAResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | 'admin_required'>('admin_required');

  useEffect(() => {
    loadQAResults();
  }, [filter]);

  const loadQAResults = async () => {
    try {
      setLoading(true);
      
      // Initialize with mock data (will be replaced with real data once types are available)
      const mockResults: QAResult[] = [
        {
          id: '1',
          source_url: 'https://www.franceagrimer.fr/Accompagner/Planification-ecologique/Planification-ecologique-agriculteurs/Renovation-des-vergers-campagnes-2024-2025-et-2025-2026',
          qa_pass: false,
          errors: ['Missing eligibility criteria structure', 'No application documents detected', 'Deadline information flattened'],
          warnings: ['Complex nested content detected', 'Dynamic JavaScript content'],
          missing_fields: ['application_deadline', 'eligible_beneficiaries', 'required_documents', 'contact_information'],
          structure_loss: ['eligibility_criteria', 'application_process', 'evaluation_criteria'],
          documents_loss: ['application_form.pdf', 'guidelines.pdf', 'technical_specifications.pdf'],
          admin_required: true,
          completeness_score: 45.5,
          structural_integrity_score: 62.0,
          review_data: {
            original_html: 'Complex nested div structure with dynamic content',
            extracted_json: 'Partial structure with missing sections',
            ui_screenshot: 'screenshot_renovation_vergers.png'
          },
          qa_timestamp: new Date().toISOString(),
          admin_status: 'pending'
        },
        {
          id: '2',
          source_url: 'https://www.franceagrimer.fr/aide-stockage-fruits-legumes',
          qa_pass: true,
          errors: [],
          warnings: ['Minor formatting inconsistencies in date formats'],
          missing_fields: [],
          structure_loss: [],
          documents_loss: [],
          admin_required: false,
          completeness_score: 96.8,
          structural_integrity_score: 95.2,
          review_data: {
            original_html: 'Well-structured HTML with clear sections',
            extracted_json: 'Complete extraction with all required fields'
          },
          qa_timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          source_url: 'https://www.franceagrimer.fr/aide-promotion-produits-bio',
          qa_pass: false,
          errors: ['Critical structure loss in eligibility section', 'All annexes missing'],
          warnings: ['Suspected dynamic content loading', 'Complex table structures'],
          missing_fields: ['deadline_dates', 'funding_amounts', 'application_procedure'],
          structure_loss: ['eligibility_table', 'funding_categories', 'application_steps'],
          documents_loss: ['application_form_bio.pdf', 'eligibility_guide.pdf', 'examples.pdf'],
          admin_required: true,
          completeness_score: 38.7,
          structural_integrity_score: 42.1,
          review_data: {
            original_html: 'Complex table-based layout',
            extracted_json: 'Major data loss in critical sections'
          },
          qa_timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          admin_status: 'rejected',
          admin_notes: 'Unacceptable data loss. Critical sections missing. Extraction pipeline needs debugging before retry.',
          reviewed_by: 'admin@agritool.com',
          reviewed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      // Apply filter
      let filteredResults = mockResults;
      switch (filter) {
        case 'pending':
          filteredResults = mockResults.filter(r => !r.admin_status || r.admin_status === 'pending');
          break;
        case 'failed':
          filteredResults = mockResults.filter(r => !r.qa_pass);
          break;
        case 'admin_required':
          filteredResults = mockResults.filter(r => r.admin_required);
          break;
      }
      
      setQaResults(filteredResults);
    } catch (error) {
      console.error('Error loading QA results:', error);
      toast.error('Failed to load QA results');
    } finally {
      setLoading(false);
    }
  };

  const updateAdminStatus = async (id: string, status: string, notes: string) => {
    try {
      // Mock update with realistic behavior
      prodLogger.debug('Updating admin status:', { id, status, notes });
      
      // Update the mock data in state to show immediate feedback
      setQaResults(prevResults => 
        prevResults.map(result => 
          result.id === id 
            ? {
                ...result,
                admin_status: status as any,
                admin_notes: notes,
                reviewed_by: 'current_admin@agritool.com',
                reviewed_at: new Date().toISOString()
              }
            : result
        )
      );
      
      toast.success(`Status updated to ${status} successfully`);
      setSelectedResult(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (result: QAResult) => {
    if (!result.qa_pass) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
    if (result.admin_required) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Review Required</Badge>;
    }
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>;
  };

  const getOverallStats = () => {
    const total = qaResults.length;
    const passed = qaResults.filter(r => r.qa_pass && !r.admin_required).length;
    const failed = qaResults.filter(r => !r.qa_pass).length;
    const pending = qaResults.filter(r => r.admin_required && !r.admin_status).length;
    
    return { total, passed, failed, pending };
  };

  const stats = getOverallStats();

  if (loading) {
    return <div className="p-6">Loading QA results...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Review Dashboard</h1>
        <Button onClick={loadQAResults} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Extractions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="admin_required">Review Required</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {qaResults.map((result) => (
            <Card key={result.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{result.source_url}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      {getStatusBadge(result)}
                      {result.admin_status && (
                        <Badge variant="outline">{result.admin_status}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedResult(result)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Completeness Score</div>
                    <Progress value={result.completeness_score} className="mt-1" />
                    <div className="text-xs text-muted-foreground mt-1">{result.completeness_score}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Structural Integrity</div>
                    <Progress value={result.structural_integrity_score} className="mt-1" />
                    <div className="text-xs text-muted-foreground mt-1">{result.structural_integrity_score}%</div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Errors ({result.errors.length}):</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {result.errors.slice(0, 3).map((error, idx) => (
                          <li key={idx} className="text-sm">{error}</li>
                        ))}
                        {result.errors.length > 3 && (
                          <li className="text-sm text-muted-foreground">
                            +{result.errors.length - 3} more errors
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result.warnings.length > 0 && (
                  <Alert className="mt-2">
                    <AlertDescription>
                      <strong>Warnings ({result.warnings.length}):</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {result.warnings.slice(0, 2).map((warning, idx) => (
                          <li key={idx} className="text-sm">{warning}</li>
                        ))}
                        {result.warnings.length > 2 && (
                          <li className="text-sm text-muted-foreground">
                            +{result.warnings.length - 2} more warnings
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Detailed Review Modal */}
      {selectedResult && (
        <DetailedReviewModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onUpdate={updateAdminStatus}
        />
      )}
    </div>
  );
};

interface DetailedReviewModalProps {
  result: QAResult;
  onClose: () => void;
  onUpdate: (id: string, status: string, notes: string) => void;
}

const DetailedReviewModal: React.FC<DetailedReviewModalProps> = ({ result, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(result.admin_notes || '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Detailed Review</h2>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Original HTML</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {result.review_data.original_html}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Extracted JSON</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {result.review_data.extracted_json}
              </pre>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Issues & Analysis</h3>
            
            {result.missing_fields.length > 0 && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Missing Fields:</strong> {result.missing_fields.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {result.structure_loss.length > 0 && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Structure Loss:</strong> {result.structure_loss.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {result.documents_loss.length > 0 && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Missing Documents:</strong> {result.documents_loss.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="Add your review notes..."
            />
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => onUpdate(result.id, 'approved', notes)}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              onClick={() => onUpdate(result.id, 'rejected', notes)}
              variant="destructive"
            >
              Reject
            </Button>
            <Button
              onClick={() => onUpdate(result.id, 'reviewed', notes)}
              variant="outline"
            >
              Mark as Reviewed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};