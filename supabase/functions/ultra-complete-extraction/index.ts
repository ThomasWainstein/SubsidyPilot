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

interface ExtractionRequest {
  url: string;
  forceReprocess?: boolean;
}

interface DocumentMetadata {
  name: string;
  url: string;
  type: string;
  size: string;
  date: string;
  description?: string;
}

interface CompleteSubsidyData {
  // Basic Information
  title: string;
  program: string;
  agency: string;
  code?: string;
  
  // Description & Content (100% verbatim)
  description: string;
  objectives: string[];
  eligibility: string;
  
  // Funding Details
  funding: {
    amount_min?: number;
    amount_max?: number;
    amount_description?: string;
    cofinancing_rate?: number;
    funding_type?: string;
    payment_terms?: string;
  };
  
  // Timing & Deadlines
  application_period: {
    start?: string;
    end?: string;
    status?: string;
  };
  
  deadlines: Array<{
    date: string;
    description: string;
    type: string;
  }>;
  
  // Geographic & Sectoral Scope
  regions: string[];
  sectors: string[];
  tags: string[];
  
  // Application Process (Step-by-step)
  application_process: Array<{
    step_number: number;
    title: string;
    description: string;
    required_documents: string[];
    optional_documents: string[];
    platform?: string;
    deadline?: string;
  }>;
  
  // Documents (EVERY single file)
  required_documents: DocumentMetadata[];
  optional_documents: DocumentMetadata[];
  associated_documents: DocumentMetadata[];
  guidance_documents: DocumentMetadata[];
  
  // Contact Information (Complete)
  contacts: Array<{
    type: string;
    email?: string;
    phone?: string;
    organization?: string;
    address?: string;
    hours?: string;
    description?: string;
  }>;
  
  // Legal Framework
  legal_references: Array<{
    type: string;
    reference: string;
    title?: string;
    url?: string;
  }>;
  
  // FAQ & Guidance
  faq: Array<{
    question: string;
    answer: string;
    source?: string;
  }>;
  
  // Alerts & Updates
  alerts: Array<{
    type: string;
    message: string;
    date?: string;
    priority?: string;
  }>;
  
  // Evaluation & Selection
  evaluation_criteria: string[];
  selection_process?: string;
  
  // Compliance & Reporting
  reporting_obligations: string[];
  compliance_requirements: string[];
  
  // Technical Details
  technical_requirements?: string;
  environmental_requirements?: string;
  
  // Complete Metadata
  meta: {
    source_url: string;
    extraction_date: string;
    last_updated?: string;
    language: string;
    confidence_score: number;
    extraction_method: string;
    content_sections_found: string[];
    documents_processed: number;
    total_content_length: number;
  };
}

const ULTRA_COMPLETE_EXTRACTION_PROMPT = `
You are an expert agricultural funding analyst tasked with ULTRA-COMPLETE extraction of subsidy information from FranceAgriMer pages and ALL linked documents.

CRITICAL EXTRACTION REQUIREMENTS:
1. Extract EVERY piece of information - do NOT summarize, omit, or paraphrase
2. Capture ALL downloadable documents with complete metadata (name, type, size, date, URL)
3. Extract ALL contact information (emails, phones, addresses, hours)
4. Include ALL deadlines, dates, and timing information
5. Preserve ALL legal references, regulations, and decision numbers
6. Extract ALL eligibility criteria, requirements, and conditions
7. Capture ALL alerts, updates, and special notices
8. Include ALL application steps and required documents
9. Extract ALL funding details, amounts, and co-financing rates
10. Preserve original French text verbatim - do NOT translate

OUTPUT STRUCTURE:
Return a JSON object with the following complete structure. Set fields to null or empty arrays if not found, but NEVER omit fields:

{
  "title": "EXACT title from page",
  "program": "Funding program name",
  "agency": "FranceAgriMer or managing agency",
  "code": "Program code if present",
  "description": "Complete description - ALL paragraphs verbatim",
  "objectives": ["All objectives as separate items"],
  "eligibility": "Complete eligibility text - ALL criteria verbatim",
  "funding": {
    "amount_min": number or null,
    "amount_max": number or null,
    "amount_description": "Verbatim funding description",
    "cofinancing_rate": number or null,
    "funding_type": "Type of funding",
    "payment_terms": "Payment terms if specified"
  },
  "application_period": {
    "start": "YYYY-MM-DD or null",
    "end": "YYYY-MM-DD or null", 
    "status": "open/closed/upcoming"
  },
  "deadlines": [
    {
      "date": "YYYY-MM-DD",
      "description": "What deadline is for",
      "type": "application/submission/evaluation"
    }
  ],
  "regions": ["All applicable regions/departments"],
  "sectors": ["All applicable sectors"],
  "tags": ["All relevant tags and keywords"],
  "application_process": [
    {
      "step_number": 1,
      "title": "Step title",
      "description": "Complete step description",
      "required_documents": ["List all required docs"],
      "optional_documents": ["List all optional docs"],
      "platform": "Submission platform if specified",
      "deadline": "Step-specific deadline if any"
    }
  ],
  "required_documents": [
    {
      "name": "EXACT document name",
      "url": "Full download URL", 
      "type": "pdf/doc/xls/etc",
      "size": "File size as shown",
      "date": "Date if shown",
      "description": "Document description if any"
    }
  ],
  "optional_documents": [],
  "associated_documents": [],
  "guidance_documents": [],
  "contacts": [
    {
      "type": "primary/support/technical",
      "email": "Email address",
      "phone": "Phone number with hours",
      "organization": "Organization name",
      "address": "Physical address if given",
      "hours": "Contact hours",
      "description": "Contact description"
    }
  ],
  "legal_references": [
    {
      "type": "decision/regulation/law",
      "reference": "Reference number/code",
      "title": "Title of legal document",
      "url": "URL if linked"
    }
  ],
  "faq": [
    {
      "question": "Question text",
      "answer": "Complete answer",
      "source": "Source document if from linked FAQ"
    }
  ],
  "alerts": [
    {
      "type": "update/warning/deadline",
      "message": "Complete alert message",
      "date": "Alert date if shown",
      "priority": "high/medium/low"
    }
  ],
  "evaluation_criteria": ["All evaluation criteria"],
  "selection_process": "Complete selection process description",
  "reporting_obligations": ["All reporting requirements"],
  "compliance_requirements": ["All compliance requirements"],
  "technical_requirements": "Technical requirements if any",
  "environmental_requirements": "Environmental requirements if any",
  "meta": {
    "source_url": "Original page URL",
    "extraction_date": "Current ISO date",
    "last_updated": "Page last updated date if shown",
    "language": "fr",
    "confidence_score": 95,
    "extraction_method": "ultra_complete_gpt4",
    "content_sections_found": ["List all sections found"],
    "documents_processed": 0,
    "total_content_length": 0
  }
}

EXTRACTION RULES:
- Extract text EXACTLY as written - no translation, no summarization
- If content spans multiple pages/documents, extract from ALL
- Preserve ALL formatting, lists, and structure
- Include ALL metadata for every document
- Capture ALL contact details completely
- Extract ALL dates and deadlines
- Include ALL legal references and decision numbers
- Never leave required fields empty - use null if truly not found
- Provide complete verbatim text for all major sections
`;

async function fetchDocumentContent(url: string): Promise<string> {
  try {
    console.log(`📄 Fetching document content from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch ${url}: ${response.status}`);
      return '';
    }
    
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // For PDFs and other binary files, we'd need specialized parsing
    // For now, return what we can extract
    if (contentType.includes('pdf')) {
      console.log(`📄 PDF detected: ${url} (${text.length} chars raw)`);
      return text.substring(0, 10000); // Limit for processing
    }
    
    return text;
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error);
    return '';
  }
}

async function extractCompleteSubsidyData(url: string): Promise<CompleteSubsidyData> {
  console.log(`🔍 Starting ultra-complete extraction for: ${url}`);
  
  try {
    // Fetch main page content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    const pageContent = await response.text();
    console.log(`📄 Main page content: ${pageContent.length} characters`);
    
    // Extract document links from the page to fetch their content too
    const documentLinks = extractDocumentLinks(pageContent, url);
    console.log(`📋 Found ${documentLinks.length} linked documents`);
    
    // Fetch content from all linked documents
    let allContent = pageContent;
    for (const doc of documentLinks) {
      const docContent = await fetchDocumentContent(doc.url);
      if (docContent) {
        allContent += `\n\n=== DOCUMENT: ${doc.name} ===\n${docContent}`;
      }
    }
    
    console.log(`📄 Total content to process: ${allContent.length} characters`);
    
    // Call OpenAI for ultra-complete extraction
    const extractedData = await callOpenAIForCompleteExtraction(allContent, url);
    
    // Update metadata with actual processing stats
    extractedData.meta.documents_processed = documentLinks.length;
    extractedData.meta.total_content_length = allContent.length;
    extractedData.meta.extraction_date = new Date().toISOString();
    
    return extractedData;
    
  } catch (error) {
    console.error(`❌ Error in ultra-complete extraction:`, error);
    throw error;
  }
}

function extractDocumentLinks(pageContent: string, baseUrl: string): DocumentMetadata[] {
  const documents: DocumentMetadata[] = [];
  
  // Extract document links from various patterns
  const linkPatterns = [
    /href="([^"]*\.pdf[^"]*)"[^>]*>([^<]+)</gi,
    /href="([^"]*\.docx?[^"]*)"[^>]*>([^<]+)</gi,
    /href="([^"]*\.xlsx?[^"]*)"[^>]*>([^<]+)</gi,
  ];
  
  linkPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(pageContent)) !== null) {
      const [, url, name] = match;
      const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;
      
      // Extract file size and date if present in surrounding text
      const context = pageContent.substring(Math.max(0, match.index - 200), match.index + 200);
      const sizeMatch = context.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
      const dateMatch = context.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      
      documents.push({
        name: name.trim(),
        url: fullUrl,
        type: url.split('.').pop()?.toLowerCase() || 'unknown',
        size: sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : '',
        date: dateMatch ? dateMatch[1] : '',
        description: ''
      });
    }
  });
  
  console.log(`📋 Extracted ${documents.length} document links`);
  return documents;
}

async function callOpenAIForCompleteExtraction(content: string, sourceUrl: string): Promise<CompleteSubsidyData> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  console.log(`🤖 Calling OpenAI for ultra-complete extraction (${content.length} chars)`);
  
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
          content: ULTRA_COMPLETE_EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Extract COMPLETE subsidy information from this FranceAgriMer page and ALL linked documents:

Source URL: ${sourceUrl}

Complete Content (including all linked documents):
${content.substring(0, 100000)}` // Use large context window
        }
      ],
      temperature: 0.05, // Very low for maximum consistency
      max_tokens: 4000,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const extractedContent = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(extractedContent);
    console.log('✅ Successfully extracted ultra-complete subsidy data');
    console.log(`📊 Extraction stats: ${Object.keys(parsed).length} fields, confidence: ${parsed.meta?.confidence_score || 'unknown'}`);
    return parsed;
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response as JSON:', extractedContent.substring(0, 500));
    throw new Error('Failed to parse extraction result as JSON');
  }
}

async function storeCompleteSubsidyData(data: CompleteSubsidyData): Promise<string> {
  console.log('💾 Storing ultra-complete subsidy data');
  
  try {
    // Map to subsidies_structured table format
    const subsidyRecord = {
      title: data.title,
      description: data.description,
      url: data.meta.source_url,
      agency: data.agency,
      program: data.program,
      
      // Funding information
      amount: data.funding.amount_min && data.funding.amount_max ? 
        [data.funding.amount_min, data.funding.amount_max] : 
        data.funding.amount_description ? [data.funding.amount_description] : null,
      co_financing_rate: data.funding.cofinancing_rate,
      funding_type: data.funding.funding_type,
      payment_terms: data.funding.payment_terms,
      
      // Eligibility and requirements
      eligibility: data.eligibility,
      objectives: data.objectives,
      eligible_actions: data.application_process.map(step => step.description),
      
      // Geographic and sectoral scope
      region: data.regions,
      sector: data.sectors,
      
      // Timing
      deadline: data.application_period.end,
      application_window_start: data.application_period.start,
      application_window_end: data.application_period.end,
      
      // Documents and process
      documents: [
        ...data.required_documents,
        ...data.optional_documents,
        ...data.associated_documents,
        ...data.guidance_documents
      ],
      questionnaire_steps: data.application_process,
      application_requirements: data.application_process.map(step => ({
        step: step.step_number,
        title: step.title,
        description: step.description,
        required_documents: step.required_documents,
        optional_documents: step.optional_documents
      })),
      
      // Evaluation and compliance
      evaluation_criteria: data.evaluation_criteria.join('; '),
      reporting_requirements: data.reporting_obligations.join('; '),
      compliance_requirements: data.compliance_requirements.join('; '),
      
      // Technical details
      technical_support: data.technical_requirements,
      
      // Contact and legal
      agency: data.contacts.length > 0 ? 
        `${data.contacts[0].organization || 'FranceAgriMer'} - ${data.contacts[0].email || ''}` : 
        data.agency,
      
      // Language and metadata
      language: data.meta.language,
      
      // Complete audit trail
      audit: {
        extraction_method: 'ultra_complete_gpt4_2025',
        extracted_at: new Date().toISOString(),
        source_url: data.meta.source_url,
        confidence_score: data.meta.confidence_score,
        fields_extracted: Object.keys(data).length,
        documents_processed: data.meta.documents_processed,
        total_content_length: data.meta.total_content_length,
        content_sections_found: data.meta.content_sections_found,
        ultra_complete_extraction: true,
        model_used: 'gpt-4.1-2025-04-14',
        
        // Store ALL extracted data as raw backup
        complete_extracted_data: data
      },
      
      // Processing status
      requirements_extraction_status: 'ultra_complete',
      
      // Missing fields tracking
      missing_fields: []
    };
    
    console.log(`💾 Storing subsidy with ${Object.keys(subsidyRecord).length} mapped fields`);
    console.log(`📊 Original extraction had ${Object.keys(data).length} fields`);
    
    const { data: insertedData, error } = await supabase
      .from('subsidies_structured')
      .insert(subsidyRecord)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error storing ultra-complete subsidy data:', error);
      throw error;
    }
    
    console.log('✅ Ultra-complete subsidy data stored successfully:', insertedData.id);
    return insertedData.id;
    
  } catch (error) {
    console.error('❌ Error in storeCompleteSubsidyData:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, forceReprocess }: ExtractionRequest = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }
    
    console.log(`🚀 Starting ultra-complete extraction for: ${url}`);
    
    // Check if already processed (unless force reprocess)
    if (!forceReprocess) {
      const { data: existing } = await supabase
        .from('subsidies_structured')
        .select('id, audit')
        .eq('url', url)
        .maybeSingle();
        
      if (existing && existing.audit?.ultra_complete_extraction) {
        console.log(`✅ Already processed with ultra-complete extraction: ${existing.id}`);
        return new Response(JSON.stringify({
          success: true,
          subsidyId: existing.id,
          message: 'Already processed with ultra-complete extraction',
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Perform ultra-complete extraction
    const completeData = await extractCompleteSubsidyData(url);
    
    // Store in database
    const subsidyId = await storeCompleteSubsidyData(completeData);
    
    return new Response(JSON.stringify({
      success: true,
      subsidyId,
      extractedData: completeData,
      stats: {
        total_fields: Object.keys(completeData).length,
        documents_processed: completeData.meta.documents_processed,
        content_length: completeData.meta.total_content_length,
        confidence_score: completeData.meta.confidence_score
      },
      message: 'Ultra-complete extraction completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in ultra-complete-extraction function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});