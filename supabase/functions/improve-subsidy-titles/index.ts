import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch subsidies with poor quality titles
    const { data: subsidies, error } = await supabaseClient
      .from('subsidies_structured')
      .select('id, title, agency, sector, description, url')
      .eq('title', 'Subsidy Page')
      .limit(20);

    if (error) throw new Error(`Failed to fetch subsidies: ${error.message}`);

    const improvements = [];
    for (const subsidy of subsidies || []) {
      let improvedTitle = null;
      
      if (subsidy.agency && subsidy.sector?.length) {
        const sectors = subsidy.sector.slice(0, 2).join(', ');
        improvedTitle = `${subsidy.agency} - ${sectors} Support Program`;
      } else if (subsidy.agency) {
        improvedTitle = `${subsidy.agency} Agricultural Support Program`;
      }
      
      if (improvedTitle) {
        await supabaseClient
          .from('subsidies_structured')
          .update({ title: improvedTitle })
          .eq('id', subsidy.id);
        
        improvements.push({
          id: subsidy.id,
          oldTitle: subsidy.title,
          newTitle: improvedTitle
        });
      }
    }

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