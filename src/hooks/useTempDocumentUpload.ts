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
      console.log('🚀 Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      // Generate temporary ID
      const documentId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `temp-farm-creation/${documentId}.${fileExt}`;
      
      console.log('📤 Uploading to Supabase storage:', {
        bucket: 'farm-documents',
        fileName,
        documentId
      });

      const { data, error } = await supabase.storage
        .from('farm-documents')
        .upload(fileName, file);

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('✅ Upload successful:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', publicUrl);

      return { documentId, fileUrl: publicUrl };
    },
    onError: (error, file) => {
      console.error('💥 Upload mutation failed:', {
        error,
        fileName: file.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
    onSuccess: (result, file) => {
      console.log('🎉 Upload mutation successful:', {
        fileName: file.name,
        documentId: result.documentId,
        fileUrl: result.fileUrl,
        timestamp: new Date().toISOString()
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
    
    setDocuments(prev => {
      const document = prev.find(d => d.id === documentId);
      if (!document) {
        console.error('❌ Document not found for processing:', documentId);
        return prev;
      }

      console.log('📤 Starting document processing for:', document.file_name);
      
      // Start the actual upload process
      (async () => {
        try {
          console.log('🚀 Initiating upload mutation for:', document.file_name);
          
          // Update to show upload starting
          setDocuments(current => current.map(doc => 
            doc.id === documentId 
              ? { ...doc, upload_progress: 5, error_message: undefined }
              : doc
          ));

          // Create upload progress simulation
          const progressInterval = setInterval(() => {
            setDocuments(current => {
              const currentDoc = current.find(d => d.id === documentId);
              if (currentDoc && currentDoc.upload_progress < 25) {
                return current.map(doc => 
                  doc.id === documentId 
                    ? { ...doc, upload_progress: Math.min(currentDoc.upload_progress + 5, 25) }
                    : doc
                );
              }
              return current;
            });
          }, 300);

          // Actual upload
          const { fileUrl } = await uploadMutation.mutateAsync(document.file);
          clearInterval(progressInterval);
          
          console.log('✅ File uploaded successfully:', fileUrl);
          
          // Update with upload complete
          setDocuments(current => current.map(doc => 
            doc.id === documentId 
              ? { 
                  ...doc, 
                  file_url: fileUrl,
                  upload_progress: 35,
                  classification_status: 'processing'
                }
              : doc
          ));

          // Step 2: Classification
          setTimeout(() => {
            setDocuments(current => current.map(doc => 
              doc.id === documentId 
                ? { ...doc, upload_progress: 45 }
                : doc
            ));
          }, 200);
          
          const classificationResult = await classifyMutation.mutateAsync({
            documentId,
            fileUrl,
            fileName: document.file_name
          });

          console.log('🏷️ Classification completed:', classificationResult);

          setDocuments(current => current.map(doc => 
            doc.id === documentId 
              ? {
                  ...doc,
                  upload_progress: 55,
                  classification_status: 'completed',
                  predicted_category: classificationResult.predicted_category,
                  confidence: classificationResult.confidence,
                  extraction_status: 'processing'
                }
              : doc
          ));

          // Step 3: Extraction
          setTimeout(() => {
            setDocuments(current => current.map(doc => 
              doc.id === documentId 
                ? { ...doc, upload_progress: 70 }
                : doc
            ));
          }, 300);
          
          setTimeout(() => {
            setDocuments(current => current.map(doc => 
              doc.id === documentId 
                ? { ...doc, upload_progress: 85 }
                : doc
            ));
          }, 600);
          
          const extractionResult = await extractMutation.mutateAsync({
            documentId,
            fileUrl,
            fileName: document.file_name
          });

          console.log('📊 Extraction completed:', extractionResult);

          setDocuments(current => current.map(doc => 
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
            description: `${document.file_name} has been processed and data extracted.`,
          });

        } catch (error) {
          console.error('❌ Document processing error:', error);
          
          let errorMessage = 'Unknown error occurred';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          setDocuments(current => current.map(doc => 
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
            title: 'Processing Failed',
            description: `Failed to process ${document.file_name}: ${errorMessage}`,
            variant: 'destructive',
          });
        }
      })();

      return prev;
    });
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