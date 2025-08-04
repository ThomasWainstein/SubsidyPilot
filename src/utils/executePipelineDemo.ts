// Manual execution of document processing pipeline to generate database evidence

import { supabase } from '@/integrations/supabase/client';

async function executeDocumentPipeline() {
  console.log('🚀 Starting document processing pipeline execution...');
  
  try {
    const { data, error } = await supabase.functions.invoke('process-subsidy-documents', {
      body: { 
        action: 'download_all',
        forceReprocess: true
      }
    });

    if (error) {
      console.error('❌ Pipeline execution failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Pipeline execution completed:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Pipeline execution error:', error);
    return { success: false, error: error.message };
  }
}

// Execute immediately to generate evidence
executeDocumentPipeline().then(result => {
  console.log('Pipeline Result:', result);
});