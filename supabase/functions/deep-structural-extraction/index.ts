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
Extract and preserve COMPLETE hierarchical structure using structured markdown format. Every heading, subheading, bullet point, numbered list, table, and indentation level must be maintained exactly as it appears in the source.

CRITICAL REQUIREMENTS:

### Hierarchical Structure as Markdown
- Convert ALL content to structured markdown with preserved hierarchy
- Use proper markdown syntax: # for headings, - for bullets, 1. for numbered lists
- Preserve exact nesting with proper indentation (2 spaces per level)
- Tables must use markdown table format | Column | Column |
- Code blocks for technical content using backticks

### Structure Types to Preserve
- Headings: #, ##, ### etc. for h1, h2, h3
- Lists: - for bullets with proper indentation
- Numbered: 1., 2. etc. with sub-numbering 1.1, 1.2
- Tables: Markdown table format with proper alignment

### Content Extraction Rules
- Extract content AS MARKDOWN preserving all visual hierarchy
- If you cannot parse structure, include raw HTML in code blocks
- NEVER flatten lists or remove indentation
- Preserve bold, italic, and other formatting using markdown syntax

HTML Content:
${html}

Return a JSON object with this EXACT structure:
{
  "url": "${sourceUrl}",
  "title": "Exact page title",
  "content_markdown": "# Complete structured markdown content with preserved hierarchy\\n\\n## Section 1\\n- Bullet point 1\\n  - Sub-bullet 1\\n  - Sub-bullet 2\\n- Bullet point 2\\n\\n### Subsection\\n1. Numbered item 1\\n   1. Sub-numbered item\\n2. Numbered item 2",
  "structured_sections": {
    "eligibility": "## Eligibility Criteria\\n\\n- French farmers with valid SIRET\\n  - Individual farmers\\n  - Agricultural cooperatives\\n- Project location requirements\\n  - Must be in rural designated areas",
    "application_steps": "## Application Process\\n\\n1. **Preparation Phase**\\n   1. Gather required documents\\n   2. Complete eligibility self-assessment\\n2. **Submission Phase**\\n   1. Online application portal\\n   2. Document upload",
    "evaluation_criteria": "## Evaluation Criteria\\n\\n### Technical Merit (40 points)\\n- Innovation level\\n- Technical feasibility\\n\\n### Economic Impact (35 points)\\n- Job creation potential\\n- Revenue projections",
    "deadlines": "## Important Dates\\n\\n- **Application Opens**: Date\\n- **Application Deadline**: Date\\n- **Decision Notification**: Date",
    "amounts": "## Funding Details\\n\\n### Grant Amounts\\n- **Minimum**: Amount\\n- **Maximum**: Amount\\n- **Co-financing Rate**: Percentage"
  },
  "documents": [
    {
      "name": "Document name",
      "type": "pdf|doc|xls|other",
      "size": "File size",
      "url": "Full document URL",
      "markdown_link": "[Document Name](full-url) (PDF, 2MB)"
    }
  ],
  "extraction_warnings": [
    "List any hierarchical preservation issues"
  ],
  "completeness": {
    "hasStructuredContent": true/false,
    "hasDocuments": true/false,
    "hasEligibility": true/false,
    "hasApplicationSteps": true/false,
    "missingFields": ["field1", "field2"],
    "warnings": ["warning1", "warning2"],
    "markdown_quality_score": 0-100,
    "structure_integrity": 0-100
  }
}

EXTRACTION RULES:
- Keep ALL original text, spacing, and structure in markdown format
- For lists: preserve nesting levels exactly with proper markdown indentation
- For documents: create proper markdown links with metadata
- For sections: extract as clean markdown with hierarchy preserved
- Flag unmappable content in warnings, never omit it
- Ensure markdown will render identically to source visual structure
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
      description: extraction.content_markdown?.split('\n').slice(0, 3).join(' ').substring(0, 500) || 'No description available',
      eligibility: extraction.structured_sections?.eligibility || '',
      application_method: extraction.structured_sections?.application_steps || '',
      evaluation_criteria: extraction.structured_sections?.evaluation_criteria || '',
      documents: extraction.documents || [],
      audit: {
        content_markdown: extraction.content_markdown,
        structured_sections: extraction.structured_sections,
        completeness: extraction.completeness,
        extraction_timestamp: new Date().toISOString(),
        extraction_method: 'deep_structural_markdown',
        markdown_quality: extraction.completeness?.markdown_quality_score || 0,
        structure_integrity: extraction.completeness?.structure_integrity || 0
      },
      requirements_extraction_status: 'deep_complete',
      missing_fields: extraction.completeness?.missingFields || [],
      audit_notes: extraction.completeness?.warnings?.join('; ') || '',
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