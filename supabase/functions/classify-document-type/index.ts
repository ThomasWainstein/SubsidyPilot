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

interface DocumentClassification {
  documentType: 'business_registration' | 'financial_statement' | 'identity_document' | 'municipal_document' | 'ngo_document' | 'agricultural_document' | 'tax_document' | 'other';
  clientType: 'business' | 'individual' | 'ngo' | 'municipality' | 'farmer';
  confidence: number;
  extractedFields: Record<string, any>;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, fileName, documentId } = await req.json();

    if (!documentContent) {
      throw new Error('Document content is required');
    }

    console.log(`🔍 Classifying document: ${fileName || 'unknown'}`);

    // Use AI to classify document type and infer client type
    const classificationPrompt = `
Analyze this document and classify it according to the following criteria:

Document Content:
${documentContent.substring(0, 5000)}

File Name: ${fileName || 'unknown'}

CLASSIFICATION REQUIREMENTS:

1. DOCUMENT TYPE (choose one):
- business_registration: Company registrations, Kbis, HRB, Chamber of Commerce certificates
- financial_statement: Balance sheets, P&L statements, cash flow, annual reports
- identity_document: Passports, ID cards, driver's licenses, personal identification
- municipal_document: Council certificates, public entity documents, administrative papers
- ngo_document: Association statutes, non-profit registrations, charity documents
- agricultural_document: Farm permits, CAP declarations, agricultural subsidies
- tax_document: VAT certificates, tax returns, fiscal documents
- other: Documents that don't fit above categories

2. CLIENT TYPE (infer from document):
- business: Companies, corporations, commercial entities
- individual: Private persons, sole proprietors
- ngo: Non-profit organizations, associations, charities
- municipality: Cities, towns, public administrations
- farmer: Agricultural operations, farms, rural enterprises

3. EXTRACT KEY FIELDS based on document type:
For businesses: company_name, vat_number, siret, registration_number, sector, employees, turnover
For individuals: name, address, date_of_birth, id_number, income
For NGOs: organization_name, registration_number, mission, legal_status
For municipalities: entity_name, administrative_code, population, contact
For farmers: farm_name, agricultural_number, hectares, activities, legal_status

4. CONFIDENCE SCORE (0-100): How certain are you of this classification?

5. REASONING: Brief explanation of classification decision

Return ONLY valid JSON in this format:
{
  "documentType": "document_type_here",
  "clientType": "client_type_here", 
  "confidence": 85,
  "extractedFields": {
    "field1": "value1",
    "field2": "value2"
  },
  "reasoning": "Brief explanation"
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
            content: 'You are an expert document classifier specializing in EU business, administrative, and subsidy-related documents. You understand French, English, Spanish, Romanian, German, and Dutch documents.' 
          },
          { role: 'user', content: classificationPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    let classificationText = aiData.choices[0].message.content.trim();
    
    // Clean JSON response
    classificationText = classificationText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('🤖 Raw AI Classification:', classificationText);
    
    const classification: DocumentClassification = JSON.parse(classificationText);

    // Validate classification
    if (!classification.documentType || !classification.clientType) {
      throw new Error('Invalid classification response from AI');
    }

    // Update document record with classification if documentId provided
    if (documentId) {
      const { error: updateError } = await supabase
        .from('farm_documents')
        .update({
          document_type: classification.documentType,
          client_type: classification.clientType,
          extracted_metadata: {
            ...classification.extractedFields,
            classification_confidence: classification.confidence,
            classification_reasoning: classification.reasoning,
            classified_at: new Date().toISOString()
          }
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('❌ Failed to update document:', updateError);
        // Don't throw - classification still succeeded
      }
    }

    console.log(`✅ Document classified as ${classification.documentType} for ${classification.clientType} with ${classification.confidence}% confidence`);

    return new Response(JSON.stringify({
      success: true,
      classification,
      message: 'Document classified successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Document classification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});