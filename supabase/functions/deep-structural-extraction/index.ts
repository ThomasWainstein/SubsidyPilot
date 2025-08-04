import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuredSection {
  type: 'heading' | 'paragraph' | 'list' | 'numbered_list' | 'table' | 'document_link';
  level?: number;
  content: string;
  children?: StructuredSection[];
  metadata?: {
    tag?: string;
    className?: string;
    id?: string;
    href?: string;
    fileType?: string;
    fileSize?: string;
  };
}

interface DocumentInfo {
  name: string;
  url: string;
  type: string;
  size?: string;
  description?: string;
  isRequired?: boolean;
}

interface DeepExtractionResult {
  url: string;
  title: string;
  sections: StructuredSection[];
  documents: DocumentInfo[];
  eligibility: StructuredSection[];
  applicationSteps: StructuredSection[];
  evaluationCriteria: StructuredSection[];
  deadlines: StructuredSection[];
  amounts: StructuredSection[];
  completeness: {
    hasStructuredContent: boolean;
    hasDocuments: boolean;
    hasEligibility: boolean;
    hasApplicationSteps: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, forceReprocess } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`Starting deep structural extraction for: ${url}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already processed
    if (!forceReprocess) {
      const { data: existing } = await supabase
        .from('subsidies_structured')
        .select('*')
        .eq('url', url)
        .eq('requirements_extraction_status', 'deep_complete')
        .single();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          data: existing,
          message: 'Already processed with deep extraction'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch page content
    const pageContent = await fetchPageContent(url);
    
    // Extract structured content with preserved hierarchy
    const extractionResult = await extractStructuredContent(pageContent, url);
    
    // Store in database
    const storedId = await storeStructuredExtraction(supabase, extractionResult);

    console.log(`Deep extraction completed for ${url}, stored with ID: ${storedId}`);

    return new Response(JSON.stringify({
      success: true,
      data: extractionResult,
      storedId,
      message: 'Deep structural extraction completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Deep extraction error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchPageContent(url: string): Promise<string> {
  console.log(`Fetching content from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

async function extractStructuredContent(html: string, sourceUrl: string): Promise<DeepExtractionResult> {
  console.log('Starting structural content extraction...');

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const extractionPrompt = `
You are an advanced extraction agent for AgriTool. Extract ALL sections and downloadable files from this FranceAgriMer subsidy page.

CRITICAL: Output a structured JSON that preserves every section, document, deadline, and application step for perfect UI rendering.

### Required JSON Structure:
{
  "title": "Exact page title",
  "url": "${sourceUrl}",
  "sections": [
    {
      "name": "Présentation",
      "content_html": "Rich HTML with bullets, links, formatting preserved"
    },
    {
      "name": "Pour qui ?",
      "content_html": "Eligibility criteria with full details and formatting"
    },
    {
      "name": "Quand ?",
      "content_html": "All timing information with formatting",
      "deadlines": [
        { "label": "Application deadline", "date": "YYYY-MM-DD", "notes": "Additional timing info" }
      ]
    },
    {
      "name": "Comment ?",
      "content_html": "Application process details",
      "application_steps": [
        { "step_number": 1, "title": "Step title", "instructions_html": "Detailed instructions" }
      ]
    },
    {
      "name": "Documents",
      "documents": [
        {
          "label": "Document name",
          "url": "Full download URL",
          "type": "pdf|docx|xlsx|etc",
          "size": "File size if available",
          "required": true/false,
          "notes": "Purpose or description"
        }
      ]
    },
    {
      "name": "Contact",
      "emails": ["email@domain.fr"],
      "phones": ["phone numbers"],
      "links": ["https://portal-links.fr"]
    },
    {
      "name": "FAQ",
      "content_html": "FAQ content if present"
    }
  ],
  "region": ["France", "specific regions"],
  "sector": ["Agriculture", "Marine", etc],
  "legal_entity_type": ["Farmers", "Cooperatives", etc],
  "amount": ["funding amounts"],
  "co_financing_rate": null,
  "agency": "FranceAgriMer",
  "program": "Program name",
  "extraction_date": "${new Date().toISOString().split('T')[0]}"
}

### Extraction Rules:
1. **Extract ALL downloadable documents** - find every PDF, DOCX, XLSX link with labels and sizes
2. **Preserve formatting** - keep bullets, bold, italics, line breaks in content_html
3. **Extract deadlines** - parse all dates, convert to YYYY-MM-DD format
4. **Capture application steps** - number and detail each step
5. **Find contact info** - emails, phones, portal links
6. **Never flatten** - keep each logical section separate

### HTML Content to Extract:
${html}

Return ONLY the JSON object, no additional text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a precision data extraction specialist. Your job is to create perfect structural mirrors of web content with zero data loss.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 16000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const extractedContent = data.choices[0].message.content;

  try {
    const result = JSON.parse(extractedContent);
    console.log(`Extraction completed: ${result.sections?.length || 0} sections, ${result.documents?.length || 0} documents`);
    return result;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', parseError);
    throw new Error('Failed to parse extracted content as JSON');
  }
}

async function storeStructuredExtraction(supabase: any, extraction: any): Promise<string> {
  console.log('Storing comprehensive structured extraction...');

  // Extract description from first section
  const description = extraction.sections?.[0]?.content_html
    ?.replace(/<[^>]*>/g, '') // Strip HTML tags
    ?.substring(0, 500) || 'No description available';

  // Extract legacy fields for compatibility
  const eligibilitySection = extraction.sections?.find((s: any) => s.name === 'Pour qui ?');
  const applicationSection = extraction.sections?.find((s: any) => s.name === 'Comment ?');
  
  const { data, error } = await supabase
    .from('subsidies_structured')
    .upsert({
      url: extraction.url,
      title: extraction.title,
      description: description,
      eligibility: eligibilitySection?.content_html || '',
      application_method: applicationSection?.content_html || '',
      evaluation_criteria: '',
      documents: extraction.sections?.find((s: any) => s.name === 'Documents')?.documents || [],
      region: extraction.region || [],
      amount: extraction.amount || [],
      co_financing_rate: extraction.co_financing_rate,
      agency: extraction.agency || 'FranceAgriMer',
      sector: extraction.sector || [],
      legal_entity_type: extraction.legal_entity_type || [],
      audit: {
        comprehensive_sections: extraction.sections,
        extraction_timestamp: new Date().toISOString(),
        extraction_method: 'comprehensive_franceagrimer_v2',
        extraction_date: extraction.extraction_date,
        program: extraction.program
      },
      requirements_extraction_status: 'deep_complete',
      missing_fields: [],
      audit_notes: `Comprehensive extraction with ${extraction.sections?.length || 0} sections`,
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('Database storage error:', error);
    throw new Error(`Failed to store extraction: ${error.message}`);
  }

  return data.id;
}