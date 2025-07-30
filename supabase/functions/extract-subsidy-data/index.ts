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

const SUBSIDY_VERBATIM_EXTRACTION_PROMPT = `
You are an expert document extraction assistant. Your task is to extract the full content of a subsidy webpage or document **verbatim**, preserving all original wording, formatting, punctuation, and structure, in any language, without summarization or paraphrasing.

Return a valid JSON object with the following keys exactly:

{
  "title": string | null,
  "contact": {
    "email": string | null,
    "phone": string | null,
    "website": string | null
  },
  "period": {
    "start_date": string | null,
    "end_date": string | null,
    "publication_date": string | null
  },
  "presentation": string | null,
  "objectives": string | null,
  "actions": string | null,
  "eligibility": string | null,
  "application_process": [
    {
      "step_number": integer,
      "description": string,
      "required_documents": [string]
    }
  ],
  "funding": {
    "amount": string | null,
    "contribution_rate": string | null,
    "type": string | null
  },
  "deadlines": {
    "application_start": string | null,
    "application_end": string | null,
    "status": string | null
  },
  "documents": [ { "name": string, "format": string | null } ],
  "additional_info": string | null,
  "language": string,
  "metadata": {
    "source_url": string | null,
    "extraction_date": string,
    "confidence": object
  }
}

CRITICAL EXTRACTION RULES:
1. Extract ALL content verbatim - NO summarization, NO paraphrasing, NO translation
2. Preserve exact original formatting, paragraphs, line breaks, bullet points
3. Maintain all named entities, numbers, policy references, legal citations as-is
4. If a section or field is missing, set its value to null or empty array
5. Support multi-language documents, preserving language-specific text
6. Include all tables, appendices, document references exactly as listed
7. Preserve all links, emails, phone numbers, and addresses exactly
8. Keep original punctuation, capitalization, and special characters

SECTION MAPPING INSTRUCTIONS:
- "title": Extract the main program title/heading exactly as shown
- "presentation": Full introductory/overview text preserving all paragraphs
- "objectives": Complete objectives section verbatim
- "actions": All eligible/ineligible actions text exactly as written
- "eligibility": Full eligibility criteria preserving all conditions and requirements
- "application_process": Step-by-step process with exact wording and document names
- "funding": All funding amounts, rates, types exactly as stated
- "deadlines": All dates and timeline information verbatim
- "documents": Every required document with exact names and formats
- "additional_info": Any remaining content not categorized above

If a key is missing or empty in source, assign null or empty array accordingly.

Response must be valid JSON only, no explanations or markdown.
`;

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
          content: SUBSIDY_VERBATIM_EXTRACTION_PROMPT
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
    // Prepare comprehensive data for subsidies_structured table using new verbatim schema
    const subsidyData = {
      // Title and basic info
      title: extractedData.title,
      description: extractedData.presentation,
      
      // Contact information
      agency: extractedData.contact?.email ? 'Contact: ' + extractedData.contact.email : null,
      
      // Funding information - extract from new funding object
      amount: extractedData.funding?.amount ? [extractedData.funding.amount] : null,
      co_financing_rate: extractedData.funding?.contribution_rate ? parseFloat(extractedData.funding.contribution_rate.replace('%', '')) : null,
      funding_type: extractedData.funding?.type,
      
      // Eligibility information
      eligibility: extractedData.eligibility,
      
      // Application process - map from new structure
      application_requirements: extractedData.application_process || [],
      documents: extractedData.documents || [],
      
      // Program details from verbatim content
      objectives: extractedData.objectives ? [extractedData.objectives] : null,
      eligible_actions: extractedData.actions ? [extractedData.actions] : null,
      
      // Timing information from new deadlines structure
      deadline: extractedData.deadlines?.application_end || extractedData.period?.end_date,
      application_window_start: extractedData.deadlines?.application_start || extractedData.period?.start_date,
      application_window_end: extractedData.deadlines?.application_end || extractedData.period?.end_date,
      
      // Contact and reference
      url: extractedData.metadata?.source_url || metadata?.sourceUrl,
      
      // Language and metadata
      language: extractedData.language || 'fr',
      
      // Processing status
      requirements_extraction_status: 'completed',
      
      // Additional verbatim content
      technical_support: extractedData.additional_info,
      
      // Comprehensive audit information
      audit: {
        extraction_method: 'verbatim_openai_gpt4',
        extracted_at: new Date().toISOString(),
        source_file: metadata?.fileName,
        source_url: metadata?.sourceUrl,
        confidence_scores: extractedData.metadata?.confidence || {},
        fields_extracted: Object.keys(extractedData).length,
        verbatim_extraction: true,
        model_used: 'gpt-4.1-2025-04-14'
      },
      
      // Store verbatim sections for full content preservation
      missing_fields: [],
      
      // Form generation data from application process
      questionnaire_steps: extractedData.application_process || [],
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