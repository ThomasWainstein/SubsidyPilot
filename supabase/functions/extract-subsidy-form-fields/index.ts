import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting subsidy form field extraction...');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { documentUrl, extractionType = 'subsidy_application_form', testMode = false } = await req.json();
    console.log(`📄 Processing document: ${documentUrl}`);
    console.log(`🔧 Extraction type: ${extractionType}`);

    if (!documentUrl) {
      throw new Error('Document URL is required');
    }

    // Step 1: Download and extract text from PDF
    console.log('📥 Downloading document...');
    const documentResponse = await fetch(documentUrl);
    
    if (!documentResponse.ok) {
      throw new Error(`Failed to download document: ${documentResponse.status} ${documentResponse.statusText}`);
    }

    const contentType = documentResponse.headers.get('content-type') || '';
    console.log(`📋 Content type: ${contentType}`);

    let extractedText = '';
    
    if (contentType.includes('application/pdf')) {
      // For PDF processing, we'll use a simple text extraction approach
      // In production, you'd want to use a proper PDF parsing library
      console.log('📖 Processing PDF document...');
      
      // Simulate PDF text extraction - in real implementation, use pdf-parse or similar
      const arrayBuffer = await documentResponse.arrayBuffer();
      const textDecoder = new TextDecoder();
      const rawText = textDecoder.decode(arrayBuffer);
      
      // Extract readable text patterns (this is simplified)
      extractedText = rawText.replace(/[^\x20-\x7E\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000); // Limit for API processing

      console.log(`📝 Extracted ${extractedText.length} characters of text`);
    } else {
      throw new Error(`Unsupported content type: ${contentType}. Only PDF documents are supported.`);
    }

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Failed to extract sufficient text from document');
    }

    // Step 2: Use OpenAI to analyze and extract form fields
    console.log('🤖 Analyzing document with OpenAI...');
    
    const prompt = `
You are an expert at analyzing government subsidy application forms. Analyze the following document text and extract all form fields, requirements, and structure.

Document text:
${extractedText}

Extract and return a JSON object with the following structure:
{
  "documentType": "type of document (e.g., 'subsidy_application', 'eligibility_form', etc.)",
  "title": "document title",
  "formFields": [
    {
      "id": "unique_field_id",
      "label": "field label as shown in document",
      "type": "field type (text, number, date, select, checkbox, file, etc.)",
      "required": true/false,
      "description": "field description or help text",
      "validation": "validation rules if any",
      "options": ["array of options for select fields"],
      "placeholder": "placeholder text if any"
    }
  ],
  "sections": [
    {
      "title": "section title",
      "description": "section description",
      "fields": ["array of field IDs in this section"]
    }
  ],
  "requirements": [
    "list of requirements, eligibility criteria, or instructions"
  ],
  "deadlines": "any deadline information",
  "contactInfo": "contact information for questions",
  "confidence": 0-100 (your confidence in the extraction accuracy)
}

Focus on:
1. All input fields, checkboxes, dropdowns, file uploads
2. Required vs optional fields
3. Field validation rules and formats
4. Section organization
5. Eligibility requirements
6. Application deadlines
7. Required documents or attachments
8. Contact information

Return ONLY the JSON object, no additional text.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert at analyzing government forms and extracting structured field information. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json();
    const extractedContent = openAIData.choices[0].message.content;

    console.log('✅ OpenAI analysis completed');

    // Step 3: Parse and validate the extracted JSON
    let parsedData;
    try {
      parsedData = JSON.parse(extractedContent);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response as JSON:', parseError);
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to extract valid JSON from AI response');
      }
    }

    // Step 4: Validate and enrich the extracted data
    const formFields = parsedData.formFields || [];
    const confidence = parsedData.confidence || 0;
    const errors = [];

    // Validate form fields
    formFields.forEach((field: any, index: number) => {
      if (!field.id || !field.label || !field.type) {
        errors.push(`Field ${index + 1}: Missing required properties (id, label, or type)`);
      }
      
      if (!['text', 'number', 'date', 'select', 'checkbox', 'radio', 'file', 'textarea', 'email', 'tel', 'url'].includes(field.type)) {
        errors.push(`Field ${index + 1}: Unknown field type "${field.type}"`);
      }
    });

    // Calculate quality metrics
    const hasMinimumFields = formFields.length >= 3;
    const hasRequiredFlags = formFields.some((f: any) => f.required === true);
    const hasSections = (parsedData.sections || []).length > 0;
    const hasRequirements = (parsedData.requirements || []).length > 0;

    const qualityScore = [
      hasMinimumFields ? 25 : 0,
      hasRequiredFlags ? 20 : 0,
      hasSections ? 15 : 0,
      hasRequirements ? 15 : 0,
      confidence > 80 ? 25 : confidence > 60 ? 15 : confidence > 40 ? 10 : 0
    ].reduce((sum, score) => sum + score, 0);

    console.log(`📊 Quality assessment: ${qualityScore}% (${formFields.length} fields, ${errors.length} errors)`);

    // Step 5: Return comprehensive results
    const result = {
      success: true,
      documentUrl,
      extractionType,
      timestamp: new Date().toISOString(),
      formFields,
      sections: parsedData.sections || [],
      requirements: parsedData.requirements || [],
      documentType: parsedData.documentType || 'unknown',
      title: parsedData.title || 'Untitled Document',
      deadlines: parsedData.deadlines || null,
      contactInfo: parsedData.contactInfo || null,
      confidence: qualityScore,
      originalConfidence: confidence,
      errors,
      extractedText: testMode ? extractedText.substring(0, 1000) + '...' : null,
      metadata: {
        textLength: extractedText.length,
        processingTime: Date.now(),
        model: 'gpt-4.1-2025-04-14',
        version: '1.0.0'
      }
    };

    console.log('✅ Form field extraction completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Form field extraction failed:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      formFields: [],
      confidence: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});