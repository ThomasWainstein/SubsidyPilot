import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrefillField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  prefilledValue: string | number | boolean | null;
  confidence: number;
  source: 'user_profile' | 'farm_profile' | 'ai_inference' | 'manual_required';
  editable: boolean;
  reasoning: string;
  needsManualInput: boolean;
}

interface PrefillResult {
  formId: string;
  subsidyTitle: string;
  totalFields: number;
  prefilledFields: number;
  confidence: number;
  prefilledData: PrefillField[];
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { farmId, schemaId, action = 'prefill_form' } = await req.json();
    
    if (!farmId || !schemaId) {
      throw new Error('farmId and schemaId are required');
    }

    console.log(`Starting AI prefill for farm: ${farmId}, schema: ${schemaId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get farm profile
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (farmError) {
      throw new Error(`Failed to fetch farm: ${farmError.message}`);
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', farm.user_id)
      .single();

    if (userError) {
      console.warn('Could not fetch user profile:', userError.message);
    }

    // Get form schema
    const { data: formSchema, error: schemaError } = await supabase
      .from('subsidy_form_schemas')
      .select('*')
      .eq('id', schemaId)
      .single();

    if (schemaError) {
      throw new Error(`Failed to fetch schema: ${schemaError.message}`);
    }

    console.log(`Processing prefill for schema: ${formSchema.schema.documentTitle}`);

    // Generate AI prefill
    const prefillResult = await generateAIPrefill(
      farm,
      userProfile,
      formSchema.schema,
      openAIApiKey
    );

    // Store prefill result
    const { data: storedResult, error: storeError } = await supabase
      .from('subsidy_applications')
      .insert({
        form_id: schemaId,
        farm_id: farmId,
        form_data: {
          prefillResult,
          generatedAt: new Date().toISOString(),
          status: 'ai_prefilled'
        },
        status: 'draft'
      })
      .select('id')
      .single();

    if (storeError) {
      console.warn('Failed to store prefill result:', storeError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      prefillResult,
      applicationId: storedResult?.id,
      message: `AI prefilled ${prefillResult.prefilledFields}/${prefillResult.totalFields} fields`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI prefill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIPrefill(
  farm: any,
  userProfile: any,
  schema: any,
  apiKey: string
): Promise<PrefillResult> {
  console.log('Generating AI prefill with OpenAI...');

  const prefillPrompt = `
You are an AI assistant that prefills French agricultural subsidy application forms using available farm and user data.

FARM PROFILE:
${JSON.stringify(farm, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

FORM SCHEMA TO PREFILL:
${JSON.stringify(schema, null, 2)}

Your task is to intelligently map the available farm and user data to the form fields in the schema. For each field in the schema, determine:

1. Can this field be filled from available data?
2. What confidence level (0-100) do you have in the mapping?
3. What is the source of the data (user_profile, farm_profile, ai_inference)?
4. Does this field need manual input from the user?

Return a JSON object with this exact structure:
{
  "formId": "${schema.documentTitle}",
  "subsidyTitle": "${schema.documentTitle}",
  "totalFields": [count of all fields in schema],
  "prefilledFields": [count of fields you can prefill],
  "confidence": [overall confidence 0-100],
  "prefilledData": [
    {
      "fieldName": "field_name_from_schema",
      "fieldLabel": "field_label_from_schema", 
      "fieldType": "field_type_from_schema",
      "prefilledValue": "actual_value_or_null",
      "confidence": 85,
      "source": "user_profile|farm_profile|ai_inference",
      "editable": true,
      "reasoning": "Mapped from farm.name field",
      "needsManualInput": false
    }
  ],
  "timestamp": "${new Date().toISOString()}"
}

MAPPING RULES:
- nom_prenom/name fields → userProfile.full_name or farm.name
- siret/business_id → farm.cnp_or_cui  
- address/adresse → farm.address
- hectares/surface → farm.total_hectares
- department/departement → farm.department
- phone/telephone → farm.phone
- email → userProfile.email
- legal_status → farm.legal_status
- livestock/elevage → farm.livestock_present
- certifications → farm.certifications

For fields you cannot map:
- Set prefilledValue to null
- Set needsManualInput to true
- Set source to "manual_required"
- Set confidence to 0

Be realistic about confidence scores:
- Exact matches: 95-100%
- Good inference: 70-85%
- Uncertain inference: 40-69%
- Manual required: 0%
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in French agricultural forms and data mapping. Generate accurate and realistic prefill data with appropriate confidence scores.'
        },
        {
          role: 'user',
          content: prefillPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const prefillContent = data.choices[0].message.content;

  try {
    const result = JSON.parse(prefillContent);
    console.log(`AI prefill generated: ${result.prefilledFields}/${result.totalFields} fields`);
    return result;
  } catch (parseError) {
    console.error('Failed to parse AI prefill response:', parseError);
    throw new Error('Failed to parse AI prefill response as JSON');
  }
}