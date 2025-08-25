import { FrenchSubsidyParser } from '@/lib/extraction/french-subsidy-parser';

export function debugSubsidyParsing(subsidy: any): void {
  console.log('=== SUBSIDY DEBUG ===');
  console.log('Title:', subsidy.title);
  console.log('ID:', subsidy.id);
  
  // Get all content that would be parsed
  const content = [
    getStringValue(subsidy.title),
    getStringValue(subsidy.description),
    subsidy.funding_markdown,
    subsidy.eligibility,
    // Include raw HTML content if available
    subsidy.raw_data?.fiche ? cleanHtmlContent(subsidy.raw_data.fiche) : '',
  ].filter(Boolean).join('\n\n');
  
  console.log('=== CONTENT TO PARSE ===');
  console.log(content);
  console.log('=== PARSED RESULTS ===');
  
  const results = FrenchSubsidyParser.debugPatterns(content);
  console.log('Funding results:', results.funding);
  console.log('Eligibility results:', results.eligibility);
  
  // Test specific patterns manually
  console.log('=== MANUAL PATTERN TESTS ===');
  
  // Test loan patterns
  const loanPattern = /montant\s+du\s+prêt.*?compris\s+entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi;
  const loanMatches = [...content.matchAll(loanPattern)];
  console.log('Loan pattern matches:', loanMatches);
  
  // Test percentage patterns  
  const percentagePattern = /(\d+(?:[.,]\d+)?)\s*%/gi;
  const percentageMatches = [...content.matchAll(percentagePattern)];
  console.log('Percentage pattern matches:', percentageMatches);
  
  console.log('=== END DEBUG ===');
}

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