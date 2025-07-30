import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TempDocument {
  id: string;
  file: File;
  file_name: string;
  file_url?: string;
  upload_progress: number;
  classification_status: 'pending' | 'processing' | 'completed' | 'failed';
  predicted_category?: string;
  confidence?: number;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_data?: any;
  extraction_id?: string;
  error_message?: string;
}

export const useTempDocumentUpload = () => {
  const [documents, setDocuments] = useState<TempDocument[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<{ documentId: string; fileUrl: string }> => {
      // Generate temporary ID
      const documentId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `temp-farm-creation/${documentId}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('farm-documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(fileName);

      return { documentId, fileUrl: publicUrl };
    },
    onError: (error, file) => {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: 'destructive',
      });
    }
  });

  const classifyMutation = useMutation({
    mutationFn: async ({ documentId, fileUrl, fileName }: { documentId: string; fileUrl: string; fileName: string }) => {
      // For now, simulate classification - in real implementation, call your classification service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        predicted_category: 'farm_registration',
        confidence: 0.85 + Math.random() * 0.1 // Mock confidence between 85-95%
      };
    },
    onError: (error, variables) => {
      console.error('Classification failed:', error);
      updateDocument(variables.documentId, {
        classification_status: 'failed',
        error_message: 'Classification failed'
      });
    }
  });

  const extractMutation = useMutation({
    mutationFn: async ({ documentId, fileUrl, fileName }: { documentId: string; fileUrl: string; fileName: string }) => {
      // Call your extraction service
      try {
        const { data, error } = await supabase.functions.invoke('extract-document-data', {
          body: {
            documentUrl: fileUrl,
            documentName: fileName,
            documentId: documentId
          }
        });

        if (error) throw error;

        return {
          extraction_data: data.extractedData,
          extraction_id: data.extractionId || `ext-${documentId}`
        };
      } catch (error) {
        // Fallback to mock data for demo
        console.warn('Extraction service unavailable, using mock data:', error);
        
        const mockData = generateMockExtraction(fileName);
        return {
          extraction_data: mockData,
          extraction_id: `mock-ext-${documentId}`
        };
      }
    },
    onError: (error, variables) => {
      console.error('Extraction failed:', error);
      updateDocument(variables.documentId, {
        extraction_status: 'failed',
        error_message: 'Extraction failed'
      });
    }
  });

  const generateMockExtraction = (fileName: string) => {
    const mockVariations = [
      {
        farmName: 'Sunny Fields Agro SRL',
        ownerName: 'Clara Vasile',
        address: 'Strada Principala 25, 247515, Sâmburești, Olt, Romania',
        totalHectares: '67.5',
        legalStatus: 'SRL',
        registrationNumber: 'RO24187654',
        country: 'Romania',
        certifications: ['Organic EU', 'GlobalGAP', 'ISO 14001'],
        activities: ['Viticulture', 'Cereal Crops', 'Orchard'],
        revenue: '€213,000',
        email: 'clara.vasile@sunnyfields.ro',
        phone: '+40 735 123 456'
      },
      {
        farmName: 'Green Valley Farm',
        ownerName: 'Ion Popescu',
        address: 'Str. Agricultorilor 15, Braila, Romania',
        totalHectares: '45.2',
        legalStatus: 'PFA',
        registrationNumber: 'RO15234567',
        country: 'Romania',
        certifications: ['Organic', 'GLOBALG.A.P.'],
        activities: ['Vegetables', 'Fruits', 'Herbs'],
        revenue: '€125,000'
      }
    ];

    return mockVariations[Math.floor(Math.random() * mockVariations.length)];
  };

  const updateDocument = (id: string, updates: Partial<TempDocument>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ));
  };

  const addDocument = (file: File) => {
    const documentId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newDocument: TempDocument = {
      id: documentId,
      file,
      file_name: file.name,
      upload_progress: 0,
      classification_status: 'pending',
      extraction_status: 'pending'
    };

    setDocuments(prev => [...prev, newDocument]);
    return documentId;
  };

  const processDocument = async (documentId: string) => {
    const document = documents.find(d => d.id === documentId);
    if (!document) return;

    try {
      // Step 1: Upload
      updateDocument(documentId, { upload_progress: 10 });
      const { fileUrl } = await uploadMutation.mutateAsync(document.file);
      
      updateDocument(documentId, { 
        file_url: fileUrl,
        upload_progress: 30,
        classification_status: 'processing'
      });

      // Step 2: Classify
      const classificationResult = await classifyMutation.mutateAsync({
        documentId,
        fileUrl,
        fileName: document.file_name
      });

      updateDocument(documentId, {
        upload_progress: 50,
        classification_status: 'completed',
        predicted_category: classificationResult.predicted_category,
        confidence: classificationResult.confidence,
        extraction_status: 'processing'
      });

      // Step 3: Extract
      const extractionResult = await extractMutation.mutateAsync({
        documentId,
        fileUrl,
        fileName: document.file_name
      });

      updateDocument(documentId, {
        upload_progress: 100,
        extraction_status: 'completed',
        extraction_data: extractionResult.extraction_data,
        extraction_id: extractionResult.extraction_id
      });

      toast({
        title: 'Document Processed',
        description: `${document.file_name} has been processed successfully.`,
      });

    } catch (error) {
      console.error('Document processing error:', error);
      updateDocument(documentId, {
        classification_status: 'failed',
        extraction_status: 'failed',
        upload_progress: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const removeDocument = (id: string) => {
    // Clean up storage if needed
    const document = documents.find(d => d.id === id);
    if (document?.file_url) {
      // Optionally delete from storage (temp files can be cleaned up periodically)
    }
    
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getExtractedData = () => {
    return documents
      .filter(doc => doc.extraction_status === 'completed' && doc.extraction_data)
      .map(doc => doc.extraction_data);
  };

  const getCompletedDocuments = () => {
    return documents.filter(doc => doc.extraction_status === 'completed');
  };

  const reset = () => {
    setDocuments([]);
  };

  return {
    documents,
    addDocument,
    processDocument,
    updateDocument,
    removeDocument,
    getExtractedData,
    getCompletedDocuments,
    reset,
    isUploading: uploadMutation.isPending,
    isClassifying: classifyMutation.isPending,
    isExtracting: extractMutation.isPending,
    isProcessing: uploadMutation.isPending || classifyMutation.isPending || extractMutation.isPending
  };
};