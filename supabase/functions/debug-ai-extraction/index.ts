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
    console.log('🔍 Testing AI extraction with real Romanian APIA content...');
    
    const openAIApiKey = Deno.env.get('SCRAPPER_RAW_GPT_API') ?? Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'No OpenAI API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Real Romanian APIA content sample
    const testContent = `
    Măsuri de sprijin și IACS - APIA
    
    APIA derulează scheme de plată și măsuri de sprijin pentru fermieri și crescători de animale.
    
    Măsuri de sprijin disponibile:
    
    1. Sprijin pentru tinerii fermieri
    - Valoare: până la 70.000 euro
    - Eligibilitate: fermieri cu vârsta sub 40 de ani
    - Deadline: 31 decembrie 2024
    
    2. Schema de sprijin pentru crescătorii de animale
    - Sprijin financiar în valoare de peste 28 milioane lei
    - Pentru modernizarea fermelor de animale
    - Fonduri europene pentru dezvoltare rurală
    
    3. Măsuri de modernizare agricolă
    - Investiții în echipamente agricole
    - Subvenții pentru certificarea bio
    - Program de dezvoltare rurală PNDR
    
    4. Schema de plată unică pe suprafață
    - Plăți directe pentru agricultori
    - Sprijin pentru menținerea terenurilor agricole
    `;

    const prompt = `You are an expert at extracting Romanian agricultural subsidy information from APIA (Agenția de Plăți și Intervenție pentru Agricultură).

AGENCY CONTEXT: APIA - ROMANIAN
SOURCE: apia.org.ro

TASK: Extract ALL subsidy, grant, funding scheme, or financial support information from this APIA content.

KEY TERMS TO RECOGNIZE (Romanian):
- "măsuri de sprijin"
- "scheme de plată" 
- "subvenții agricole"
- "fonduri europene"
- "sprijin financiar"
- "dezvoltare rurală"
- "crescători de animale"
- "fermieri"
- "tinerii fermieri"

OUTPUT FORMAT: Valid JSON array where each item has:
- title: Name of the subsidy/grant (in Romanian)
- description: What the funding covers  
- eligibility: Who can apply and requirements
- deadline: Application deadline (YYYY-MM-DD format if found)
- funding_type: "grant" | "subsidy" | "loan" | "support_measure"
- agency: "APIA"
- sector: Agricultural area like "livestock", "crops", "equipment", "rural_development"
- region: Geographic area if specified

IMPORTANT: Look for ANY financial support, investment schemes, payment programs, or funding opportunities.

Content to analyze:
${testContent}

Return only valid JSON array, no other text.`;

    console.log('📡 Making test OpenAI API call...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at extracting agricultural subsidy information. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ OpenAI API error: ${errorText}`);
      return new Response(JSON.stringify({ error: `OpenAI error: ${aiResponse.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;
    
    console.log('✅ Raw AI response:');
    console.log(extractedText);
    
    // Try to parse JSON
    let parsedSubsidies = [];
    try {
      parsedSubsidies = JSON.parse(extractedText);
      console.log(`🎯 Successfully parsed ${parsedSubsidies.length} subsidies`);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.log('Raw response was:', extractedText);
    }

    return new Response(JSON.stringify({
      success: true,
      rawAIResponse: extractedText,
      parsedSubsidies: parsedSubsidies,
      subsidyCount: parsedSubsidies.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});