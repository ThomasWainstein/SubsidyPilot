/**
 * OpenAI service for farm data extraction
 */

export interface ExtractedFarmData {
  farmName?: string | null;
  ownerName?: string | null;
  legalStatus?: string | null;
  registrationNumber?: string | null;
  address?: string | null;
  region?: string | null;
  country?: string | null;
  department?: string | null;
  totalHectares?: number | null;
  landOwned?: number | null;
  landRented?: number | null;
  landUseTypes?: string[];
  activities?: string[];
  mainCrops?: string[];
  livestockTypes?: string[];
  organicFarming?: boolean | null;
  precisionAgriculture?: boolean | null;
  irrigationUsed?: boolean | null;
  irrigationMethods?: string[];
  certifications?: string[];
  environmentalPractices?: string[];
  carbonFootprintAssessment?: boolean | null;
  annualRevenue?: string | number | null;
  profitabilityStatus?: string | null;
  receivedPreviousSubsidies?: boolean | null;
  subsidiesReceived?: string[];
  fullTimeEmployees?: number | null;
  partTimeEmployees?: number | null;
  youngFarmersInvolvement?: boolean | null;
  genderBalanceInitiatives?: boolean | null;
  socialInitiatives?: string[];
  farmManagementSoftware?: boolean | null;
  digitalInfrastructure?: string[];
  renewableEnergyUse?: string[];
  energyEfficiencyMeasures?: string[];
  confidence?: number;
  extractedFields?: string[];
  error?: string;
  rawResponse?: string;
}

const SYSTEM_PROMPT = `You are a document analysis assistant for a European agricultural platform.
Your task is to extract detailed, structured farm/business profile data from agricultural documents.

INSTRUCTIONS:
- Carefully analyze the provided document text
- Extract every field in the schema below if it appears clearly in the document
- If a value is missing, set it to null (for string/number/boolean) or an empty array [] (for lists)
- Do not invent or hallucinate missing data
- Return only a valid, flat JSON object with these fields and lowercase keys:

{
  "farmName": "string or null",
  "ownerName": "string or null",
  "legalStatus": "string or null",
  "registrationNumber": "string or null",
  "address": "string or null",
  "region": "string or null",
  "country": "string or null",
  "department": "string or null",
  "totalHectares": "number or null",
  "landOwned": "number or null",
  "landRented": "number or null",
  "landUseTypes": ["list of strings"],
  "activities": ["list of strings"],
  "mainCrops": ["list of strings"],
  "livestockTypes": ["list of strings"],
  "organicFarming": "boolean or null",
  "precisionAgriculture": "boolean or null",
  "irrigationUsed": "boolean or null",
  "irrigationMethods": ["list of strings"],
  "certifications": ["list of strings"],
  "environmentalPractices": ["list of strings"],
  "carbonFootprintAssessment": "boolean or null",
  "annualRevenue": "string or number or null",
  "profitabilityStatus": "string or null",
  "receivedPreviousSubsidies": "boolean or null",
  "subsidiesReceived": ["list of strings"],
  "fullTimeEmployees": "number or null",
  "partTimeEmployees": "number or null",
  "youngFarmersInvolvement": "boolean or null",
  "genderBalanceInitiatives": "boolean or null",
  "socialInitiatives": ["list of strings"],
  "farmManagementSoftware": "boolean or null",
  "digitalInfrastructure": ["list of strings"],
  "renewableEnergyUse": ["list of strings"],
  "energyEfficiencyMeasures": ["list of strings"],
  "confidence": 0.8,
  "extractedFields": ["list of field names that were successfully extracted"]
}`;

export async function extractFarmDataWithOpenAI(
  extractedText: string,
  openAIApiKey: string
): Promise<ExtractedFarmData> {
  // Create comprehensive extraction prompt with full document text
  const extractionPrompt = `Extract comprehensive farm/agricultural information from this document.

Document content:
${extractedText.substring(0, 6000)}`;

  // Call OpenAI for extraction
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`❌ OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`, errorText);
    throw new Error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText} - ${errorText}`);
  }
  console.log('✅ OpenAI API call successful');

  const aiData = await aiResponse.json();
  const extractedContent = aiData.choices[0]?.message?.content;
  
  // Log raw OpenAI response for debugging
  console.log(`🔍 OpenAI raw response: ${extractedContent}`);
  console.log(`📊 OpenAI usage:`, aiData.usage);

  let extractedData: ExtractedFarmData;
  try {
    // Clean the response by removing markdown code blocks if present
    let cleanContent = extractedContent;
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '');
    }
    
    extractedData = JSON.parse(cleanContent);
    console.log(`✅ Successfully parsed extraction data:`, extractedData);
    
    // Validate that we have the expected structure
    if (!extractedData.hasOwnProperty('confidence')) {
      extractedData.confidence = 0.5; // Default confidence
    }
    if (!extractedData.hasOwnProperty('extractedFields')) {
      extractedData.extractedFields = Object.keys(extractedData).filter(key => 
        extractedData[key as keyof ExtractedFarmData] !== null && 
        extractedData[key as keyof ExtractedFarmData] !== undefined && 
        (Array.isArray(extractedData[key as keyof ExtractedFarmData]) ? 
          (extractedData[key as keyof ExtractedFarmData] as string[]).length > 0 : true)
      );
    }
    
  } catch (parseError) {
    console.error('❌ Failed to parse AI response as JSON:', parseError);
    console.error('📄 Raw content that failed to parse:', extractedContent);
    extractedData = {
      error: `Failed to parse extraction results: ${(parseError as Error).message}`,
      confidence: 0,
      extractedFields: [],
      rawResponse: extractedContent
    };
  }

  return extractedData;
}