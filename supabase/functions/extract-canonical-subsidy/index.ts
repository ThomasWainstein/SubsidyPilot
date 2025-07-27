import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already processed (unless force reprocess)
    if (!force_reprocess) {
      const { data: existing } = await supabase
        .from('subsidies_structured')
        .select('id')
        .eq('raw_log_id', raw_log_id)
        .single();

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
      .single();

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
    if (scrapedPages && scrapedPages.length > 0) {
      scrapedPages.forEach(page => {
        contentForExtraction += `\n\n--- Scraped Page: ${page.source_url} ---\n`;
        contentForExtraction += page.raw_text || '';
        if (page.raw_html) {
          contentForExtraction += `\n--- HTML ---\n${page.raw_html}`;
        }
      });
    }

    // Call OpenAI with canonical extraction prompt
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert subsidy data extraction agent for the AgriTool platform.
Your task is to analyze unstructured raw subsidy logs from FranceAgriMer subsidy pages (in French or English), including messy web page text and attached files, and convert each subsidy record into a strictly structured JSON object conforming to the canonical schema below.

Always:
- Parse and normalize all relevant information: subsidy details, eligibility, special/conditional scenarios (e.g., for JA, NI, CUMA, collective investments), objectives, eligible/ineligible actions, funding amounts (including breakdowns/ranges), application methods, required documents, evaluation criteria, reporting and compliance requirements, etc.
- Clearly flag and capture conditional logic and special eligibility cases, explicitly noting these to support downstream human review and filtering.
- If any information is ambiguous, missing, or cannot be confidently extracted, set that field to null or empty string and include it in a flagged "missing_fields" audit list.
- Normalize dates to ISO format: YYYY-MM-DD.
- Normalize numbers as plain numbers or numeric arrays for ranges (e.g., "amount": [min, max]).
- Normalize URLs as absolute URLs.
- Fields with multiple discrete values (e.g., eligible regions, entity types) must be output as arrays of strings.
- Output only the final JSON object per record, no explanations, comments, or extra text.
- Honor the source language: if source is French, output fields in French; if English, output fields in English. Do not mix languages in a field.

Canonical Fields (must always be present, null if missing):
["url", "title", "description", "eligibility", "documents", "deadline", "amount", "program", "agency", "region", "sector", "funding_type", "co_financing_rate", "project_duration", "payment_terms", "application_method", "evaluation_criteria", "previous_acceptance_rate", "priority_groups", "legal_entity_type", "funding_source", "reporting_requirements", "compliance_requirements", "language", "technical_support", "matching_algorithm_score"]

Additional Fields for Application Logic (must include):
- "application_requirements": Array of all required documents, proofs, or steps needed to apply. Extract these explicitly from all text and attachments.
- "questionnaire_steps": Array of user-facing instructions or questions corresponding 1:1 to each item in application_requirements, phrased clearly to guide applicants what to upload or enter.
- "requirements_extraction_status": Set to "ok" if any application requirements can be extracted; "not found" if none detected.

Extended Classification Fields:
- "objectives": Array of thematic categories (productivity, climate, competitiveness, etc.)
- "eligible_actions": Array of specific actions that can be funded
- "ineligible_actions": Array of actions that cannot be funded
- "beneficiary_types": Array of entity types (PME, cooperative, research orgs, individual farmers, CUMA, JA, NI, etc.)
- "investment_types": Array of investment categories (new, used, lease)
- "geographic_scope": Object with detailed region/department information
- "conditional_eligibility": Object with special cases and conditional requirements

Field-by-Field Extraction Guidance:
- "description": Succinct 2–3 sentence summary capturing purpose, objectives, and key rules.
- "eligibility": Clearly specify who can apply, including entity types, geographic scopes, and any conditional eligibility statements.
- "amount": ALWAYS provide as array - single number as [amount] or range as [min, max]. Remove currency symbols.
- "documents": List document names exactly as specified, or translated if English source.
- "deadline": Final application deadline date (if none, null).
- "legal_entity_type": Enumerate all legal forms eligible (e.g., "SAS", "EARL", "CUMA").
- "application_method": Describe submission method(s) ("online form", "by email", "by post", etc.) and any unique procedural notes.

For nullable fields, always return null if not present or ambiguous.

Audit & Flags:
- If any canonical field cannot be reliably extracted, include its key in missing_fields (an array) inside the JSON object.
- If conditional cases or special statuses are detected but incomplete, flag these clearly inside eligibility or an "audit_notes" field (optional).

Output Requirement:
Output only one JSON object per subsidy record.
Do not output any explanations, logs, or additional commentary.`
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

    console.log('Raw OpenAI response:', extractedContent);

    // Parse the JSON response
    let structuredData;
    try {
      // Remove any potential markdown formatting
      const cleanContent = extractedContent.replace(/```json\n?|\n?```/g, '').trim();
      structuredData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from AI extraction');
    }

    // Enforce array fields for database compatibility - CRITICAL FIX
    const enforceArray = (value: any) => {
      if (value === null || value === undefined || value === '') return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.includes(',')) {
        // Handle comma-separated values like "cereal, livestock"
        return value.split(',').map(v => v.trim()).filter(v => v);
      }
      return [value];
    };

    // Array fields that must be enforced
    const arrayFields = ['amount', 'region', 'sector', 'documents', 'priority_groups', 
                        'application_requirements', 'questionnaire_steps', 'legal_entity_type',
                        'objectives', 'eligible_actions', 'ineligible_actions', 
                        'beneficiary_types', 'investment_types', 'rejection_conditions'];

    // Enforce array format for required fields
    arrayFields.forEach(field => {
      if (structuredData[field] !== undefined) {
        structuredData[field] = enforceArray(structuredData[field]);
      }
    });

    // Validate all array fields are actually arrays - CRITICAL CHECK
    console.log('Enforced array fields validation:');
    arrayFields.forEach(field => {
      if (structuredData[field] !== undefined) {
        const isArray = Array.isArray(structuredData[field]);
        console.log(`${field}: ${isArray ? 'ARRAY' : 'NOT ARRAY'} - ${typeof structuredData[field]} - ${JSON.stringify(structuredData[field])}`);
        if (!isArray) {
          console.error(`CRITICAL ERROR: ${field} is not an array after enforcement!`);
        }
      }
    });

    // Insert structured data into subsidies_structured
    const insertData = {
      raw_log_id,
      ...structuredData,
      requirements_extraction_status: structuredData.requirements_extraction_status || 'pending',
      audit: {
        extraction_timestamp: new Date().toISOString(),
        model_used: 'gpt-4.1-2025-04-14',
        content_length: contentForExtraction.length,
        array_fields_enforced: arrayFields.filter(f => structuredData[f] !== undefined)
      }
    };

    const { data: newSubsidy, error: insertError } = await supabase
      .from('subsidies_structured')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save structured data: ${insertError.message}`);
    }

    // Mark raw log as processed
    await supabase
      .from('raw_logs')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', raw_log_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subsidy_id: newSubsidy.id,
        extraction_summary: {
          fields_extracted: Object.keys(structuredData).length,
          missing_fields: structuredData.missing_fields || [],
          requirements_status: structuredData.requirements_extraction_status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Extraction failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});