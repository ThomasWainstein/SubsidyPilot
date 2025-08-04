import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QAResult {
  qa_pass: boolean;
  errors: string[];
  warnings: string[];
  missing_fields: string[];
  structure_loss: string[];
  documents_loss: string[];
  admin_required: boolean;
  source_url: string;
  review_links: {
    original_html: string;
    extracted_json: string;
    ui_screenshot?: string;
  };
  completeness_score: number;
  structural_integrity_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedData, originalHtml, sourceUrl } = await req.json();
    
    if (!extractedData || !originalHtml || !sourceUrl) {
      throw new Error('Missing required data: extractedData, originalHtml, sourceUrl');
    }

    console.log(`Starting QA validation for: ${sourceUrl}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Perform comprehensive QA validation
    const qaResult = await performQAValidation(extractedData, originalHtml, sourceUrl);
    
    // Store QA results in database
    await storeQAResults(supabase, qaResult);

    console.log(`QA validation completed for ${sourceUrl}: ${qaResult.qa_pass ? 'PASS' : 'FAIL'}`);

    return new Response(JSON.stringify({
      success: true,
      data: qaResult,
      message: `QA validation completed: ${qaResult.qa_pass ? 'PASS' : 'FAIL'}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('QA validation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performQAValidation(extractedData: any, originalHtml: string, sourceUrl: string): Promise<QAResult> {
  console.log('Performing comprehensive QA validation...');

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const qaPrompt = `
For each structured output, compare the extracted JSON to the raw HTML. Ensure:

1. All major headings, sections, and bullets from the source are present in the JSON, with correct nesting and structure.
2. No list or table is collapsed into a single paragraph ("wall of text").
3. All annexes/documents are present, with full metadata (name, type, link, size).
4. If a field is in the source and empty in the output, flag as ERROR with evidence (original HTML snippet, line number).
5. If "Not specified" is present but the source is non-empty, flag as ERROR.
6. If JS/dynamic content or annex loading is suspected, flag as WARNING.
7. For any extraction_warnings in the output, escalate to admin review.
8. No output is marked as deep_complete unless 100% of checks pass.

SOURCE HTML:
${originalHtml.substring(0, 30000)}

EXTRACTED JSON:
${JSON.stringify(extractedData, null, 2)}

SOURCE URL: ${sourceUrl}

Return a JSON object with this EXACT structure:
{
  "qa_pass": true|false,
  "errors": ["Specific error descriptions with evidence"],
  "warnings": ["Warning descriptions"],
  "missing_fields": ["List of fields that exist in source but missing in extraction"],
  "structure_loss": ["List of structural elements that were flattened or lost"],
  "documents_loss": ["List of documents/annexes that exist in source but missing in extraction"],
  "admin_required": true|false,
  "source_url": "${sourceUrl}",
  "review_links": {
    "original_html": "HTML snippet for review",
    "extracted_json": "JSON snippet for comparison"
  },
  "completeness_score": 0-100,
  "structural_integrity_score": 0-100,
  "detailed_analysis": {
    "sections_compared": number,
    "lists_preserved": number,
    "lists_flattened": number,
    "documents_found_in_source": number,
    "documents_extracted": number,
    "critical_missing_content": ["..."]
  }
}

VALIDATION RULES:
- Compare every bullet point, sub-bullet, and list item
- Verify all document links and metadata
- Check that hierarchical structure is preserved
- Flag any "Not specified" where source has content
- Calculate scores based on preservation ratio
- Mark admin_required=true if any errors or critical warnings exist
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
          content: 'You are a precision QA specialist. Your job is to rigorously validate data extraction completeness and structural integrity with zero tolerance for data loss.'
        },
        {
          role: 'user',
          content: qaPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 8000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const qaContent = data.choices[0].message.content;

  try {
    const result = JSON.parse(qaContent);
    console.log(`QA validation completed: ${result.qa_pass ? 'PASS' : 'FAIL'}, Score: ${result.completeness_score}%`);
    return result;
  } catch (parseError) {
    console.error('Failed to parse QA response:', parseError);
    throw new Error('Failed to parse QA validation as JSON');
  }
}

async function storeQAResults(supabase: any, qaResult: QAResult): Promise<void> {
  console.log('Storing QA results...');

  const { error } = await supabase
    .from('extraction_qa_results')
    .upsert({
      source_url: qaResult.source_url,
      qa_pass: qaResult.qa_pass,
      errors: qaResult.errors,
      warnings: qaResult.warnings,
      missing_fields: qaResult.missing_fields,
      structure_loss: qaResult.structure_loss,
      documents_loss: qaResult.documents_loss,
      admin_required: qaResult.admin_required,
      completeness_score: qaResult.completeness_score,
      structural_integrity_score: qaResult.structural_integrity_score,
      review_data: qaResult.review_links,
      qa_timestamp: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to store QA results:', error);
    throw new Error(`Failed to store QA results: ${error.message}`);
  }
}