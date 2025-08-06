import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline utilities for self-contained edge function
function getStandardizedConfig() {
  const config = {
    supabase_url: Deno.env.get('SUPABASE_URL'),
    supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    openai_primary_key: Deno.env.get('SCRAPPER_RAW_GPT_API'),
    openai_backup_key: Deno.env.get('OPENAI_API_KEY')
  };

  if (!config.supabase_url || !config.supabase_service_key) {
    const missing = [];
    if (!config.supabase_url) missing.push('SUPABASE_URL');
    if (!config.supabase_service_key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing required Supabase configuration: ${missing.join(', ')}`);
  }

  return config;
}

class OpenAIClient {
  constructor(primaryKey, backupKey) {
    this.primaryKey = primaryKey;
    this.backupKey = backupKey;
    if (!primaryKey && !backupKey) {
      throw new Error('At least one OpenAI API key must be provided');
    }
  }

  async extractContent(content, systemPrompt, options = {}) {
    const keys = [this.primaryKey, this.backupKey].filter(Boolean);
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: content }
            ],
            temperature: options.temperature || 0.1,
            max_tokens: options.maxTokens || 2000
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          if (!content) throw new Error('No content in OpenAI response');
          
          try {
            const patterns = [
              /```json\n([\s\S]*?)\n```/,
              /```\n([\s\S]*?)\n```/,
              /\{[\s\S]*\}/
            ];
            
            for (const pattern of patterns) {
              const match = content.match(pattern);
              if (match) {
                const jsonStr = match[1] || match[0];
                return JSON.parse(jsonStr);
              }
            }
            
            return JSON.parse(content);
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI response:', content.substring(0, 200));
            throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
          }
        } else if (response.status === 429 && i < keys.length - 1) {
          console.warn(`⚠️ Rate limited on key ${i + 1}, trying next...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          const errorText = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }
      } catch (error) {
        if (i === keys.length - 1) {
          throw error;
        }
        console.warn(`⚠️ OpenAI key ${i + 1} failed, trying backup:`, error.message);
      }
    }
    
    throw new Error('All OpenAI keys failed');
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea' | 'file';
  label: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  placeholder?: string;
  section?: string;
}

interface GeneratedFormSchema {
  title: string;
  description: string;
  language: string;
  sections: {
    title: string;
    fields: FormField[];
  }[];
  validation_rules: {
    required_fields: string[];
    conditional_logic?: Record<string, any>;
  };
  submission_config: {
    endpoint?: string;
    method: string;
    format: 'json' | 'form-data';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = getStandardizedConfig();
    const openaiClient = new OpenAIClient(config.openai_primary_key, config.openai_backup_key);
    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    
    const { action, subsidy_id, document_url, document_content } = await req.json();

    console.log('📝 PDF Form Detector starting:', { action, subsidy_id, has_content: !!document_content });

    if (action === 'detect_and_generate') {
      let contentToAnalyze = document_content;
      
      // If document_url provided, fetch the content
      if (document_url && !contentToAnalyze) {
        try {
          const docResponse = await fetch(document_url);
          if (docResponse.ok) {
            const docText = await docResponse.text();
            contentToAnalyze = docText;
          }
        } catch (fetchError) {
          console.warn('⚠️ Failed to fetch document content:', fetchError);
        }
      }

      if (!contentToAnalyze) {
        throw new Error('No document content provided for analysis');
      }

      // Analyze content with OpenAI to detect form structure
      const formSchema = await analyzeDocumentForForms(contentToAnalyze, openaiClient);
      
      if (!formSchema) {
        return new Response(JSON.stringify({
          success: false,
          message: 'No form structure detected in document'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store the generated form schema
      const { data: storedSchema, error: schemaError } = await supabase
        .from('subsidy_form_schemas')
        .insert({
          subsidy_id,
          schema: formSchema,
          version: '1.0'
        })
        .select()
        .single();

      if (schemaError) {
        throw new Error(`Failed to store form schema: ${schemaError.message}`);
      }

      console.log(`✅ Generated and stored form schema for subsidy: ${subsidy_id}`);

      return new Response(JSON.stringify({
        success: true,
        schema_id: storedSchema.id,
        form_schema: formSchema,
        fields_detected: formSchema.sections.reduce((total, section) => total + section.fields.length, 0)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'batch_detect') {
      // Process multiple documents for form detection
      const { data: subsidies, error } = await supabase
        .from('subsidies')
        .select(`
          id,
          application_docs,
          title
        `)
        .not('application_docs', 'is', null)
        .limit(10);

      if (error) {
        throw new Error(`Failed to fetch subsidies: ${error.message}`);
      }

      const results = [];

      for (const subsidy of subsidies || []) {
        try {
          const docs = subsidy.application_docs as any[];
          if (docs && docs.length > 0) {
            // Take the first document for form analysis
            const docUrl = docs[0].document_url;
            
            if (docUrl) {
              console.log(`🔍 Analyzing document for subsidy: ${subsidy.id}`);
              
              // Recursively call this function for individual processing
              const detectionResult = await fetch(req.url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': req.headers.get('Authorization') || ''
                },
                body: JSON.stringify({
                  action: 'detect_and_generate',
                  subsidy_id: subsidy.id,
                  document_url: docUrl
                })
              });

              const result = await detectionResult.json();
              results.push({
                subsidy_id: subsidy.id,
                success: result.success,
                fields_count: result.fields_detected || 0
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process subsidy ${subsidy.id}:`, error);
          results.push({
            subsidy_id: subsidy.id,
            success: false,
            error: error.message
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(JSON.stringify({
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ PDF Form Detector error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeDocumentForForms(content: string, openaiClient: OpenAIClient): Promise<GeneratedFormSchema | null> {
  const systemPrompt = `You are an expert at analyzing government agricultural subsidy application documents and converting them into structured web form schemas.

Analyze the provided document content and extract the form structure. Return a JSON schema that can be used to generate a dynamic web form.

Required JSON structure:
{
  "title": "Application Form Title",
  "description": "Brief description of the form purpose",
  "language": "fr" or "ro" or "en",
  "sections": [
    {
      "title": "Section Name",
      "fields": [
        {
          "name": "field_name",
          "type": "text|number|date|email|phone|select|checkbox|textarea|file",
          "label": "Field Label",
          "required": true|false,
          "validation": {
            "min": 1,
            "max": 100,
            "pattern": "regex",
            "options": ["option1", "option2"]
          },
          "placeholder": "Enter...",
          "section": "section_name"
        }
      ]
    }
  ],
  "validation_rules": {
    "required_fields": ["field1", "field2"],
    "conditional_logic": {}
  },
  "submission_config": {
    "method": "POST",
    "format": "form-data"
  }
}

Guidelines:
- Identify logical sections (Personal Info, Farm Details, Financial Info, etc.)
- Detect field types based on content (dates, amounts, checkboxes, etc.)
- Mark required fields based on document indicators (*, required, obligatoire, etc.)
- Extract validation rules (min/max values, formats, etc.)
- Preserve original language of labels
- Include file upload fields for document attachments
- Create select options from enumerated choices
- Return null if no clear form structure is detected`;

  try {
    const prompt = `Analyze this document and extract the form structure:\n\n${content}`;
    const result = await openaiClient.extractContent(prompt, systemPrompt, {
      model: 'gpt-4o',
      maxTokens: 3000
    });
    
    return validateFormSchema(result) ? result : null;
  } catch (error) {
    console.warn('⚠️ Failed to analyze document for forms:', error);
    return null;
  }
}

function validateFormSchema(schema: any): boolean {
  // Basic validation of the form schema structure
  return (
    schema &&
    typeof schema.title === 'string' &&
    Array.isArray(schema.sections) &&
    schema.sections.length > 0 &&
    schema.sections.every((section: any) =>
      section.title &&
      Array.isArray(section.fields) &&
      section.fields.every((field: any) =>
        field.name && field.type && field.label
      )
    )
  );
}