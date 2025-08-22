/**
 * Phase 1: Pattern Extraction Service
 * Extracts structured data from EU business documents using regex patterns
 * Fast, reliable, and cost-effective for standardized formats
 */

export interface ExtractionResult {
  value: string | number | null;
  confidence: number; // 0-1 scale
  source: 'pattern' | 'calculation' | 'lookup';
  position?: { start: number; end: number };
  raw?: string;
}

export interface PatternExtractionResults {
  // Legal Identifiers
  vatNumber?: ExtractionResult;
  picCode?: ExtractionResult;
  registrationNumber?: ExtractionResult;
  sirenNumber?: ExtractionResult;
  
  // Financial Data
  turnover?: ExtractionResult;
  employees?: ExtractionResult;
  balanceSheetTotal?: ExtractionResult;
  
  // Banking & Financial
  iban?: ExtractionResult;
  bicCode?: ExtractionResult;
  
  // Contact Information
  email?: ExtractionResult;
  phone?: ExtractionResult;
  website?: ExtractionResult;
  
  // Dates
  incorporationDate?: ExtractionResult;
  financialYearEnd?: ExtractionResult;
  
  // Address Components
  postalCode?: ExtractionResult;
  country?: ExtractionResult;
  
  // Company Details
  companyName?: ExtractionResult;
  legalForm?: ExtractionResult;
}

class PatternExtractionService {
  // EU VAT Number patterns by country
  private readonly vatPatterns = {
    // Standard EU VAT format: 2 letters + 9-11 digits
    general: /(?:VAT[:\s]*)?([A-Z]{2}[\s]?\d{9,11})/gi,
    
    // Country-specific patterns
    FR: /(?:FR|France)[:\s]*(\d{2}[\s]?\d{9})/gi, // French VAT
    DE: /(?:DE|Germany)[:\s]*(\d{9})/gi, // German VAT
    IT: /(?:IT|Italy)[:\s]*(\d{11})/gi, // Italian VAT
    ES: /(?:ES|Spain)[:\s]*([A-Z]?\d{8}[A-Z]?)/gi, // Spanish VAT
    NL: /(?:NL|Netherlands)[:\s]*(\d{9}B\d{2})/gi, // Dutch VAT
    BE: /(?:BE|Belgium)[:\s]*([01]?\d{9})/gi, // Belgian VAT
  };

  // Company registration patterns
  private readonly registrationPatterns = {
    // French SIREN (9 digits)
    siren: /(?:SIREN|N°\s?SIREN)[:\s]*(\d{3}[\s]?\d{3}[\s]?\d{3})/gi,
    
    // German Handelsregister
    hrb: /(?:HRB|Handelsregister)[:\s]*(\d{1,6}[A-Z]?)/gi,
    
    // UK Companies House
    ukCompany: /(?:Company\s?No|Registration)[:\s]*(\d{8})/gi,
    
    // General registration number
    general: /(?:Registration[:\s]*(?:No|Number)[:\s]*|Reg[:\s]*No[:\s]*)([A-Z0-9]{6,15})/gi,
  };

  // Financial amount patterns (handles various EU formats)
  private readonly financialPatterns = {
    // European format: 1.234.567,89 or 1 234 567,89
    euroAmount: /(?:€|EUR)?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*(?:€|EUR)?/g,
    
    // English format: 1,234,567.89
    angloCurrency: /(?:£|€|USD?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:£|€|USD?)?/g,
    
    // Turnover specific patterns
    turnover: /(?:turnover|chiffre\s?d'affaires|revenues?|sales)[:\s]*(?:€|EUR)?\s*(\d{1,3}(?:[.\s,]\d{3})*(?:[.,]\d{2})?)/gi,
    
    // Employee count
    employees: /(?:employees?|staff|personnel|salariés?)[:\s]*(\d{1,6})/gi,
    
    // Balance sheet
    balanceSheet: /(?:balance\s?sheet|bilan)[:\s]*(?:€|EUR)?\s*(\d{1,3}(?:[.\s,]\d{3})*(?:[.,]\d{2})?)/gi,
  };

  // Banking patterns
  private readonly bankingPatterns = {
    // IBAN format (basic validation)
    iban: /\b([A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16})\b/g,
    
    // BIC/SWIFT code
    bic: /\b([A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)\b/g,
  };

  // Contact information patterns
  private readonly contactPatterns = {
    email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    
    // International phone formats
    phone: /(?:\+\d{1,3}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    
    // Website URLs
    website: /(?:https?:\/\/)?((?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]*\.(?:[a-zA-Z]{2,})+(?:\/[^\s]*)?)/g,
  };

  // Date patterns (various EU formats)
  private readonly datePatterns = {
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    european: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
    
    // YYYY-MM-DD (ISO format)
    iso: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
    
    // Month names (multi-language)
    monthName: /\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/gi,
  };

  // Legal form patterns
  private readonly legalFormPatterns = {
    // Common EU legal forms
    sarl: /\b(SARL|S\.A\.R\.L\.)\b/gi,
    sa: /\b(SA|S\.A\.)\b/gi,
    sas: /\b(SAS|S\.A\.S\.)\b/gi,
    eurl: /\b(EURL|E\.U\.R\.L\.)\b/gi,
    gmbh: /\b(GmbH|G\.m\.b\.H\.)\b/gi,
    ltd: /\b(Ltd|Limited)\b/gi,
    bv: /\b(B\.V\.)\b/gi,
    spa: /\b(S\.p\.A\.)\b/gi,
  };

  // Romanian-specific patterns
  private readonly romanianPatterns = {
    // CUI (Company Unique Registration Code) - 6-10 digits
    cui: /(?:CUI|Cod\s+Unic\s+de\s+[IÎ]nregistrare)[:\s]*(\d{6,10})/gi,
    cuiGeneral: /\b(\d{6,10})\b/g, // Fallback pattern
    
    // CIF (Fiscal Identification Code) - RO + 6-10 digits
    cif: /(?:CIF|VAT)[:\s]*(?:RO)?(\d{6,10})|RO(\d{6,10})/gi,
    
    // Trade Register Number - J + county code + / + number + / + year
    tradeRegister: /(?:Numărul\s+de\s+ordine\s+în\s+Registrul\s+Comerţului[:\s]*)?J(\d{2})\/(\d{1,9})\/(\d{4})/gi,
    
    // Romanian IBAN - RO + 22 digits total
    iban: /\b(?:IBAN[:\s]*)?RO(\d{22})\b/gi,
    
    // CNP (Personal Numerical Code) - 13 digits starting with 1-8
    cnp: /(?:CNP|Cod\s+Numeric\s+Personal)[:\s]*([1-8]\d{12})\b/gi,
    
    // ANAF Tax Certificate
    anafCertificate: /(?:Certificat\s+de\s+cazier\s+fiscal|Tax\s+clearance\s+certificate|ANAF|Agenția\s+Națională\s+de\s+Administrare\s+Fiscală)/gi,
  };

  // French-specific patterns  
  private readonly frenchPatterns = {
    // SIREN - 9 digits
    siren: /(?:SIREN|Numéro\s+SIREN)[:\s]*(\d{9})\b/gi,
    sirenGeneral: /\b(\d{9})\b/g, // Fallback for validation
    
    // SIRET - 14 digits (SIREN + 5 digit establishment code)
    siret: /(?:SIRET|Numéro\s+SIRET)[:\s]*(\d{14})\b/gi,
    siretGeneral: /\b(\d{14})\b/g,
    
    // RCS Registration
    rcs: /(?:RCS|Registre\s+du\s+Commerce\s+et\s+des\s+Sociétés)\s+([A-Z\s]+)(\d{3})\s*(\d{3})\s*(\d{3})/gi,
    
    // French VAT - FR + 2 check digits + 9 digit SIREN
    vatFr: /(?:TVA|N°\s*TVA)[:\s]*FR(\d{11})\b/gi,
    
    // APE/NAF Code - 4 digits + 1 letter
    apeNaf: /(?:APE|NAF)[:\s]*(\d{4}[A-Z])\b/gi,
    
    // French IBAN - FR + 25 digits total
    ibanFr: /\b(?:IBAN[:\s]*)?FR(\d{25})\b/gi,
    
    // KBIS Extract identifiers
    kbis: /(?:EXTRAIT\s+K\s*BIS|Greffe\s+du\s+Tribunal\s+de\s+Commerce|Code\s+de\s+vérification|Dénomination\s+sociale)/gi,
  };

  // Document type detection patterns
  private readonly documentHeaders = {
    romanian: [
      /REGISTRUL\s+COMERȚULUI/gi,
      /OFICIUL\s+NAȚIONAL\s+AL\s+REGISTRULUI\s+COMERȚULUI/gi,
      /AGENȚIA\s+NAȚIONALĂ\s+DE\s+ADMINISTRARE\s+FISCALĂ/gi,
      /ANAF/gi
    ],
    french: [
      /RÉPUBLIQUE\s+FRANÇAISE/gi,
      /GREFFE\s+DU\s+TRIBUNAL\s+DE\s+COMMERCE/gi,
      /REGISTRE\s+DU\s+COMMERCE\s+ET\s+DES\s+SOCIÉTÉS/gi,
      /INSEE/gi
    ]
  };

  /**
   * Extract patterns from document text
   */
  extractPatterns(text: string): PatternExtractionResults {
    const results: PatternExtractionResults = {};

    // VAT Number extraction
    results.vatNumber = this.extractVATNumber(text);
    
    // Registration numbers
    results.registrationNumber = this.extractRegistrationNumber(text);
    results.sirenNumber = this.extractSirenNumber(text);
    
    // Financial data
    results.turnover = this.extractTurnover(text);
    results.employees = this.extractEmployees(text);
    results.balanceSheetTotal = this.extractBalanceSheet(text);
    
    // Banking information
    results.iban = this.extractIBAN(text);
    results.bicCode = this.extractBIC(text);
    
    // Contact information
    results.email = this.extractEmail(text);
    results.phone = this.extractPhone(text);
    results.website = this.extractWebsite(text);
    
    // Dates
    results.incorporationDate = this.extractIncorporationDate(text);
    
    // Company details
    results.companyName = this.extractCompanyName(text);
    results.legalForm = this.extractLegalForm(text);
    
    // Geographic data
    results.postalCode = this.extractPostalCode(text);
    results.country = this.extractCountry(text);

    return results;
  }

  private extractVATNumber(text: string): ExtractionResult | undefined {
    // Try country-specific patterns first
    for (const [country, pattern] of Object.entries(this.vatPatterns)) {
      if (country === 'general') continue;
      
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1].replace(/\s/g, ''),
          confidence: 0.95,
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0]
        };
      }
    }

    // Fallback to general pattern
    const generalMatch = this.vatPatterns.general.exec(text);
    if (generalMatch) {
      return {
        value: generalMatch[1].replace(/\s/g, ''),
        confidence: 0.85,
        source: 'pattern',
        position: { start: generalMatch.index!, end: generalMatch.index! + generalMatch[0].length },
        raw: generalMatch[0]
      };
    }

    return undefined;
  }

  private extractRegistrationNumber(text: string): ExtractionResult | undefined {
    for (const [type, pattern] of Object.entries(this.registrationPatterns)) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1].replace(/\s/g, ''),
          confidence: type === 'general' ? 0.75 : 0.90,
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractSirenNumber(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.siren.exec(text);
    if (match) {
      return {
        value: match[1].replace(/\s/g, ''),
        confidence: 0.95,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractTurnover(text: string): ExtractionResult | undefined {
    const match = this.financialPatterns.turnover.exec(text);
    if (match) {
      const numericValue = this.parseEuropeanNumber(match[1]);
      return {
        value: numericValue,
        confidence: 0.85,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractEmployees(text: string): ExtractionResult | undefined {
    const match = this.financialPatterns.employees.exec(text);
    if (match) {
      return {
        value: parseInt(match[1], 10),
        confidence: 0.90,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractBalanceSheet(text: string): ExtractionResult | undefined {
    const match = this.financialPatterns.balanceSheet.exec(text);
    if (match) {
      const numericValue = this.parseEuropeanNumber(match[1]);
      return {
        value: numericValue,
        confidence: 0.80,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractIBAN(text: string): ExtractionResult | undefined {
    const match = this.bankingPatterns.iban.exec(text);
    if (match && this.validateIBAN(match[1])) {
      return {
        value: match[1],
        confidence: 0.95,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractBIC(text: string): ExtractionResult | undefined {
    const match = this.bankingPatterns.bic.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.85,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractEmail(text: string): ExtractionResult | undefined {
    const match = this.contactPatterns.email.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.95,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractPhone(text: string): ExtractionResult | undefined {
    const match = this.contactPatterns.phone.exec(text);
    if (match && match[0].replace(/\D/g, '').length >= 10) {
      return {
        value: match[0],
        confidence: 0.75, // Lower confidence as phone patterns can be ambiguous
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractWebsite(text: string): ExtractionResult | undefined {
    const match = this.contactPatterns.website.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.90,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractIncorporationDate(text: string): ExtractionResult | undefined {
    // Look for context-specific date patterns
    const incorporationContext = /(?:incorporat|créé|fondé|established)[^.]*?(\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]?\d{4})/gi;
    const match = incorporationContext.exec(text);
    
    if (match) {
      return {
        value: this.normalizeDate(match[1]),
        confidence: 0.80,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractCompanyName(text: string): ExtractionResult | undefined {
    // Look for company name patterns at document start
    const namePatterns = [
      /^([A-Z][A-Za-z\s&.-]{3,50}(?:S\.A\.R\.L\.?|S\.A\.S\.?|S\.A\.?|Ltd\.?|GmbH|B\.V\.)?)/m,
      /(?:Company|Société|Empresa)[:\s]*([A-Z][A-Za-z\s&.-]{3,50})/gi,
    ];

    for (const pattern of namePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1].trim(),
          confidence: 0.70, // Lower confidence as this is harder to extract accurately
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractLegalForm(text: string): ExtractionResult | undefined {
    for (const [type, pattern] of Object.entries(this.legalFormPatterns)) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1],
          confidence: 0.95,
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractPostalCode(text: string): ExtractionResult | undefined {
    // EU postal code patterns
    const postalPatterns = [
      /\b(\d{5})\b/g, // France, Germany (5 digits)
      /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/g, // UK
      /\b(\d{4}\s?[A-Z]{2})\b/g, // Netherlands
    ];

    for (const pattern of postalPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1],
          confidence: 0.80,
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractCountry(text: string): ExtractionResult | undefined {
    const countryPattern = /\b(France|Germany|Italy|Spain|Netherlands|Belgium|Portugal|Austria|Poland|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Slovenia|Slovakia|Lithuania|Latvia|Estonia|Luxembourg|Malta|Cyprus)\b/gi;
    const match = countryPattern.exec(text);
    
    if (match) {
      return {
        value: match[1],
        confidence: 0.85,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  // Utility methods
  private parseEuropeanNumber(numberStr: string): number {
    // Handle European number format (1.234.567,89 or 1 234 567,89)
    const normalized = numberStr
      .replace(/[\s.]/g, '') // Remove spaces and dots
      .replace(',', '.'); // Replace comma with dot for decimal
    
    return parseFloat(normalized);
  }

  private validateIBAN(iban: string): boolean {
    // Basic IBAN length validation (simplified)
    const ibanLengths: { [key: string]: number } = {
      'AD': 24, 'AE': 23, 'AL': 28, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
      'BG': 22, 'BH': 22, 'BR': 29, 'BY': 28, 'CH': 21, 'CR': 22, 'CY': 28,
      'CZ': 24, 'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'EG': 29, 'ES': 24,
      'FI': 18, 'FO': 18, 'FR': 27, 'GB': 22, 'GE': 22, 'GI': 23, 'GL': 18,
      'GR': 27, 'GT': 28, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23, 'IS': 26,
      'IT': 27, 'JO': 30, 'KW': 30, 'KZ': 20, 'LB': 28, 'LC': 32, 'LI': 21,
      'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'MD': 24, 'ME': 22, 'MK': 19,
      'MR': 27, 'MT': 31, 'MU': 30, 'NL': 18, 'NO': 15, 'PK': 24, 'PL': 28,
      'PS': 29, 'PT': 25, 'QA': 29, 'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24,
      'SI': 19, 'SK': 24, 'SM': 27, 'TN': 24, 'TR': 26, 'UA': 29, 'VG': 24,
      'XK': 20
    };

    const countryCode = iban.substring(0, 2);
    const expectedLength = ibanLengths[countryCode];
    
    return expectedLength ? iban.length === expectedLength : false;
  }

  private normalizeDate(dateStr: string): string {
    // Convert various date formats to ISO format (YYYY-MM-DD)
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      // Assume DD/MM/YYYY format for European documents
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  }

  /**
   * Get summary of extraction confidence and quality
   */
  getExtractionSummary(results: PatternExtractionResults): {
    totalFields: number;
    extractedFields: number;
    averageConfidence: number;
    highConfidenceFields: number;
  } {
    const allFields = Object.values(results).filter(Boolean);
    const totalFields = Object.keys(results).length;
    const extractedFields = allFields.length;
    const averageConfidence = allFields.reduce((sum, field) => sum + field!.confidence, 0) / extractedFields;
    const highConfidenceFields = allFields.filter(field => field!.confidence >= 0.8).length;

    return {
      totalFields,
      extractedFields,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      highConfidenceFields
    };
  }
}

// Singleton instance
let patternExtractionServiceInstance: PatternExtractionService | null = null;

export const getPatternExtractionService = (): PatternExtractionService => {
  if (!patternExtractionServiceInstance) {
    patternExtractionServiceInstance = new PatternExtractionService();
  }
  return patternExtractionServiceInstance;
};

export { PatternExtractionService };