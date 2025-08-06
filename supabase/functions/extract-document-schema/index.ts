import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentSchemaExtractionRequest {
  subsidyId: string;
  documentUrl?: string;
  forceExtraction?: boolean;
}

interface ExtractedSchema {
  sections: Record<string, any>;
  fields: Record<string, any>;
  validation_rules: Record<string, any>;
  required_documents: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check required environment variables first
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const { subsidyId, documentUrl, forceExtraction = false } = await req.json() as DocumentSchemaExtractionRequest;
    
    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    console.log(`🔍 Starting document schema extraction for subsidy: ${subsidyId}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if extraction already exists and is successful
    if (!forceExtraction) {
      const { data: existingExtraction } = await supabase
        .from('document_extraction_status')
        .select('*')
        .eq('subsidy_id', subsidyId)
        .eq('extraction_status', 'completed')
        .maybeSingle();

      if (existingExtraction) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Schema extraction already completed',
          extractionId: existingExtraction.id,
          schema: existingExtraction.extracted_schema
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get subsidy and documents info
    const { data: subsidy, error: subsidyError } = await supabase
      .from('subsidies_structured')
      .select('*')
      .eq('id', subsidyId)
      .single();

    if (subsidyError) {
      throw new Error(`Failed to fetch subsidy: ${subsidyError.message}`);
    }

    // Create or update extraction status record
    const { data: extractionRecord, error: insertError } = await supabase
      .from('document_extraction_status')
      .upsert({
        subsidy_id: subsidyId,
        document_url: documentUrl || subsidy.url || '',
        document_type: 'subsidy_page',
        extraction_status: 'processing',
        field_count: 0,
        coverage_percentage: 0,
        extraction_errors: []
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create extraction record: ${insertError.message}`);
    }

    // Extract schema using OpenAI
    const extractedSchema = await extractDocumentSchema(subsidy, documentUrl);
    
    // Calculate metrics
    const fieldCount = Object.keys(extractedSchema.fields || {}).length;
    const sectionCount = Object.keys(extractedSchema.sections || {}).length;
    const totalItems = fieldCount + sectionCount;
    const coveragePercentage = totalItems > 0 ? Math.min(100, (totalItems / 20) * 100) : 0;

    // Update extraction status
    const { error: updateError } = await supabase
      .from('document_extraction_status')
      .update({
        extraction_status: 'completed',
        extracted_schema: extractedSchema,
        field_count: fieldCount,
        coverage_percentage: coveragePercentage,
        extraction_errors: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionRecord.id);

    if (updateError) {
      throw new Error(`Failed to update extraction record: ${updateError.message}`);
    }

    // Store form schema
    const { error: schemaError } = await supabase
      .from('subsidy_form_schemas')
      .upsert({
        subsidy_id: subsidyId,
        schema: {
          form_structure: extractedSchema.sections,
          fields: extractedSchema.fields,
          validation: extractedSchema.validation_rules,
          documents: extractedSchema.required_documents,
          extraction_metadata: {
            extracted_at: new Date().toISOString(),
            field_count: fieldCount,
            coverage_percentage: coveragePercentage
          }
        },
        version: '1.0'
      });

    if (schemaError) {
      console.error('⚠️ Failed to store form schema:', schemaError);
      // Don't fail the whole operation for this
    }

    console.log(`✅ Schema extraction completed for subsidy ${subsidyId}: ${fieldCount} fields, ${coveragePercentage}% coverage`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Document schema extraction completed successfully',
      extractionId: extractionRecord.id,
      schema: extractedSchema,
      metrics: {
        field_count: fieldCount,
        coverage_percentage: coveragePercentage
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Schema extraction error:', error.message);
    
    // Try to update extraction status to failed if we have the subsidy ID
    try {
      const { subsidyId } = await req.json();
      if (subsidyId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('document_extraction_status')
          .upsert({
            subsidy_id: subsidyId,
            document_url: '',
            document_type: 'subsidy_page',
            extraction_status: 'failed',
            extraction_errors: [{ error: error.message, timestamp: new Date().toISOString() }]
          });
      }
    } catch (updateError) {
      console.error('Failed to update extraction status to failed:', updateError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractDocumentSchema(subsidy: any, documentUrl?: string): Promise<ExtractedSchema> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`🤖 Extracting schema for subsidy: ${subsidy.title}`);

  // Get comprehensive sections if available
  const comprehensiveSections = subsidy.audit?.comprehensive_sections || [];
  
  const extractionPrompt = `
You are a form schema extraction specialist. Create a comprehensive application form schema based on this subsidy information.

SUBSIDY INFORMATION:
Title: ${subsidy.title}
Description: ${subsidy.description}
Eligibility: ${subsidy.eligibility}
Application Method: ${subsidy.application_method}
Evaluation Criteria: ${subsidy.evaluation_criteria}

${comprehensiveSections.length > 0 ? `
COMPREHENSIVE SECTIONS:
${JSON.stringify(comprehensiveSections, null, 2)}
` : ''}

DOCUMENTS: ${JSON.stringify(subsidy.documents || [])}

Create a JSON schema for an application form with these exact sections:

{
  "sections": {
    "applicant_information": {
      "title": "Applicant Information",
      "fields": {
        "organization_name": {
          "type": "string",
          "label": "Organization Name",
          "required": true,
          "validation": {"minLength": 2}
        },
        "legal_status": {
          "type": "select",
          "label": "Legal Status",
          "required": true,
          "options": ["Individual", "Cooperative", "Company", "Association"]
        },
        "siret_number": {
          "type": "string",
          "label": "SIRET Number",
          "required": true,
          "validation": {"pattern": "^[0-9]{14}$"}
        }
      }
    },
    "project_details": {
      "title": "Project Details", 
      "fields": {
        "project_title": {
          "type": "string",
          "label": "Project Title",
          "required": true
        },
        "project_description": {
          "type": "textarea",
          "label": "Project Description",
          "required": true,
          "validation": {"minLength": 100}
        },
        "project_duration": {
          "type": "number",
          "label": "Project Duration (months)",
          "required": true,
          "validation": {"min": 1, "max": 60}
        }
      }
    },
    "financial_information": {
      "title": "Financial Information",
      "fields": {
        "total_budget": {
          "type": "number",
          "label": "Total Project Budget (€)",
          "required": true,
          "validation": {"min": 0}
        },
        "requested_amount": {
          "type": "number", 
          "label": "Requested Grant Amount (€)",
          "required": true,
          "validation": {"min": 0}
        }
      }
    },
    "supporting_documents": {
      "title": "Supporting Documents",
      "fields": {
        "business_plan": {
          "type": "file",
          "label": "Business Plan",
          "required": true,
          "accept": ".pdf,.doc,.docx"
        },
        "financial_statements": {
          "type": "file",
          "label": "Financial Statements",
          "required": true,
          "accept": ".pdf,.xls,.xlsx"
        }
      }
    }
  },
  "fields": {
    // Flattened field definitions for easy access
  },
  "validation_rules": {
    "cross_field_validations": [
      {
        "rule": "requested_amount <= total_budget",
        "message": "Requested amount cannot exceed total budget"
      }
    ]
  },
  "required_documents": [
    {
      "name": "Business Plan",
      "type": "pdf",
      "required": true,
      "description": "Detailed business plan for the project"
    }
  ]
}

IMPORTANT: Extract actual field requirements from the subsidy information. If eligibility mentions specific criteria, create corresponding form fields. If documents are listed, include them in required_documents. Make the schema comprehensive but realistic.

Return ONLY the JSON object.`;

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
          content: 'You are a form schema extraction specialist. Create comprehensive application form schemas based on subsidy requirements.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenAI API error (${response.status}):`, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const extractedContent = data.choices[0].message.content;

  try {
    const schema = JSON.parse(extractedContent);
    
    // Flatten fields for easy access
    schema.fields = {};
    Object.values(schema.sections || {}).forEach((section: any) => {
      Object.entries(section.fields || {}).forEach(([fieldName, fieldDef]) => {
        schema.fields[fieldName] = fieldDef;
      });
    });

    return schema;
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response:', parseError);
    console.error('Raw response content:', extractedContent);
    throw new Error('Failed to parse extracted schema as JSON');
  }
}