import { supabase } from '@/integrations/supabase/client';

// Test function to manually trigger extraction for debugging
export const testExtraction = async (documentId: string, fileUrl: string, fileName: string, documentType: string) => {
  console.log('🧪 Testing extraction pipeline with comprehensive debugging...');
  console.log('📋 Parameters:', { documentId, fileUrl, fileName, documentType });
  
  try {
    console.log('📡 Calling extract-document-data edge function...');
    const result = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        fileUrl,
        fileName,
        documentType
      }
    });
    
    console.log('✅ Test extraction completed');
    console.log('📊 Result summary:', {
      success: result.data?.success || false,
      error: result.error || result.data?.error || 'none',
      extractedFields: result.data?.extractedData?.extractedFields || 'none',
      confidence: result.data?.extractedData?.confidence || 0,
      textLength: result.data?.summary?.textLength || 0
    });
    
    console.log('📄 Full result:', result);
    return result;
  } catch (error) {
    console.error('❌ Test extraction failed:', error);
    return { error };
  }
};

// Enhanced test function for current document issues
export const testCurrentDocument = async () => {
  // Use the document ID and URL from the recent logs
  return testExtraction(
    'd44b4802-4d94-425c-8cb6-ca8b8037fc84', 
    'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/d4f572cf-a56e-4a24-9344-21f981424b01/financial/Farm_Registration_Document_long.docx',
    'Farm_Registration_Document_long.docx',
    'financial'
  );
};

// Call this in browser console to test: 
// testCurrentDocument()