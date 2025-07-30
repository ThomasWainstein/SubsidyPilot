import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SubsidyExtractionRequest {
  documentId?: string;
  fileUrl?: string;
  fileName?: string;
  documentText?: string;
  sourceUrl?: string;
  metadata?: any;
}

interface SubsidyExtractionResult {
  program_title: string | null;
  program_code: string | null;
  summary: string | null;
  application_deadline: string | null;
  applicable_regions: string[] | null;
  total_funding: string | null;
  funding_range: number[] | null;
  contact_info: {
    organization?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
  } | null;
  application_steps: Array<{
    step_description: string;
    required_files: string[];
    web_portal?: string;
  }> | null;
  eligibility_criteria: string[] | null;
  important_dates: Array<{
    date: string;
    description: string;
  }> | null;
  required_documents: string[] | null;
  legal_entity_types: string[] | null;
  sectors: string[] | null;
  funding_type: string | null;
  language: string | null;
  file_metadata: {
    original_file_name?: string;
    scraped_url?: string;
  } | null;
  confidence_scores: Record<string, number> | null;
}

const SUBSIDY_EXTRACTION_PROMPT = `You are an expert agricultural funding analyst. Extract ALL detailed information from subsidy documents to create comprehensive, well-structured entries that preserve every important detail.

CRITICAL INSTRUCTIONS:
1. Extract ALL content - do not summarize or lose any important information
2. Preserve exact funding amounts, percentages, dates, and specific requirements
3. Maintain original terminology and official language
4. If you see detailed requirements or procedures, extract them fully
5. Generate proper titles based on the actual program name, not generic placeholders

REQUIRED OUTPUT STRUCTURE:

TITLE GENERATION:
- title: Create a specific, descriptive title based on the actual program name, code, and focus area. NEVER use generic titles like "Subsidy Page" or "Agricultural Program". Use format: "[Program Code] - [Program Name]" or similar based on actual content.

PRESENTATION SECTION (Complete program description):
- description: Extract the FULL presentation/description section. Include:
  * Complete program overview and objectives
  * All policy context and background information
  * Detailed explanation of supported actions/activities
  * All investment types and eligible expenses
  * Complete funding calculation methods and rates
  * Any specific criteria or conditions mentioned
  
ELIGIBILITY SECTION (Who can apply):
- eligibility: Extract COMPLETE eligibility information including:
  * All beneficiary types and legal entity requirements
  * Specific eligibility criteria and conditions
  * Required registrations, affiliations, or certifications
  * Size limits, geographic restrictions, or sector requirements
  * Any exclusions or special conditions

TIMING SECTION (When to apply):
- deadline: Extract exact deadline date in YYYY-MM-DD format
- application_window_start: Start date if specified
- application_window_end: End date if specified  
- project_duration: Allowed project duration or implementation timeframes
- payment_terms: Payment schedule and timing details

APPLICATION PROCESS (How to apply):
- application_requirements: Array of ALL required steps, documents, and procedures including:
  * Complete step-by-step application process
  * All required forms and documents with exact names
  * Portal links and submission methods
  * Review and evaluation process
  * Payment request procedures
- documents: Array of ALL required documents with exact official names
- application_method: How to submit (online portal, mail, etc.)

COMPREHENSIVE DETAILS:
- program: Full program name
- agency: Managing agency/organization
- amount: Array of ALL funding amounts mentioned (preserve all numbers)
- funding_type: Specific type of funding
- funding_source: Source of funding (EU, national, regional, etc.)
- co_financing_rate: Co-financing percentage if mentioned
- region: Array of applicable regions
- sector: Array of ALL applicable sectors/activities
- legal_entity_type: Array of ALL eligible legal entity types
- objectives: Array of ALL program objectives
- eligible_actions: Array of ALL eligible actions/investments
- ineligible_actions: Array of actions explicitly excluded
- investment_types: Array of investment categories supported
- evaluation_criteria: Detailed evaluation and scoring criteria
- reporting_requirements: Reporting obligations
- compliance_requirements: Compliance and audit requirements
- technical_support: Available technical assistance
- language: Document language (fr, en, etc.)

CONTACT AND REFERENCE:
- url: Source URL if available
- contact_info: Complete contact information including email, phone, portal links

METADATA:
- confidence_scores: Object with confidence (0.0-1.0) for major extractions
- missing_fields: Array of fields that couldn't be extracted

EXAMPLE OF GOOD TITLE GENERATION:
- Instead of "Subsidy Page" → "(OS 2.2) - TA 1 : Transformation (Régions continentales uniquement)"
- Instead of "Agricultural Program" → "FEAMPA - Aide aux investissements de modernisation"
- Use actual program codes, names, and focus areas from the document

REMEMBER: Extract EVERYTHING in detail. Do not lose any information. The goal is to preserve all the rich content from the original document in a structured format.

Respond with valid JSON only. Do not include explanations or markdown formatting.`;

async function extractTextFromFile(fileUrl: string, fileName: string): Promise<string> {
  console.log(`📄 Extracting text from: ${fileName}`);
  
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    
    // For now, we'll handle text files and PDFs
    // In production, you'd want to add proper PDF parsing with pdf-parse or similar
    if (contentType.includes('text/plain') || fileName.endsWith('.txt')) {
      const text = new TextDecoder().decode(arrayBuffer);
      return text;
    } else if (contentType.includes('pdf') || fileName.endsWith('.pdf')) {
      // For MVP, we'll extract basic text - in production use proper PDF parser
      const text = new TextDecoder().decode(arrayBuffer);
      return text.substring(0, 50000); // Limit for API
    } else if (contentType.includes('json')) {
      const text = new TextDecoder().decode(arrayBuffer);
      return text;
    } else {
      // For other file types, try to decode as text
      const text = new TextDecoder().decode(arrayBuffer);
      return text.substring(0, 50000); // Limit for API
    }
  } catch (error) {
    console.error(`❌ Error extracting text from ${fileName}:`, error);
    throw error;
  }
}

async function callOpenAIExtraction(documentText: string, fileName: string): Promise<SubsidyExtractionResult> {
  console.log(`🤖 Calling OpenAI for subsidy extraction: ${fileName}`);
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: SUBSIDY_EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Extract subsidy program information from this document:

Filename: ${fileName}

Document Content:
${documentText.substring(0, 45000)}` // Leave room for response
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const extractedContent = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(extractedContent);
    console.log('✅ Successfully extracted subsidy data');
    return parsed;
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response as JSON:', extractedContent);
    throw new Error('Failed to parse extraction result as JSON');
  }
}

async function storeSubsidyData(extractedData: any, metadata: any): Promise<string> {
  console.log('💾 Storing comprehensive extracted subsidy data');
  
  try {
    // Prepare comprehensive data for subsidies_structured table
    const subsidyData = {
      // Title and basic info
      title: extractedData.title || extractedData.program_title,
      description: extractedData.description || extractedData.summary,
      program: extractedData.program,
      agency: extractedData.agency,
      
      // Funding information - preserve all amounts
      amount: extractedData.amount || extractedData.funding_range,
      funding_type: extractedData.funding_type,
      funding_source: extractedData.funding_source,
      co_financing_rate: extractedData.co_financing_rate,
      
      // Geographic and sector targeting
      region: extractedData.region || extractedData.applicable_regions,
      sector: extractedData.sector || extractedData.sectors,
      
      // Comprehensive eligibility information
      eligibility: extractedData.eligibility,
      legal_entity_type: extractedData.legal_entity_type || extractedData.legal_entity_types,
      
      // Detailed application process
      application_requirements: extractedData.application_requirements || extractedData.application_steps,
      documents: extractedData.documents || extractedData.required_documents,
      application_method: extractedData.application_method,
      
      // Comprehensive program details
      objectives: extractedData.objectives,
      eligible_actions: extractedData.eligible_actions,
      ineligible_actions: extractedData.ineligible_actions,
      investment_types: extractedData.investment_types,
      beneficiary_types: extractedData.beneficiary_types,
      
      // Timing information
      deadline: extractedData.deadline || extractedData.application_deadline,
      application_window_start: extractedData.application_window_start,
      application_window_end: extractedData.application_window_end,
      project_duration: extractedData.project_duration,
      payment_terms: extractedData.payment_terms,
      
      // Requirements and criteria
      evaluation_criteria: extractedData.evaluation_criteria,
      reporting_requirements: extractedData.reporting_requirements,
      compliance_requirements: extractedData.compliance_requirements,
      
      // Additional support and contact
      technical_support: extractedData.technical_support,
      
      // Contact and reference
      url: extractedData.url || metadata?.sourceUrl,
      
      // Language and metadata
      language: extractedData.language || 'fr',
      
      // Processing status
      requirements_extraction_status: 'completed',
      
      // Comprehensive audit information
      audit: {
        extraction_method: 'enhanced_openai_gpt4',
        extracted_at: new Date().toISOString(),
        source_file: metadata?.fileName,
        source_url: metadata?.sourceUrl,
        confidence_scores: extractedData.confidence_scores,
        fields_extracted: Object.keys(extractedData).length,
        comprehensive_extraction: true,
        model_used: 'gpt-4.1-2025-04-14'
      },
      
      // Store missing fields tracking
      missing_fields: extractedData.missing_fields || [],
      
      // Form generation data
      questionnaire_steps: extractedData.application_requirements || extractedData.application_steps || [],
    };
    
    // Clean up null/undefined values to avoid database issues
    Object.keys(subsidyData).forEach(key => {
      if (subsidyData[key] === null || subsidyData[key] === undefined) {
        delete subsidyData[key];
      }
    });
    
    console.log(`💾 Storing subsidy with ${Object.keys(subsidyData).length} fields`);
    console.log(`📊 Key content lengths: title=${subsidyData.title?.length || 0}, description=${subsidyData.description?.length || 0}, eligibility=${subsidyData.eligibility?.length || 0}`);
    
    const { data, error } = await supabase
      .from('subsidies_structured')
      .insert(subsidyData)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error storing subsidy data:', error);
      console.error('❌ Problematic data sample:', JSON.stringify(subsidyData, null, 2).substring(0, 1000));
      throw error;
    }
    
    console.log('✅ Comprehensive subsidy data stored successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Error in storeSubsidyData:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      documentId,
      fileUrl, 
      fileName, 
      documentText,
      sourceUrl,
      metadata 
    }: SubsidyExtractionRequest = await req.json();

    console.log('🚀 Starting subsidy document extraction:', { fileName, sourceUrl });

    let textToProcess = documentText;
    
    // If no text provided, extract from file URL
    if (!textToProcess && fileUrl && fileName) {
      textToProcess = await extractTextFromFile(fileUrl, fileName);
    }
    
    if (!textToProcess) {
      throw new Error('No document text or file URL provided');
    }

    // Call OpenAI for extraction
    const extractedData = await callOpenAIExtraction(textToProcess, fileName || 'document');
    
    // Store in subsidies_structured table
    const subsidyId = await storeSubsidyData(extractedData, { 
      fileName, 
      sourceUrl, 
      documentId,
      ...metadata 
    });
    
    // Update source document record if provided
    if (documentId) {
      await supabase
        .from('raw_scraped_pages')
        .update({ 
          status: 'processed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subsidyId,
        extractedData,
        message: 'Subsidy data extracted and stored successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in extract-subsidy-data function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});