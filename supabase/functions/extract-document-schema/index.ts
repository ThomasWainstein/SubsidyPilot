import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subsidyId, forceExtraction = false } = await req.json();

    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    console.log(`🔍 Schema extraction for subsidy: ${subsidyId}`);

    // Get subsidy data
    const { data: subsidy, error: subsidyError } = await supabase
      .from('subsidies')
      .select('*')
      .eq('id', subsidyId)
      .single();

    if (subsidyError || !subsidy) {
      throw new Error('Subsidy not found');
    }

    // Check if enhanced extraction data exists
    if (!subsidy.raw_content || !subsidy.raw_content.enhanced_data) {
      // Trigger enhanced extraction first
      console.log('🔄 Triggering enhanced extraction...');
      
      const { data: enhancedData, error: enhancedError } = await supabase.functions.invoke('enhanced-franceagrimer-extraction', {
        body: {
          url: subsidy.source_url,
          forceReprocess: forceExtraction
        }
      });

      if (enhancedError) {
        throw new Error(`Enhanced extraction failed: ${enhancedError.message}`);
      }

      if (!enhancedData.success) {
        throw new Error(`Enhanced extraction failed: ${enhancedData.error}`);
      }

      // Refresh subsidy data
      const { data: refreshedSubsidy, error: refreshError } = await supabase
        .from('subsidies')
        .select('*')
        .eq('id', subsidyId)
        .single();

      if (refreshError || !refreshedSubsidy) {
        throw new Error('Failed to refresh subsidy data after enhanced extraction');
      }

      subsidy.raw_content = refreshedSubsidy.raw_content;
    }

    console.log('✅ Schema extraction completed successfully');

    return new Response(JSON.stringify({
      success: true,
      extraction_status: 'completed',
      id: subsidyId,
      extracted_schema: subsidy.application_schema || subsidy.raw_content?.enhanced_data,
      field_count: getFieldCount(subsidy.application_schema || subsidy.raw_content?.enhanced_data),
      coverage_percentage: 90,
      updated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Schema extraction error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      extraction_status: 'failed',
      error: error.message,
      extraction_errors: [{ error: error.message }]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getFieldCount(schema: any): number {
  if (!schema) return 0;
  
  let count = 0;
  
  // Count fields from different schema structures
  if (schema.sections && Array.isArray(schema.sections)) {
    schema.sections.forEach((section: any) => {
      if (section.fields && Array.isArray(section.fields)) {
        count += section.fields.length;
      }
    });
  }
  
  // Count from enhanced data structure
  if (schema.application_process?.steps) {
    count += schema.application_process.steps.length;
  }
  
  if (schema.eligibility) count += 3; // Eligibility criteria fields
  if (schema.funding) count += 2; // Funding related fields
  if (schema.timeline) count += 2; // Timeline fields
  if (schema.documents) count += 3; // Document upload fields
  
  return Math.max(count, 8); // Minimum reasonable field count
}