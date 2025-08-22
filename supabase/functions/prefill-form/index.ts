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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formSchema, clientProfileId, smartFillLevel = 'comprehensive' } = await req.json();

    if (!formSchema) {
      throw new Error('Form schema is required');
    }

    console.log(`🎯 Pre-filling form with ${smartFillLevel} level for profile: ${clientProfileId}`);

    // Get client profile data
    let clientProfile = null;
    if (clientProfileId) {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*, applicant_types(*)')
        .eq('id', clientProfileId)
        .single();
      
      if (error) {
        console.warn('Could not fetch client profile:', error);
      } else {
        clientProfile = data;
      }
    }

    // Initialize form data structure
    const formData: Record<string, any> = {};
    const aiGeneratedFields: string[] = [];
    const mappedFields: string[] = [];

    // Direct field mapping from profile data
    if (clientProfile?.profile_data) {
      const profileData = clientProfile.profile_data;
      
      // Map common fields across all client types
      const commonMappings: Record<string, string[]> = {
        // Contact information
        'company_name': ['organization_name', 'entity_name', 'farm_name'],
        'organization_name': ['company_name', 'entity_name', 'farm_name'],
        'contact_email': ['email', 'contact_email', 'applicant_email'],
        'phone': ['phone_number', 'contact_phone', 'telephone'],
        'address': ['address', 'postal_address', 'registered_address'],
        'postal_code': ['zip_code', 'postal_code', 'postcode'],
        'city': ['city', 'commune', 'municipality'],
        'country': ['country', 'pays'],
        
        // Legal information
        'vat_number': ['vat_id', 'tax_number', 'tva'],
        'siret': ['siret_number', 'registration_number'],
        'legal_form': ['legal_status', 'company_type', 'entity_type'],
        
        // Financial data
        'annual_turnover': ['revenue', 'chiffre_affaires', 'turnover'],
        'employees': ['number_of_employees', 'staff_count', 'workforce'],
        
        // Sector information
        'sector': ['business_sector', 'activity_sector', 'nace_code'],
        'activity': ['main_activity', 'business_activity', 'activities'],
      };

      // Apply direct mappings
      for (const section of formSchema.sections) {
        for (const field of section.fields) {
          const fieldId = field.id.toLowerCase();
          
          // Try direct match first
          if (profileData[fieldId]) {
            formData[field.id] = profileData[fieldId];
            mappedFields.push(field.id);
            continue;
          }
          
          // Try mapped field names
          const mappingKey = Object.keys(commonMappings).find(key => 
            fieldId.includes(key) || key.includes(fieldId)
          );
          
          if (mappingKey) {
            const possibleFields = commonMappings[mappingKey];
            const matchedValue = possibleFields.find(pf => profileData[pf]);
            if (matchedValue && profileData[matchedValue]) {
              formData[field.id] = profileData[matchedValue];
              mappedFields.push(field.id);
            }
          }
        }
      }
    }

    // AI-powered field generation for complex fields
    if (smartFillLevel === 'comprehensive' && clientProfile) {
      console.log('🤖 Using AI for intelligent field completion...');
      
      // Find fields that need AI generation (narrative, descriptive fields)
      const aiFields = formSchema.sections.flatMap((section: any) => 
        section.fields.filter((field: any) => 
          (field.type === 'textarea' || field.label.toLowerCase().includes('description') || 
           field.label.toLowerCase().includes('project') || field.label.toLowerCase().includes('justification')) &&
          !formData[field.id]
        )
      );

      if (aiFields.length > 0) {
        const aiPrompt = `
Based on this client profile, generate appropriate content for the following form fields:

CLIENT PROFILE:
${JSON.stringify(clientProfile.profile_data, null, 2)}

Client Type: ${clientProfile.applicant_types?.type_name || 'unknown'}

FIELDS TO COMPLETE:
${aiFields.map((field: any) => `
- Field: ${field.label}
- Type: ${field.type}
- Description: ${field.description || 'No description'}
- Help Text: ${field.helpText || 'No help text'}
`).join('\n')}

GENERATION RULES:
1. Write in professional, formal tone suitable for government applications
2. Be specific and concrete, avoid vague statements
3. Focus on measurable outcomes and benefits
4. Keep responses appropriate for field type (brief for text, detailed for textarea)
5. Reference relevant profile data where applicable
6. Write in French if the subsidy appears to be French, otherwise English

Return ONLY a JSON object mapping field IDs to generated content:
{
  "field_id_1": "Generated content for field 1",
  "field_id_2": "Generated content for field 2"
}`;

        try {
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
                  content: 'You are an expert grant writer who helps organizations complete subsidy applications. Generate compelling, accurate content that maximizes approval chances while staying truthful to the client profile.' 
                },
                { role: 'user', content: aiPrompt }
              ],
              max_tokens: 2000,
              temperature: 0.3
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            let aiContent = aiData.choices[0].message.content.trim();
            
            // Clean JSON response
            aiContent = aiContent
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            
            const aiGeneratedContent = JSON.parse(aiContent);
            
            // Merge AI-generated content
            for (const [fieldId, content] of Object.entries(aiGeneratedContent)) {
              if (content && typeof content === 'string' && content.trim()) {
                formData[fieldId] = content.trim();
                aiGeneratedFields.push(fieldId);
              }
            }
          }
        } catch (error) {
          console.warn('AI field generation failed:', error);
        }
      }
    }

    // Calculate pre-fill statistics
    const totalFields = formSchema.sections.reduce((total: number, section: any) => 
      total + section.fields.length, 0);
    const preFilledFields = Object.keys(formData).length;
    const completionPercentage = Math.round((preFilledFields / totalFields) * 100);

    console.log(`✅ Form pre-filled: ${preFilledFields}/${totalFields} fields (${completionPercentage}%)`);
    console.log(`📊 Direct mappings: ${mappedFields.length}, AI generated: ${aiGeneratedFields.length}`);

    return new Response(JSON.stringify({
      success: true,
      formData,
      statistics: {
        totalFields,
        preFilledFields,
        completionPercentage,
        directMappings: mappedFields.length,
        aiGeneratedCount: aiGeneratedFields.length,
        mappedFields,
        generatedFields: aiGeneratedFields
      },
      message: `Form pre-filled with ${completionPercentage}% completion`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Form pre-fill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});