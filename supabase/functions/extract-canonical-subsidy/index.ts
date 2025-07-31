import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { mapToCanonicalSchema, CANONICAL_FIELD_PRIORITIES } from './canonicalMapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CANONICAL_EXTRACTION_PROMPT = `You are a specialized subsidy data extraction agent for the AgriTool platform. Your task is to extract subsidy information from raw content and map it STRICTLY to the canonical schema below.

CANONICAL SCHEMA - USE ONLY THESE FIELDS:

HIGH PRIORITY FIELDS (must flag if missing):
- scheme_id: Official code/identifier (string)
- scheme_title: Title in original language (string)
- scheme_title_en: English title (string)
- legal_basis: Legal regulation reference (string)
- aid_category: State aid classification (string)
- wto_classification: WTO category (string)
- eligible_countries: ISO country codes (array)
- eligible_regions: NUTS/FADN codes (array)
- application_deadline: ISO date format (string)
- scheme_duration: Date range (string)
- funding_source: EAFRD/EAGF/National/Other (string)
- total_budget: Number in euros (number)
- aid_intensity_max: Maximum percentage (number)
- minimum_aid_amount: Minimum euros (number)
- maximum_aid_amount: Maximum euros (number)
- eligible_beneficiary_types: Types array (array)
- enterprise_size_criteria: SME/large/other (string)
- sectoral_scope: NACE codes (array)
- financial_thresholds: Crisis/targeting rules (string)

MEDIUM PRIORITY FIELDS:
- land_requirements: Land criteria (string)
- livestock_requirements: Livestock criteria (string)
- farming_practices: Practices array (array)
- crop_specifications: Crop types (array)
- application_method: How to apply (string)
- required_documents: Documents array (array)
- assessment_criteria: Selection criteria (string)
- monitoring_requirements: Monitoring rules (string)
- cross_compliance: Compliance rules (string)
- state_aid_cumulation: Aid cumulation rules (string)
- primary_objective: Main objective (string)
- sustainability_goals: Goals array (array)

OPTIONAL FIELDS:
- managing_authority: Authority name (string)
- data_source: Source array (array)
- quality_flags: Quality flags (array)

EXTRACTION RULES:
1. Use ONLY the canonical field names above - NO other fields allowed
2. Preserve original language content exactly as found
3. Arrays must be properly formatted JSON arrays
4. Numbers without currency symbols or formatting
5. Dates in ISO format (YYYY-MM-DD)
6. If a field cannot be reliably extracted, do NOT include it in the output
7. Track source information for each field extracted

SOURCE TRACKING:
For each field you extract, note where it came from:
- Web page URL
- PDF filename and page number
- Document section
- HTML element

OUTPUT FORMAT:
Return ONLY a JSON object with:
- Only the canonical fields you found
- NO additional fields
- NO explanations or comments

Example:
{
  "scheme_title": "Programme d'aide à l'innovation agricole",
  "application_deadline": "2024-12-31",
  "total_budget": 1000000,
  "eligible_countries": ["FR"],
  "funding_source": "EAFRD"
}`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_log_id, force_reprocess = false } = await req.json();

    if (!raw_log_id) {
      return new Response(
        JSON.stringify({ error: 'raw_log_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already processed (unless force reprocess)
    if (!force_reprocess) {
      const { data: existing } = await supabase
        .from('subsidies_structured')
        .select('id')
        .eq('raw_log_id', raw_log_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ message: 'Already processed', subsidy_id: existing.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get raw log data
    const { data: rawLog, error: logError } = await supabase
      .from('raw_logs')
      .select('*')
      .eq('id', raw_log_id)
      .maybeSingle();

    if (logError || !rawLog) {
      return new Response(
        JSON.stringify({ error: 'Raw log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get related scraped page data if available
    const { data: scrapedPages } = await supabase
      .from('raw_scraped_pages')
      .select('*')
      .in('source_url', rawLog.file_refs || []);

    // Prepare content for extraction
    let contentForExtraction = rawLog.payload || '';
    const sourceMapping: Record<string, string> = {};

    if (scrapedPages && scrapedPages.length > 0) {
      scrapedPages.forEach(page => {
        contentForExtraction += `\n\n--- Scraped Page: ${page.source_url} ---\n`;
        contentForExtraction += page.raw_text || '';
        if (page.raw_html) {
          contentForExtraction += `\n--- HTML ---\n${page.raw_html}`;
        }
        sourceMapping['web'] = page.source_url;
      });
    }

    if (rawLog.file_refs && rawLog.file_refs.length > 0) {
      sourceMapping['document'] = rawLog.file_refs.join(', ');
    }

    console.log('[CanonicalExtraction] Starting extraction...');
    console.log(`[CanonicalExtraction] Content length: ${contentForExtraction.length}`);
    console.log(`[CanonicalExtraction] Sources: ${JSON.stringify(sourceMapping)}`);

    // Call OpenAI with canonical extraction prompt
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SCRAPER_RAW_GPT_API')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: CANONICAL_EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: `Extract subsidy information from the following raw content:\n\n${contentForExtraction}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIResult = await openAIResponse.json();
    const extractedContent = openAIResult.choices[0].message.content;

    console.log('[CanonicalExtraction] Raw OpenAI response:', extractedContent);

    // Parse the JSON response
    let rawExtractedData;
    try {
      // Remove any potential markdown formatting
      const cleanContent = extractedContent.replace(/```json\n?|\n?```/g, '').trim();
      rawExtractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[CanonicalExtraction] Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from AI extraction');
    }

    console.log('[CanonicalExtraction] Raw extracted data:', JSON.stringify(rawExtractedData, null, 2));

    // Apply canonical mapping with strict field enforcement
    const canonicalResult = mapToCanonicalSchema(rawExtractedData, sourceMapping);

    console.log('[CanonicalExtraction] Canonical mapping result:', JSON.stringify(canonicalResult, null, 2));

    // Strict validation and admin flagging
    const validationErrors: string[] = [];
    const flaggedForAdmin: string[] = [];

    // Check high-priority fields and flag missing ones
    const highPriorityFields = CANONICAL_FIELD_PRIORITIES.high;
    for (const field of highPriorityFields) {
      if (!canonicalResult[field]) {
        flaggedForAdmin.push(field);
        console.log(`[CanonicalExtraction] High priority field missing: ${field}`);
      }
    }

    // Check medium-priority fields and flag missing ones
    const mediumPriorityFields = CANONICAL_FIELD_PRIORITIES.medium;
    for (const field of mediumPriorityFields) {
      if (!canonicalResult[field]) {
        flaggedForAdmin.push(field);
        console.log(`[CanonicalExtraction] Medium priority field missing: ${field}`);
      }
    }

    // Validate title quality - reject placeholder titles
    if (!canonicalResult.scheme_title || 
        canonicalResult.scheme_title === 'Subsidy Page' || 
        canonicalResult.scheme_title === 'Agricultural Program' ||
        canonicalResult.scheme_title === 'Agricultural Funding Program' ||
        canonicalResult.scheme_title.trim() === '') {
      flaggedForAdmin.push('scheme_title');
      validationErrors.push('Missing or invalid scheme_title - must be official program name');
    }

    // Create final canonical record with strict schema adherence
    const finalCanonicalRecord = {
      // Core extracted data (only canonical fields)
      ...Object.fromEntries(
        Object.entries(canonicalResult).filter(([key]) => 
          [...CANONICAL_FIELD_PRIORITIES.high, ...CANONICAL_FIELD_PRIORITIES.medium, ...CANONICAL_FIELD_PRIORITIES.optional]
            .includes(key)
        )
      ),
      
      // System fields
      flagged_for_admin: [...new Set(flaggedForAdmin)],
      source: canonicalResult.source || {},
      last_updated: new Date().toISOString(),
      
      // Audit information
      audit: {
        extraction_timestamp: new Date().toISOString(),
        validation_errors: validationErrors,
        fields_extracted: Object.keys(canonicalResult).length,
        fields_flagged: flaggedForAdmin.length,
        source_content_length: contentForExtraction.length,
        has_attachments: rawLog.file_refs.length > 0,
        canonical_compliance: 'strict'
      }
    };

    console.log('=== CANONICAL EXTRACTION SUMMARY ===');
    console.log(`Fields extracted: ${Object.keys(finalCanonicalRecord).length}`);
    console.log(`High priority missing: ${flaggedForAdmin.filter(f => CANONICAL_FIELD_PRIORITIES.high.includes(f)).length}`);
    console.log(`Medium priority missing: ${flaggedForAdmin.filter(f => CANONICAL_FIELD_PRIORITIES.medium.includes(f)).length}`);
    console.log(`Total flagged fields: ${flaggedForAdmin.length}`);
    console.log(`Validation errors: ${validationErrors.length}`);
    console.log('====================================');

    if (validationErrors.length > 0) {
      console.warn('[CanonicalExtraction] Validation warnings:', validationErrors);
    }

    // Insert into subsidies_structured table with canonical data only
    const insertData = {
      raw_log_id: raw_log_id,
      
      // Map canonical fields to database columns - only include fields that exist in DB
      url: finalCanonicalRecord.scheme_id || null,
      title: finalCanonicalRecord.scheme_title || null,
      description: finalCanonicalRecord.primary_objective || null,
      eligibility: finalCanonicalRecord.eligible_beneficiary_types ? 
        (Array.isArray(finalCanonicalRecord.eligible_beneficiary_types) ? 
          finalCanonicalRecord.eligible_beneficiary_types.join(', ') : 
          finalCanonicalRecord.eligible_beneficiary_types) : null,
      deadline: finalCanonicalRecord.application_deadline || null,
      amount: finalCanonicalRecord.total_budget ? [finalCanonicalRecord.total_budget] : [],
      program: finalCanonicalRecord.scheme_title || null,
      agency: finalCanonicalRecord.managing_authority || null,
      region: finalCanonicalRecord.eligible_regions || [],
      sector: finalCanonicalRecord.sectoral_scope || [],
      funding_type: finalCanonicalRecord.funding_source || null,
      funding_source: finalCanonicalRecord.funding_source || null,
      evaluation_criteria: finalCanonicalRecord.assessment_criteria || null,
      legal_entity_type: finalCanonicalRecord.eligible_beneficiary_types || [],
      
      // System fields
      audit: finalCanonicalRecord.audit || {},
      missing_fields: finalCanonicalRecord.flagged_for_admin || [],
      audit_notes: validationErrors.join('; ') || null
    };

    const { data: insertedSubsidy, error: insertError } = await supabase
      .from('subsidies_structured')
      .insert([insertData])
      .select();

    if (insertError) {
      console.error('[CanonicalExtraction] Insert error:', insertError);
      throw new Error(`Failed to insert subsidy: ${insertError.message}`);
    }

    // Update raw log as processed
    await supabase
      .from('raw_logs')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', raw_log_id);

    console.log(`[CanonicalExtraction] Successfully processed subsidy: ${insertedSubsidy[0].id}`);

    return new Response(JSON.stringify({
      success: true,
      subsidy_id: insertedSubsidy[0].id,
      extraction_summary: {
        fields_extracted: Object.keys(finalCanonicalRecord).length,
        high_priority_missing: flaggedForAdmin.filter(f => CANONICAL_FIELD_PRIORITIES.high.includes(f)).length,
        medium_priority_missing: flaggedForAdmin.filter(f => CANONICAL_FIELD_PRIORITIES.medium.includes(f)).length,
        total_flagged: flaggedForAdmin.length,
        validation_errors: validationErrors.length,
        scheme_title: finalCanonicalRecord.scheme_title || 'MISSING',
        canonical_compliance: 'strict'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CanonicalExtraction] Error in extract-canonical-subsidy function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Canonical subsidy extraction failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});