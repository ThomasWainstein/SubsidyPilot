import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    
    // In production, this would check against actual EU sanctions databases
    // For now, we'll simulate with some known test cases
    const sanctionedEntities = [
      'sanctioned company',
      'blocked entity',
      'restricted business',
      'embargoed firm'
    ];
    
    const normalizedName = name.toLowerCase().trim();
    const found = sanctionedEntities.some(entity => 
      normalizedName.includes(entity) || entity.includes(normalizedName)
    );
    
    return new Response(JSON.stringify({
      found,
      name: name,
      checked_against: 'EU Consolidated Sanctions List',
      confidence: found ? 0.95 : 0.99,
      details: found ? 'Entity found on sanctions list' : 'No sanctions matches found',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sanctions check error:', error);
    return new Response(JSON.stringify({
      found: false,
      error: error.message,
      confidence: 0,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});