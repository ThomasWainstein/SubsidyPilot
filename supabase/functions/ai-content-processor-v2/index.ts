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

// Latest model for best extraction quality
const AI_MODEL = 'gpt-4.1-2025-04-14';

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

async function extractFromContent(content: string, attachments: any[] = []): Promise<any> {
  try {
    console.log('🤖 Starting AI extraction...');
    console.log(`📝 Content preview: ${content.substring(0, 200)}...`);
    console.log(`📎 Attachments: ${attachments.length} files`);

    const messages = [
      {
        role: 'system',
        content: COMPREHENSIVE_EXTRACTION_PROMPT
      },
      {
        role: 'user',
        content: `Extract comprehensive subsidy information from this content:\n\n${content}\n\nAttached documents available: ${attachments.map(a => a.name).join(', ')}`
      }
    ];

    console.log('🔗 Making OpenAI API call...');
    console.log(`🔑 API Key available: ${openAIApiKey ? 'Yes' : 'No'}`);
    console.log(`🔑 API Key preview: ${openAIApiKey ? openAIApiKey.substring(0, 10) + '...' : 'N/A'}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 4000
      }),
    });

    console.log(`🌐 OpenAI Response status: ${response.status}`);
    console.log(`🌐 OpenAI Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error ${response.status}:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 OpenAI Response received');
    console.log(`🔍 Response structure:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content,
      usage: data.usage
    });

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ No content in OpenAI response:', data);
      throw new Error('No content returned from OpenAI');
    }

    const extractedText = data.choices[0].message.content;
    console.log(`📄 Raw AI response length: ${extractedText.length} characters`);
    console.log(`📄 Raw AI response preview: ${extractedText.substring(0, 300)}...`);
    
    // Parse JSON response with better error handling and validation
    console.log('🔍 Parsing JSON response...');
    let jsonText;
    try {
      // Try multiple strategies to extract JSON
      let cleanText = extractedText.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonStart = cleanText.indexOf('{');
      let jsonEnd = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStart === -1) {
        console.error('❌ No JSON found in response:', cleanText.substring(0, 500));
        throw new Error('No JSON found in AI response');
      }
      
      // Validate that we have proper closing bracket
      if (jsonEnd <= jsonStart) {
        console.error('❌ No closing bracket found, attempting to fix...');
        // Count opening vs closing brackets
        const openBrackets = (cleanText.match(/\{/g) || []).length;
        const closeBrackets = (cleanText.match(/\}/g) || []).length;
        const missingBrackets = openBrackets - closeBrackets;
        
        if (missingBrackets > 0) {
          console.log(`🔧 Adding ${missingBrackets} missing closing brackets`);
          cleanText += '}' .repeat(missingBrackets);
          jsonEnd = cleanText.lastIndexOf('}') + 1;
        }
      }
      
      jsonText = cleanText.slice(jsonStart, jsonEnd);
      console.log(`📄 Extracted JSON length: ${jsonText.length} characters`);
      console.log(`📄 JSON preview: ${jsonText.substring(0, 300)}...`);
      
    } catch (sliceError) {
      console.error('❌ Error extracting JSON from response:', sliceError);
      console.log('📄 Full response text:', extractedText.substring(0, 1000));
      throw new Error(`JSON extraction error: ${sliceError.message}`);
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
      console.log('✅ JSON parsed successfully');
      console.log(`📊 Parsed data keys: ${Object.keys(parsedData).join(', ')}`);
      console.log(`📊 Data preview:`, {
        title: parsedData.title,
        authority: parsedData.authority,
        totalFields: Object.keys(parsedData).length,
        hasDescription: !!parsedData.description,
        hasEligibility: !!parsedData.eligibility_criteria
      });
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('📄 Failed JSON text:', jsonText.substring(0, 1000));
      
      // Try to provide more specific error information
      const errorMatch = parseError.message.match(/position (\d+)/);
      if (errorMatch) {
        const position = parseInt(errorMatch[1]);
        console.log(`📍 Error context around position ${position}:`, 
          jsonText.substring(Math.max(0, position - 50), position + 50));
      }
      
      throw new Error(`JSON parsing error: ${parseError.message}`);
    }
    
    return parsedData;

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
    const { run_id, page_ids, test_mode = false } = await req.json();
    
    console.log(`🚀 V2 Comprehensive AI Processing started - Run: ${run_id}`);
    
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

    console.log(`📄 Processing ${pages.length} pages`);

    let subsidiesCreated = 0;
    let pagesProcessed = 0;

    // Process pages synchronously to ensure completion
    await processPages();

    const result = {
      success: true,
      run_id,
      model: AI_MODEL,
      pages_processed: pagesProcessed,
      subsidies_created: subsidiesCreated,
      version: 'v2_comprehensive'
    };

    console.log(`🎉 V2 Processing complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    async function processPages() {
      // Process each page
      for (const page of pages) {
        try {
          pagesProcessed++;
          console.log(`🔍 Processing page: ${page.source_url}`);
          
          // Get content - prefer combined markdown, fallback to raw text
          const content = page.combined_content_markdown || page.raw_text || '';
          const attachments = page.attachments_jsonb || [];
          
          if (content.length < 100) {
            console.log(`⚠️ Skipping page with insufficient content: ${page.source_url}`);
            continue;
          }

          // Extract comprehensive data
          console.log(`🧠 Starting AI extraction for: ${page.source_url}`);
          console.log(`📝 Content length: ${content.length} characters`);
          
          const extractedData = await extractFromContent(content, attachments);
          
          if (!extractedData) {
            console.log(`❌ Failed to extract data from: ${page.source_url}`);
            continue;
          }
          
          console.log(`✅ AI extraction successful for: ${page.source_url}`);
          
          // Extract core identification data safely
          const coreData = extractedData.core_identification || {};
          const datesData = extractedData.dates || {};
          const eligibilityData = extractedData.eligibility || {};
          const fundingData = extractedData.funding || {};
          const projectData = extractedData.project_scope_objectives || {};
          const processData = extractedData.application_process || {};
          
          // Check if subsidy already exists by URL
          const { data: existingSubsidy } = await supabase
            .from('subsidies_structured')
            .select('id, url, title, updated_at')
            .eq('url', page.source_url)
            .maybeSingle();

          let upsertAction = 'created';
          let upsertResult;

          if (existingSubsidy) {
            console.log(`🔄 Found existing subsidy, updating: ${existingSubsidy.url}`);
            upsertAction = 'updated';
            
            upsertResult = await supabase
              .from('subsidies_structured')
              .update({
                title: sanitizeStringValue(coreData.title || extractedData.title || 'Untitled Subsidy'),
                description: sanitizeStringValue((() => {
                  const obj = projectData.objectives_detailed;
                  if (typeof obj === 'string') return obj;
                  if (Array.isArray(obj) && obj.length > 0) return obj.join(' ');
                  return extractedData.description || coreData.policy_objective || 'No description available';
                })()),
                eligibility: sanitizeStringValue([
                  eligibilityData.eligible_entities,
                  eligibilityData.geographic_eligibility, 
                  eligibilityData.special_conditions
                ].filter(Boolean).join('. ') || 'No eligibility criteria specified'),
                agency: sanitizeStringValue(coreData.authority || extractedData.authority) || 'Unknown Agency',
                region: sanitizeArrayValue(eligibilityData.geographic_eligibility),
                sector: sanitizeArrayValue(coreData.categories || coreData.sector),
                funding_type: sanitizeStringValue(coreData.call_type || fundingData.funding_type) || 'Grant',
                deadline: sanitizeDateValue(datesData.closing_date || datesData.application_deadline),
                run_id: run_id,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSubsidy.id);
              
          } else {
            console.log(`➕ Creating new subsidy: ${page.source_url}`);
            
            upsertResult = await supabase
              .from('subsidies_structured')
              .insert({
                url: page.source_url,
                title: sanitizeStringValue(coreData.title || 'Untitled Subsidy'),
                description: sanitizeStringValue((() => {
                  const obj = projectData.objectives_detailed;
                  if (typeof obj === 'string') return obj;
                  if (Array.isArray(obj) && obj.length > 0) return obj.join(' ');
                  return coreData.policy_objective || 'No description available';
                })()),
                eligibility: sanitizeStringValue([
                  eligibilityData.eligible_entities,
                  eligibilityData.geographic_eligibility, 
                  eligibilityData.special_conditions
                ].filter(Boolean).join('. ') || 'No eligibility criteria specified'),
                agency: sanitizeStringValue(coreData.authority) || 'Unknown Agency',
                region: sanitizeArrayValue(eligibilityData.geographic_eligibility),
                sector: sanitizeArrayValue(coreData.categories || coreData.sector),
                funding_type: sanitizeStringValue(coreData.call_type || fundingData.funding_type) || 'Grant',
                deadline: sanitizeDateValue(datesData.closing_date || datesData.application_deadline),
                run_id: run_id
              });
          }
          
          if (upsertResult.error) {
            console.error(`❌ Failed to ${upsertAction} subsidy for ${page.source_url}:`, upsertResult.error);
          } else {
            subsidiesCreated++;
            console.log(`✅ Successfully ${upsertAction} comprehensive subsidy record for: ${page.source_url}`);
          }

        } catch (pageError) {
          console.error(`❌ Error processing page ${page.source_url}:`, pageError);
        }
      }
    }

  } catch (error) {
    console.error('V2 AI processor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      version: 'v2_comprehensive'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});