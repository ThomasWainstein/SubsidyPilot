import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroundTruthData {
  documentId: string;
  clientType: 'farm' | 'business' | 'individual' | 'municipality' | 'ngo';
  expectedFields: {
    company_name?: string;
    siret?: string;
    legal_form?: string;
    registration_date?: string;
    full_name?: string;
    national_id?: string;
    birth_date?: string;
    farm_name?: string;
    total_hectares?: number;
    certifications?: string[];
  };
  criticalFields: string[];
  language: string;
  complexity: 'low' | 'medium' | 'high';
}

interface TestDocument {
  id: string;
  fileName: string;
  clientType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  accuracy?: number;
  groundTruth?: GroundTruthData;
  extractedData?: any;
  uploadedAt: string;
}

export const RealDocumentTesting: React.FC = () => {
  const [testDocuments, setTestDocuments] = useState<TestDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [groundTruthForm, setGroundTruthForm] = useState<Partial<GroundTruthData>>({
    clientType: 'farm',
    language: 'fr',
    complexity: 'medium',
    expectedFields: {},
    criticalFields: []
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload PDF files only');
      return;
    }

    setSelectedFile(file);
  };

  const handleGroundTruthSubmit = async () => {
    if (!selectedFile || !groundTruthForm.clientType) {
      toast.error('Please select a file and fill in required fields');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to Supabase storage
      const fileName = `ground-truth/${Date.now()}-${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('farm-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(uploadData.path);

      // Create test document record
      const testDoc: TestDocument = {
        id: crypto.randomUUID(),
        fileName: selectedFile.name,
        clientType: groundTruthForm.clientType!,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        groundTruth: {
          documentId: uploadData.path,
          ...groundTruthForm as GroundTruthData
        }
      };

      setTestDocuments(prev => [...prev, testDoc]);
      
      // Trigger extraction
      await triggerExtraction(testDoc, publicUrlData.publicUrl);
      
      toast.success('Document uploaded and extraction started');
      resetForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerExtraction = async (testDoc: TestDocument, fileUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('async-document-processor', {
        body: {
          documentPath: testDoc.groundTruth?.documentId,
          fileUrl: fileUrl,
          fileName: testDoc.fileName,
          clientType: testDoc.clientType,
          isTestDocument: true
        }
      });

      if (error) throw error;

      // Update document status
      setTestDocuments(prev => 
        prev.map(doc => 
          doc.id === testDoc.id 
            ? { ...doc, status: 'processing', extractedData: data }
            : doc
        )
      );

      // Calculate accuracy after processing
      setTimeout(() => calculateAccuracy(testDoc.id, data), 2000);
    } catch (error) {
      console.error('Extraction error:', error);
      setTestDocuments(prev => 
        prev.map(doc => 
          doc.id === testDoc.id 
            ? { ...doc, status: 'failed' }
            : doc
        )
      );
    }
  };

  const calculateAccuracy = (docId: string, extractedData: any) => {
    const doc = testDocuments.find(d => d.id === docId);
    if (!doc?.groundTruth) return;

    const { expectedFields, criticalFields } = doc.groundTruth;
    let correctFields = 0;
    let totalFields = Object.keys(expectedFields).length;

    // Compare extracted vs expected fields
    Object.entries(expectedFields).forEach(([field, expected]) => {
      const extracted = extractedData?.extractedData?.[field];
      if (extracted && String(extracted).toLowerCase().includes(String(expected).toLowerCase())) {
        correctFields++;
      }
    });

    const accuracy = totalFields > 0 ? (correctFields / totalFields) * 100 : 0;

    setTestDocuments(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { ...doc, status: 'completed', accuracy: Math.round(accuracy) }
          : doc
      )
    );
  };

  const resetForm = () => {
    setSelectedFile(null);
    setGroundTruthForm({
      clientType: 'farm',
      language: 'fr',
      complexity: 'medium',
      expectedFields: {},
      criticalFields: []
    });
  };

  const getStatusIcon = (status: string, accuracy?: number) => {
    switch (status) {
      case 'completed':
        return accuracy && accuracy >= 85 ? 
          <CheckCircle className="h-5 w-5 text-green-500" /> : 
          <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const overallAccuracy = testDocuments.length > 0 
    ? Math.round(testDocuments
        .filter(doc => doc.accuracy !== undefined)
        .reduce((sum, doc) => sum + (doc.accuracy || 0), 0) / testDocuments.length)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Real Document Testing - Phase 1A Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="document">Upload Test Document (PDF)</Label>
            <Input
              id="document"
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>

          {selectedFile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ground Truth Form */}
              <div className="space-y-4">
                <h3 className="font-medium">Ground Truth Data</h3>
                
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select 
                    value={groundTruthForm.clientType} 
                    onValueChange={(value) => setGroundTruthForm(prev => ({ ...prev, clientType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farm">Farm</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="municipality">Municipality</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select 
                      value={groundTruthForm.language} 
                      onValueChange={(value) => setGroundTruthForm(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ro">Romanian</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="pl">Polish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Complexity</Label>
                    <Select 
                      value={groundTruthForm.complexity} 
                      onValueChange={(value) => setGroundTruthForm(prev => ({ ...prev, complexity: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expected Key Fields (JSON)</Label>
                  <Textarea
                    placeholder='{"company_name": "Example SAS", "siret": "12345678901234"}'
                    value={JSON.stringify(groundTruthForm.expectedFields, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setGroundTruthForm(prev => ({ ...prev, expectedFields: parsed }));
                      } catch {}
                    }}
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleGroundTruthSubmit}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Processing...' : 'Upload & Test'}
                </Button>
              </div>

              {/* Document Preview */}
              <div className="space-y-2">
                <Label>Document Preview</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">Size: {(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <div className="text-sm text-gray-600">
              Overall Accuracy: <span className={`font-bold ${overallAccuracy >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                {overallAccuracy}%
              </span> (Target: 85%)
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status, doc.accuracy)}
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {doc.clientType} • {doc.status}
                        {doc.accuracy !== undefined && ` • ${doc.accuracy}% accuracy`}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};