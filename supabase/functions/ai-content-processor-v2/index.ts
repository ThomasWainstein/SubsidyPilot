import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Configuration Management
const CONFIG = {
  AI_MODEL: 'ft:gpt-4o-mini-2024-07-18:personal:subsidy-extractor-v1:C4Z0In47',
  CONCURRENT_LIMIT: 3,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.2,
  JSON_RESPONSE_FORMAT: { type: "json_object" }
};

// Data Validation Schema
const SUBSIDY_SCHEMA = {
  required: ['title', 'authority'],
  optional: ['description', 'eligibility', 'region', 'sector', 'funding_type', 'deadline'],
  
  validators: {
    title: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim().length < 3) {
        throw new Error('Title must be a string with at least 3 characters');
      }
      return value.trim();
    },
    
    authority: (value: any) => {
      if (!value || typeof value !== 'string') {
        throw new Error('Authority is required and must be a string');
      }
      return value.trim();
    },
    
    deadline: (value: any) => {
      if (!value) return null;
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Deadline must be a valid date');
      }
      
      // Warn about past deadlines
      if (date < new Date()) {
        console.warn(`⚠️ Deadline is in the past: ${value}`);
      }
      
      return date.toISOString().split('T')[0];
    },
    
    funding_type: (value: any) => {
      const validTypes = ['Grant', 'Loan', 'Subsidy', 'Tax Credit', 'Other'];
      if (value && !validTypes.includes(value)) {
        console.warn(`⚠️ Unknown funding type: ${value}`);
      }
      return value || 'Grant';
    }
  }
};

// Data Validation Function
function validateSubsidyData(extractedData: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validated: any = {};
  
  // Check required fields
  for (const field of SUBSIDY_SCHEMA.required) {
    try {
      const validator = SUBSIDY_SCHEMA.validators[field as keyof typeof SUBSIDY_SCHEMA.validators];
      const value = extractedData[field];
      
      if (validator) {
        validated[field] = validator(value);
      } else {
        if (!value) {
          errors.push(`Required field '${field}' is missing`);
        } else {
          validated[field] = value;
        }
      }
    } catch (error: any) {
      errors.push(`Validation error for '${field}': ${error.message}`);
    }
  }
  
  // Process optional fields
  for (const field of SUBSIDY_SCHEMA.optional) {
    try {
      const validator = SUBSIDY_SCHEMA.validators[field as keyof typeof SUBSIDY_SCHEMA.validators];
      const value = extractedData[field];
      
      if (value) {
        if (validator) {
          validated[field] = validator(value);
        } else {
          validated[field] = sanitizeStringValue(value);
        }
      }
    } catch (error: any) {
      warnings.push(`Validation warning for '${field}': ${error.message}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: validated
  };
}

// Improved JSON Parser
function parseJSONResponse(responseText: string): any {
  try {
    // Remove markdown code blocks
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find JSON boundaries
    const jsonStart = cleanText.indexOf('{');
    let jsonEnd = cleanText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1) {
      throw new Error('No JSON object found in response');
    }
    
    if (jsonEnd <= jsonStart) {
      // Try to fix missing closing brackets
      const openBrackets = (cleanText.match(/\{/g) || []).length;
      const closeBrackets = (cleanText.match(/\}/g) || []).length;
      const missingBrackets = openBrackets - closeBrackets;
      
      if (missingBrackets > 0) {
        console.log(`🔧 Adding ${missingBrackets} missing closing brackets`);
        cleanText += '}' .repeat(missingBrackets);
        jsonEnd = cleanText.lastIndexOf('}') + 1;
      }
    }
    
    const jsonText = cleanText.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonText);
    
  } catch (error: any) {
    console.error('❌ JSON parsing failed:', error.message);
    console.error('📄 Response text preview:', responseText.substring(0, 500));
    throw new Error(`JSON parsing error: ${error.message}`);
  }
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES,
  baseDelay: number = CONFIG.RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message.includes('401') || error.message.includes('403')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`⏳ Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

const COMPREHENSIVE_EXTRACTION_PROMPT = `
You are an expert AI assistant specializing in extracting structured information from French government subsidy and funding documents.

CRITICAL: You MUST return ONLY a JSON object with the exact nested structure shown below. Do not include any commentary, explanations, or markdown formatting.

Return this exact structure:

{
  "core_identification": {
    "title": "Full official subsidy name",
    "authority": "Managing agency (e.g., FranceAgriMer, ADEME)",
    "reference_code": "Official reference number",
    "sector": "Economic/industrial sectors targeted",
    "funding_programme": "Parent funding scheme",
    "call_type": "Nature of funding (Appel à projets, Subvention directe, etc.)",
    "status_detailed": "Current status (open, closed, upcoming)"
  },
  "dates": {
    "publication_date": "YYYY-MM-DD format",
    "opening_date": "YYYY-MM-DD format", 
    "closing_date": "YYYY-MM-DD format",
    "application_deadline": "YYYY-MM-DD format"
  },
  "eligibility": {
    "eligible_entities": "Who can apply (farmers, SMEs, etc.)",
    "geographic_eligibility": "Areas covered (regions, DOM, etc.)",
    "entity_size": "Enterprise size requirements",
    "special_conditions": "Additional requirements"
  },
  "funding": {
    "total_budget": "Total program envelope",
    "funding_amount": "Min/max amounts per beneficiary", 
    "funding_rate_details": "Percentage coverage, bonuses",
    "funding_type": "Grant/Loan/Subsidy/Tax Credit"
  },
  "project_scope_objectives": {
    "objectives_detailed": "Program aims and goals",
    "eligible_expenses_detailed": "Covered costs",
    "ineligible_expenses": "Excluded costs"
  },
  "application_process": {
    "required_documents_detailed": "Forms, annexes, certifications",
    "submission_method_detailed": "Portal/platform details",
    "contact_information": "Support contacts"
  },
  "forms_detected": ["List of application form names found in attachments"]
}

EXAMPLE for French subsidy:
{
  "core_identification": {
    "title": "Aide à l'investissement en faveur de la compétitivité des entreprises agroalimentaires",
    "authority": "FranceAgriMer",
    "reference_code": "INTV-AGRAL-2024-01",
    "sector": "Agroalimentaire",
    "funding_programme": "France 2030",
    "call_type": "Appel à projets",
    "status_detailed": "open"
  },
  "dates": {
    "publication_date": "2024-01-15",
    "opening_date": "2024-02-01",
    "closing_date": "2024-06-30",
    "application_deadline": "2024-06-30"
  },
  "eligibility": {
    "eligible_entities": "PME du secteur agroalimentaire",
    "geographic_eligibility": "France métropolitaine et DOM-TOM",
    "entity_size": "Micro, petites et moyennes entreprises",
    "special_conditions": "Entreprise créée depuis plus de 2 ans"
  },
  "funding": {
    "total_budget": "50000000",
    "funding_amount": "Minimum 50000 euros, Maximum 2000000 euros",
    "funding_rate_details": "40% des dépenses éligibles, 50% pour les jeunes entreprises",
    "funding_type": "Grant"
  },
  "project_scope_objectives": {
    "objectives_detailed": "Modernisation des outils de production, amélioration de la compétitivité",
    "eligible_expenses_detailed": "Équipements, logiciels, formation du personnel",
    "ineligible_expenses": "Fonds de roulement, TVA récupérable"
  },
  "application_process": {
    "required_documents_detailed": "Formulaire de demande, devis détaillés, plan de financement",
    "submission_method_detailed": "Dépôt électronique via le portail FranceAgriMer",
    "contact_information": "contact.aides@franceagrimer.gouv.fr"
  },
  "forms_detected": ["formulaire_demande_aide.pdf", "annexe_plan_financement.xlsx"]
}

Instructions:
- Extract information from both the main page content AND attachment contents provided
- Use NULL for missing information - do not invent data
- Dates must be in YYYY-MM-DD format
- Numbers should be extracted as strings (preserve original formatting)
- Return ONLY the JSON object, no other text
`;

// Enhanced attachment processing function
async function processAttachments(attachments: any[]): Promise<string> {
  if (!attachments || attachments.length === 0) {
    return "No attached documents provided.";
  }
  
  let attachmentContent = "\n\n=== ATTACHED DOCUMENTS CONTENT ===\n";
  
  for (const attachment of attachments) {
    attachmentContent += `\n--- DOCUMENT: ${attachment.name} ---\n`;
    
    // If attachment has text content, include it
    if (attachment.text_content) {
      attachmentContent += attachment.text_content.substring(0, 8000); // Limit per document
    } else if (attachment.extracted_text) {
      attachmentContent += attachment.extracted_text.substring(0, 8000);
    } else {
      attachmentContent += `[Document detected but text content not available: ${attachment.name}]`;
    }
    
    attachmentContent += "\n--- END DOCUMENT ---\n";
  }
  
  return attachmentContent;
}

// Enhanced attachment processing function (duplicate function body removed)

// Data structure fallback function - handles both nested and flat JSON responses
function extractDataWithFallback(extractedData: any): any {
  console.log('🔍 VALIDATION - Data structure check:', {
    hasNestedStructure: !!(extractedData.core_identification || extractedData.dates),
    topLevelKeys: Object.keys(extractedData),
    coreTitle: extractedData.core_identification?.title || extractedData.title,
    hasAnyTitle: !!(extractedData.core_identification?.title || extractedData.title),
    hasAnyAuthority: !!(extractedData.core_identification?.authority || extractedData.authority)
  });

  // Check if we have the expected nested structure
  const hasNestedStructure = extractedData.core_identification || 
                            extractedData.dates || 
                            extractedData.eligibility;

  if (hasNestedStructure) {
    console.log('✅ Using nested data structure');
    return {
      core_identification: extractedData.core_identification || {},
      dates: extractedData.dates || {},
      eligibility: extractedData.eligibility || {},
      funding: extractedData.funding || {},
      project_scope_objectives: extractedData.project_scope_objectives || {},
      application_process: extractedData.application_process || {},
      evaluation_selection: extractedData.evaluation_selection || {},
      documents_annexes: extractedData.documents_annexes || {},
      meta_language: extractedData.meta_language || {},
      compliance_transparency: extractedData.compliance_transparency || {}
    };
  } else {
    console.log('⚠️ Falling back to flat data structure mapping');
    // Map flat structure to nested structure
    return {
      core_identification: {
        title: extractedData.title,
        authority: extractedData.authority,
        reference_code: extractedData.reference_code,
        managing_agency: extractedData.managing_agency,
        sector: extractedData.sector,
        categories: extractedData.categories,
        funding_programme: extractedData.funding_programme,
        policy_objective: extractedData.policy_objective,
        call_type: extractedData.call_type,
        status_detailed: extractedData.status_detailed
      },
      dates: {
        publication_date: extractedData.publication_date,
        opening_date: extractedData.opening_date,
        closing_date: extractedData.closing_date,
        evaluation_start_date: extractedData.evaluation_start_date,
        signature_date: extractedData.signature_date,
        extended_deadlines: extractedData.extended_deadlines,
        payment_schedule: extractedData.payment_schedule,
        timeline_notes: extractedData.timeline_notes
      },
      eligibility: {
        eligible_entities: extractedData.eligible_entities,
        geographic_eligibility: extractedData.geographic_eligibility,
        entity_size: extractedData.entity_size,
        activity_sector_codes: extractedData.activity_sector_codes,
        previous_award_restrictions: extractedData.previous_award_restrictions,
        special_conditions: extractedData.special_conditions
      },
      funding: {
        total_budget: extractedData.total_budget,
        funding_amount: extractedData.funding_amount,
        funding_rate_details: extractedData.funding_rate_details,
        duration_limits: extractedData.duration_limits,
        cofinancing_sources: extractedData.cofinancing_sources,
        payment_modality: extractedData.payment_modality,
        budget_tranches: extractedData.budget_tranches
      },
      project_scope_objectives: {
        objectives_detailed: extractedData.objectives_detailed,
        expected_results: extractedData.expected_results,
        impact_indicators: extractedData.impact_indicators,
        eligible_expenses_detailed: extractedData.eligible_expenses_detailed,
        ineligible_expenses: extractedData.ineligible_expenses,
        priority_themes: extractedData.priority_themes
      },
      application_process: {
        process_steps: extractedData.process_steps,
        application_language: extractedData.application_language,
        required_documents_detailed: extractedData.required_documents_detailed,
        submission_method_detailed: extractedData.submission_method_detailed,
        submission_format: extractedData.submission_format,
        contact_information: extractedData.contact_information,
        support_resources: extractedData.support_resources
      },
      evaluation_selection: extractedData.evaluation_selection || {},
      documents_annexes: extractedData.documents_annexes || {},
      meta_language: extractedData.meta_language || {},
      compliance_transparency: extractedData.compliance_transparency || {}
    };
  }
}

// Schema fallback function - maps flat structure to nested if needed
function normalizeExtractedData(data: any): any {
  // If already has nested structure, return as-is
  if (data.core_identification) {
    return data;
  }
  
  console.log('🔄 Converting flat structure to nested schema');
  
  // Map flat structure to nested
  return {
    core_identification: {
      title: data.title,
      authority: data.authority,
      reference_code: data.reference_code,
      sector: data.sector,
      funding_programme: data.funding_programme,
      call_type: data.call_type || data.funding_type,
      status_detailed: data.status_detailed || data.status
    },
    dates: {
      publication_date: data.publication_date,
      opening_date: data.opening_date,
      closing_date: data.closing_date || data.deadline,
      application_deadline: data.application_deadline || data.deadline
    },
    eligibility: {
      eligible_entities: data.eligible_entities || data.eligibility,
      geographic_eligibility: data.geographic_eligibility || data.region,
      entity_size: data.entity_size,
      special_conditions: data.special_conditions
    },
    funding: {
      total_budget: data.total_budget,
      funding_amount: data.funding_amount,
      funding_rate_details: data.funding_rate_details,
      funding_type: data.funding_type
    },
    project_scope_objectives: {
      objectives_detailed: data.objectives_detailed || data.description,
      eligible_expenses_detailed: data.eligible_expenses_detailed,
      ineligible_expenses: data.ineligible_expenses
    },
    application_process: {
      required_documents_detailed: data.required_documents_detailed,
      submission_method_detailed: data.submission_method_detailed,
      contact_information: data.contact_information
    },
    forms_detected: data.forms_detected || []
  };
}

// Utility functions for data sanitization
function sanitizeStringValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function sanitizeDateValue(value: any): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function sanitizeNumericValue(value: any): string | null {
  if (!value) return null;
  const str = String(value).replace(/[^\d.,]/g, '');
  return str.length > 0 ? str : null;
}

function sanitizeArrayValue(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return [value.trim()].filter(Boolean);
  return [];
}

async function extractFromContent(
  content: string,
  attachments: any[] = [],
  model: string = CONFIG.AI_MODEL,
  ctx?: { run_id?: string; page_id?: string; source_url?: string; content_preview?: string }
): Promise<any> {
  try {
    console.log('🤖 Starting AI extraction...');
    console.log(`📝 Content preview: ${content.substring(0, 200)}...`);
    console.log(`📎 Attachments: ${attachments.length} files`);

    // Process attachments to include actual content
    const attachmentContent = await processAttachments(attachments);

    const messages = [
      {
        role: 'system',
        content: COMPREHENSIVE_EXTRACTION_PROMPT
      },
      {
        role: 'user',
        content: `Extract comprehensive subsidy information from this content:\n\n${content}${attachmentContent}`
      }
    ];


    // Simplified to use only chat/completions for stability
    console.log('🔗 Making OpenAI API call to chat/completions...');
    console.log(`🔑 API Key available: ${openAIApiKey ? 'Yes' : 'No'}`);
    console.log(`🔑 API Key preview: ${openAIApiKey ? openAIApiKey.substring(0, 10) + '...' : 'N/A'}`);
    console.log('🧩 Payload metrics:', {
      systemChars: COMPREHENSIVE_EXTRACTION_PROMPT.length,
      userChars: content.length + attachmentContent.length,
      attachmentsCount: attachments.length,
      model,
      totalInputSize: content.length + attachmentContent.length + COMPREHENSIVE_EXTRACTION_PROMPT.length
    });

    // Use only chat/completions for consistency and stability
    const payload = { 
      model, 
      messages, 
      temperature: 0, // Deterministic for extraction
      max_tokens: CONFIG.MAX_TOKENS,
      response_format: CONFIG.JSON_RESPONSE_FORMAT
    };

    // For newer models (GPT-4.1+), use max_completion_tokens instead of max_tokens
    if (model.includes('gpt-4.1') || model.includes('gpt-5') || model.includes('o3') || model.includes('o4')) {
      delete payload.temperature; // Not supported in newer models
      delete payload.max_tokens;
      payload.max_completion_tokens = CONFIG.MAX_TOKENS;
    }

    // Execute request with retry
    const makeRequest = async (): Promise<Response> => {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    };

    const response = await retryWithBackoff(makeRequest);

    console.log(`🌐 OpenAI Response status: ${response.status}`);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log(`🌐 OpenAI Response headers:`, responseHeaders);
    
    // Log important headers for debugging
    if (responseHeaders['x-request-id']) {
      console.log(`🔍 Request ID: ${responseHeaders['x-request-id']}`);
    }
    if (responseHeaders['x-ratelimit-remaining-requests']) {
      console.log(`📊 Rate Limit - Remaining Requests: ${responseHeaders['x-ratelimit-remaining-requests']}`);
    }
    if (responseHeaders['x-ratelimit-remaining-tokens']) {
      console.log(`📊 Rate Limit - Remaining Tokens: ${responseHeaders['x-ratelimit-remaining-tokens']}`);
    }

    const rawText = await response.text();

    // Persist raw response for diagnostics (even on errors)
    try {
      if (ctx?.run_id && ctx?.page_id) {
        const { error: rawSaveErr } = await supabase
          .from('ai_raw_extractions')
          .insert({
            run_id: ctx.run_id,
            page_id: ctx.page_id,
            raw_output: rawText,
            content_preview: ctx.content_preview || content.substring(0, 500),
            model,
            prompt: `comprehensive_extraction_v2_chat_completions`
          });
        if (rawSaveErr) console.error('Failed to save raw OpenAI response:', rawSaveErr);
      }
    } catch (e) {
      console.error('Failed to log raw OpenAI response:', e);
    }

    if (!response.ok) {
      console.error(`❌ OpenAI API error ${response.status}:`, rawText?.slice(0, 800));
      throw new Error(`OpenAI API error: ${response.status} - ${rawText?.slice(0, 800)}`);
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ Failed to parse OpenAI JSON body:', e);
      throw new Error('Failed to parse OpenAI JSON body');
    }

    
    // Extract content from chat/completions response
    const extractedText = data?.choices?.[0]?.message?.content;

    if (!extractedText) {
      console.error('❌ No content in OpenAI response:', data);
      throw new Error('No content in OpenAI response');
    }

    console.log(`📄 Raw AI response length: ${extractedText.length} characters`);
    console.log(`📄 Raw AI response preview: ${extractedText.substring(0, 300)}...`);
    
    // Parse JSON response with improved parser
    console.log('🔍 Parsing JSON response...');
    const parsedData = parseJSONResponse(extractedText);
    
    // Use the enhanced fallback function instead of simple normalization
    const normalizedData = extractDataWithFallback(parsedData);
    
    console.log('✅ JSON parsed and normalized successfully');
    console.log(`📊 Enhanced data structure check:`, {
      hasCore: !!normalizedData.core_identification,
      hasDates: !!normalizedData.dates,
      hasEligibility: !!normalizedData.eligibility,
      hasFunding: !!normalizedData.funding,
      title: normalizedData.core_identification?.title,
      authority: normalizedData.core_identification?.authority,
      dataStructureSource: normalizedData.core_identification ? 'nested' : 'flat_mapped'
    });
    
    // Validate extracted data
    const validation = validateSubsidyData(normalizedData);
    console.log(`🔍 Validation results: ${validation.isValid ? 'VALID' : 'INVALID'}`);
    
    if (validation.errors.length > 0) {
      console.warn('⚠️ Validation errors:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:', validation.warnings);
    }
    
    // Return normalized data with validation metadata
    return {
      ...normalizedData,
      _validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        rawFieldCount: Object.keys(parsedData).length,
        normalizedFieldCount: Object.keys(normalizedData).length
      }
    };

  } catch (error) {
    console.error('💥 EXTRACTION ERROR:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

serve(async (req) => {
  let run_id: string; // Declare here to fix scope issue
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    run_id = requestData.run_id; // Assign here
    const { page_ids, test_mode = false, model = CONFIG.AI_MODEL } = requestData;
    
    console.log(`🚀 V2 Comprehensive AI Processing started - Run: ${run_id}`);
    console.log(`🤖 Using AI Model: ${model}`);
    console.log(`📊 Request Config:`, { model, test_mode, page_count: page_ids?.length });
    
    // Create run tracking record in pipeline_runs (required by FK)
    const { error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        id: run_id,
        status: 'running',
        stage: 'ai_processing',
        progress: 0,
        config: { model },
        started_at: new Date().toISOString(),
        version: 2
      });
    
    
    
    if (runError) {
      console.error('❌ Failed to create run record:', runError);
    }
    
    // Get pages to process
    let query = supabase
      .from('raw_scraped_pages')
      .select('*');
    
    if (page_ids && page_ids.length > 0) {
      query = query.in('id', page_ids);
    } else if (test_mode) {
      // In test mode, process ALL pages (not just recent ones)
      query = query.order('created_at', { ascending: false });
    } else {
      // For regular runs, process recent unprocessed pages
      query = query
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(50);
    }
    
    const { data: pages, error: pagesError } = await query;
    
    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pages found to process',
        pages_processed: 0,
        subsidies_created: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📄 Processing ${pages.length} pages with concurrency limit: ${CONFIG.CONCURRENT_LIMIT}`);

    let subsidiesCreated = 0;
    let pagesProcessed = 0;

    // Process pages in batches with concurrency control
    const processBatch = async (batch: any[]) => {
      return Promise.allSettled(
        batch.map(async (page) => {
          console.log(`🔍 Processing page: ${page.source_url}`);
          
          // Get content - prefer combined markdown, fallback to raw text
          const content = page.combined_content_markdown || page.raw_text || '';
          const attachments = page.attachments_jsonb || [];
          
          if (content.length < 100) {
            console.log(`⚠️ Skipping page with insufficient content: ${page.source_url}`);
            return { success: false, url: page.source_url, reason: 'Insufficient content' };
          }

          try {
            console.log(`🧠 Starting AI extraction for: ${page.source_url}`);
            console.log(`📝 Content length: ${content.length} characters`);
            
            const extractedData = await extractFromContent(
              content,
              attachments,
              model,
              { 
                run_id,
                page_id: page.id,
                source_url: page.source_url,
                content_preview: content.substring(0, 500)
              }
            );

            if (extractedData) {
              console.log(`🔍 CRITICAL DEBUG - Extracted data structure for ${page.source_url}:`, {
                hasData: !!extractedData,
                hasCore: !!extractedData.core_identification,
                coreTitle: extractedData.core_identification?.title,
                topLevelTitle: extractedData.title,
                topLevelKeys: Object.keys(extractedData),
                validationIsValid: extractedData._validation?.isValid,
                validationErrors: extractedData._validation?.errors
              });
              
              // Enhanced validation - check both nested and top-level title
              const hasValidTitle = extractedData.core_identification?.title || extractedData.title;
              
              if (hasValidTitle) {
                console.log(`✅ Extracted data from: ${page.source_url} - Title: ${hasValidTitle}`);
                
                // Extract data from nested structure (already handled by fallback function)
                const coreData = extractedData.core_identification || {};
                const datesData = extractedData.dates || {};
                const eligibilityData = extractedData.eligibility || {};
                const fundingData = extractedData.funding || {};
                const projectData = extractedData.project_scope_objectives || {};
                const processData = extractedData.application_process || {};
                
                // Save to subsidies_structured table with sanitized data
                const subsidyData = {
                  run_id,
                  url: page.source_url,
                  title: sanitizeStringValue(coreData.title || extractedData.title) || 'Untitled Subsidy',
                  description: sanitizeStringValue(projectData.objectives_detailed || coreData.policy_objective || extractedData.description),
                  eligibility: sanitizeStringValue([
                    eligibilityData.eligible_entities || extractedData.eligible_entities,
                    eligibilityData.geographic_eligibility || extractedData.geographic_eligibility, 
                    eligibilityData.special_conditions || extractedData.special_conditions
                  ].filter(Boolean).join('. ')),
                  deadline: sanitizeDateValue(datesData.closing_date || datesData.application_deadline || extractedData.deadline),
                  agency: sanitizeStringValue(coreData.authority || extractedData.authority) || 'Unknown Agency',
                  region: sanitizeStringValue(eligibilityData.geographic_eligibility || extractedData.region),
                  sector: sanitizeStringValue(coreData.sector || extractedData.sector),
                  funding_type: sanitizeStringValue(fundingData.funding_type || coreData.call_type || extractedData.funding_type) || 'Grant',
                  total_budget: sanitizeNumericValue(fundingData.total_budget || extractedData.total_budget),
                  funding_amount: sanitizeStringValue(fundingData.funding_amount || extractedData.funding_amount),
                  raw_data: extractedData,
                  confidence_score: extractedData._validation?.isValid ? 0.9 : 0.6,
                  language: 'fr',
                  extracted_documents: sanitizeArrayValue(extractedData.forms_detected || extractedData.documents),
                  document_count: Array.isArray(extractedData.forms_detected || extractedData.documents) ? (extractedData.forms_detected || extractedData.documents).length : 0,
                  extraction_timestamp: new Date().toISOString(),
                  ai_model: model,
                  version: 'v2_comprehensive_enhanced'
                };
                
                console.log(`💾 Attempting to save subsidy data for: ${page.source_url}`, {
                  title: subsidyData.title,
                  agency: subsidyData.agency,
                  hasRequiredFields: !!(subsidyData.title && subsidyData.agency)
                });
                
                const { error: insertError } = await supabase
                  .from('subsidies_structured')
                  .insert(subsidyData);
                
                if (insertError) {
                  console.error(`❌ Failed to save subsidy data for ${page.source_url}:`, insertError);
                  throw insertError;
                } else {
                  console.log(`💾 Saved subsidy data for: ${page.source_url}`);
                  return { success: true, url: page.source_url };
                }
              } else {
                console.log(`⚠️ No valid title found in extracted data from: ${page.source_url}`, {
                  extractedDataKeys: Object.keys(extractedData),
                  coreIdentification: extractedData.core_identification,
                  topLevelTitle: extractedData.title,
                  validationErrors: extractedData._validation?.errors
                });
                return { success: false, url: page.source_url, reason: 'No valid title found in extracted data' };
              }
            }
            
          } catch (error: any) {
            console.error(`❌ Failed to extract data from: ${page.source_url}`);
            console.error('💥 EXTRACTION ERROR:', error);
            console.error('💥 Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
            
            // Log error to database
            try {
              await supabase
                .from('ai_content_errors')
                .insert({
                  run_id,
                  page_id: page.id,
                  source_url: page.source_url,
                  stage: 'extraction',
                  message: error.message,
                  snippet: content?.substring(0, 500)
                });
            } catch (logError) {
              console.error('Failed to log extraction error:', logError);
            }
            
            throw error;
          }
        })
      );
    };

    // Process in batches
    const batches = [];
    for (let i = 0; i < pages.length; i += CONFIG.CONCURRENT_LIMIT) {
      batches.push(pages.slice(i, i + CONFIG.CONCURRENT_LIMIT));
    }

    for (const batch of batches) {
      console.log(`🔄 Processing batch of ${batch.length} pages...`);
      const results = await processBatch(batch);
      
      // Count results
      for (const result of results) {
        pagesProcessed++;
        if (result.status === 'fulfilled' && result.value?.success) {
          subsidiesCreated++;
        }
      }
      
      console.log(`📊 Batch complete: ${pagesProcessed}/${pages.length} processed, ${subsidiesCreated} subsidies created`);
    }

    // Update run completion status
    const { error: updateError } = await supabase
      .from('pipeline_runs')
      .update({
        status: 'completed',
        stage: 'done',
        progress: 100,
        ended_at: new Date().toISOString(),
        stats: {
          pages_seen: pages.length,
          pages_eligible: pages.length,
          pages_processed: pagesProcessed,
          subs_created: subsidiesCreated
        }
      })
      .eq('id', run_id);

    

    if (updateError) {
      console.error('❌ Failed to update run record:', updateError);
    }

    const result = {
      success: true,
      run_id,
      model: model,
      pages_processed: pagesProcessed,
      subsidies_created: subsidiesCreated,
      version: 'v2_comprehensive_enhanced'
    };

    console.log(`🎉 V2 Processing complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('V2 AI processor error:', error);
    
    // Update run status to failed
    if (typeof run_id !== 'undefined') {
      const { error: updateError } = await supabase
        .from('pipeline_runs')
        .update({
          status: 'failed',
          stage: 'error',
          ended_at: new Date().toISOString(),
          reason: error.message
        })
        .eq('id', run_id);
      
      if (updateError) {
        console.error('Failed to update failed run status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      version: 'v2_comprehensive_enhanced'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});