import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Robust array processing utilities (Deno version)
const CANONICAL_ARRAY_FIELDS = [
  'amount', 'region', 'sector', 'legal_entity_type', 'objectives',
  'beneficiary_types', 'investment_types', 'rejection_conditions',
  'eligible_actions', 'ineligible_actions', 'requirements',
  'documents_required', 'scoring_criteria_list', 'funding_tranches',
  'priority_groups_list'
];

const ARRAY_FIELD_TYPES: Record<string, 'numeric' | 'text'> = {
  amount: 'numeric',
  region: 'text',
  sector: 'text',
  legal_entity_type: 'text',
  objectives: 'text',
  beneficiary_types: 'text',
  investment_types: 'text',
  rejection_conditions: 'text',
  eligible_actions: 'text',
  ineligible_actions: 'text',
  requirements: 'text',
  documents_required: 'text',
  scoring_criteria_list: 'text',
  funding_tranches: 'text',
  priority_groups_list: 'text',
};

interface ArrayCoercionResult {
  value: any[];
  original: any;
  method: string;
  fieldName: string;
  warnings: string[];
  timestamp: string;
  success: boolean;
}

/**
 * Robust array coercion for Deno/Edge Functions
 */
function ensureArray(value: any, fieldName: string = 'unknown'): ArrayCoercionResult {
  const originalValue = value;
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();

  console.log(`[EdgeFunction] Coercing field '${fieldName}': ${JSON.stringify(value)} (${typeof value})`);

  try {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined) {
      return {
        value: [],
        original: originalValue,
        method: 'null_handling',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Handle already-array values
    if (Array.isArray(value)) {
      const cleaned = value.filter(item => 
        item !== null && 
        item !== undefined && 
        String(item).trim() !== ''
      );
      
      if (cleaned.length !== value.length) {
        warnings.push(`Filtered ${value.length - cleaned.length} empty/null items`);
      }

      return {
        value: cleaned,
        original: originalValue,
        method: 'array_cleanup',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Convert to string for processing
    const strValue = String(value).trim();

    // Handle empty strings and null-like values
    if (!strValue || ['null', 'none', 'undefined', '[]', '{}'].includes(strValue.toLowerCase())) {
      return {
        value: [],
        original: originalValue,
        method: 'empty_string',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

    // Try JSON parsing first (most reliable)
    if (strValue.startsWith('[') && strValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(strValue);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => 
            item !== null && 
            item !== undefined && 
            String(item).trim() !== ''
          );
          
          console.log(`[EdgeFunction] JSON parse successful: ${cleaned.length} items`);
          return {
            value: cleaned,
            original: originalValue,
            method: 'json_parse',
            fieldName,
            warnings,
            timestamp,
            success: true
          };
        } else {
          warnings.push(`JSON parsed to non-array: ${typeof parsed}`);
        }
      } catch (e) {
        warnings.push(`JSON parse failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Handle comma-separated or semicolon-separated values
    if (strValue.includes(',') || strValue.includes(';')) {
      const separator = strValue.includes(',') ? ',' : ';';
      const items = strValue
        .split(separator)
        .map(item => item.trim())
        .filter(item => item);

      if (items.length > 0) {
        console.log(`[EdgeFunction] CSV parse successful: ${items.length} items`);
        return {
          value: items,
          original: originalValue,
          method: `csv_split_${separator}`,
          fieldName,
          warnings,
          timestamp,
          success: true
        };
      }
    }

    // Handle numeric fields specially
    const fieldType = ARRAY_FIELD_TYPES[fieldName] || 'text';
    if (fieldType === 'numeric') {
      try {
        let numericValue: number;
        if (typeof value === 'number') {
          numericValue = value;
        } else {
          numericValue = strValue.includes('.') ? parseFloat(strValue) : parseInt(strValue, 10);
        }

        if (!isNaN(numericValue)) {
          console.log(`[EdgeFunction] Numeric wrap successful: [${numericValue}]`);
          return {
            value: [numericValue],
            original: originalValue,
            method: 'numeric_wrap',
            fieldName,
            warnings,
            timestamp,
            success: true
          };
        }
      } catch (e) {
        warnings.push(`Failed to convert to numeric: ${strValue}`);
      }
    }

    // Last resort: wrap as single item
    if (strValue) {
      console.log(`[EdgeFunction] Single wrap: ['${strValue}']`);
      return {
        value: [strValue],
        original: originalValue,
        method: 'single_wrap',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    } else {
      return {
        value: [],
        original: originalValue,
        method: 'empty_fallback',
        fieldName,
        warnings,
        timestamp,
        success: true
      };
    }

  } catch (error) {
    const errorMsg = `Array coercion critical error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[EdgeFunction] ${errorMsg}`);
    warnings.push(errorMsg);

    return {
      value: [],
      original: originalValue,
      method: 'error_fallback',
      fieldName,
      warnings,
      timestamp,
      success: false
    };
  }
}

/**
 * Process all array fields in a record
 */
function processRecordArrays(record: Record<string, any>): {
  processedRecord: Record<string, any>;
  auditEntries: ArrayCoercionResult[];
} {
  const processedRecord = { ...record };
  const auditEntries: ArrayCoercionResult[] = [];

  console.log(`[EdgeFunction] Processing record with ${CANONICAL_ARRAY_FIELDS.length} potential array fields`);

  for (const fieldName of CANONICAL_ARRAY_FIELDS) {
    if (fieldName in record) {
      const result = ensureArray(record[fieldName], fieldName);
      processedRecord[fieldName] = result.value;
      auditEntries.push(result);

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.warn(`[EdgeFunction] Field '${fieldName}': ${warning}`);
        }
      }
    }
  }

  console.log(`[EdgeFunction] Record processing complete: ${auditEntries.length} fields processed`);
  return { processedRecord, auditEntries };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRITICAL: Environment variable names are case-sensitive and MUST use standardized uppercase format
const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('SCRAPER_RAW_GPT_API')!;

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
        'Authorization': `Bearer ${Deno.env.get('SCRAPER_RAW_GPT_API')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert subsidy data extraction agent for the AgriTool platform.
Your task is to analyze unstructured raw subsidy logs from FranceAgriMer subsidy pages (in French or English), including messy web page text and attached files, and convert each subsidy record into a strictly structured JSON object conforming to the canonical schema below.

CRITICAL TITLE EXTRACTION RULES:
- ALWAYS extract the OFFICIAL program/subsidy name from the page's main title, H1 heading, or program name field
- NEVER use "Subsidy Page", "Agricultural Program", generic agency names, or placeholder text as titles
- If the official title cannot be found, set "title": null and add "missing_title" to missing_fields array
- NEVER generate, infer, or create titles from other fields like agency, sector, or description

CRITICAL: ALL array-type fields MUST be returned as valid JSON arrays, even for single values or empty cases.

Always:
- Parse and normalize all relevant information: subsidy details, eligibility, special/conditional scenarios (e.g., for JA, NI, CUMA, collective investments), objectives, eligible/ineligible actions, funding amounts (including breakdowns/ranges), application methods, required documents, evaluation criteria, reporting and compliance requirements, etc.
- Clearly flag and capture conditional logic and special eligibility cases, explicitly noting these to support downstream human review and filtering.
- If any information is ambiguous, missing, or cannot be confidently extracted, set that field to null or empty array [] for array fields.
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
- "title": Extract ONLY the official program/subsidy name from main heading/title. NEVER use "Subsidy Page", agency names, or generic terms. Set null if not found.
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
    let extractedData;
    try {
      // Remove any potential markdown formatting
      const cleanContent = extractedContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from AI extraction');
    }

    // Apply robust array enforcement with audit trail
    console.log('Applying robust array enforcement...');
    const { processedRecord, auditEntries } = processRecordArrays(extractedData);
    
    // Log audit entries
    for (const auditEntry of auditEntries) {
      console.log(`Array processing audit: ${JSON.stringify(auditEntry)}`);
    }
    
    // Log processing summary
    const methodsUsed: Record<string, number> = {};
    let totalWarnings = 0;
    for (const entry of auditEntries) {
      methodsUsed[entry.method] = (methodsUsed[entry.method] || 0) + 1;
      totalWarnings += entry.warnings.length;
    }
    
    console.log('=== ARRAY PROCESSING SUMMARY ===');
    console.log(`Fields processed: ${auditEntries.length}`);
    console.log(`Methods used: ${JSON.stringify(methodsUsed)}`);
    console.log(`Total warnings: ${totalWarnings}`);
    console.log('===============================');
    
    // Validate title quality - reject placeholder titles
    if (processedRecord.title === 'Subsidy Page' || 
        processedRecord.title === 'Agricultural Program' ||
        processedRecord.title === 'Agricultural Funding Program' ||
        (processedRecord.title && processedRecord.title.includes('FranceAgriMer') && processedRecord.title.length < 30)) {
      console.warn('Placeholder title detected, setting to null:', processedRecord.title);
      processedRecord.title = null;
      if (!processedRecord.missing_fields) processedRecord.missing_fields = [];
      if (!processedRecord.missing_fields.includes('missing_title')) {
        processedRecord.missing_fields.push('missing_title');
      }
    }

    // Validate array fields before insertion
    const validationErrors: string[] = [];
    for (const fieldName of CANONICAL_ARRAY_FIELDS) {
      if (fieldName in processedRecord) {
        const value = processedRecord[fieldName];
        if (!Array.isArray(value)) {
          validationErrors.push(`Field '${fieldName}' is not an array: ${typeof value}`);
        }
      }
    }
    
    if (validationErrors.length > 0) {
      console.error(`Array validation failed: ${JSON.stringify(validationErrors)}`);
      // Log but continue with insertion
    }
    
    // Log final payload for debugging
    console.log(`Inserting record with ${Object.keys(processedRecord).length} fields`);
    const arrayFieldSummary: Record<string, any> = {};
    for (const field of CANONICAL_ARRAY_FIELDS) {
      if (field in processedRecord) {
        const value = processedRecord[field];
        arrayFieldSummary[field] = {
          type: Array.isArray(value) ? 'array' : typeof value,
          length: Array.isArray(value) ? value.length : 'N/A'
        };
      }
    }
    console.log(`Array fields summary: ${JSON.stringify(arrayFieldSummary)}`);

    // Insert processed data
    const insertData = {
      raw_log_id,
      ...processedRecord,
      requirements_extraction_status: processedRecord.requirements_extraction_status || 'pending',
      audit: {
        extraction_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o-mini',
        content_length: contentForExtraction.length,
        array_fields_enforced: CANONICAL_ARRAY_FIELDS.filter(f => processedRecord[f] !== undefined),
        processing_methods: methodsUsed,
        total_warnings: totalWarnings
      }
    };

    const { data: newSubsidy, error: insertError } = await supabase
      .from('subsidies_structured')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion failed:', insertError);
      
      // Log detailed error information
      if (insertError.message?.toLowerCase().includes('array') || 
          insertError.message?.toLowerCase().includes('json') ||
          insertError.message?.toLowerCase().includes('type')) {
        console.error('Detected array-related insertion error. Field details:');
        for (const field of CANONICAL_ARRAY_FIELDS) {
          if (field in processedRecord) {
            const value = processedRecord[field];
            console.error(`  ${field}: ${typeof value} = ${JSON.stringify(value)}`);
          }
        }
      }
      
      throw insertError;
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
          fields_extracted: Object.keys(extractedData).length,
          array_fields_processed: auditEntries.length,
          processing_methods: methodsUsed,
          missing_fields: extractedData.missing_fields || [],
          requirements_status: extractedData.requirements_extraction_status
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