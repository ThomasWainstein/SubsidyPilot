import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subsidyId, extractionId } = await req.json();

    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    console.log(`🔍 Generating form for subsidy: ${subsidyId}`);

    // Get subsidy data including schema
    const { data: subsidy, error: subsidyError } = await supabase
      .from('subsidies')
      .select('*')
      .eq('id', subsidyId)
      .single();

    if (subsidyError || !subsidy) {
      throw new Error('Subsidy not found');
    }

    console.log('📊 Subsidy data found, checking application schema...');

    // Check if we have application_schema or need to generate from raw_content
    let schemaData = subsidy.application_schema;
    
    if (!schemaData && subsidy.raw_content?.enhanced_data) {
      // Use enhanced extraction data
      schemaData = subsidy.raw_content.enhanced_data;
      console.log('✅ Using enhanced extraction data for form generation');
    }

    if (!schemaData) {
      throw new Error('No schema data available. Please run enhanced extraction first.');
    }

    // Generate form schema using OpenAI
    const formPrompt = `
You are a form generator for subsidy applications. Based on the following subsidy data, generate a comprehensive application form schema.

Subsidy Information:
Title: ${subsidy.title?.fr || subsidy.title}
Description: ${subsidy.description?.fr || subsidy.description}
Agency: ${subsidy.agency}

Enhanced Data: ${JSON.stringify(schemaData, null, 2)}

Generate a JSON form schema with this structure:
{
  "title": "Application Form Title",
  "description": "Form description",
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "description": "Section description",
      "fields": [
        {
          "id": "field_id",
          "type": "text|email|number|select|textarea|checkbox|file",
          "label": "Field Label",
          "description": "Field description",
          "required": true|false,
          "validation": {
            "min": 0,
            "max": 100,
            "pattern": "regex if needed"
          },
          "options": ["option1", "option2"] // for select fields only
        }
      ]
    }
  ]
}

Requirements:
1. Include sections for: Applicant Information, Project Details, Financial Information, Supporting Documents
2. Base fields on the eligibility criteria and application requirements
3. Make required fields clear
4. Include appropriate validation
5. Ensure all text is in French for French subsidies
6. Include file upload fields for required documents
7. Make the form comprehensive but user-friendly

Return only valid JSON.`;

    console.log('🤖 Calling OpenAI to generate form schema...');

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
            content: 'You are an expert form generator for government subsidy applications. Generate comprehensive, user-friendly forms based on subsidy requirements.' 
          },
          { role: 'user', content: formPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    const formSchemaText = aiData.choices[0].message.content.trim();
    
    console.log('🔧 Parsing generated form schema...');
    
    // Clean and parse JSON
    const cleanedJson = formSchemaText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const formSchema = JSON.parse(cleanedJson);

    // Store the generated schema
    const { error: schemaError } = await supabase
      .from('subsidy_form_schemas')
      .upsert({
        subsidy_id: subsidyId,
        schema: formSchema,
        version: 'v1.0',
        updated_at: new Date().toISOString()
      }, { onConflict: 'subsidy_id' });

    if (schemaError) {
      console.error('❌ Failed to store schema:', schemaError);
      // Don't throw - we can still return the schema
    }

    console.log(`✅ Form schema generated with ${formSchema.sections?.length || 0} sections`);

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