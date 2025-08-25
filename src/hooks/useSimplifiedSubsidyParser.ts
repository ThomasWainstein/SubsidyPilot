import { useMemo } from 'react';
import { FrenchSubsidyParser } from '@/lib/extraction/french-subsidy-parser';

interface SimplifiedParsedData {
  funding: string;
  entityTypes: string[];
  region: string;
  confidence: number;
}

export const useSimplifiedSubsidyParser = (subsidy: any): SimplifiedParsedData => {
  return useMemo(() => {
    // If we have cached parsed data, use it
    if (subsidy.parsed_data && Object.keys(subsidy.parsed_data).length > 0) {
      return {
        funding: subsidy.parsed_data.funding || 'Montant non spécifié',
        entityTypes: subsidy.parsed_data.entityTypes || ['All Businesses'],
        region: subsidy.parsed_data.region || 'France',
        confidence: subsidy.parsed_data.confidence || 0
      };
    }

    // Otherwise, parse on-demand
    const content = [
      getStringValue(subsidy.title),
      getStringValue(subsidy.description),
      subsidy.funding_markdown,
      subsidy.eligibility,
      // Include raw HTML content if available
      subsidy.raw_data?.fiche ? cleanHtmlContent(subsidy.raw_data.fiche) : '',
    ].filter(Boolean).join('\n\n');

    if (!content.trim()) {
      return {
        funding: 'Montant non spécifié',
        entityTypes: ['All Businesses'],
        region: 'France',
        confidence: 0
      };
    }

    // Parse with enhanced French parser
    const parsed = FrenchSubsidyParser.parse(content);
    
    // Format results
    const funding = FrenchSubsidyParser.formatFundingDisplay(parsed.funding);
    const entityTypes = parsed.eligibility.entityTypes.length > 0 
      ? parsed.eligibility.entityTypes 
      : ['All Businesses'];
    const region = parsed.eligibility.geographicScope.length > 0 
      ? parsed.eligibility.geographicScope[0] 
      : 'France';

    return {
      funding,
      entityTypes,
      region,
      confidence: parsed.confidence
    };
  }, [subsidy]);
};

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
