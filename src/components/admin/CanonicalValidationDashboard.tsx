import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, Flag, FileText, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CANONICAL_FIELD_PRIORITIES } from '@/lib/extraction/canonicalSchema';
import RecordEditModal from './RecordEditModal';

interface FlaggedRecord {
  id: string;
  title: string;
  missing_fields: string[];
  audit_notes: string;
  created_at: string;
  raw_log_id: string;
}

interface ValidationStats {
  totalRecords: number;
  flaggedRecords: number;
  highPriorityMissing: number;
  mediumPriorityMissing: number;
  mostFlaggedFields: Array<{ field: string; count: number }>;
  completionRate: number;
}

const CanonicalValidationDashboard = () => {
  const [flaggedRecords, setFlaggedRecords] = useState<FlaggedRecord[]>([]);
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FlaggedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchValidationData = async () => {
    try {
      setLoading(true);

      // Fetch flagged records
      const { data: flaggedData, error: flaggedError } = await supabase
        .from('subsidies_structured')
        .select('id, title, missing_fields, audit_notes, created_at, raw_log_id')
        .not('missing_fields', 'is', null)
        .gt('missing_fields', '{}')
        .order('created_at', { ascending: false })
        .limit(100);

      if (flaggedError) throw flaggedError;

      setFlaggedRecords(flaggedData || []);

      // Calculate validation stats
      const { data: allRecords, error: statsError } = await supabase
        .from('subsidies_structured')
        .select('missing_fields, audit');

      if (statsError) throw statsError;

      if (allRecords) {
        const flaggedCount = allRecords.filter(r => 
          r.missing_fields && r.missing_fields.length > 0
        ).length;

        // Count field frequencies
        const fieldCounts: Record<string, number> = {};
        let highPriorityMissing = 0;
        let mediumPriorityMissing = 0;

        allRecords.forEach(record => {
          if (record.missing_fields) {
            record.missing_fields.forEach((field: string) => {
              fieldCounts[field] = (fieldCounts[field] || 0) + 1;
              
              if (CANONICAL_FIELD_PRIORITIES.high.includes(field as any)) {
                highPriorityMissing++;
              } else if (CANONICAL_FIELD_PRIORITIES.medium.includes(field as any)) {
                mediumPriorityMissing++;
              }
            });
          }
        });

        const mostFlaggedFields = Object.entries(fieldCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([field, count]) => ({ field, count }));

        setValidationStats({
          totalRecords: allRecords.length,
          flaggedRecords: flaggedCount,
          highPriorityMissing,
          mediumPriorityMissing,
          mostFlaggedFields,
          completionRate: allRecords.length > 0 
            ? ((allRecords.length - flaggedCount) / allRecords.length) * 100 
            : 0
        });
      }
    } catch (error) {
      console.error('Error fetching validation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch validation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reprocessRecord = async (recordId: string, rawLogId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-canonical-subsidy', {
        body: { raw_log_id: rawLogId, force_reprocess: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Record has been queued for reprocessing",
      });

      // Refresh data
      await fetchValidationData();
    } catch (error) {
      console.error('Error reprocessing record:', error);
      toast({
        title: "Error",
        description: "Failed to reprocess record",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchValidationData();
  }, []);

  const getPriorityColor = (field: string) => {
    if (CANONICAL_FIELD_PRIORITIES.high.includes(field as any)) return 'destructive';
    if (CANONICAL_FIELD_PRIORITIES.medium.includes(field as any)) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{validationStats?.totalRecords || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged Records</p>
                <p className="text-2xl font-bold text-orange-600">{validationStats?.flaggedRecords || 0}</p>
              </div>
              <Flag className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority Missing</p>
                <p className="text-2xl font-bold text-red-600">{validationStats?.highPriorityMissing || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {validationStats?.completionRate.toFixed(1) || 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flagged" className="w-full">
        <TabsList>
          <TabsTrigger value="flagged">Flagged Records</TabsTrigger>
          <TabsTrigger value="analytics">Field Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Records Requiring Admin Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flaggedRecords.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold">All Records Validated!</p>
                  <p className="text-muted-foreground">No records require admin review at this time.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Missing Fields</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.title || 'Untitled Record'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {record.missing_fields.slice(0, 3).map((field) => (
                              <Badge 
                                key={field} 
                                variant={getPriorityColor(field)}
                                className="text-xs"
                              >
                                {field}
                              </Badge>
                            ))}
                            {record.missing_fields.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{record.missing_fields.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(record.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedRecord(record)}
                            >
                              Review
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => reprocessRecord(record.id, record.raw_log_id)}
                            >
                              Reprocess
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Most Frequently Missing Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Missing Count</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationStats?.mostFlaggedFields.map((item) => (
                    <TableRow key={item.field}>
                      <TableCell className="font-medium">{item.field}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(item.field)}>
                          {CANONICAL_FIELD_PRIORITIES.high.includes(item.field as any) ? 'High' :
                           CANONICAL_FIELD_PRIORITIES.medium.includes(item.field as any) ? 'Medium' : 'Optional'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.count}</TableCell>
                      <TableCell>
                        {validationStats ? 
                          ((item.count / validationStats.totalRecords) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Edit Modal */}
      {selectedRecord && (
        <RecordEditModal
          record={selectedRecord}
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSave={fetchValidationData}
        />
      )}
    </div>
  );
};

export default CanonicalValidationDashboard;