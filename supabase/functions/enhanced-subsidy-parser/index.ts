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
    const { 
      subsidyId, 
      forceReprocess = false, 
      localResult = null 
    } = await req.json();
    
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

    console.log(`🤖 AI Processing subsidy: ${subsidy.title}`);

    // Prepare content for AI analysis
    const contentSources = [
      subsidy.title,
      subsidy.description,
      subsidy.eligibility,
      subsidy.funding_markdown,
      subsidy.description_markdown,
      // Include raw data if available
      subsidy.raw_data?.fiche ? cleanHtmlContent(subsidy.raw_data.fiche) : '',
      subsidy.lesAidesData?.description,
      subsidy.lesAidesData?.montants,
      subsidy.lesAidesData?.conditions,
    ].filter(Boolean);

    const contentToAnalyze = contentSources.join('\n\n');

    if (!contentToAnalyze.trim()) {
      throw new Error('No content available to analyze');
    }

    // Create specialized prompt based on whether we have local results
    const prompt = createHybridPrompt(contentToAnalyze, localResult);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Make AI extraction request with optimized model selection
    const model = localResult ? 'gpt-4o-mini' : 'gpt-4o'; // Use cheaper model if we have local baseline
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: localResult 
              ? 'You are an expert at enhancing and validating extracted French subsidy information. Focus on filling gaps and improving accuracy of the provided local extraction.'
              : 'You are an expert at extracting structured information from French subsidy and funding documents. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: localResult ? 1500 : 2000, // Fewer tokens needed for enhancement
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

    // Merge with local result if available (hybrid approach)
    const finalData = localResult ? mergeResults(localResult, parsedData) : parsedData;

    // Calculate confidence score
    const confidence = calculateHybridConfidenceScore(finalData, contentToAnalyze, localResult);
    
    // Prepare enhanced data
    const enhancedData = {
      ...finalData,
      confidence,
      extractedAt: new Date().toISOString(),
      originalContent: contentToAnalyze.substring(0, 1000),
      processingMethod: localResult ? 'hybrid' : 'ai-enhanced',
      localConfidence: localResult?.confidence || null,
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

    const processingMethod = localResult ? 'hybrid' : 'ai-enhanced';
    console.log(`✅ Successfully processed subsidy ${subsidyId} with ${processingMethod} method (confidence: ${Math.round(confidence * 100)}%)`);

    return new Response(JSON.stringify({
      success: true,
      data: enhancedData,
      confidence,
      subsidyId,
      processingMethod,
      tokensUsed: aiData.usage?.total_tokens || 0,
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

function createHybridPrompt(content: string, localResult: any): string {
  if (localResult) {
    // Enhancement prompt - focus on filling gaps
    return `I have already extracted some information from this French subsidy using local parsing. Please enhance and validate this information, focusing on filling any missing details and correcting any errors.

CONTENT:
${content}

EXISTING LOCAL EXTRACTION:
${JSON.stringify(localResult, null, 2)}

Please provide an enhanced version in the same JSON format, focusing on:
1. Validating and improving funding information accuracy
2. Adding any missing eligibility criteria or entity types
3. Enhancing application process details
4. Filling in missing deadlines or contact information
5. Correcting any obvious errors in the local extraction

Return only valid JSON with the same structure:
{
  "funding": {
    "type": "percentage|fixed|range|maximum|minimum|percentage_with_range",
    "percentage": null,
    "minAmount": null,
    "maxAmount": null,
    "investmentMin": null,
    "investmentMax": null,
    "currency": "EUR",
    "conditions": "",
    "description": ""
  },
  "eligibility": {
    "entityTypes": [],
    "sectors": [],
    "geographicScope": [],
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
}`;
  } else {
    // Full extraction prompt
    return `Analyze this French subsidy information and extract structured data in JSON format.

Content to analyze:
${content}

Extract the following information in JSON format:
{
  "funding": {
    "type": "percentage|fixed|range|maximum|minimum|percentage_with_range",
    "percentage": null,
    "minAmount": null,
    "maxAmount": null,
    "investmentMin": null,
    "investmentMax": null,
    "currency": "EUR",
    "conditions": "",
    "description": ""
  },
  "eligibility": {
    "entityTypes": [],
    "sectors": [],
    "geographicScope": [],
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
For percentage_with_range type, include both the percentage rate and the investment range it applies to.
Return only valid JSON, no additional text.`;
  }
}

function mergeResults(localResult: any, aiResult: any): any {
  // Smart merge - prefer AI results where they're more detailed, keep local where AI is missing info
  return {
    funding: {
      ...localResult.funding,
      ...aiResult.funding,
      // Prefer local calculations if AI doesn't have them
      minAmount: aiResult.funding?.minAmount || localResult.funding?.minAmount,
      maxAmount: aiResult.funding?.maxAmount || localResult.funding?.maxAmount,
      investmentMin: aiResult.funding?.investmentMin || localResult.funding?.investmentMin,
      investmentMax: aiResult.funding?.investmentMax || localResult.funding?.investmentMax,
    },
    eligibility: {
      entityTypes: [...new Set([
        ...(localResult.eligibility?.entityTypes || []),
        ...(aiResult.eligibility?.entityTypes || [])
      ])],
      sectors: [...new Set([
        ...(localResult.eligibility?.sectors || []),
        ...(aiResult.eligibility?.sectors || [])
      ])],
      geographicScope: [...new Set([
        ...(localResult.eligibility?.geographicScope || []),
        ...(aiResult.eligibility?.geographicScope || [])
      ])],
      specificConditions: [...new Set([
        ...(localResult.eligibility?.specificConditions || []),
        ...(aiResult.eligibility?.specificConditions || [])
      ])]
    },
    applicationProcess: {
      ...localResult.applicationProcess,
      ...aiResult.applicationProcess,
      steps: [...new Set([
        ...(localResult.applicationProcess?.steps || []),
        ...(aiResult.applicationProcess?.steps || [])
      ])],
      requiredDocuments: [...new Set([
        ...(localResult.applicationProcess?.requiredDocuments || []),
        ...(aiResult.applicationProcess?.requiredDocuments || [])
      ])]
    },
    deadline: aiResult.deadline || localResult.deadline,
    keyInformation: {
      ...localResult.keyInformation,
      ...aiResult.keyInformation
    }
  };
}

function calculateHybridConfidenceScore(data: any, originalContent: string, localResult: any): number {
  let score = 0;
  let maxScore = 10;

  // Base confidence from local result if available
  if (localResult?.confidence) {
    score += localResult.confidence * 3; // 30% weight for local foundation
  }

  // Funding information completeness (40% of total)
  if (data.funding) {
    if (data.funding.type && data.funding.type !== 'unknown') score += 1;
    if (data.funding.percentage || data.funding.minAmount || data.funding.maxAmount) score += 1.5;
    if (data.funding.investmentMin && data.funding.investmentMax) score += 1; // Bonus for investment range
    if (data.funding.conditions) score += 0.5;
  }

  // Eligibility information (25% of total)
  if (data.eligibility) {
    if (data.eligibility.entityTypes?.length > 0) score += 1;
    if (data.eligibility.geographicScope?.length > 0) score += 0.75;
    if (data.eligibility.specificConditions?.length > 0) score += 0.25;
  }

  // Application process (20% of total)
  if (data.applicationProcess) {
    if (data.applicationProcess.steps?.length > 0) score += 1;
    if (data.applicationProcess.beforeProjectStart !== undefined) score += 0.5;
    if (data.applicationProcess.requiredDocuments?.length > 0) score += 0.5;
  }

  // Key information completeness (10% of total)
  if (data.keyInformation) {
    if (data.keyInformation.issuingBody) score += 0.5;
    if (data.keyInformation.region) score += 0.5;
  }

  // Deadline information (5% of total)
  if (data.deadline && data.deadline.type !== 'unknown') score += 0.5;

  // Bonus for hybrid processing (AI + local working together)
  if (localResult && score > localResult.confidence * 10) {
    score += 0.5; // Bonus for AI successfully enhancing local results
  }

  // Content quality adjustment
  const contentLength = originalContent.length;
  if (contentLength < 200) score *= 0.8; // Penalize very short content
  if (contentLength > 1500) score *= 1.1; // Bonus for detailed content
  
  return Math.min(1, score / maxScore);
}

function cleanHtmlContent(htmlContent: any): string {
  if (!htmlContent) return '';
  
  const content = typeof htmlContent === 'string' ? htmlContent : JSON.stringify(htmlContent);
  
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}