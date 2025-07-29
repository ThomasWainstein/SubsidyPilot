/**
 * Document Classification Edge Function
 * Classifies documents after text extraction and compares with user selection
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationRequest {
  documentId: string;
  extractedText: string;
  fileName: string;
  userSelectedCategory: string;
}

interface ClassificationResult {
  category: string;
  confidence: number;
  model: string;
  alternatives: Array<{ category: string; confidence: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, extractedText, fileName, userSelectedCategory }: ClassificationRequest = await req.json();

    console.log(`🔍 Starting classification for document: ${fileName}`);

    // Perform rule-based classification
    const classification = performRuleBasedClassification(extractedText, fileName);
    
    const agrees = classification.category === userSelectedCategory;
    
    console.log(`📊 Classification result: ${classification.category} (confidence: ${classification.confidence})`);
    console.log(`👤 User selected: ${userSelectedCategory}`);
    console.log(`🤝 Agreement: ${agrees}`);

    // Log classification comparison
    const { error: logError } = await supabase
      .from('document_classification_logs')
      .insert({
        document_id: documentId,
        predicted_category: classification.category,
        user_selected_category: userSelectedCategory,
        prediction_confidence: classification.confidence,
        model_used: classification.model,
        document_text_preview: extractedText.substring(0, 500),
        agrees,
      });

    if (logError) {
      console.error('Failed to log classification:', logError);
    }

    // Update document with classification results
    const { error: updateError } = await supabase
      .from('farm_documents')
      .update({
        predicted_category: classification.category,
        prediction_confidence: classification.confidence,
        category_agreement: agrees,
        classification_model: classification.model,
        classification_timestamp: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      classification,
      agrees,
      message: agrees 
        ? 'AI classification matches user selection' 
        : `AI suggests "${classification.category}" instead of "${userSelectedCategory}"`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function performRuleBasedClassification(text: string, fileName: string): ClassificationResult {
  const lowerText = text.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  const combined = lowerText + ' ' + lowerFileName;

  // Document categories and their keywords
  const categoryMapping = {
    'legal': ['contract', 'agreement', 'legal', 'terms', 'policy', 'license', 'clause', 'jurisdiction', 'party', 'whereas'],
    'financial': ['invoice', 'receipt', 'financial', 'payment', 'budget', 'statement', 'euro', 'dollar', 'cost', 'price', 'tax', 'vat'],
    'environmental': ['environmental', 'sustainability', 'green', 'carbon', 'emission', 'ecology', 'renewable', 'climate'],
    'technical': ['technical', 'specification', 'manual', 'guide', 'documentation', 'procedure', 'instruction', 'method'],
    'certification': ['certificate', 'certification', 'accreditation', 'standard', 'compliance', 'certified', 'quality', 'iso'],
    'other': ['other', 'miscellaneous', 'general']
  };

  const scores: Record<string, number> = {};
  
  // Initialize all categories with base score
  Object.keys(categoryMapping).forEach(category => {
    scores[category] = 0;
  });

  // Score based on keyword matching
  Object.entries(categoryMapping).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combined.match(regex);
      if (matches) {
        scores[category] += matches.length * 10;
      }
    });
  });

  // Additional scoring based on file patterns and content structure
  if (fileName.includes('invoice') || fileName.includes('receipt') || /\$|€|£|\d+\.\d{2}/.test(text)) {
    scores['financial'] += 25;
  }
  
  if (fileName.includes('contract') || fileName.includes('agreement') || /shall|whereas|party|jurisdiction/.test(lowerText)) {
    scores['legal'] += 25;
  }
  
  if (fileName.includes('manual') || fileName.includes('spec') || /step \d+|procedure|method|technical/.test(lowerText)) {
    scores['technical'] += 25;
  }
  
  if (fileName.includes('cert') || /certified|iso \d+|standard|accredited/.test(lowerText)) {
    scores['certification'] += 25;
  }

  if (/environmental|carbon|emission|sustainable|green|renewable/.test(lowerText)) {
    scores['environmental'] += 25;
  }

  // Find the highest scoring category
  const sortedScores = Object.entries(scores)
    .sort(([,a], [,b]) => b - a);
  
  const topCategory = sortedScores[0];
  const maxScore = topCategory[1];
  
  // Calculate confidence based on score separation and content length
  const secondHighest = sortedScores[1]?.[1] || 0;
  const scoreSeparation = maxScore - secondHighest;
  const baseConfidence = Math.min(0.95, Math.max(0.1, maxScore / 100));
  
  // Boost confidence if there's clear separation between top categories
  const separationBonus = scoreSeparation > 20 ? 0.1 : 0;
  const confidence = Math.min(0.95, baseConfidence + separationBonus);
  
  // Build alternatives list
  const alternatives = sortedScores
    .slice(1, 4)
    .map(([category, score]) => ({
      category,
      confidence: Math.max(0.01, Math.min(0.8, score / 100))
    }))
    .filter(alt => alt.confidence > 0.05);

  return {
    category: topCategory[0],
    confidence,
    model: 'rule-based-enhanced-v1',
    alternatives
  };
}