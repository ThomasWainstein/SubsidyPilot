import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProcessingRequest {
  batchSize?: number;
  forceReprocess?: boolean;
  specificDocumentId?: string;
}

async function getUnprocessedDocuments(batchSize: number = 10, specificId?: string): Promise<any[]> {
  console.log(`📋 Fetching unprocessed subsidy documents (batch size: ${batchSize})`);
  
  let query = supabase
    .from('raw_scraped_pages')
    .select('*');
    
  if (specificId) {
    query = query.eq('id', specificId);
  } else {
    query = query
      .in('status', ['raw', 'failed'])
      .limit(batchSize)
      .order('created_at', { ascending: true });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching documents:', error);
    throw error;
  }
  
  console.log(`📄 Found ${data?.length || 0} documents to process`);
  return data || [];
}

async function markDocumentProcessing(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('raw_scraped_pages')
    .update({ 
      status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);
    
  if (error) {
    console.error(`❌ Error marking document ${documentId} as processing:`, error);
    throw error;
  }
}

async function markDocumentCompleted(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('raw_scraped_pages')
    .update({ 
      status: 'processed',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);
    
  if (error) {
    console.error(`❌ Error marking document ${documentId} as completed:`, error);
    throw error;
  }
}

async function markDocumentFailed(documentId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('raw_scraped_pages')
    .update({ 
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);
    
  if (error) {
    console.error(`❌ Error marking document ${documentId} as failed:`, error);
  }
}

async function processSubsidyDocument(document: any): Promise<boolean> {
  console.log(`🔄 Processing document: ${document.id} - ${document.source_url}`);
  
  try {
    await markDocumentProcessing(document.id);
    
    // Prepare data for extraction
    const extractionRequest = {
      documentId: document.id,
      documentText: document.raw_text,
      fileName: document.source_url?.split('/').pop() || 'scraped-document',
      sourceUrl: document.source_url,
      metadata: {
        scrapedAt: document.scrape_date,
        sourceSite: document.source_site,
        attachmentCount: document.attachment_count
      }
    };
    
    // Call the extraction function
    const extractionResponse = await supabase.functions.invoke('extract-subsidy-data', {
      body: extractionRequest
    });
    
    if (extractionResponse.error) {
      console.error(`❌ Extraction failed for document ${document.id}:`, extractionResponse.error);
      await markDocumentFailed(document.id, extractionResponse.error.message);
      return false;
    }
    
    const extractionData = extractionResponse.data;
    
    if (!extractionData.success) {
      console.error(`❌ Extraction unsuccessful for document ${document.id}:`, extractionData.error);
      await markDocumentFailed(document.id, extractionData.error || 'Extraction failed');
      return false;
    }
    
    console.log(`✅ Successfully processed document ${document.id} -> subsidy ${extractionData.subsidyId}`);
    await markDocumentCompleted(document.id);
    
    return true;
  } catch (error) {
    console.error(`❌ Error processing document ${document.id}:`, error);
    await markDocumentFailed(document.id, error.message);
    return false;
  }
}

async function processAttachments(document: any): Promise<void> {
  if (!document.attachment_paths || document.attachment_count === 0) {
    return;
  }
  
  console.log(`📎 Processing ${document.attachment_count} attachments for document ${document.id}`);
  
  try {
    const attachments = Array.isArray(document.attachment_paths) 
      ? document.attachment_paths 
      : [];
    
    for (const attachmentPath of attachments) {
      console.log(`📄 Processing attachment: ${attachmentPath}`);
      
      try {
        // Extract filename from path
        const fileName = attachmentPath.split('/').pop() || 'attachment';
        
        // Call extraction for this attachment
        const extractionRequest = {
          fileUrl: attachmentPath,
          fileName: fileName,
          sourceUrl: document.source_url,
          metadata: {
            parentDocumentId: document.id,
            isAttachment: true,
            scrapedAt: document.scrape_date
          }
        };
        
        const extractionResponse = await supabase.functions.invoke('extract-subsidy-data', {
          body: extractionRequest
        });
        
        if (extractionResponse.error) {
          console.error(`❌ Attachment extraction failed for ${fileName}:`, extractionResponse.error);
        } else {
          console.log(`✅ Successfully processed attachment ${fileName}`);
        }
      } catch (attachmentError) {
        console.error(`❌ Error processing attachment ${attachmentPath}:`, attachmentError);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing attachments for document ${document.id}:`, error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      batchSize = 5, 
      forceReprocess = false, 
      specificDocumentId 
    }: ProcessingRequest = await req.json();

    console.log('🚀 Starting subsidy document processing pipeline');
    
    // Get documents to process
    const documents = await getUnprocessedDocuments(batchSize, specificDocumentId);
    
    if (documents.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No documents to process',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let processedCount = 0;
    let failedCount = 0;
    const results = [];
    
    // Process documents sequentially to avoid overwhelming the system
    for (const document of documents) {
      try {
        console.log(`📋 Processing document ${document.id}/${documents.length}`);
        
        // Process main document content
        const mainSuccess = await processSubsidyDocument(document);
        
        // Process any attachments
        await processAttachments(document);
        
        if (mainSuccess) {
          processedCount++;
        } else {
          failedCount++;
        }
        
        results.push({
          documentId: document.id,
          sourceUrl: document.source_url,
          success: mainSuccess
        });
        
      } catch (error) {
        console.error(`❌ Error processing document ${document.id}:`, error);
        failedCount++;
        results.push({
          documentId: document.id,
          sourceUrl: document.source_url,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Processing complete: ${processedCount} successful, ${failedCount} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${documents.length} documents`,
        processed: processedCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-subsidy-documents function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});