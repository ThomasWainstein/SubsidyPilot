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
      forceReprocess = false, 
      batchSize = 10,
      testMode = false // Only process first 5 subsidies in test mode
    } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🚀 Starting batch enhanced parsing for existing subsidies...');

    // Fetch all subsidies from the correct table
    const { data: subsidies, error: fetchError } = await supabase
      .from('subsidies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(testMode ? 5 : 1000);
    
    if (fetchError) {
      throw new Error(`Failed to fetch subsidies: ${fetchError.message}`);
    }

    if (!subsidies || subsidies.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No subsidies found to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${subsidies.length} subsidies to process`);

    const stats = {
      total: subsidies.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      localOnly: 0,
      aiEnhanced: 0,
      hybrid: 0,
      startTime: Date.now(),
      results: [] as any[]
    };

    // Start background processing
    EdgeRuntime.waitUntil(processSubsidiesInBackground(subsidies, stats, forceReprocess, batchSize));

    // Return immediate response
    return new Response(JSON.stringify({
      success: true,
      message: `Batch processing started for ${subsidies.length} subsidies`,
      jobId: `batch-${Date.now()}`,
      totalSubsidies: subsidies.length,
      testMode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in batch-enhanced-parser:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSubsidiesInBackground(
  subsidies: any[], 
  stats: any, 
  forceReprocess: boolean, 
  batchSize: number
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`🔄 Processing ${subsidies.length} subsidies in batches of ${batchSize}`);

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < subsidies.length; i += batchSize) {
    const batch = subsidies.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(subsidies.length / batchSize)} (${batch.length} subsidies)`);

    // Process batch concurrently
    const batchPromises = batch.map(async (subsidy) => {
      return processSingleSubsidy(subsidy, forceReprocess, stats, supabase);
    });

    await Promise.allSettled(batchPromises);

    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final statistics
  const endTime = Date.now();
  const duration = Math.round((endTime - stats.startTime) / 1000);
  
  console.log('🎉 Batch processing completed!');
  console.log(`📈 Statistics:`);
  console.log(`  ✅ Successful: ${stats.successful}`);
  console.log(`  ❌ Failed: ${stats.failed}`);
  console.log(`  ⏭️ Skipped: ${stats.skipped}`);
  console.log(`  🚀 Local only: ${stats.localOnly}`);
  console.log(`  🤖 AI enhanced: ${stats.aiEnhanced}`);
  console.log(`  ⚡ Hybrid: ${stats.hybrid}`);
  console.log(`  ⏱️ Total time: ${duration}s`);
  console.log(`  📊 Success rate: ${Math.round(stats.successful / stats.total * 100)}%`);

  // Log detailed results for analysis
  console.log(`📋 Processing results:`, JSON.stringify(stats.results, null, 2));
}

async function processSingleSubsidy(
  subsidy: any, 
  forceReprocess: boolean, 
  stats: any, 
  supabase: any
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Check if already processed (skip if not forcing reprocess)
    const existingData = (subsidy as any).enhanced_funding_info;
    if (!forceReprocess && existingData) {
      stats.skipped++;
      console.log(`⏭️ Skipping ${subsidy.id.substring(0, 8)} - already processed`);
      return;
    }

    console.log(`🔍 Processing subsidy: ${subsidy.title?.substring(0, 50)}...`);

    // STEP 1: Enhanced Local Parsing
    const localResult = parseSubsidyLocally(subsidy);
    let processingMethod = 'failed';
    let confidence = 0;
    let finalResult = null;

    if (localResult && localResult.confidence >= 0.6) {
      // Local parsing sufficient
      finalResult = { ...localResult, processingMethod: 'local' };
      processingMethod = 'local';
      confidence = localResult.confidence;
      stats.localOnly++;
      
      console.log(`✅ Local parsing sufficient for ${subsidy.id.substring(0, 8)} (${Math.round(confidence * 100)}%)`);
    } else {
      // Use AI enhancement
      try {
        const aiResult = await performAIEnhancement(subsidy, localResult, supabase);
        if (aiResult) {
          finalResult = aiResult;
          processingMethod = localResult ? 'hybrid' : 'ai-enhanced';
          confidence = aiResult.confidence;
          
          if (localResult) {
            stats.hybrid++;
          } else {
            stats.aiEnhanced++;
          }
          
          console.log(`🤖 AI enhancement completed for ${subsidy.id.substring(0, 8)} (${Math.round(confidence * 100)}%)`);
        }
      } catch (aiError) {
        console.warn(`⚠️ AI enhancement failed for ${subsidy.id.substring(0, 8)}:`, aiError);
        
        // Fallback to local result if available
        if (localResult) {
          finalResult = { ...localResult, processingMethod: 'local_fallback' };
          processingMethod = 'local_fallback';
          confidence = localResult.confidence;
          stats.localOnly++;
        }
      }
    }

    if (finalResult) {
      // Update the database with enhanced data
      await updateSubsidyRecord(supabase, subsidy.id, finalResult);
      stats.successful++;
    } else {
      stats.failed++;
      console.error(`❌ All processing methods failed for ${subsidy.id.substring(0, 8)}`);
    }

    // Track processing result
    stats.results.push({
      subsidyId: subsidy.id.substring(0, 8),
      title: subsidy.title?.substring(0, 30),
      method: processingMethod,
      confidence: Math.round(confidence * 100),
      processingTime: Date.now() - startTime,
      funding: finalResult?.funding || null
    });

    stats.processed++;

  } catch (error) {
    stats.failed++;
    console.error(`❌ Error processing ${subsidy.id.substring(0, 8)}:`, error);
    
    stats.results.push({
      subsidyId: subsidy.id.substring(0, 8),
      title: subsidy.title?.substring(0, 30),
      method: 'error',
      confidence: 0,
      processingTime: Date.now() - startTime,
      error: error.message
    });
  }
}

function parseSubsidyLocally(subsidy: any): any {
  try {
    // Enhanced French parser with comprehensive content extraction
    const contentSources = [
      subsidy.title,
      subsidy.description,
      subsidy.eligibility,
      subsidy.funding_markdown,
      subsidy.description_markdown,
      
      // Raw data extraction (rich HTML content)
      subsidy.raw_data?.fiche ? cleanHtmlContent(subsidy.raw_data.fiche) : '',
      
      // LesAides.fr specific data
      subsidy.lesAidesData?.description,
      subsidy.lesAidesData?.montants,
      subsidy.lesAidesData?.conditions,
      subsidy.lesAidesData?.demarches,
      
      // Any other structured fields
      subsidy.funding_details,
      subsidy.application_process,
    ].filter(Boolean);

    const content = contentSources.join('\n\n');

    if (!content.trim()) {
      return null;
    }

    // Use enhanced French parser (inline implementation for edge function)
    const parsed = parseEnhancedFrench(content);
    
    return {
      funding: parsed.funding,
      eligibility: parsed.eligibility,
      applicationProcess: parsed.applicationProcess,
      deadline: parsed.deadline,
      keyInformation: {
        issuingBody: subsidy.agency,
        programName: subsidy.title,
        sector: Array.isArray(subsidy.sector) ? subsidy.sector.join(', ') : subsidy.sector,
        region: Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region,
      },
      confidence: parsed.confidence,
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Local parsing error:', error);
    return null;
  }
}

// Enhanced French parsing with key patterns for the problematic subsidy
function parseEnhancedFrench(content: string): any {
  const funding: any = { type: 'unknown', currency: 'EUR' };
  const eligibility: any = { entityTypes: [], sectors: [], geographicScope: [], specificConditions: [] };
  let confidence = 0;

  // CRITICAL: Handle the "20% + investment range" pattern
  const percentageWithRangePatterns = [
    /(\d+(?:[.,]\d+)?)\s*%.*?(?:dépense|investissement|coût).*?entre\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?/gi,
    /aide.*?hauteur.*?(\d+(?:[.,]\d+)?)\s*%.*?investissement.*?entre\s+(\d+(?:\s*\d{3})*)\s*€.*?et\s+(\d+(?:\s*\d{3})*)\s*€/gi
  ];

  for (const pattern of percentageWithRangePatterns) {
    const match = content.match(pattern);
    if (match) {
      const percentage = parseFloat(match[1].replace(',', '.'));
      const investmentMin = parseInt(match[2].replace(/\s/g, ''));
      const investmentMax = parseInt(match[3].replace(/\s/g, ''));
      
      funding.type = 'percentage_with_range';
      funding.percentage = percentage;
      funding.investmentMin = investmentMin;
      funding.investmentMax = investmentMax;
      funding.minAmount = Math.round(investmentMin * percentage / 100);
      funding.maxAmount = Math.round(investmentMax * percentage / 100);
      funding.conditions = `Sur investissement entre €${investmentMin.toLocaleString()} et €${investmentMax.toLocaleString()}`;
      
      confidence += 0.4; // High confidence for this complex pattern
      break;
    }
  }

  // Entity type detection
  const entityPatterns = {
    'TPE': /TPE|très\s+petites\s+entreprises/gi,
    'PME': /PME|petites\s+et\s+moyennes\s+entreprises/gi,
    'Entreprises': /entreprises?/gi,
    'Associations': /associations?/gi,
  };

  for (const [type, pattern] of Object.entries(entityPatterns)) {
    if (pattern.test(content)) {
      eligibility.entityTypes.push(type);
      confidence += 0.1;
    }
  }

  // Geographic scope
  const geoPatterns = {
    'France': /France|français|nationale?/gi,
    'Pays de Mormal': /pays\s+de\s+mormal/gi,
    'Nord': /nord|région\s+nord/gi,
  };

  for (const [scope, pattern] of Object.entries(geoPatterns)) {
    if (pattern.test(content)) {
      eligibility.geographicScope.push(scope);
      confidence += 0.1;
    }
  }

  // Basic percentage patterns (fallback)
  if (funding.type === 'unknown') {
    const percentageMatch = content.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentageMatch) {
      funding.type = 'percentage';
      funding.percentage = parseFloat(percentageMatch[1].replace(',', '.'));
      confidence += 0.2;
    }
  }

  // Amount range patterns
  if (funding.type === 'unknown') {
    const rangeMatch = content.match(/entre\s*(\d+(?:\s*\d{3})*)\s*€.*?et\s*(\d+(?:\s*\d{3})*)\s*€/gi);
    if (rangeMatch) {
      funding.type = 'range';
      funding.minAmount = parseInt(rangeMatch[1].replace(/\s/g, ''));
      funding.maxAmount = parseInt(rangeMatch[2].replace(/\s/g, ''));
      confidence += 0.3;
    }
  }

  return {
    funding,
    eligibility,
    applicationProcess: null,
    deadline: null,
    confidence: Math.min(1, confidence)
  };
}

async function performAIEnhancement(subsidy: any, localResult: any, supabase: any): Promise<any> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contentToAnalyze = [
    subsidy.title,
    subsidy.description,
    subsidy.eligibility,
    subsidy.funding_markdown,
    subsidy.description_markdown
  ].filter(Boolean).join('\n\n');

  const prompt = localResult 
    ? `Enhance this French subsidy extraction. Local result: ${JSON.stringify(localResult)}\n\nContent: ${contentToAnalyze}`
    : `Extract French subsidy information from: ${contentToAnalyze}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: localResult ? 'gpt-4o-mini' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Extract French subsidy information as JSON with funding, eligibility, etc.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: localResult ? 1500 : 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }
  
  const parsedData = JSON.parse(jsonMatch[0]);
  
  return {
    ...parsedData,
    confidence: calculateConfidence(parsedData),
    extractedAt: new Date().toISOString(),
    processingMethod: localResult ? 'hybrid' : 'ai-enhanced'
  };
}

function calculateConfidence(data: any): number {
  let score = 0;
  let maxScore = 5;

  if (data.funding?.type && data.funding.type !== 'unknown') score += 1;
  if (data.funding?.percentage || data.funding?.minAmount) score += 1;
  if (data.eligibility?.entityTypes?.length > 0) score += 1;
  if (data.eligibility?.geographicScope?.length > 0) score += 1;
  if (data.applicationProcess?.steps?.length > 0) score += 1;

  return Math.min(1, score / maxScore);
}

async function updateSubsidyRecord(supabase: any, subsidyId: string, enhancedData: any): Promise<void> {
  const { error } = await supabase
    .from('subsidies')
    .update({
      enhanced_funding_info: enhancedData,
      extraction_completeness_score: Math.round(enhancedData.confidence * 100),
      updated_at: new Date().toISOString()
    })
    .eq('id', subsidyId);

  if (error) {
    console.warn(`Failed to update subsidy ${subsidyId}:`, error);
  }
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