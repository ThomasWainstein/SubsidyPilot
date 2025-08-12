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
    
    // Parse JSON response with better error handling
    console.log('🔍 Parsing JSON response...');
    let jsonText;
    try {
      const jsonStart = extractedText.indexOf('{');
      const jsonEnd = extractedText.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('❌ No JSON found in response:', extractedText);
        throw new Error('No JSON found in AI response');
      }
      
      jsonText = extractedText.slice(jsonStart, jsonEnd);
      console.log(`📄 Extracted JSON length: ${jsonText.length} characters`);
      console.log(`📄 JSON preview: ${jsonText.substring(0, 200)}...`);
      
    } catch (sliceError) {
      console.error('❌ Error extracting JSON from response:', sliceError);
      console.log('📄 Full response text:', extractedText);
      throw sliceError;
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
      console.log('📄 Failed JSON text:', jsonText);
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
    } else {
      // Process recent unprocessed pages
      query = query
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5); // Start with 5 pages for testing
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

    // For test mode, send immediate response and process async  
    if (test_mode && pages.length > 2) {
      // Send immediate response to avoid timeout
      const quickResponse = {
        success: true,
        run_id: run_id,
        message: `Started processing ${pages.length} pages asynchronously`,
        pages_to_process: pages.length,
        status: 'processing_async'
      };
      
      console.log('⚡ Sending immediate response for async processing');
      
      // Process pages asynchronously without blocking response
      processPages().catch(console.error);
      
      return new Response(JSON.stringify(quickResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
        
        // Log raw extracted data for debugging
        console.log(`🔍 Raw extracted data structure:`, {
          topLevelKeys: Object.keys(extractedData),
          coreIdExists: !!extractedData.core_identification,
          coreIdKeys: extractedData.core_identification ? Object.keys(extractedData.core_identification) : [],
          datesExists: !!extractedData.dates,
          eligibilityExists: !!extractedData.eligibility,
          fundingExists: !!extractedData.funding
        });
        
        // Extract core identification data safely
        const coreData = extractedData.core_identification || {};
        const datesData = extractedData.dates || {};
        const eligibilityData = extractedData.eligibility || {};
        const fundingData = extractedData.funding || {};
        const projectData = extractedData.project_scope_objectives || {};
        const processData = extractedData.application_process || {};
        const evaluationData = extractedData.evaluation_selection || {};
        const documentsData = extractedData.documents_annexes || {};
        const metaData = extractedData.meta_language || {};
        const complianceData = extractedData.compliance_transparency || {};
        
        // DEBUG: Log the actual data structure we're receiving
        console.log(`🔍 DEBUG - Full extracted data structure:`, JSON.stringify(extractedData, null, 2).substring(0, 1000));
        console.log(`🔍 DEBUG - Core identification data:`, JSON.stringify(coreData, null, 2));
        console.log(`🔍 DEBUG - Project data:`, JSON.stringify(projectData, null, 2));
        
        console.log(`📊 Extracted data preview:`, {
          title: coreData.title,
          description: projectData.objectives_detailed?.substring(0, 100),
          authority: coreData.authority,
          managingAgency: coreData.managing_agency,
          hasData: Object.keys(extractedData).length,
          verbatimDataSize: JSON.stringify(extractedData).length
        });

        // Generate content hash for deduplication
        const contentHash = await crypto.subtle.digest(
          'SHA-256', 
          new TextEncoder().encode(content)
        ).then(buffer => 
          Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        );

        // Create fingerprint for deduplication using properly extracted data
        const fingerprintSource = `${coreData.title || 'untitled'}-${coreData.authority || 'unknown'}-${page.source_url}`;
        console.log(`🔑 Creating fingerprint from: "${fingerprintSource}"`);
        
        const fingerprint = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(fingerprintSource)
        ).then(buffer => 
          Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        );
        
        console.log(`🔑 Generated fingerprint: ${fingerprint.substring(0, 16)}...`);

        // Ensure scrape run exists before inserting subsidy
        const { data: existingRun } = await supabase
          .from('scrape_runs')
          .select('id')
          .eq('id', run_id)
          .maybeSingle();
        
        if (!existingRun) {
          const { error: runError } = await supabase
            .from('scrape_runs')
            .insert({
              id: run_id,
              status: 'running',
              notes: 'V2 Comprehensive AI Processing',
              metadata: { test_mode: test_mode || false }
            });
          
          if (runError) {
            console.error('❌ Failed to create scrape run:', runError);
          }
        }

        // Check if subsidy already exists by fingerprint
        const { data: existingSubsidy } = await supabase
          .from('subsidies')
          .select('id, source_url, title, updated_at')
          .eq('source_url', page.source_url)
          .maybeSingle();

        let upsertAction = 'created';
        let upsertResult;

        if (existingSubsidy) {
          console.log(`🔄 Found existing subsidy, updating: ${existingSubsidy.source_url}`);
          upsertAction = 'updated';
          
          // Update existing record with STRUCTURED data in proper fields
          console.log(`🔄 Mapping V2 STRUCTURED data to database fields...`);
          
          upsertResult = await supabase
            .from('subsidies')
            .update({
              // ✅ STRUCTURED DATA goes into proper structured fields
              title: { ro: coreData.title || extractedData.title || 'Untitled Subsidy' },
              description: { ro: projectData.objectives_detailed || extractedData.description || coreData.policy_objective || 'No description available' },
              eligibility_criteria: { 
                ro: [
                  eligibilityData.eligible_entities,
                  eligibilityData.geographic_eligibility, 
                  eligibilityData.special_conditions
                ].filter(Boolean).join('. ') || 'No eligibility criteria specified'
              },
              
              // Financial data
              amount_min: fundingData.funding_amount_min || fundingData.funding_amount?.min || null,
              amount_max: fundingData.funding_amount_max || fundingData.funding_amount?.max || null,
              
              // Dates
              deadline: datesData.closing_date || datesData.application_deadline || null,
              
              // Basic fields
              agency: coreData.authority || extractedData.authority || 'Unknown Agency',
              region: eligibilityData.geographic_eligibility ? [eligibilityData.geographic_eligibility] : [],
              categories: coreData.categories || (coreData.sector ? [coreData.sector] : []),
              tags: [
                ...(coreData.categories || []),
                coreData.sector,
                coreData.call_type,
                fundingData.funding_type
              ].filter(Boolean),
              funding_type: coreData.call_type || fundingData.funding_type || 'Grant',
              status: coreData.status_detailed === 'open' ? 'open' : 'closed',
              
              // Application documents
              application_docs: {
                required_documents: processData.required_documents_detailed,
                forms_detected: documentsData.forms_detected,
                submission_method: processData.submission_method_detailed,
                contact_info: processData.contact_information
              },
              
              // Documents metadata
              documents: {
                forms: documentsData.forms_detected || [],
                regulatory_refs: documentsData.regulatory_references || [],
                attachments: attachments || []
              },
              
              // ✅ RAW CONTENT stores the complete unprocessed AI response for reference
              raw_content: extractedData,
              
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubsidy.id);
            
          console.log(`💾 Update operation completed for: ${existingSubsidy.source_url}`);
        } else {
          console.log(`➕ Creating new subsidy: ${page.source_url}`);
          console.log(`🔄 Mapping V2 STRUCTURED data to database fields...`);
          
          // Generate unique code for new subsidy
          const subsidyCode = `fr-agri-${fingerprint.substring(0, 8)}`;
          
          // Insert new record with STRUCTURED data
          upsertResult = await supabase
            .from('subsidies')
            .insert({
              // Basic identifiers
              code: subsidyCode,
              source_url: page.source_url,
              domain: 'franceagrimer.fr',
              
              // ✅ STRUCTURED DATA goes into proper structured fields
              title: { ro: coreData.title || 'Untitled Subsidy' },
              description: { ro: projectData.objectives_detailed || coreData.policy_objective || 'No description available' },
              eligibility_criteria: { 
                ro: [
                  eligibilityData.eligible_entities,
                  eligibilityData.geographic_eligibility, 
                  eligibilityData.special_conditions
                ].filter(Boolean).join('. ') || 'No eligibility criteria specified'
              },
              
              // Financial data
              amount_min: fundingData.funding_amount_min || null,
              amount_max: fundingData.funding_amount_max || null,
              
              // Dates
              deadline: datesData.closing_date || datesData.application_deadline || null,
              
              // Basic fields
              agency: coreData.authority || 'Unknown Agency',
              region: eligibilityData.geographic_eligibility ? [eligibilityData.geographic_eligibility] : [],
              categories: coreData.categories || (coreData.sector ? [coreData.sector] : []),
              tags: [
                ...(coreData.categories || []),
                coreData.sector,
                coreData.call_type,
                fundingData.funding_type
              ].filter(Boolean),
              funding_type: coreData.call_type || fundingData.funding_type || 'Grant',
              status: coreData.status_detailed === 'open' ? 'open' : 'closed',
              
              // Application documents
              application_docs: {
                required_documents: processData.required_documents_detailed,
                forms_detected: documentsData.forms_detected,
                submission_method: processData.submission_method_detailed,
                contact_info: processData.contact_information
              },
              
              // Documents metadata  
              documents: {
                forms: documentsData.forms_detected || [],
                regulatory_refs: documentsData.regulatory_references || [],
                attachments: attachments || []
              },
              
              // ✅ RAW CONTENT stores the complete unprocessed AI response for reference
              raw_content: extractedData,
              categories: coreData.sector ? [coreData.sector] : (coreData.categories || []),
              funding_type: coreData.call_type || fundingData.funding_type,
              
              // Processing metadata only - basic schema
              record_status: 'active',
              extraction_batch_id: run_id
            });
            
          console.log(`💾 Insert operation completed for: ${page.source_url}`);
        }
        
        if (upsertResult.error) {
          console.error(`❌ Failed to ${upsertAction} subsidy for ${page.source_url}:`, upsertResult.error);
          
          // Log detailed error information
          console.error('💥 Database upsert error details:', {
            action: upsertAction,
            url: page.source_url,
            fingerprint: fingerprint,
            existingSubsidy: existingSubsidy?.id,
            errorCode: upsertResult.error.code,
            errorMessage: upsertResult.error.message,
            errorDetails: upsertResult.error.details
          });
        } else {
          subsidiesCreated++;
          console.log(`✅ Successfully ${upsertAction} comprehensive subsidy record for: ${page.source_url}`);
          console.log(`📊 ${upsertAction.charAt(0).toUpperCase() + upsertAction.slice(1)} data preview:`, {
            title: coreData.title || 'No title',
            authority: coreData.authority || 'No authority',
            hasDescription: !!(projectData.objectives_detailed || projectData.project_objectives),
            totalFieldsSet: Object.keys(extractedData).length,
            verbatimDataStored: !!extractedData && Object.keys(extractedData).length > 0,
            fingerprint: fingerprint.substring(0, 12) + '...'
          });
          
          // Additional debugging for successful operations
          console.log(`🔍 Core data mapped:`, {
            title: coreData.title,
            authority: coreData.authority,
            managing_agency: coreData.managing_agency,
            reference_code: coreData.reference_code
          });
          
          console.log(`🔍 Verbatim data size: ${JSON.stringify(extractedData).length} characters`);
        }

        } catch (pageError) {
          console.error(`❌ Error processing page ${page.source_url}:`, pageError);
        }
      }

      const result = {
        success: true,
        run_id,
        model: AI_MODEL,
        pages_processed: pagesProcessed,
        subsidies_created: subsidiesCreated,
        version: 'v2_comprehensive'
      };

      console.log(`🎉 V2 Processing complete:`, result);
    }

    // Synchronous processing for small batches
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