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
      
      // Clean agency name - extract just "FranceAgriMer" from longer text
      let cleanAgency = null;
      if (subsidy.agency) {
        const agencyLower = subsidy.agency.toLowerCase();
        if (agencyLower.includes('franceagrimer')) {
          cleanAgency = 'FranceAgriMer';
        } else {
          // Take first few words if it's a long agency description
          const words = subsidy.agency.split(' ');
          cleanAgency = words.length > 3 ? words.slice(0, 3).join(' ') : subsidy.agency;
        }
      }
      
      // Try to extract a meaningful title from description if no agency
      if (!cleanAgency && subsidy.description) {
        const desc = subsidy.description.toLowerCase();
        if (desc.includes('plantation')) {
          improvedTitle = 'Aide à la plantation de vergers';
        } else if (desc.includes('investissement')) {
          improvedTitle = 'Aide aux investissements agricoles';
        } else if (desc.includes('modernisation')) {
          improvedTitle = 'Aide à la modernisation';
        } else if (desc.includes('restructuration')) {
          improvedTitle = 'Aide à la restructuration';
        } else if (desc.includes('développement')) {
          improvedTitle = 'Aide au développement rural';
        }
      }
      
      // Generate title based on available data
      if (!improvedTitle && cleanAgency && subsidy.sector?.length) {
        const sectors = subsidy.sector.slice(0, 2).join(', ');
        improvedTitle = `Aide ${cleanAgency} - ${sectors}`;
      } else if (!improvedTitle && cleanAgency) {
        improvedTitle = `Aide ${cleanAgency}`;
      }
      
      if (improvedTitle) {
        console.log(`   ✅ Generated title: "${improvedTitle}"`);
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