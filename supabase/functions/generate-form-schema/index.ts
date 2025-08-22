import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'file' | 'date' | 'radio' | 'multi-select';
  label: string;
  description?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
  placeholder?: string;
  helpText?: string;
  conditionalLogic?: {
    showIf: string; // Field ID
    value: any; // Value that triggers showing this field
  };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
}

interface ApplicationFormSchema {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  metadata: {
    subsidyId: string;
    clientType: string;
    estimatedTime: number; // minutes
    difficulty: 'easy' | 'medium' | 'hard';
    requiredDocuments: string[];
    generatedAt: string;
    version: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subsidyId, clientType, clientProfileId } = await req.json();

    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    console.log(`📝 Generating application form for subsidy: ${subsidyId}, client type: ${clientType}`);

    // Get subsidy data
    const { data: subsidy, error: subsidyError } = await supabase
      .from('subsidies')
      .select('*')
      .eq('id', subsidyId)
      .single();

    if (subsidyError || !subsidy) {
      throw new Error('Subsidy not found');
    }

    // Get client profile if provided
    let clientProfile = null;
    if (clientProfileId) {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientProfileId)
        .single();
      
      if (!error) {
        clientProfile = data;
      }
    }

    console.log('🤖 Generating form schema with AI...');

    // Generate form schema using AI
    const formPrompt = `
Generate a comprehensive application form schema for this subsidy:

SUBSIDY INFORMATION:
Title: ${subsidy.title?.en || subsidy.title?.fr || subsidy.title || 'Untitled'}
Description: ${subsidy.description?.en || subsidy.description?.fr || subsidy.description || 'No description'}
Agency: ${subsidy.agency || 'Unknown'}
Eligibility: ${subsidy.eligibility_criteria?.en || subsidy.eligibility_criteria?.fr || 'No criteria'}
Amount: ${subsidy.amount?.en || subsidy.amount?.fr || 'Not specified'}
Client Type: ${clientType}

FORM GENERATION REQUIREMENTS:

1. Create a form with 4-6 logical sections:
   - Applicant Information
   - Project/Organization Details  
   - Financial Information
   - Supporting Documents
   - Additional sections based on subsidy requirements

2. Field types to use:
   - text: Names, addresses, short answers
   - email: Email addresses
   - number: Amounts, counts, percentages
   - select: Dropdown choices
   - textarea: Long descriptions, project details
   - checkbox: Yes/no, agreement checkboxes
   - file: Document uploads
   - date: Deadlines, start dates
   - radio: Exclusive choices
   - multi-select: Multiple choice selections

3. CLIENT TYPE SPECIFIC FIELDS:
   ${clientType === 'business' ? `
   - Company name, VAT number, SIRET/SIREN
   - Number of employees, annual turnover
   - Business sector, NACE code
   - Legal form (SAS, SARL, etc.)
   ` : ''}
   ${clientType === 'ngo' ? `
   - Organization name, registration number
   - Mission statement, beneficiaries
   - Legal status (association, foundation)
   - Board composition
   ` : ''}
   ${clientType === 'municipality' ? `
   - Municipality name, administrative code
   - Population, budget
   - Contact person, department
   - Project impact area
   ` : ''}
   ${clientType === 'farmer' ? `
   - Farm name, agricultural number
   - Total hectares, crop types
   - Organic certification
   - Farm activities
   ` : ''}
   ${clientType === 'individual' ? `
   - Full name, date of birth
   - Address, nationality
   - Income level, employment status
   - Educational background
   ` : ''}

4. VALIDATION RULES:
   - Mark required fields based on eligibility criteria
   - Add appropriate validation (email format, number ranges)
   - Include pattern matching for specific formats

5. CONDITIONAL LOGIC:
   - Show/hide fields based on other field values
   - Example: Show "Number of employees" only if legal form is "Company"

6. REQUIRED DOCUMENTS:
   Based on the subsidy requirements, specify which documents need to be uploaded.

Return ONLY valid JSON in this exact format:
{
  "title": "Application Form Title",
  "description": "Brief form description",
  "sections": [
    {
      "id": "section_1",
      "title": "Section Title",
      "description": "Section description",
      "order": 1,
      "fields": [
        {
          "id": "field_id",
          "type": "text",
          "label": "Field Label",
          "description": "Field description",
          "required": true,
          "placeholder": "Enter text...",
          "helpText": "Additional help text",
          "validation": {
            "minLength": 2,
            "maxLength": 100
          }
        }
      ]
    }
  ],
  "estimatedTime": 30,
  "difficulty": "medium",
  "requiredDocuments": ["Document 1", "Document 2"]
}`;

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
            content: 'You are an expert form designer specializing in government subsidy applications. You understand EU regulations, French administrative requirements, and best practices for complex application forms. Generate user-friendly, comprehensive forms that maximize application success rates.' 
          },
          { role: 'user', content: formPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    let formSchemaText = aiData.choices[0].message.content.trim();
    
    // Clean JSON response
    formSchemaText = formSchemaText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('🔧 Parsing generated form schema...');
    
    const formData = JSON.parse(formSchemaText);

    // Build complete schema with metadata
    const formSchema: ApplicationFormSchema = {
      id: `form_${subsidyId}_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      sections: formData.sections.map((section: any, index: number) => ({
        ...section,
        order: index + 1,
        fields: section.fields.map((field: any) => ({
          ...field,
          id: field.id || `field_${Math.random().toString(36).substr(2, 9)}`
        }))
      })),
      metadata: {
        subsidyId,
        clientType: clientType || 'unknown',
        estimatedTime: formData.estimatedTime || 30,
        difficulty: formData.difficulty || 'medium',
        requiredDocuments: formData.requiredDocuments || [],
        generatedAt: new Date().toISOString(),
        version: 'v1.0'
      }
    };

    // Store the form schema
    const { error: schemaError } = await supabase
      .from('subsidy_form_schemas')
      .upsert({
        subsidy_id: subsidyId,
        schema: formSchema,
        version: formSchema.metadata.version,
        client_type: clientType,
        updated_at: new Date().toISOString()
      }, { onConflict: 'subsidy_id' });

    if (schemaError) {
      console.error('❌ Failed to store form schema:', schemaError);
      // Don't throw - we can still return the schema
    }

    console.log(`✅ Application form generated with ${formSchema.sections.length} sections, ${formSchema.sections.reduce((total, section) => total + section.fields.length, 0)} fields`);

    return new Response(JSON.stringify({
      success: true,
      formSchema,
      message: 'Application form generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Form generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});