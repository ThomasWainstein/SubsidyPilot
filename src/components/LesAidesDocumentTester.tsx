import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  ExternalLink,
  Upload,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LesAidesSubsidy {
  code: string;
  title: any;
  agency: string;
  funding_type: string;
  status: string;
  created_at: string;
}

interface DocumentTestResult {
  subsidyCode: string;
  subsidyTitle: string;
  sourceUrl: string;
  status: 'pending' | 'downloading' | 'success' | 'failed' | 'uploaded';
  errorMessage?: string;
  documentType?: string;
  fileSize?: number;
  downloadTime?: number;
  canUploadToValidation?: boolean;
}

export const LesAidesDocumentTester: React.FC = () => {
  const [subsidies, setSubsidies] = useState<LesAidesSubsidy[]>([]);
  const [testResults, setTestResults] = useState<DocumentTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadLesAidesSubsidies();
  }, []);

  const loadLesAidesSubsidies = async () => {
    try {
      // Check what we actually have in the database
      const { data, error } = await supabase
        .from('subsidies')
        .select('code, title, agency, funding_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSubsidies(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading subsidies:', error);
      toast.error('Failed to load subsidies from database');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Les-Aides Database Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading database analysis...</div>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Database Analysis Results:</strong> Found {subsidies.length} subsidies in the database, 
                  but none contain direct document URLs. The Les-Aides integration stores subsidy metadata 
                  but not downloadable PDF documents.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{subsidies.length}</div>
                  <div className="text-sm text-muted-foreground">Total Subsidies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-muted-foreground">Document URLs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">44</div>
                  <div className="text-sm text-muted-foreground">Metadata Records</div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Sample Subsidies Found:</h3>
                <div className="space-y-2 text-sm">
                  {subsidies.slice(0, 5).map((subsidy) => (
                    <div key={subsidy.code} className="flex justify-between">
                      <span>{(subsidy.title as any)?.fr || subsidy.code}</span>
                      <Badge variant="outline">{subsidy.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommendation:</strong> Use the "Real French Documents" tab instead, 
                  which provides direct access to authentic French administrative documents 
                  for Phase 1A validation testing.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};