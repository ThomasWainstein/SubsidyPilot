/**
 * French Subsidy Content Parser
 * Extracts structured information from French subsidy descriptions using regex patterns and NLP techniques
 */

export interface ExtractedFunding {
  type: 'percentage' | 'fixed' | 'range' | 'maximum' | 'minimum';
  percentage?: number;
  minAmount?: number;
  maxAmount?: number;
  currency: string;
  conditions?: string;
  originalText: string;
}

export interface ExtractedEligibility {
  entityTypes: string[];
  sectors: string[];
  geographicScope: string[];
  sizeRequirements?: string;
  originalText: string;
}

export interface ExtractedDeadline {
  date?: string;
  type: 'fixed' | 'rolling' | 'annual' | 'unknown';
  description: string;
  originalText: string;
}

export interface ParsedSubsidyContent {
  funding: ExtractedFunding[];
  eligibility: ExtractedEligibility;
  applicationProcess?: string[];
  contactInfo?: string;
  deadline?: ExtractedDeadline;
  confidence: number;
}

export class FrenchSubsidyParser {
  // Funding pattern matchers
  private static FUNDING_PATTERNS = {
    percentage: [
      /(?:subvention|aide).*?(?:hauteur de|jusqu'à|maximum)\s*(\d+(?:[.,]\d+)?)\s*%/gi,
      /(\d+(?:[.,]\d+)?)\s*%.*?(?:dépense|investissement|coût)/gi,
    ],
    amountRange: [
      /entre\s*(\d+(?:\s*\d{3})*)\s*€.*?et\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /de\s*(\d+(?:\s*\d{3})*)\s*€.*?à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    maxAmount: [
      /plafond.*?(?:aide|subvention).*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /maximum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /jusqu'à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    minAmount: [
      /minimum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /au moins\s*(\d+(?:\s*\d{3})*)\s*€/gi,
    ]
  };

  // Entity type patterns
  private static ENTITY_PATTERNS = {
    tpe: /TPE|très petites entreprises|micro[- ]entreprises/gi,
    pme: /PME|petites et moyennes entreprises/gi,
    entreprises: /entreprises?/gi,
    associations: /associations?/gi,
    collectivites: /collectivités?|communes?|départements?|régions?/gi,
    artisans: /artisans?|artisanat/gi,
    commercants: /commerçants?|commerce/gi,
    agriculteurs: /agriculteurs?|exploitations? agricoles?/gi,
  };

  // Geographic patterns
  private static GEOGRAPHIC_PATTERNS = {
    france: /France|français|nationale?/gi,
    region: /région|régional/gi,
    departement: /département|départemental/gi,
    commune: /commune|communal|local/gi,
    communaute: /communauté de communes|intercommunal/gi,
  };

  static parse(content: string): ParsedSubsidyContent {
    const funding = this.extractFunding(content);
    const eligibility = this.extractEligibility(content);
    const applicationProcess = this.extractApplicationProcess(content);
    const contactInfo = this.extractContactInfo(content);
    const deadline = this.extractDeadline(content);
    
    // Calculate confidence based on extracted information completeness
    const confidence = this.calculateConfidence(funding, eligibility, applicationProcess, contactInfo, deadline);

    return {
      funding,
      eligibility,
      applicationProcess,
      contactInfo,
      deadline,
      confidence
    };
  }

  private static extractFunding(content: string): ExtractedFunding[] {
    const results: ExtractedFunding[] = [];
    
    // Extract percentage-based funding
    for (const pattern of this.FUNDING_PATTERNS.percentage) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const percentage = parseFloat(match[1].replace(',', '.'));
        results.push({
          type: 'percentage',
          percentage,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // Extract amount ranges
    for (const pattern of this.FUNDING_PATTERNS.amountRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        const maxAmount = parseInt(match[2].replace(/\s/g, ''));
        results.push({
          type: 'range',
          minAmount,
          maxAmount,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // Extract maximum amounts
    for (const pattern of this.FUNDING_PATTERNS.maxAmount) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const maxAmount = parseInt(match[1].replace(/\s/g, ''));
        results.push({
          type: 'maximum',
          maxAmount,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // Extract minimum amounts
    for (const pattern of this.FUNDING_PATTERNS.minAmount) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        results.push({
          type: 'minimum',
          minAmount,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    return results;
  }

  private static extractEligibility(content: string): ExtractedEligibility {
    const entityTypes: string[] = [];
    const sectors: string[] = [];
    const geographicScope: string[] = [];

    // Extract entity types
    for (const [type, pattern] of Object.entries(this.ENTITY_PATTERNS)) {
      if (pattern.test(content)) {
        entityTypes.push(type);
      }
    }

    // Extract geographic scope
    for (const [scope, pattern] of Object.entries(this.GEOGRAPHIC_PATTERNS)) {
      if (pattern.test(content)) {
        geographicScope.push(scope);
      }
    }

    return {
      entityTypes,
      sectors,
      geographicScope,
      originalText: content
    };
  }

  private static extractApplicationProcess(content: string): string[] {
    const processes: string[] = [];
    
    // Look for application process indicators
    const processPatterns = [
      /démarche.*?suivre[^.]*\./gi,
      /demande.*?dossier[^.]*\./gi,
      /retirer.*?dossier[^.]*\./gi,
      /avant.*?démarrage[^.]*\./gi,
    ];

    for (const pattern of processPatterns) {
      const matches = [...content.matchAll(pattern)];
      processes.push(...matches.map(m => m[0].trim()));
    }

    return processes;
  }

  private static extractContactInfo(content: string): string | undefined {
    // Extract contact information
    const contactPatterns = [
      /auprès.*?organisme[^.]*\./gi,
      /contact.*?[^.]*\./gi,
      /s'adresser.*?[^.]*\./gi,
    ];

    for (const pattern of contactPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  private static extractDeadline(content: string): ExtractedDeadline | undefined {
    // Look for deadline information
    const deadlinePatterns = [
      /avant.*?(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /jusqu'au.*?(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /limite.*?(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    ];

    for (const pattern of deadlinePatterns) {
      const match = content.match(pattern);
      if (match) {
        return {
          date: match[1],
          type: 'fixed',
          description: match[0].trim(),
          originalText: match[0]
        };
      }
    }

    // Look for rolling deadline indicators
    if (/en continu|permanent|tout moment/gi.test(content)) {
      return {
        type: 'rolling',
        description: 'Candidatures en continu',
        originalText: content
      };
    }

    return undefined;
  }

  private static calculateConfidence(
    funding: ExtractedFunding[],
    eligibility: ExtractedEligibility,
    applicationProcess?: string[],
    contactInfo?: string,
    deadline?: ExtractedDeadline
  ): number {
    let score = 0;
    let maxScore = 5;

    // Funding information (most important)
    if (funding.length > 0) score += 2;
    
    // Eligibility information
    if (eligibility.entityTypes.length > 0 || eligibility.geographicScope.length > 0) score += 1;
    
    // Application process
    if (applicationProcess && applicationProcess.length > 0) score += 1;
    
    // Contact information
    if (contactInfo) score += 0.5;
    
    // Deadline information
    if (deadline) score += 0.5;

    return Math.min(1, score / maxScore);
  }

  // Utility method to format funding for display
  static formatFundingDisplay(funding: ExtractedFunding[]): string {
    if (funding.length === 0) return 'Montant non spécifié';

    const primary = funding[0];
    
    switch (primary.type) {
      case 'percentage':
        return `${primary.percentage}% de subvention`;
      case 'range':
        return `€${primary.minAmount?.toLocaleString()} - €${primary.maxAmount?.toLocaleString()}`;
      case 'maximum':
        return `Jusqu'à €${primary.maxAmount?.toLocaleString()}`;
      case 'minimum':
        return `À partir de €${primary.minAmount?.toLocaleString()}`;
      default:
        return primary.originalText;
    }
  }
}