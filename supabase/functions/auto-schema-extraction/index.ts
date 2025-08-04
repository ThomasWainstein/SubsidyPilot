import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoExtractionRequest {
  subsidyId?: string;
  batchProcess?: boolean;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as AutoExtractionRequest;
    const { subsidyId, batchProcess = false, limit = 10 } = body;

    console.log('Auto schema extraction triggered:', { subsidyId, batchProcess, limit });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let subsidyIds: string[] = [];

    if (subsidyId) {
      // Process specific subsidy
      subsidyIds = [subsidyId];
    } else if (batchProcess) {
      // Find subsidies that need schema extraction
      const { data: subsidiesNeedingExtraction, error } = await supabase
        .from('subsidies_structured')
        .select('id')
        .not('id', 'in', `(
          SELECT subsidy_id 
          FROM document_extraction_status 
          WHERE extraction_status = 'completed'
        )`)
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch subsidies: ${error.message}`);
      }

      subsidyIds = subsidiesNeedingExtraction.map(s => s.id);
    }

    if (subsidyIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No subsidies need schema extraction',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing schema extraction for ${subsidyIds.length} subsidies`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each subsidy
    for (const id of subsidyIds) {
      try {
        console.log(`Starting extraction for subsidy: ${id}`);

        // Call the document schema extraction function
        const { data, error } = await supabase.functions.invoke('extract-document-schema', {
          body: {
            subsidyId: id,
            forceExtraction: false
          }
        });

        if (error) {
          throw new Error(error.message || 'Schema extraction failed');
        }

        if (data.success) {
          successCount++;
          console.log(`✓ Schema extraction successful for subsidy: ${id}`);
          results.push({
            subsidyId: id,
            status: 'success',
            fieldCount: data.metrics?.field_count || 0,
            coveragePercentage: data.metrics?.coverage_percentage || 0
          });
        } else {
          throw new Error(data.error || 'Unknown extraction error');
        }

      } catch (error) {
        failureCount++;
        console.error(`✗ Schema extraction failed for subsidy ${id}:`, error);
        results.push({
          subsidyId: id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Log the failure but continue with other subsidies
        await supabase
          .from('document_extraction_status')
          .upsert({
            subsidy_id: id,
            document_url: '',
            document_type: 'subsidy_page',
            extraction_status: 'failed',
            extraction_errors: [{ 
              error: error instanceof Error ? error.message : 'Unknown error', 
              timestamp: new Date().toISOString(),
              source: 'auto-extraction'
            }]
          });
      }

      // Add a small delay between extractions to avoid rate limiting
      if (subsidyIds.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const summary = {
      success: true,
      message: `Auto schema extraction completed`,
      processed: subsidyIds.length,
      successful: successCount,
      failed: failureCount,
      results
    };

    console.log('Auto extraction summary:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto extraction error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});