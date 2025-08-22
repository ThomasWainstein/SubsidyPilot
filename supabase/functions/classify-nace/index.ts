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
    const { description } = await req.json();
    
    const naceCode = classifyNACE(description.toLowerCase());
    
    return new Response(JSON.stringify(naceCode), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NACE classification error:', error);
    return new Response(JSON.stringify({
      code: '82.99',
      description: 'Other business support service activities n.e.c.',
      section: 'N',
      confidence: 0.3,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function classifyNACE(description: string) {
  // NACE classification based on keywords
  const classifications = [
    // Agriculture
    { keywords: ['farm', 'agriculture', 'crop', 'livestock', 'dairy'], code: '01.11', desc: 'Growing of cereals', section: 'A', confidence: 0.9 },
    { keywords: ['vineyard', 'wine', 'grape'], code: '01.21', desc: 'Growing of grapes', section: 'A', confidence: 0.95 },
    
    // Manufacturing
    { keywords: ['manufacture', 'production', 'factory'], code: '25.50', desc: 'Forging, pressing, stamping', section: 'C', confidence: 0.8 },
    { keywords: ['software', 'application', 'programming'], code: '62.01', desc: 'Computer programming activities', section: 'J', confidence: 0.9 },
    { keywords: ['food', 'bakery', 'restaurant'], code: '56.10', desc: 'Restaurants and mobile food service', section: 'I', confidence: 0.85 },
    
    // Construction
    { keywords: ['construction', 'building', 'renovation'], code: '41.20', desc: 'Construction of residential buildings', section: 'F', confidence: 0.85 },
    
    // Retail
    { keywords: ['shop', 'store', 'retail', 'sell'], code: '47.19', desc: 'Other retail sale in non-specialised stores', section: 'G', confidence: 0.75 },
    
    // Services
    { keywords: ['consulting', 'advisory', 'service'], code: '70.22', desc: 'Other management consultancy', section: 'M', confidence: 0.8 },
    { keywords: ['transport', 'logistics', 'delivery'], code: '49.41', desc: 'Freight transport by road', section: 'H', confidence: 0.85 },
    { keywords: ['education', 'training', 'school'], code: '85.59', desc: 'Other education n.e.c.', section: 'P', confidence: 0.8 },
    
    // Technology
    { keywords: ['technology', 'tech', 'digital', 'data'], code: '62.09', desc: 'Other information technology service', section: 'J', confidence: 0.75 },
    { keywords: ['research', 'development', 'innovation'], code: '72.19', desc: 'Other research and development', section: 'M', confidence: 0.8 },
    
    // Healthcare
    { keywords: ['health', 'medical', 'clinic', 'doctor'], code: '86.90', desc: 'Other human health activities', section: 'Q', confidence: 0.85 },
    
    // Energy
    { keywords: ['energy', 'solar', 'renewable', 'electric'], code: '35.11', desc: 'Production of electricity', section: 'D', confidence: 0.9 },
    
    // Finance
    { keywords: ['finance', 'bank', 'investment', 'credit'], code: '64.19', desc: 'Other monetary intermediation', section: 'K', confidence: 0.85 },
    
    // Real Estate
    { keywords: ['real estate', 'property', 'rental'], code: '68.10', desc: 'Buying and selling of own real estate', section: 'L', confidence: 0.9 },
    
    // Tourism
    { keywords: ['hotel', 'tourism', 'accommodation'], code: '55.10', desc: 'Hotels and similar accommodation', section: 'I', confidence: 0.9 }
  ];

  // Find best match
  let bestMatch = { code: '82.99', desc: 'Other business support service activities n.e.c.', section: 'N', confidence: 0.3 };
  
  for (const classification of classifications) {
    const matchCount = classification.keywords.filter(keyword => 
      description.includes(keyword)
    ).length;
    
    if (matchCount > 0) {
      const confidence = Math.min(0.95, classification.confidence * (matchCount / classification.keywords.length));
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          code: classification.code,
          desc: classification.desc,
          section: classification.section,
          confidence
        };
      }
    }
  }

  return {
    code: bestMatch.code,
    description: bestMatch.desc,
    section: bestMatch.section,
    confidence: bestMatch.confidence,
    timestamp: new Date().toISOString()
  };
}