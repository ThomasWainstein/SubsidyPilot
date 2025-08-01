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
You are an expert at extracting structured subsidy information while preserving ALL original formatting, hierarchy, and logical structure.

CRITICAL REQUIREMENTS:
1. Extract EVERY piece of content - no summarization or collapsing
2. Preserve ALL bullet points, sub-bullets, numbered lists, and indentation
3. Identify and extract ALL linked documents with metadata
4. Map content to specific sections while maintaining structure
5. Flag any content that cannot be categorized
6. NEVER use "Not specified" - if data exists but is unclear, include it with a warning

HTML Content:
${html}

Return a JSON object with this EXACT structure:
{
  "url": "${sourceUrl}",
  "title": "Exact page title",
  "sections": [
    {
      "type": "heading|paragraph|list|numbered_list|table|document_link",
      "level": 1-6,
      "content": "Exact text content",
      "children": [...nested items...],
      "metadata": {
        "tag": "original HTML tag",
        "className": "CSS classes if any",
        "href": "link URL if applicable",
        "fileType": "pdf|doc|xls etc if document",
        "fileSize": "size if available"
      }
    }
  ],
  "documents": [
    {
      "name": "Document name",
      "url": "Full document URL",
      "type": "pdf|doc|docx|xls|xlsx",
      "size": "File size if available",
      "description": "Context or description",
      "isRequired": true/false
    }
  ],
  "eligibility": [...structured sections for who can apply...],
  "applicationSteps": [...structured sections for how to apply...],
  "evaluationCriteria": [...structured sections for evaluation...],
  "deadlines": [...structured sections for dates and deadlines...],
  "amounts": [...structured sections for funding amounts...],
  "completeness": {
    "hasStructuredContent": true/false,
    "hasDocuments": true/false,
    "hasEligibility": true/false,
    "hasApplicationSteps": true/false,
    "missingFields": ["field1", "field2"],
    "warnings": ["warning1", "warning2"]
  }
}

EXTRACTION RULES:
- Keep ALL original text, spacing, and structure
- For lists: preserve nesting levels exactly
- For documents: extract name, type, size, and full URL
- For sections: map to appropriate category but preserve ALL content
- Flag unmappable content in warnings, never omit it
- Include metadata for all elements to preserve context
`;

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

async function storeStructuredExtraction(supabase: any, extraction: DeepExtractionResult): Promise<string> {
  console.log('Storing structured extraction...');

  const { data, error } = await supabase
    .from('subsidies_structured')
    .upsert({
      url: extraction.url,
      title: extraction.title,
      description: extraction.sections.find(s => s.type === 'paragraph')?.content || 'No description available',
      eligibility: extraction.eligibility.map(e => e.content).join('\n'),
      application_method: extraction.applicationSteps.map(s => s.content).join('\n'),
      evaluation_criteria: extraction.evaluationCriteria.map(e => e.content).join('\n'),
      documents: extraction.documents,
      audit: {
        sections: extraction.sections,
        completeness: extraction.completeness,
        extraction_timestamp: new Date().toISOString(),
        extraction_method: 'deep_structural'
      },
      requirements_extraction_status: 'deep_complete',
      missing_fields: extraction.completeness.missingFields,
      audit_notes: extraction.completeness.warnings.join('; '),
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