import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subsidyId, forceReprocess = false } = await req.json();
    
    console.log(`Starting document processing: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subsidies with documents
    const { data: subsidies, error } = await supabase
      .from('subsidies_structured')
      .select('id, title, url, documents')
      .not('documents', 'is', null)
      .limit(5); // Process 5 for testing

    if (error) throw new Error(`Failed to fetch subsidies: ${error.message}`);

    console.log(`Processing ${subsidies.length} subsidies with documents`);

    let totalDocuments = 0;
    let processedDocuments = 0;
    const errors: string[] = [];

    for (const subsidy of subsidies) {
      if (!subsidy.documents || !Array.isArray(subsidy.documents)) continue;
      
      totalDocuments += subsidy.documents.length;
      
      for (const doc of subsidy.documents) {
        try {
          console.log(`Processing: ${doc.filename || doc.url}`);
          
          // Record document processing status
          const { error: statusError } = await supabase
            .from('document_extraction_status')
            .upsert({
              subsidy_id: subsidy.id,
              document_url: doc.url,
              document_type: getDocumentType(doc.filename || doc.url),
              extraction_status: 'processing',
              extracted_schema: {
                filename: doc.filename,
                originalUrl: doc.url,
                processedAt: new Date().toISOString()
              },
              field_count: 0,
              coverage_percentage: 0
            });

          if (statusError) {
            errors.push(`Status update failed for ${doc.filename}: ${statusError.message}`);
          } else {
            processedDocuments++;
          }
          
        } catch (error) {
          console.error(`Error processing ${doc.filename}:`, error);
          errors.push(`${doc.filename}: ${error.message}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalSubsidies: subsidies.length,
      documentsFound: totalDocuments,
      documentsDownloaded: processedDocuments,
      errors: errors.slice(0, 10)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Document processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDocumentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'doc':
    case 'docx': return 'docx';
    case 'xls':
    case 'xlsx': return 'xlsx';
    default: return 'unknown';
  }
}