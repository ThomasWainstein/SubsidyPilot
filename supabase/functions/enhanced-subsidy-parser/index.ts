import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subsidyId, forceReprocess = false } = await req.json();
    
    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch the subsidy data
    const { data: subsidy, error: fetchError } = await supabase
      .from('subsidies_structured')
      .select('*')
      .eq('id', subsidyId)
      .single();
    
    if (fetchError || !subsidy) {
      throw new Error(`Failed to fetch subsidy: ${fetchError?.message}`);
    }

    // Check if already processed and not forcing reprocess
    if (!forceReprocess && subsidy.enhanced_funding_info) {
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        data: subsidy.enhanced_funding_info
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing subsidy: ${subsidy.title}`);

    // Prepare content for AI analysis
    const contentToAnalyze = [
      subsidy.title,
      subsidy.description,
      subsidy.eligibility,
      subsidy.funding_markdown,
      subsidy.description_markdown
    ].filter(Boolean).join('\n\n');

    if (!contentToAnalyze.trim()) {
      throw new Error('No content available to analyze');
    }

    // AI extraction prompt
    const prompt = `Analyze this French subsidy information and extract structured data in JSON format.

Content to analyze:
${contentToAnalyze}

Extract the following information in JSON format:
{
  "funding": {
    "type": "percentage|fixed|range|maximum|minimum",
    "percentage": null,
    "minAmount": null,
    "maxAmount": null,
    "currency": "EUR",
    "conditions": "",
    "investmentRange": {"min": null, "max": null},
    "description": ""
  },
  "eligibility": {
    "entityTypes": [],
    "sectors": [],
    "geographicScope": [],
    "sizeRequirements": "",
    "specificConditions": []
  },
  "applicationProcess": {
    "steps": [],
    "timeline": "",
    "requiredDocuments": [],
    "contactInfo": "",
    "beforeProjectStart": true/false
  },
  "deadline": {
    "type": "fixed|rolling|annual|unknown",
    "date": null,
    "description": ""
  },
  "keyInformation": {
    "issuingBody": "",
    "programName": "",
    "sector": "",
    "region": ""
  }
}

Be precise with numbers and extract exact amounts, percentages, and ranges mentioned in the text.
For entity types, use standardized terms: TPE, PME, GE, associations, collectivities, artisans, farmers, etc.
Return only valid JSON, no additional text.`;

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Make AI extraction request
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured information from French subsidy and funding documents. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0].message.content.trim();
    
    let parsedData;
    try {
      // Clean the response to ensure it's valid JSON
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', extractedContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Calculate confidence score
    const confidence = calculateConfidenceScore(parsedData, contentToAnalyze);
    
    // Prepare enhanced data
    const enhancedData = {
      ...parsedData,
      confidence,
      extractedAt: new Date().toISOString(),
      originalContent: contentToAnalyze.substring(0, 1000), // Truncate for storage
      processingMethod: 'ai-enhanced'
    };

    // Update the subsidy record
    const { error: updateError } = await supabase
      .from('subsidies_structured')
      .update({
        enhanced_funding_info: enhancedData,
        extraction_completeness_score: Math.round(confidence * 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', subsidyId);

    if (updateError) {
      console.error('Failed to update subsidy record:', updateError);
    }

    console.log(`Successfully processed subsidy ${subsidyId} with confidence ${confidence}`);

    return new Response(JSON.stringify({
      success: true,
      data: enhancedData,
      confidence,
      subsidyId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in enhanced-subsidy-parser:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateConfidenceScore(data: any, originalContent: string): number {
  let score = 0;
  let maxScore = 5;

  // Funding information (most important - 40%)
  if (data.funding) {
    if (data.funding.type && data.funding.type !== 'unknown') score += 1;
    if (data.funding.percentage || data.funding.minAmount || data.funding.maxAmount) score += 1;
  }

  // Eligibility information (25%)
  if (data.eligibility && (data.eligibility.entityTypes?.length > 0 || data.eligibility.geographicScope?.length > 0)) {
    score += 1;
  }

  // Application process (20%)
  if (data.applicationProcess && data.applicationProcess.steps?.length > 0) {
    score += 1;
  }

  // Key information completeness (15%)
  if (data.keyInformation && (data.keyInformation.issuingBody || data.keyInformation.programName)) {
    score += 1;
  }

  // Adjust for content quality
  const contentLength = originalContent.length;
  if (contentLength < 100) score *= 0.7; // Penalize very short content
  if (contentLength > 1000) score *= 1.1; // Bonus for detailed content
  
  return Math.min(1, score / maxScore);
}