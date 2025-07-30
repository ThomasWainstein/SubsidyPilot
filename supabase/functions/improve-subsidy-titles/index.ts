import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 improve-subsidy-titles function called');
  
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Fetching subsidies with poor quality titles...');
    // Fetch subsidies with poor quality titles
    const { data: subsidies, error } = await supabaseClient
      .from('subsidies_structured')
      .select('id, title, agency, sector, description, url')
      .eq('title', 'Subsidy Page')
      .limit(20);

    console.log(`📊 Found ${subsidies?.length || 0} subsidies to improve`);

    if (error) throw new Error(`Failed to fetch subsidies: ${error.message}`);

    const improvements = [];
    console.log('🔄 Processing subsidies for title improvements...');
    
    for (const subsidy of subsidies || []) {
      console.log(`🔍 Processing subsidy ${subsidy.id}: "${subsidy.title}"`);
      console.log(`   Agency: ${subsidy.agency || 'None'}`);
      console.log(`   Sectors: ${subsidy.sector?.length ? subsidy.sector.join(', ') : 'None'}`);
      
      let improvedTitle = null;
      
      if (subsidy.agency && subsidy.sector?.length) {
        const sectors = subsidy.sector.slice(0, 2).join(', ');
        improvedTitle = `${subsidy.agency} - ${sectors} Support Program`;
        console.log(`   ✅ Generated title with agency and sectors: "${improvedTitle}"`);
      } else if (subsidy.agency) {
        improvedTitle = `${subsidy.agency} Agricultural Support Program`;
        console.log(`   ✅ Generated title with agency only: "${improvedTitle}"`);
      } else {
        console.log(`   ❌ No agency found, skipping title improvement`);
      }
      
      if (improvedTitle) {
        console.log(`   💾 Updating subsidy ${subsidy.id} with new title...`);
        const { error: updateError } = await supabaseClient
          .from('subsidies_structured')
          .update({ title: improvedTitle })
          .eq('id', subsidy.id);
          
        if (updateError) {
          console.error(`   ❌ Failed to update subsidy ${subsidy.id}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Successfully updated subsidy ${subsidy.id}`);
          improvements.push({
            id: subsidy.id,
            oldTitle: subsidy.title,
            newTitle: improvedTitle
          });
        }
      }
    }
    
    console.log(`🎉 Completed processing. Improved ${improvements.length} subsidies`);

    return new Response(JSON.stringify({
      success: true,
      improved: improvements.length,
      improvements
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});