import { supabase } from '@/integrations/supabase/client';

// Test function to manually trigger extraction for debugging
export const testExtraction = async (documentId: string, fileUrl: string, fileName: string, documentType: string) => {
  console.log('🧪 Testing extraction pipeline...');
  
  try {
    const result = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        fileUrl,
        fileName,
        documentType
      }
    });
    
    console.log('Test extraction result:', result);
    return result;
  } catch (error) {
    console.error('Test extraction failed:', error);
    return { error };
  }
};

// Call this in browser console to test: 
// testExtraction('bf5c7a3f-25c6-44c2-9301-f50230400b60', 'https://gvfgvbztagafjykncwto.supabase.co/storage/v1/object/public/farm-documents/d4f572cf-a56e-4a24-9344-21f981424b01/financial/1752414274888_Lettre_de_motivation___Thomas_Wainstein___Candidature_au_poste_de_Consultant_Junior_en_diagnostic_strat_gique___financier__SECAFI_.pdf', 'test.pdf', 'financial')