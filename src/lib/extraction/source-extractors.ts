/**
 * Source-aware extraction system for different subsidy data sources
 */

export interface ExtractedSubsidyData {
  title: string;
  agency: string;
  description: string;
  amount: string;
  region: string | null;
  eligibility: string;
  applicationProcess: string[];
  deadline: string | null;
  contactInfo: any;
  documents: Array<{
    name: string;
    url?: string;
    type: string;
    description?: string;
  }>;
  requirements: string[];
  fundingDetails: string;
  isRegionRestricted: boolean;
  applicationUrl?: string;
}

/**
 * Abstract base extractor class
 */
abstract class SubsidyExtractor {
  abstract extractData(subsidyData: any): ExtractedSubsidyData;
  
  protected parseAmount(amountData: any): string {
    if (!amountData) return "Amount not specified";
    
    if (typeof amountData === 'string') {
      // Handle French amount patterns
      if (amountData.includes('dépendra du projet') || amountData.includes('dépend du projet')) {
        return "Amount varies by project";
      }
      if (amountData.includes('Non précisé') || amountData.includes('non précisé')) {
        return "Amount not specified";
      }
      // Extract amounts like "Jusqu'à 50 000 €"
      const amountMatch = amountData.match(/(\d{1,3}(?:\s?\d{3})*)\s*€/);
      if (amountMatch) {
        return `Up to €${amountMatch[1].replace(/\s/g, ',')}`;
      }
      return amountData;
    }
    
    if (typeof amountData === 'object' && amountData !== null) {
      if (amountData.min && amountData.max) {
        return `€${amountData.min} - €${amountData.max}`;
      }
      if (amountData.max) {
        return `Up to €${amountData.max}`;
      }
      if (amountData.min) {
        return `From €${amountData.min}`;
      }
    }
    
    return "Amount varies";
  }
}

/**
 * Les Aides extractor for les-aides.fr API data
 */
export class LesAidesExtractor extends SubsidyExtractor {
  extractData(subsidyData: any): ExtractedSubsidyData {
    const rawData = subsidyData.raw_data || {};
    const fiche = rawData.fiche || {};
    const organisme = rawData.organisme || {};
    
    // Extract region from provider name or implantation
    const region = this.extractRegion(subsidyData, organisme);
    
    // Parse amount from French text
    const amount = this.parseAmount(fiche.montants);
    
    // Extract application process from conditions
    const applicationProcess = this.extractApplicationProcess(fiche);
    
    // Extract contact information
    const contactInfo = this.extractContactInfo(organisme);
    
    // Extract requirements from conditions
    const requirements = this.extractRequirements(fiche);
    
    return {
      title: subsidyData.title || fiche.titre || 'Untitled Subsidy',
      agency: organisme.raison_sociale || subsidyData.agency || 'Unknown Agency',
      description: fiche.objet || subsidyData.description || '',
      amount,
      region: region.regionName,
      eligibility: fiche.conditions || subsidyData.eligibility || 'Check with provider',
      applicationProcess,
      deadline: subsidyData.deadline || null,
      contactInfo,
      documents: this.extractDocuments(fiche),
      requirements,
      fundingDetails: this.extractFundingDetails(fiche),
      isRegionRestricted: region.isRestricted,
      applicationUrl: fiche.url
    };
  }
  
  private extractRegion(subsidyData: any, organisme: any): { regionName: string | null; isRestricted: boolean } {
    // Check provider name for "Région X"
    if (organisme.raison_sociale) {
      const regionMatch = organisme.raison_sociale.match(/Région\s+(.+)/i);
      if (regionMatch) {
        return { regionName: regionMatch[1], isRestricted: true };
      }
    }
    
    // Check implantation type
    if (organisme.implantation === 'T') {
      // Territorial = Regional restriction
      const regionName = organisme.raison_sociale?.replace(/^Région\s+/i, '') || 'Regional program';
      return { regionName, isRestricted: true };
    }
    
    // Check raw_data conditions for region mentions
    const conditions = subsidyData.raw_data?.fiche?.conditions || '';
    const regionPatterns = [
      /en\s+(Normandie)/i,
      /en\s+(Pays\s+de\s+la\s+Loire)/i,
      /en\s+(Île-de-France)/i,
      /en\s+(Nouvelle-Aquitaine)/i,
      /en\s+(Occitanie)/i,
      /en\s+(Auvergne-Rhône-Alpes)/i,
      /en\s+(Hauts-de-France)/i,
      /en\s+(Grand\s+Est)/i,
      /en\s+(Bretagne)/i,
      /en\s+(Centre-Val\s+de\s+Loire)/i,
      /en\s+(Bourgogne-Franche-Comté)/i,
      /en\s+(Provence-Alpes-Côte\s+d'Azur)/i,
      /en\s+(Corse)/i
    ];
    
    for (const pattern of regionPatterns) {
      const match = conditions.match(pattern);
      if (match) {
        return { regionName: match[1], isRestricted: true };
      }
    }
    
    return { regionName: null, isRestricted: false };
  }
  
  private extractApplicationProcess(fiche: any): string[] {
    const process: string[] = [];
    
    if (fiche.conseils) {
      // Extract application advice
      process.push(`Application advice: ${fiche.conseils}`);
    }
    
    if (fiche.url) {
      process.push(`Visit application page: ${fiche.url}`);
    }
    
    if (process.length === 0) {
      process.push('Contact the provider for application details');
    }
    
    return process;
  }
  
  private extractContactInfo(organisme: any): any {
    const contact: any = {};
    
    if (organisme.adresses && organisme.adresses.length > 0) {
      const address = organisme.adresses[0];
      contact.address = `${address.adresse}, ${address.code_postal} ${address.ville}`;
      contact.phone = address.telephone;
      contact.email = address.email;
    }
    
    contact.organization = organisme.raison_sociale;
    contact.website = organisme.site_web;
    
    return contact;
  }
  
  private extractRequirements(fiche: any): string[] {
    const requirements: string[] = [];
    
    if (fiche.conditions) {
      // Simple extraction - could be enhanced with HTML parsing
      requirements.push(fiche.conditions);
    }
    
    return requirements;
  }
  
  private extractDocuments(fiche: any): Array<{ name: string; url?: string; type: string; description?: string }> {
    const documents: Array<{ name: string; url?: string; type: string; description?: string }> = [];
    
    // Les Aides typically doesn't have structured document lists
    // Most information is on the web page itself
    if (fiche.url) {
      documents.push({
        name: 'Program Information Page',
        url: fiche.url,
        type: 'webpage',
        description: 'Complete program details and application information'
      });
    }
    
    return documents;
  }
  
  private extractFundingDetails(fiche: any): string {
    if (fiche.montants) {
      return fiche.montants;
    }
    return 'Funding details available on program page';
  }
}

/**
 * FranceAgriMer extractor for structured FranceAgriMer data
 */
export class FranceAgriMerExtractor extends SubsidyExtractor {
  extractData(subsidyData: any): ExtractedSubsidyData {
    return {
      title: subsidyData.title || 'Untitled Program',
      agency: 'FranceAgriMer',
      description: subsidyData.description || '',
      amount: this.parseAmount(subsidyData.funding?.amount || subsidyData.amount),
      region: subsidyData.eligibility?.geographicScope?.join(', ') || null,
      eligibility: subsidyData.eligibility?.generalCriteria || '',
      applicationProcess: subsidyData.applicationProcess?.steps || [],
      deadline: subsidyData.timeline?.applicationPeriod?.end || null,
      contactInfo: subsidyData.contact || {},
      documents: subsidyData.documents?.required || [],
      requirements: subsidyData.eligibility?.eligibleEntities || [],
      fundingDetails: subsidyData.funding?.fundingDetails || '',
      isRegionRestricted: subsidyData.eligibility?.geographicScope?.length > 0 &&
                          !subsidyData.eligibility.geographicScope.includes('France métropolitaine'),
      applicationUrl: subsidyData.applicationProcess?.applicationPlatform
    };
  }
}

/**
 * Generic extractor for unknown data sources
 */
export class GenericExtractor extends SubsidyExtractor {
  extractData(subsidyData: any): ExtractedSubsidyData {
    return {
      title: subsidyData.title || 'Untitled Subsidy',
      agency: subsidyData.agency || 'Unknown Agency',
      description: subsidyData.description || '',
      amount: this.parseAmount(subsidyData.amount),
      region: subsidyData.region || null,
      eligibility: subsidyData.eligibility || '',
      applicationProcess: subsidyData.applicationProcess || [],
      deadline: subsidyData.deadline || null,
      contactInfo: subsidyData.contact || {},
      documents: subsidyData.documents || [],
      requirements: subsidyData.requirements || [],
      fundingDetails: subsidyData.fundingDetails || '',
      isRegionRestricted: !!subsidyData.region && subsidyData.region !== 'All regions',
      applicationUrl: subsidyData.applicationUrl
    };
  }
}

/**
 * Factory function to get the appropriate extractor based on data source
 */
export const getSubsidyExtractor = (subsidyData: any): SubsidyExtractor => {
  // Detect Les Aides data by checking for raw_data.fiche structure
  if (subsidyData.raw_data?.fiche) {
    return new LesAidesExtractor();
  }
  
  // Detect FranceAgriMer data by checking for structured fields
  if (subsidyData.documents?.required || subsidyData.applicationProcess?.steps) {
    return new FranceAgriMerExtractor();
  }
  
  // Check agency field
  if (subsidyData.agency === 'FranceAgriMer') {
    return new FranceAgriMerExtractor();
  }
  
  // Default to generic extractor
  return new GenericExtractor();
};

/**
 * Main extraction function that uses source-aware extractors
 */
export const extractSubsidyData = (subsidyData: any): ExtractedSubsidyData => {
  const extractor = getSubsidyExtractor(subsidyData);
  return extractor.extractData(subsidyData);
};