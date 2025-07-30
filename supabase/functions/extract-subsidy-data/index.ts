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

const SUBSIDY_EXTRACTION_PROMPT = `You are a specialized document intelligence agent for extracting structured subsidy and funding program information from administrative documents (PDFs, DOCX, web pages, etc.).

Your task is to extract key information that will be used to:
1. Populate subsidy program listings for farmers
2. Generate dynamic application forms
3. Enable automatic matching with farm profiles

Extract the following fields from the document. If information is missing or unclear, set the value to null:

PROGRAM IDENTIFICATION:
- program_title: Official program name or title
- program_code: Any official reference number, code, or identifier
- summary: Brief description of the program (2-3 sentences)

FUNDING DETAILS:
- total_funding: Total available funding as text (e.g., "€2.5 million")
- funding_range: Array of numbers [min, max] if funding amounts per applicant are specified
- funding_type: "grant", "loan", "subsidy", "tax_credit", or "other"

TIMING:
- application_deadline: ISO date format (YYYY-MM-DD) if specified
- important_dates: Array of objects with "date" and "description" for key milestones

TARGETING:
- applicable_regions: Array of regions, departments, or geographic areas
- sectors: Array of agricultural sectors or activities covered
- legal_entity_types: Array of eligible legal entity types (individual, srl, cooperative, etc.)
- eligibility_criteria: Array of key eligibility requirements

APPLICATION PROCESS:
- application_steps: Array of objects with step_description, required_files array, and optional web_portal
- required_documents: Array of document types needed for application
- contact_info: Object with organization, contact_email, contact_phone, website

METADATA:
- language: Document language code (en, fr, es, ro, pl)
- file_metadata: Object with original_file_name and scraped_url if available

CONFIDENCE SCORING:
For each major field where you have uncertainty, add confidence scores (0.0-1.0) in confidence_scores object.

SPECIAL INSTRUCTIONS:
- Preserve original language for official terms and requirements
- Focus on actionable information for farmers applying for funding
- If document contains forms or questionnaires, extract field requirements into application_steps
- Look for file upload requirements, form fields, and validation rules
- Extract any mentions of required certifications, land use types, or farm characteristics

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

async function storeSubsidyData(extractedData: SubsidyExtractionResult, metadata: any): Promise<string> {
  console.log('💾 Storing extracted subsidy data');
  
  try {
    // Prepare data for subsidies_structured table
    const subsidyData = {
      // Core identification
      title: extractedData.program_title,
      description: extractedData.summary,
      program: extractedData.program_code,
      
      // Funding information
      amount: extractedData.funding_range,
      funding_type: extractedData.funding_type,
      
      // Geographic and sector targeting
      region: extractedData.applicable_regions,
      sector: extractedData.sectors,
      
      // Eligibility and requirements
      eligibility: extractedData.eligibility_criteria?.join('; ') || null,
      legal_entity_type: extractedData.legal_entity_types,
      
      // Application process
      application_requirements: extractedData.application_steps || [],
      documents: extractedData.required_documents || [],
      
      // Timing
      deadline: extractedData.application_deadline,
      
      // Contact and metadata
      agency: extractedData.contact_info?.organization,
      language: extractedData.language || 'fr',
      url: metadata?.sourceUrl,
      
      // Processing metadata
      requirements_extraction_status: 'completed',
      audit: {
        extraction_method: 'openai_gpt4',
        extracted_at: new Date().toISOString(),
        source_file: metadata?.fileName,
        confidence_scores: extractedData.confidence_scores
      },
      
      // Store full extracted data for form generation
      questionnaire_steps: extractedData.application_steps || [],
    };
    
    const { data, error } = await supabase
      .from('subsidies_structured')
      .insert(subsidyData)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error storing subsidy data:', error);
      throw error;
    }
    
    console.log('✅ Subsidy data stored successfully:', data.id);
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