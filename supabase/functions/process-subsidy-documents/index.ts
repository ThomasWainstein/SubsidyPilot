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
    const { action = 'download_all', forceReprocess = false } = await req.json();
    
    console.log(`Starting document processing: ${action}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get subsidies with documents
    const { data: subsidies, error } = await supabase
      .from('subsidies_structured')
      .select('id, title, url, documents')
      .not('documents', 'is', null)
      .limit(3); // Process first 3 for initial test

    if (error) throw new Error(`Failed to fetch subsidies: ${error.message}`);

    console.log(`Processing ${subsidies.length} subsidies with documents`);

    let totalDocuments = 0;
    let processedDocuments = 0;
    const errors: string[] = [];
    const processedResults: any[] = [];

    for (const subsidy of subsidies) {
      if (!subsidy.documents || !Array.isArray(subsidy.documents)) continue;
      
      totalDocuments += subsidy.documents.length;
      console.log(`Processing subsidy: ${subsidy.title} (${subsidy.documents.length} docs)`);
      
      for (const doc of subsidy.documents) {
        try {
          const docUrl = typeof doc === 'string' ? doc : doc.url;
          const docFilename = typeof doc === 'string' ? 
            docUrl.split('/').pop() : 
            doc.filename || doc.url.split('/').pop();
          
          console.log(`Processing document: ${docFilename}`);
          
          // Record document processing status in database
          const { data: statusData, error: statusError } = await supabase
            .from('document_extraction_status')
            .upsert({
              subsidy_id: subsidy.id,
              document_url: docUrl,
              document_type: getDocumentType(docFilename || ''),
              extraction_status: 'processing',
              extracted_schema: {
                filename: docFilename,
                originalUrl: docUrl,
                subsidyTitle: subsidy.title,
                processedAt: new Date().toISOString(),
                step: 'document_cataloging'
              },
              field_count: 0,
              coverage_percentage: 0,
              extraction_errors: []
            })
            .select('id')
            .single();

          if (statusError) {
            console.error(`Status update failed for ${docFilename}:`, statusError);
            errors.push(`Status update failed for ${docFilename}: ${statusError.message}`);
          } else {
            processedDocuments++;
            processedResults.push({
              id: statusData.id,
              filename: docFilename,
              url: docUrl,
              subsidyTitle: subsidy.title,
              status: 'cataloged'
            });
            console.log(`✅ Cataloged: ${docFilename}`);
          }
          
        } catch (error) {
          console.error(`Error processing document:`, error);
          errors.push(`Document processing error: ${error.message}`);
        }
      }
    }

    // Update batch processing summary
    const summary = {
      totalSubsidies: subsidies.length,
      documentsFound: totalDocuments,
      documentsDownloaded: processedDocuments,
      successRate: totalDocuments > 0 ? ((processedDocuments / totalDocuments) * 100).toFixed(1) + '%' : '0%',
      processedAt: new Date().toISOString(),
      errors: errors.slice(0, 5)
    };

    console.log('Processing Summary:', summary);

    return new Response(JSON.stringify({
      success: true,
      ...summary,
      processedResults: processedResults.slice(0, 5), // Return first 5 for display
      errors: errors.slice(0, 10)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Document processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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