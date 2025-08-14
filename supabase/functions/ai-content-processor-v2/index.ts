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
  AI_MODEL: 'gpt-4.1-2025-04-14',
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
You are an expert AI assistant specializing in extracting structured information from government subsidy and funding documents.

Your task is to extract comprehensive information from French government subsidy pages and their attachments, focusing on these 10 categories:

## 1. CORE IDENTIFICATION
- title: Full official name 
- reference_code: Official decision/dossier/legal reference ID
- authority: Managing/issuing body (e.g., FranceAgriMer, ADEME)
- managing_agency: Specific department managing the program
- sector: Economic/industrial sectors targeted
- categories: Thematic tags (Climate Change, R&D, Innovation, Regional Development, etc.)
- funding_programme: Parent funding scheme (France 2030, FEADER, etc.)
- policy_objective: Alignment with national/EU policy goals
- call_type: Nature of funding (Appel à projets, Subvention directe, Prêt, etc.)
- status_detailed: Current status (open, closed, upcoming, suspended)

## 2. DATES
- publication_date: When officially published
- opening_date: Applications begin
- closing_date: Deadline for submissions  
- evaluation_start_date: Evaluation begins
- signature_date: Contract/agreement dates
- extended_deadlines: Any extensions
- payment_schedule: Payment phases/dates
- timeline_notes: Additional timeline info

## 3. ELIGIBILITY
- eligible_entities: Who can apply (farmers, SMEs, cooperatives, etc.)
- geographic_eligibility: Areas covered (regions, DOM, etc.)
- entity_size: micro/small/medium/large enterprises
- activity_sector_codes: Industry codes (NAF/APE)
- previous_award_restrictions: Rules for previous beneficiaries
- special_conditions: Additional requirements

## 4. FUNDING
- total_budget: Total program envelope
- funding_amount: Min/max amounts per beneficiary
- funding_rate_details: Percentage coverage, bonuses, modifiers
- duration_limits: Project duration/spending windows
- cofinancing_sources: Other required/allowed funding
- payment_modality: How payments are made
- budget_tranches: Multi-year/phase splitting

## 5. PROJECT SCOPE & OBJECTIVES
- objectives_detailed: Program aims and goals
- expected_results: Quantitative/qualitative outcomes
- impact_indicators: Measurable KPIs
- eligible_expenses_detailed: Covered costs
- ineligible_expenses: Excluded costs
- priority_themes: Internal priorities

## 6. APPLICATION PROCESS
- process_steps: Ordered application process
- application_language: Supported languages
- required_documents_detailed: Forms, annexes, certifications
- submission_method_detailed: Portal/platform details
- submission_format: Format requirements
- contact_information: Support contacts
- support_resources: FAQs, guides, webinars

## 7. EVALUATION & SELECTION
- selection_criteria: Scoring/prioritization criteria
- evaluation_committee: Evaluation body
- evaluation_phases: Multiple rounds description
- conflict_of_interest_notes: Conflict rules
- decision_publication_method: Results publication

## 8. DOCUMENTS & ANNEXES
- regulatory_references: Laws, decrees, EU regulations
- verbatim_blocks: Raw content preserving formatting
- forms_detected: Application forms identified
- forms_recreated: Digital form recreation data

## 9. META & LANGUAGE
- content_hash: Content change detection
- related_programmes: Similar/linked schemes
- cross_funding_links: Interaction with other funding

## 10. COMPLIANCE & TRANSPARENCY
- beneficiary_reporting_requirements: Post-funding obligations
- compliance_audit_mechanisms: Audit procedures
- sanctions_for_non_compliance: Penalties
- transparency_notes: Publicity obligations
- previous_recipients_list: Past beneficiaries
- procurement_obligations: Public procurement rules
- environmental_social_safeguards: ESG conditions
- additional_support_mechanisms: Related advisory support

**IMPORTANT INSTRUCTIONS:**
1. Extract as much information as possible from the provided content
2. If information is missing from the main page, note which documents might contain it
3. Use NULL for missing information, don't make up data
4. Provide confidence scores for extracted information
5. Identify potential application forms in attached documents
6. Return valid JSON with all extracted fields

Return the extracted information as a JSON object with all the fields listed above.
`;

// Data sanitization functions
function sanitizeNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    // Remove common currency symbols and formatting
    let cleaned = value
      .replace(/[€$£¥₹]/g, '') // Remove currency symbols
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\(.*?\)/g, '') // Remove parenthetical content like "(plafond d'aide publique...)"
      .replace(/[^\d\s,.-]/g, '') // Keep only digits, spaces, commas, dots, hyphens
      .trim();
    
    // Handle European number format (space/dot as thousands separator, comma as decimal)
    if (cleaned.includes(',') && cleaned.includes(' ')) {
      // Example: "100 000,50" or "1 500,00"
      cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
    } else if (cleaned.includes(' ') && !cleaned.includes(',')) {
      // Example: "100 000" 
      cleaned = cleaned.replace(/\s/g, '');
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Example: "1000,50" - European decimal format
      cleaned = cleaned.replace(',', '.');
    }
    
    // Extract first valid number
    const numberMatch = cleaned.match(/^\d+(?:\.\d+)?/);
    if (numberMatch) {
      const parsed = parseFloat(numberMatch[0]);
      return isNaN(parsed) ? null : parsed;
    }
  }
  
  return null;
}

function sanitizeStringValue(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ') || null;
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value).trim() || null;
}

function sanitizeDateValue(value: any): string | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    // Try to parse common date formats
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/    // DD-MM-YYYY
    ];
    
    for (const pattern of datePatterns) {
      const match = value.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
  }
  
  return null;
}

function sanitizeArrayValue(value: any): string[] {
  if (!value) return [];
  
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
  }
  
  if (typeof value === 'string') {
    // Split on common delimiters
    return value.split(/[,;|]/)
      .map(v => v.trim())
      .filter(Boolean);
  }
  
  return [String(value).trim()].filter(Boolean);
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

    const messages = [
      {
        role: 'system',
        content: COMPREHENSIVE_EXTRACTION_PROMPT + "\n\nYou MUST return only valid JSON. Do not include any commentary or markdown formatting."
      },
      {
        role: 'user',
        content: `Extract comprehensive subsidy information from this content:\n\n${content}\n\nAttached documents available: ${attachments.map(a => a.name).join(', ')}`
      }
    ];

    console.log('🔗 Making OpenAI API call...');
    console.log(`🔑 API Key available: ${openAIApiKey ? 'Yes' : 'No'}`);
    console.log(`🔑 API Key preview: ${openAIApiKey ? openAIApiKey.substring(0, 10) + '...' : 'N/A'}`);
    console.log('🧩 Payload metrics:', {
      systemChars: COMPREHENSIVE_EXTRACTION_PROMPT.length,
      userChars: content.length,
      attachmentsCount: attachments.length,
      model
    });

    const isLegacy = /gpt-4o/i.test(model);
    let endpointUsed = isLegacy ? 'chat.completions' : 'responses';

    // Prepare payloads with response format enforcement
    const chatPayload: Record<string, any> = isLegacy
      ? { model, messages, temperature: CONFIG.TEMPERATURE, max_tokens: CONFIG.MAX_TOKENS, response_format: CONFIG.JSON_RESPONSE_FORMAT }
      : { model, messages, max_completion_tokens: CONFIG.MAX_TOKENS, response_format: CONFIG.JSON_RESPONSE_FORMAT };

    const responsesPayload: Record<string, any> = { model, input: messages, max_completion_tokens: CONFIG.MAX_TOKENS };

    console.log('🧪 Model payload configuration:', { model, isLegacy, endpointPreferred: endpointUsed, chatKeys: Object.keys(chatPayload), responsesKeys: Object.keys(responsesPayload) });

    // Execute request with retry and fallback
    const makeRequest = async (): Promise<Response> => {
      let response: Response;
      if (!isLegacy) {
        response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(responsesPayload),
        });

        if (!response.ok) {
          const errTxt = await response.text();
          console.error('⚠️ Responses endpoint failed, falling back to chat.completions:', errTxt?.slice(0, 500));
          endpointUsed = 'chat.completions';
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chatPayload),
          });
        }
      } else {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatPayload),
        });
      }
      return response;
    };

    const response = await retryWithBackoff(makeRequest);

    console.log(`🌐 OpenAI Response status [${endpointUsed}]: ${response.status}`);
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
            prompt: `comprehensive_extraction_v2_${endpointUsed}`
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

    console.log('📥 OpenAI Response received');
    console.log('🔍 Response structural hints:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasOutput: !!data.output,
      hasOutputText: !!data.output_text
    });

    // Normalize to a single text string
    let extractedText: string | undefined = data?.output_text;
    if (!extractedText && Array.isArray(data?.output)) {
      try {
        extractedText = data.output
          .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
          .map((c: any) => c?.text || c?.output_text || '')
          .filter(Boolean)
          .join('\n');
      } catch (_) { /* ignore */ }
    }
    if (!extractedText && data?.choices?.[0]?.message?.content) {
      extractedText = data.choices[0].message.content;
    }

    if (!extractedText) {
      console.error('❌ No usable text in OpenAI response:', data);
      throw new Error('No usable text in OpenAI response');
    }

    console.log(`📄 Raw AI response length: ${extractedText.length} characters`);
    console.log(`📄 Raw AI response preview: ${extractedText.substring(0, 300)}...`);
    
    // Parse JSON response with improved parser
    console.log('🔍 Parsing JSON response...');
    const parsedData = parseJSONResponse(extractedText);
    
    console.log('✅ JSON parsed successfully');
    console.log(`📊 Parsed data keys: ${Object.keys(parsedData).join(', ')}`);
    
    // Validate extracted data
    const validation = validateSubsidyData(parsedData);
    console.log(`🔍 Validation results: ${validation.isValid ? 'VALID' : 'INVALID'}`);
    
    if (validation.errors.length > 0) {
      console.warn('⚠️ Validation errors:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:', validation.warnings);
    }
    
    console.log(`📊 Data preview:`, {
      title: validation.data.title,
      authority: validation.data.authority,
      totalFields: Object.keys(validation.data).length,
      validationScore: validation.isValid ? 1.0 : 0.5
    });
    
    // Return validated data with metadata
    return {
      ...validation.data,
      _validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        rawFieldCount: Object.keys(parsedData).length,
        validatedFieldCount: Object.keys(validation.data).length
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id, page_ids, test_mode = false, model = CONFIG.AI_MODEL } = await req.json();
    
    console.log(`🚀 V2 Comprehensive AI Processing started - Run: ${run_id}`);
    
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

            if (extractedData && extractedData.title) {
              console.log(`✅ Extracted data from: ${page.source_url}`);
              
              // Save to subsidies_structured table with sanitized data
              const subsidyData = {
                run_id,
                url: page.source_url,
                title: sanitizeStringValue(extractedData.title) || 'Untitled Subsidy',
                description: sanitizeStringValue(extractedData.description),
                eligibility: sanitizeStringValue(extractedData.eligibility_criteria || extractedData.eligibility),
                deadline: sanitizeDateValue(extractedData.closing_date || extractedData.deadline),
                agency: sanitizeStringValue(extractedData.authority || extractedData.managing_agency) || 'Unknown Agency',
                region: sanitizeStringValue(extractedData.region || extractedData.geographic_eligibility),
                sector: sanitizeStringValue(extractedData.sector),
                funding_type: sanitizeStringValue(extractedData.funding_type || extractedData.call_type) || 'Grant',
                total_budget: sanitizeNumericValue(extractedData.total_budget),
                funding_amount: sanitizeStringValue(extractedData.funding_amount),
                raw_data: extractedData,
                confidence_score: extractedData._validation?.isValid ? 0.9 : 0.6,
                language: 'fr',
                extracted_documents: sanitizeArrayValue(extractedData.forms_detected),
                document_count: Array.isArray(extractedData.forms_detected) ? extractedData.forms_detected.length : 0,
                extraction_timestamp: new Date().toISOString(),
                ai_model: model,
                version: 'v2_comprehensive_validated'
              };
              
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
              console.log(`⚠️ No valid data extracted from: ${page.source_url}`);
              return { success: false, url: page.source_url, reason: 'No valid data extracted' };
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
      version: 'v2_comprehensive'
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