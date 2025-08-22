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
    const { address } = await req.json();

    // Use OpenStreetMap Nominatim API for geocoding (free alternative to Google)
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SubsidyPilot/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding service error: ${response.status}`);
    }

    const results = await response.json();

    if (results && results.length > 0) {
      const result = results[0];
      
      return new Response(JSON.stringify({
        found: true,
        formatted_address: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        confidence: parseFloat(result.importance || 0.5),
        components: {
          country: result.address?.country,
          country_code: result.address?.country_code,
          state: result.address?.state,
          city: result.address?.city || result.address?.town || result.address?.village,
          postal_code: result.address?.postcode,
          street: result.address?.road,
          house_number: result.address?.house_number
        },
        raw: result,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        found: false,
        error: 'Address not found',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(JSON.stringify({
      found: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});