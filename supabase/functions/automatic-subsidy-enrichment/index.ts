import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// French Subsidy Parser - Simplified version for edge function
class FrenchSubsidyParser {
  private static FUNDING_PATTERNS = {
    // Loan patterns (HIGHEST PRIORITY for prêt/crédit subsidies)
    loanPatterns: [
      /montant\s+du\s+prêt.*?compris\s+entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /prêt.*?entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /prêt.*?de\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+à\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /prêt.*?jusqu'à\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /crédit.*?entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Aid ceiling patterns
    aidCeilingWithRange: [
      /plafond\s+d.aide.*?entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /aide.*?plafonnée.*?entre\s+(\d+(?:\s*\d{3})*)\s*et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /\(aide:\s*€?(\d+(?:\s*\d{3})*)\s*(?:€)?\s*[-–]\s*€?(\d+(?:\s*\d{3})*)\s*€?\)/gi,
      /aide\s+compris\s+entre\s+(\d+(?:\s*\d{3})*)\s*et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Amount ranges
    amountRange: [
      /entre\s*(\d+(?:\s*\d{3})*)\s*€.*?et\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /de\s*(\d+(?:\s*\d{3})*)\s*€.*?à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /(\d+(?:\s*\d{3})*)\s*€.*?à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Maximum amounts
    maxAmount: [
      /plafond.*?(?:aide|subvention).*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /maximum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /jusqu'à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /plafonnée?\s+à\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Percentage with investment range
    percentageWithInvestmentRange: [
      /(\d+(?:[.,]\d+)?)\s*%.*?(?:dépense|investissement|coût).*?(?:compris\s+)?entre\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?/gi,
      /subvention.*?hauteur\s+de\s+(\d+(?:[.,]\d+)?)\s*%.*?investissement.*?entre\s+(\d+(?:\s*\d{3})*)\s*€.*?et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ]
  };

  static parse(content: string) {
    const funding = this.extractFunding(content);
    const eligibility = this.extractEligibility(content);
    
    return {
      funding,
      eligibility,
      confidence: funding.length > 0 ? 0.8 : 0.3
    };
  }

  private static extractFunding(content: string) {
    const results: any[] = [];
    
    // PRIORITY 1: Extract loan amounts first
    for (const pattern of this.FUNDING_PATTERNS.loanPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[2]) {
          // Range pattern
          const minAmount = parseInt(match[1].replace(/\s/g, ''));
          const maxAmount = parseInt(match[2].replace(/\s/g, ''));
          
          if (!isNaN(minAmount) && !isNaN(maxAmount) && minAmount >= 0 && maxAmount >= 0) {
            const validMin = Math.min(minAmount, maxAmount);
            const validMax = Math.max(minAmount, maxAmount);
            
            results.push({
              type: 'range',
              minAmount: validMin,
              maxAmount: validMax,
              currency: 'EUR',
              originalText: match[0]
            });
          }
        } else if (match[1]) {
          // Single max amount
          const maxAmount = parseInt(match[1].replace(/\s/g, ''));
          
          if (!isNaN(maxAmount) && maxAmount >= 0) {
            results.push({
              type: 'maximum',
              maxAmount,
              currency: 'EUR',
              originalText: match[0]
            });
          }
        }
      }
    }
    
    if (results.length > 0) return results;

    // PRIORITY 2: Aid ceiling ranges
    for (const pattern of this.FUNDING_PATTERNS.aidCeilingWithRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        const maxAmount = parseInt(match[2].replace(/\s/g, ''));
        
        if (!isNaN(minAmount) && !isNaN(maxAmount) && minAmount >= 0 && maxAmount >= 0) {
          const validMin = Math.min(minAmount, maxAmount);
          const validMax = Math.max(minAmount, maxAmount);
          
          results.push({
            type: 'range',
            minAmount: validMin,
            maxAmount: validMax,
            currency: 'EUR',
            originalText: match[0]
          });
        }
      }
    }
    
    if (results.length > 0) return results;

    // PRIORITY 3: Percentage with investment range
    for (const pattern of this.FUNDING_PATTERNS.percentageWithInvestmentRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const percentage = parseFloat(match[1].replace(',', '.'));
        const investmentMin = parseInt(match[2].replace(/\s/g, ''));
        const investmentMax = parseInt(match[3].replace(/\s/g, ''));
        
        if (!isNaN(percentage) && !isNaN(investmentMin) && !isNaN(investmentMax) && 
            percentage > 0 && percentage <= 100 && investmentMin >= 0 && investmentMax >= 0) {
          
          const validInvestMin = Math.min(investmentMin, investmentMax);
          const validInvestMax = Math.max(investmentMin, investmentMax);
          
          const minAmount = Math.round(validInvestMin * percentage / 100);
          const maxAmount = Math.round(validInvestMax * percentage / 100);
          
          results.push({
            type: 'percentage_with_range',
            percentage,
            minAmount,
            maxAmount,
            investmentMin: validInvestMin,
            investmentMax: validInvestMax,
            currency: 'EUR',
            originalText: match[0]
          });
        }
      }
    }

    // PRIORITY 4: Basic amount ranges
    for (const pattern of this.FUNDING_PATTERNS.amountRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        const maxAmount = parseInt(match[2].replace(/\s/g, ''));
        
        if (!isNaN(minAmount) && !isNaN(maxAmount) && minAmount >= 0 && maxAmount >= 0) {
          const validMin = Math.min(minAmount, maxAmount);
          const validMax = Math.max(minAmount, maxAmount);
          
          results.push({
            type: 'range',
            minAmount: validMin,
            maxAmount: validMax,
            currency: 'EUR',
            originalText: match[0]
          });
        }
      }
    }

    // PRIORITY 5: Maximum amounts
    for (const pattern of this.FUNDING_PATTERNS.maxAmount) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const maxAmount = parseInt(match[1].replace(/\s/g, ''));
        
        if (!isNaN(maxAmount) && maxAmount >= 0) {
          results.push({
            type: 'maximum',
            maxAmount,
            currency: 'EUR',
            originalText: match[0]
          });
        }
      }
    }

    return results;
  }

  private static extractEligibility(content: string) {
    const entityTypes: string[] = [];
    const geographicScope: string[] = [];

    // Extract entity types
    const entityPatterns = [
      /\b(TPE|PME|ETI|GE)\b/gi,
      /micro[- ]?entreprise/gi,
      /petite[s]?\s+entreprise[s]?/gi,
      /moyenne[s]?\s+entreprise[s]?/gi,
      /grande[s]?\s+entreprise[s]?/gi,
    ];

    for (const pattern of entityPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const entityType = match[0].toUpperCase().trim();
        if (!entityTypes.includes(entityType)) {
          entityTypes.push(entityType);
        }
      }
    }

    // Extract geographic scope
    const geoPatterns = [
      /\b(France|National|Régional|Départemental|Communal)\b/gi,
      /Région\s+([A-Za-zÀ-ÿ\-\s]+)/gi,
    ];

    for (const pattern of geoPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const scope = match[0].trim();
        if (!geographicScope.includes(scope)) {
          geographicScope.push(scope);
        }
      }
    }

    return {
      entityTypes: entityTypes.length > 0 ? entityTypes : ['All Businesses'],
      geographicScope: geographicScope.length > 0 ? geographicScope : ['France']
    };
  }

  static formatFundingDisplay(funding: any[]): string {
    if (funding.length === 0) return 'Montant non spécifié';

    const primary = funding[0];
    
    switch (primary.type) {
      case 'percentage_with_range':
        // Show calculated aid amounts if available
        if (primary.minAmount && primary.maxAmount) {
          return `€${primary.minAmount.toLocaleString()} - €${primary.maxAmount.toLocaleString()}`;
        }
        if (primary.percentage && primary.investmentMin && primary.investmentMax) {
          return `${primary.percentage}% sur investissement €${primary.investmentMin.toLocaleString()} - €${primary.investmentMax.toLocaleString()}`;
        }
        return `${primary.percentage}% de subvention`;
      case 'range':
        return `€${primary.minAmount?.toLocaleString()} - €${primary.maxAmount?.toLocaleString()}`;
      case 'maximum':
        return `Jusqu'à €${primary.maxAmount?.toLocaleString()}`;
      default:
        return primary.originalText || 'Montant non spécifié';
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic subsidy enrichment');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { subsidyId } = await req.json();
    
    if (!subsidyId) {
      throw new Error('Subsidy ID is required');
    }

    console.log(`Processing subsidy enrichment for ID: ${subsidyId}`);

    // Fetch the subsidy data
    const { data: subsidy, error: fetchError } = await supabase
      .from('subsidies')
      .select('*')
      .eq('id', subsidyId)
      .single();

    if (fetchError || !subsidy) {
      console.error('Error fetching subsidy:', fetchError);
      throw new Error('Subsidy not found');
    }

    console.log(`Fetched subsidy: ${subsidy.title || 'Untitled'}`);

    // Extract content for parsing
    const content = [
      getStringValue(subsidy.title),
      getStringValue(subsidy.description),
      subsidy.funding_markdown,
      getStringValue(subsidy.eligibility_criteria),
      // Include raw data if available
      subsidy.raw_data ? cleanHtmlContent(subsidy.raw_data) : '',
    ].filter(Boolean).join('\n\n');

    if (!content.trim()) {
      console.log('No content to parse, skipping enrichment');
      return new Response(
        JSON.stringify({ success: true, message: 'No content to parse' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing content with FrenchSubsidyParser...');

    // Parse with French parser
    const parsed = FrenchSubsidyParser.parse(content);
    const fundingDisplay = FrenchSubsidyParser.formatFundingDisplay(parsed.funding);

    console.log(`Parsing results:`, {
      fundingCount: parsed.funding.length,
      entityTypes: parsed.eligibility.entityTypes,
      confidence: parsed.confidence,
      fundingDisplay
    });

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update funding amounts if found
    if (parsed.funding.length > 0) {
      const primary = parsed.funding[0];
      
      if (primary.type === 'range' && primary.minAmount && primary.maxAmount) {
        updateData.amount_min = primary.minAmount;
        updateData.amount_max = primary.maxAmount;
      } else if (primary.type === 'maximum' && primary.maxAmount) {
        updateData.amount_max = primary.maxAmount;
        updateData.amount_min = 0;
      } else if (primary.type === 'percentage_with_range' && primary.minAmount && primary.maxAmount) {
        updateData.amount_min = primary.minAmount;
        updateData.amount_max = primary.maxAmount;
      }
    }

    // Update categories/tags with entity types if found
    if (parsed.eligibility.entityTypes.length > 0 && 
        !parsed.eligibility.entityTypes.includes('All Businesses')) {
      updateData.categories = parsed.eligibility.entityTypes;
    }

    // Store parsed data for future use
    updateData.parsed_data = {
      funding: fundingDisplay,
      entityTypes: parsed.eligibility.entityTypes,
      region: parsed.eligibility.geographicScope[0] || 'France',
      confidence: parsed.confidence,
      lastParsed: new Date().toISOString(),
      version: '1.0'
    };

    console.log('Updating subsidy with enriched data:', updateData);

    // Update the subsidy
    const { error: updateError } = await supabase
      .from('subsidies')
      .update(updateData)
      .eq('id', subsidyId);

    if (updateError) {
      console.error('Error updating subsidy:', updateError);
      throw updateError;
    }

    console.log(`Successfully enriched subsidy ${subsidyId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subsidyId,
        enriched: true,
        fundingDisplay,
        entityTypes: parsed.eligibility.entityTypes,
        confidence: parsed.confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in automatic subsidy enrichment:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions
function getStringValue(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.fr || value.en || value.ro || Object.values(value)[0] || '';
  }
  return String(value);
}

function cleanHtmlContent(htmlContent: any): string {
  if (!htmlContent) return '';
  const content = typeof htmlContent === 'string' ? htmlContent : JSON.stringify(htmlContent);
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}