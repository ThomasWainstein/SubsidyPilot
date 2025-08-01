import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  source_url: string;
  original_html_link?: string;
  extracted_json_link?: string;
  documents_comparison: {
    source_count: number;
    extracted_count: number;
    missing_documents: string[];
  };
  missing_fields: string[];
  flattened_fields: string[];
  qa_status: 'pass' | 'fail' | 'warning';
  admin_action_required: boolean;
  extraction_timestamp: string;
  completeness_score: number;
  fix_applied?: string;
}

export const ExtractionAuditReport: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAuditData();
  }, [dateRange]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      
      // Mock data until database is properly configured
      const mockEntries: AuditEntry[] = [
        {
          id: '1',
          source_url: 'https://www.franceagrimer.fr/aide-stockage',
          original_html_link: 'available',
          extracted_json_link: 'available',
          documents_comparison: {
            source_count: 3,
            extracted_count: 2,
            missing_documents: ['guide_application.pdf']
          },
          missing_fields: ['application_deadline', 'contact_info'],
          flattened_fields: ['eligibility_criteria'],
          qa_status: 'fail',
          admin_action_required: true,
          extraction_timestamp: new Date().toISOString(),
          completeness_score: 65,
          fix_applied: 'Pending admin review'
        },
        {
          id: '2',
          source_url: 'https://www.franceagrimer.fr/aide-investment',
          original_html_link: 'available',
          extracted_json_link: 'available',
          documents_comparison: {
            source_count: 2,
            extracted_count: 2,
            missing_documents: []
          },
          missing_fields: [],
          flattened_fields: [],
          qa_status: 'pass',
          admin_action_required: false,
          extraction_timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completeness_score: 98
        }
      ];

      setAuditEntries(mockEntries);
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const generateFullAuditReport = async () => {
    try {
      const reportData = {
        generation_date: new Date().toISOString(),
        date_range: dateRange,
        summary: getAuditSummary(),
        entries: auditEntries,
        methodology: {
          validation_criteria: [
            "All major headings, sections, and bullets preserved",
            "No list or table collapsed into single paragraph",
            "All annexes/documents present with metadata", 
            "No 'Not specified' where source has content",
            "Structural hierarchy maintained"
          ],
          scoring_method: "Percentage of elements preserved vs source",
          review_process: "Automated QA + Admin review for flagged items"
        }
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extraction_audit_report_${dateRange.start}_to_${dateRange.end}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Audit report downloaded');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const getAuditSummary = () => {
    const total = auditEntries.length;
    const losslessPass = auditEntries.filter(e => e.qa_status === 'pass' && e.completeness_score >= 95).length;
    const failed = auditEntries.filter(e => e.qa_status === 'fail').length;
    const avgScore = total > 0 ? auditEntries.reduce((sum, e) => sum + e.completeness_score, 0) / total : 0;
    
    return {
      total_extractions: total,
      lossless_passes: losslessPass,
      failures: failed,
      average_completeness_score: Math.round(avgScore * 10) / 10,
      lossless_percentage: total > 0 ? Math.round((losslessPass / total) * 100) : 0
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const summary = getAuditSummary();

  if (loading) {
    return <div className="p-6">Loading audit data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Extraction Audit Report</h1>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border rounded"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border rounded"
            />
          </div>
          <Button onClick={generateFullAuditReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.total_extractions}</div>
            <div className="text-sm text-muted-foreground">Total Extractions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.lossless_passes}</div>
            <div className="text-sm text-muted-foreground">Lossless Passes (95%+)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.failures}</div>
            <div className="text-sm text-muted-foreground">Failures</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.average_completeness_score}%</div>
            <div className="text-sm text-muted-foreground">Avg Completeness</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.lossless_percentage}%</div>
            <div className="text-sm text-muted-foreground">Lossless Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Extraction Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subsidy URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completeness</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Missing/Flattened Fields</TableHead>
                <TableHead>Admin Action</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      <a href={entry.source_url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        {entry.source_url}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(entry.qa_status)}
                      <Badge variant={entry.qa_status === 'pass' ? 'default' : 'destructive'}>
                        {entry.qa_status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-20">
                      <Progress value={entry.completeness_score} />
                      <div className="text-xs text-center mt-1">{entry.completeness_score}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Found: {entry.documents_comparison.extracted_count}</div>
                      {entry.documents_comparison.missing_documents.length > 0 && (
                        <div className="text-red-600">
                          Missing: {entry.documents_comparison.missing_documents.length}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs">
                      {entry.missing_fields.length > 0 && (
                        <div className="text-red-600">
                          Missing: {entry.missing_fields.slice(0, 2).join(', ')}
                          {entry.missing_fields.length > 2 && '...'}
                        </div>
                      )}
                      {entry.flattened_fields.length > 0 && (
                        <div className="text-yellow-600">
                          Flattened: {entry.flattened_fields.slice(0, 2).join(', ')}
                          {entry.flattened_fields.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.admin_action_required ? (
                      <Badge variant="secondary">Required</Badge>
                    ) : (
                      <Badge variant="outline">None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {entry.original_html_link && (
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      {entry.extracted_json_link && (
                        <Button size="sm" variant="outline">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {summary.lossless_percentage < 80 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
              <div>
                <h3 className="font-semibold text-red-800">Critical: Low Lossless Rate</h3>
                <p className="text-red-700 text-sm mt-1">
                  Only {summary.lossless_percentage}% of extractions meet the 95% completeness threshold. 
                  This indicates systematic data loss that requires immediate investigation.
                </p>
                <p className="text-red-700 text-sm mt-2">
                  <strong>Recommended Actions:</strong> Review extraction prompts, validate HTML parsing logic, 
                  check for dynamic content loading issues, and enhance QA validation criteria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};