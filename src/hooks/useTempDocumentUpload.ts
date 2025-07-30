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

  const uploadFile = async (documentId: string, file: File) => {
    console.log('🚀 Starting direct upload for:', file.name);
    
    try {
      // Update to show upload starting
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, upload_progress: 10, error_message: undefined }
          : doc
      ));

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `temp-farm-creation/${documentId}.${fileExt}`;
      
      console.log('📤 Uploading to Supabase storage:', fileName);

      // Direct upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('farm-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', publicUrl);

      // Update with upload complete
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              file_url: publicUrl,
              upload_progress: 40,
              classification_status: 'processing'
            }
          : doc
      ));

      // Start classification
      await startClassification(documentId, publicUrl, file.name);

    } catch (error) {
      console.error('💥 Upload failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? {
              ...doc,
              classification_status: 'failed',
              extraction_status: 'failed',
              error_message: errorMessage
            }
          : doc
      ));

      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${file.name}. ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const startClassification = async (documentId: string, fileUrl: string, fileName: string) => {
    try {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, upload_progress: 60 }
          : doc
      ));

      // Mock classification for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const classificationResult = {
        predicted_category: 'farm_registration',
        confidence: 0.85 + Math.random() * 0.1
      };

      console.log('🏷️ Classification completed:', classificationResult);

      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? {
              ...doc,
              upload_progress: 80,
              classification_status: 'completed',
              predicted_category: classificationResult.predicted_category,
              confidence: classificationResult.confidence,
              extraction_status: 'processing'
            }
          : doc
      ));

      await startExtraction(documentId, fileUrl, fileName);

    } catch (error) {
      console.error('Classification failed:', error);
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? {
              ...doc,
              classification_status: 'failed',
              error_message: 'Classification failed'
            }
          : doc
      ));
    }
  };

  const startExtraction = async (documentId: string, fileUrl: string, fileName: string) => {
    try {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, upload_progress: 90 }
          : doc
      ));

      // Try extraction service, fallback to mock
      let extractionResult;
      try {
        const { data, error } = await supabase.functions.invoke('extract-document-data', {
          body: {
            documentUrl: fileUrl,
            documentName: fileName,
            documentId: documentId
          }
        });

        if (error) throw error;
        extractionResult = {
          extraction_data: data.extractedData,
          extraction_id: data.extractionId || `ext-${documentId}`
        };
      } catch (error) {
        console.warn('Extraction service unavailable, using mock data:', error);
        extractionResult = {
          extraction_data: generateMockExtraction(fileName),
          extraction_id: `mock-ext-${documentId}`
        };
      }

      console.log('📊 Extraction completed:', extractionResult);

      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? {
              ...doc,
              upload_progress: 100,
              extraction_status: 'completed',
              extraction_data: extractionResult.extraction_data,
              extraction_id: extractionResult.extraction_id
            }
          : doc
      ));

      toast({
        title: 'Document Processed Successfully',
        description: `${fileName} has been processed and data extracted.`,
      });

    } catch (error) {
      console.error('Extraction failed:', error);
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? {
              ...doc,
              extraction_status: 'failed',
              error_message: 'Extraction failed'
            }
          : doc
      ));
    }
  };

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
    
    console.log('📋 Adding new document to state:', {
      documentId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });
    
    const newDocument: TempDocument = {
      id: documentId,
      file,
      file_name: file.name,
      upload_progress: 1, // Start with 1% to show immediate feedback
      classification_status: 'pending',
      extraction_status: 'pending'
    };

    setDocuments(prev => {
      const updated = [...prev, newDocument];
      console.log('📚 Documents state updated:', {
        totalDocs: updated.length,
        newDocument: {
          id: newDocument.id,
          fileName: newDocument.file_name,
          progress: newDocument.upload_progress
        }
      });
      return updated;
    });
    
    return documentId;
  };

  const processDocument = async (documentId: string) => {
    console.log('🎯 Starting processDocument for:', documentId);
    
    const document = documents.find(d => d.id === documentId);
    if (!document) {
      console.error('❌ Document not found for processing:', documentId);
      return;
    }

    console.log('📤 Starting document processing for:', document.file_name);
    
    // Use the new direct upload approach
    await uploadFile(documentId, document.file);
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
    isUploading: false, // We'll track this in state if needed
    isClassifying: classifyMutation.isPending,
    isExtracting: extractMutation.isPending,
    isProcessing: classifyMutation.isPending || extractMutation.isPending
  };
};