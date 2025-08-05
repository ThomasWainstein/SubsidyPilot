import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unmappedData } = await req.json();

    if (!unmappedData || typeof unmappedData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid unmapped data provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const classifications = [];

    // Process each unmapped field
    for (const [originalKey, value] of Object.entries(unmappedData)) {
      try {
        console.log(`🔍 Classifying field: ${originalKey} with value: ${JSON.stringify(value)}`);

        const classification = await classifyField(originalKey, value);
        classifications.push({
          originalKey,
          value,
          ...classification
        });
      } catch (error) {
        console.error(`Failed to classify field ${originalKey}:`, error);
        // Add fallback classification
        classifications.push({
          originalKey,
          value,
          suggestedFieldName: originalKey.replace(/([A-Z])/g, ' $1').toLowerCase().trim(),
          confidence: 0.3
        });
      }
    }

    console.log(`✅ Classified ${classifications.length} fields`);

    return new Response(
      JSON.stringify({ classifications }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in classify-extracted-fields function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function classifyField(originalKey: string, value: any): Promise<{
  suggestedFieldName: string;
  confidence: number;
}> {
  const prompt = `
You are an expert at analyzing and categorizing extracted document fields for agricultural/farm data.

Given this field data:
- Original field name: "${originalKey}"
- Value: ${JSON.stringify(value)}

Your task is to suggest a standardized field name that would be appropriate for a farm management system.

Common farm/agricultural field categories include:
- Farm identification (farmName, ownerName, legalEntity)
- Location (address, region, country, coordinates)
- Farm characteristics (totalHectares, landType, soilType)
- Operations (activities, cropTypes, livestockTypes, certifications)
- Business (revenue, employees, registrationNumber)
- Contact (email, phone, website)
- Technical (irrigationMethod, equipment, softwareUsed)

Respond with a JSON object containing:
{
  "suggestedFieldName": "camelCaseFieldName",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}

The suggestedFieldName should be:
1. In camelCase format
2. Descriptive and standardized
3. Appropriate for farm/agricultural context
4. Consistent with common field naming conventions

Confidence should be between 0.0 and 1.0 based on how certain you are about the classification.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert agricultural data analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = JSON.parse(content);
    return {
      suggestedFieldName: result.suggestedFieldName || originalKey,
      confidence: Math.min(Math.max(result.confidence || 0.5, 0.0), 1.0)
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    // Fallback classification
    return {
      suggestedFieldName: originalKey.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/\s+/g, ''),
      confidence: 0.4
    };
  }
}