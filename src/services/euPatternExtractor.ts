/**
 * Comprehensive EU Pattern Extractor
 * Phase 4A: Enhanced Pattern Extraction for EU Funding Applications
 * Supports multiple countries, client types, and document languages
 */

export interface ExtractionResult {
  value: string;
  confidence: number;
  source: string;
  position?: { start: number; end: number };
  raw?: string;
  metadata?: any;
}

export interface EUPatternResults {
  // Legal Identifiers
  picCode?: ExtractionResult;
  vatNumber?: ExtractionResult;
  companyName?: ExtractionResult;
  
  // Country-specific Registration Numbers
  siretNumber?: ExtractionResult; // France
  kvkNumber?: ExtractionResult;   // Netherlands
  hrbNumber?: ExtractionResult;   // Germany
  cuiNumber?: ExtractionResult;   // Romania
  nipcNumber?: ExtractionResult;  // Spain
  nifNumber?: ExtractionResult;   // Portugal
  
  // International Codes
  eoriNumber?: ExtractionResult;  // Customs
  leiCode?: ExtractionResult;     // Financial entities
  
  // Financial Data
  turnover?: ExtractionResult;
  employees?: ExtractionResult;
  balanceSheetTotal?: ExtractionResult;
  profitLoss?: ExtractionResult;
  
  // SME Classification (auto-calculated)
  smeClassification?: ExtractionResult;
  
  // Contact Information
  address?: ExtractionResult;
  city?: ExtractionResult;
  postalCode?: ExtractionResult;
  country?: ExtractionResult;
  email?: ExtractionResult;
  phone?: ExtractionResult;
  
  // Dates
  registrationDate?: ExtractionResult;
  financialYearEnd?: ExtractionResult;
  
  // Document Metadata
  documentLanguage?: ExtractionResult;
  documentType?: ExtractionResult;
  clientType?: ExtractionResult;
}

export class EUPatternExtractor {
  
  // PIC (Participant Identification Code) - 9 digits
  private readonly picPattern = /(?:PIC|Participant\s+Identification\s+Code)[:\s]*(\d{9})\b/gi;
  
  // VAT Numbers by Country
  private readonly vatPatterns = {
    // European format: Country Code + digits
    general: /(?:VAT|TVA|IVA|BTW|MOMS)[:\s]*([A-Z]{2}\d{8,12})\b/gi,
    france: /(?:VAT|TVA)[:\s]*FR(\d{11})\b/gi,
    germany: /(?:VAT|USt-IdNr)[:\s]*DE(\d{9})\b/gi,
    netherlands: /(?:VAT|BTW)[:\s]*NL(\d{9})B\d{2}\b/gi,
    romania: /(?:VAT|TVA|CIF)[:\s]*RO(\d{6,10})\b/gi,
    spain: /(?:VAT|IVA|NIF)[:\s]*ES([A-Z]\d{7}[A-Z]|\d{8}[A-Z])\b/gi,
    portugal: /(?:VAT|IVA|NIF)[:\s]*PT(\d{9})\b/gi,
    italy: /(?:VAT|IVA)[:\s]*IT(\d{11})\b/gi,
    belgium: /(?:VAT|TVA|BTW)[:\s]*BE(\d{10})\b/gi
  };

  // Country-specific Registration Numbers
  private readonly registrationPatterns = {
    // France: SIRET (14 digits)
    siret: /(?:SIRET|Numéro\s+SIRET)[:\s]*(\d{14})\b/gi,
    
    // Netherlands: KVK (8 digits)
    kvk: /(?:KVK|Kamer\s+van\s+Koophandel)[:\s]*(\d{8})\b/gi,
    
    // Germany: HRB (Handelsregister)
    hrb: /(?:HRB|Handelsregister)[:\s]*(\d{1,6})\b/gi,
    
    // Romania: CUI (6-10 digits)
    cui: /(?:CUI|Cod\s+Unic\s+de\s+Înregistrare)[:\s]*(\d{6,10})\b/gi,
    
    // Spain: NIF/CIF
    nif: /(?:NIF|CIF)[:\s]*([A-Z]\d{7}[A-Z]|\d{8}[A-Z])\b/gi,
    
    // Portugal: NIPC
    nipc: /(?:NIPC|Número\s+de\s+Identificação)[:\s]*(\d{9})\b/gi
  };

  // International Trade Codes
  private readonly internationalPatterns = {
    // EORI (Economic Operators Registration and Identification)
    eori: /(?:EORI)[:\s]*([A-Z]{2}\d{12,15})\b/gi,
    
    // LEI (Legal Entity Identifier) - 20 characters
    lei: /(?:LEI)[:\s]*([A-Z0-9]{20})\b/gi
  };

  // Financial Data Patterns (Multi-language)
  private readonly financialPatterns = {
    // Turnover/Revenue
    turnover: [
      /(?:chiffre\s+d'affaires|turnover|cifra\s+de\s+afaceri|facturación)[:\s]*([€$£]?[\d\s,\.]+)(?:\s*(?:EUR|RON|USD|GBP))?/gi,
      /(?:revenue|revenus|venituri|ingresos)[:\s]*([€$£]?[\d\s,\.]+)(?:\s*(?:EUR|RON|USD|GBP))?/gi
    ],
    
    // Employees
    employees: [
      /(?:employés|employees|angajați|empleados|werknemers)[:\s]*(\d{1,6})\b/gi,
      /(?:staff|personnel|personal|medewerkers)[:\s]*(\d{1,6})\b/gi,
      /(\d{1,6})\s*(?:employés|employees|angajați|empleados)/gi
    ],
    
    // Balance Sheet Total
    balanceSheet: [
      /(?:total\s+du\s+bilan|balance\s+sheet\s+total|total\s+activ|total\s+balance)[:\s]*([€$£]?[\d\s,\.]+)/gi,
      /(?:total\s+assets|actifs\s+totaux|active\s+totale)[:\s]*([€$£]?[\d\s,\.]+)/gi
    ],
    
    // Profit/Loss
    profitLoss: [
      /(?:résultat\s+net|net\s+profit|profit\s+net|beneficio\s+neto)[:\s]*([€$£\-]?[\d\s,\.]+)/gi,
      /(?:loss|perte|perdida|pierdere)[:\s]*([€$£\-]?[\d\s,\.]+)/gi
    ]
  };

  // Address Patterns
  private readonly addressPatterns = {
    // European postal codes
    postalCode: [
      /\b(\d{5})\b.*(?:France|FR)/gi,        // France: 5 digits
      /\b(\d{5})\b.*(?:Germany|DE)/gi,       // Germany: 5 digits  
      /\b(\d{4}\s*[A-Z]{2})\b.*(?:Netherlands|NL)/gi, // Netherlands: 4 digits + 2 letters
      /\b(\d{6})\b.*(?:Romania|RO)/gi,       // Romania: 6 digits
      /\b(\d{5})\b.*(?:Spain|ES)/gi,         // Spain: 5 digits
      /\b(\d{4}-\d{3})\b.*(?:Portugal|PT)/gi // Portugal: 4-3 format
    ],
    
    // Street addresses (simplified)
    address: [
      /(?:address|adresse|dirección|endereço|adres)[:\s]*([^\n]{10,100})/gi,
      /(?:rue|street|str\.|strada|calle)[:\s]*([^\n]{5,80})/gi
    ],
    
    // Cities
    city: [
      /(?:city|ville|ciudad|cidade|stad|oraș)[:\s]*([A-Za-zÀ-ÿ\s]{2,50})/gi
    ]
  };

  // Date Patterns (Multiple formats)
  private readonly datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,     // DD/MM/YYYY or MM/DD/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,     // YYYY/MM/DD
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi, // French
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi, // English
    /(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/gi // Spanish
  ];

  /**
   * Main extraction method
   */
  extractPatterns(text: string, clientType?: string, documentType?: string): EUPatternResults {
    const results: EUPatternResults = {};
    
    // Document metadata
    results.documentLanguage = this.detectLanguage(text);
    results.documentType = this.detectDocumentType(text);
    results.clientType = this.inferClientType(text, clientType);
    
    // Legal identifiers
    results.picCode = this.extractPICCode(text);
    results.vatNumber = this.extractVATNumber(text);
    results.companyName = this.extractCompanyName(text);
    
    // Country-specific registration numbers
    results.siretNumber = this.extractSIRET(text);
    results.kvkNumber = this.extractKVK(text);
    results.hrbNumber = this.extractHRB(text);
    results.cuiNumber = this.extractCUI(text);
    results.nipcNumber = this.extractNIPC(text);
    results.nifNumber = this.extractNIF(text);
    
    // International codes
    results.eoriNumber = this.extractEORI(text);
    results.leiCode = this.extractLEI(text);
    
    // Financial data
    results.turnover = this.extractTurnover(text);
    results.employees = this.extractEmployees(text);
    results.balanceSheetTotal = this.extractBalanceSheet(text);
    results.profitLoss = this.extractProfitLoss(text);
    
    // Contact information
    results.address = this.extractAddress(text);
    results.postalCode = this.extractPostalCode(text);
    results.email = this.extractEmail(text);
    results.phone = this.extractPhone(text);
    
    // Dates
    results.registrationDate = this.extractRegistrationDate(text);
    results.financialYearEnd = this.extractFinancialYearEnd(text);
    
    // Calculate SME classification
    results.smeClassification = this.calculateSMEClassification(results);
    
    return results;
  }

  /**
   * Extract PIC Code (9 digits)
   */
  private extractPICCode(text: string): ExtractionResult | undefined {
    const match = this.picPattern.exec(text);
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

  /**
   * Extract VAT Number (country-aware)
   */
  private extractVATNumber(text: string): ExtractionResult | undefined {
    // Try country-specific patterns first
    for (const [country, pattern] of Object.entries(this.vatPatterns)) {
      const match = pattern.exec(text);
      if (match) {
        const vatNumber = country === 'general' ? match[1] : `${this.getCountryCode(country)}${match[1]}`;
        return {
          value: vatNumber,
          confidence: 0.90,
          source: 'pattern',
          position: { start: match.index!, end: match.index! + match[0].length },
          raw: match[0],
          metadata: { country }
        };
      }
    }
    return undefined;
  }

  /**
   * Extract company name (multi-language)
   */
  private extractCompanyName(text: string): ExtractionResult | undefined {
    const patterns = [
      /(?:company\s+name|nom\s+de\s+l'entreprise|denominación|denominação)[:\s]*([^\n]{3,100})/gi,
      /(?:société|company|empresa|bedrijf)[:\s]*([^\n]{3,80})/gi,
      /([A-Z][a-zA-ZÀ-ÿ\s&]{2,50})\s*(?:S\.R\.L\.|S\.A\.|SRL|SA|B\.V\.|GmbH|Ltd|Inc)/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1].trim(),
          confidence: 0.80,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  /**
   * Extract SIRET (France)
   */
  private extractSIRET(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.siret.exec(text);
    if (match && this.validateSIRET(match[1])) {
      return {
        value: match[1],
        confidence: 0.95,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0],
        metadata: { country: 'France' }
      };
    }
    return undefined;
  }

  /**
   * Extract turnover/revenue
   */
  private extractTurnover(text: string): ExtractionResult | undefined {
    for (const pattern of this.financialPatterns.turnover) {
      const match = pattern.exec(text);
      if (match) {
        const cleanValue = this.cleanFinancialValue(match[1]);
        if (cleanValue) {
          return {
            value: cleanValue,
            confidence: 0.75,
            source: 'pattern',
            position: { start: match.index!, end: match.index! + match[0].length },
            raw: match[0]
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Extract employee count
   */
  private extractEmployees(text: string): ExtractionResult | undefined {
    for (const pattern of this.financialPatterns.employees) {
      const match = pattern.exec(text);
      if (match) {
        const employeeCount = parseInt(match[1]);
        if (employeeCount > 0 && employeeCount < 1000000) {
          return {
            value: employeeCount.toString(),
            confidence: 0.85,
            source: 'pattern',
            position: { start: match.index!, end: match.index! + match[0].length },
            raw: match[0]
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Calculate SME Classification based on EU criteria
   */
  private calculateSMEClassification(results: EUPatternResults): ExtractionResult | undefined {
    const turnover = results.turnover ? this.parseFinancialValue(results.turnover.value) : null;
    const employees = results.employees ? parseInt(results.employees.value) : null;
    const balanceSheet = results.balanceSheetTotal ? this.parseFinancialValue(results.balanceSheetTotal.value) : null;

    // EU SME criteria:
    // Micro: < 10 employees, < €2M turnover or < €2M balance sheet
    // Small: < 50 employees, < €10M turnover or < €10M balance sheet  
    // Medium: < 250 employees, < €50M turnover or < €43M balance sheet
    // Large: >= 250 employees or >= €50M turnover or >= €43M balance sheet

    let classification = 'unknown';
    let confidence = 0.0;

    if (employees !== null || turnover !== null || balanceSheet !== null) {
      if ((employees !== null && employees < 10) || 
          (turnover !== null && turnover < 2000000) || 
          (balanceSheet !== null && balanceSheet < 2000000)) {
        classification = 'micro';
        confidence = 0.90;
      } else if ((employees !== null && employees < 50) || 
                 (turnover !== null && turnover < 10000000) || 
                 (balanceSheet !== null && balanceSheet < 10000000)) {
        classification = 'small';
        confidence = 0.90;
      } else if ((employees !== null && employees < 250) || 
                 (turnover !== null && turnover < 50000000) || 
                 (balanceSheet !== null && balanceSheet < 43000000)) {
        classification = 'medium';
        confidence = 0.90;
      } else {
        classification = 'large';
        confidence = 0.85;
      }

      return {
        value: classification,
        confidence,
        source: 'calculated',
        metadata: {
          employees,
          turnover,
          balanceSheet,
          criteria: 'EU SME Definition'
        }
      };
    }

    return undefined;
  }

  // Helper methods
  private detectLanguage(text: string): ExtractionResult | undefined {
    const languagePatterns = {
      french: /\b(?:société|entreprise|siret|siren|chiffre|affaires)\b/gi,
      english: /\b(?:company|business|turnover|revenue|employees)\b/gi,
      spanish: /\b(?:empresa|sociedad|facturación|empleados)\b/gi,
      romanian: /\b(?:societate|întreprindere|cifra|afaceri|angajați)\b/gi,
      german: /\b(?:unternehmen|gesellschaft|umsatz|mitarbeiter)\b/gi,
      dutch: /\b(?:bedrijf|onderneming|omzet|werknemers)\b/gi
    };

    let maxMatches = 0;
    let detectedLanguage = 'unknown';

    for (const [language, pattern] of Object.entries(languagePatterns)) {
      const matches = (text.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLanguage = language;
      }
    }

    if (maxMatches > 0) {
      return {
        value: detectedLanguage,
        confidence: Math.min(0.95, 0.5 + (maxMatches * 0.1)),
        source: 'pattern'
      };
    }

    return undefined;
  }

  private validateSIRET(siret: string): boolean {
    if (siret.length !== 14) return false;
    // SIRET validation algorithm (Luhn-like)
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(siret[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  private cleanFinancialValue(value: string): string | null {
    const cleaned = value.replace(/[€$£\s,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed.toString() : null;
  }

  private parseFinancialValue(value: string): number | null {
    const cleaned = value.replace(/[€$£\s,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }

  private getCountryCode(country: string): string {
    const codes: { [key: string]: string } = {
      france: 'FR',
      germany: 'DE',
      netherlands: 'NL',
      romania: 'RO',
      spain: 'ES',
      portugal: 'PT',
      italy: 'IT',
      belgium: 'BE'
    };
    return codes[country] || '';
  }

  // Implement remaining extraction methods with similar patterns...
  private extractKVK(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.kvk.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.90,
        source: 'pattern',
        raw: match[0],
        metadata: { country: 'Netherlands' }
      };
    }
    return undefined;
  }

  private extractHRB(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.hrb.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.85,
        source: 'pattern',
        raw: match[0],
        metadata: { country: 'Germany' }
      };
    }
    return undefined;
  }

  private extractCUI(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.cui.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.90,
        source: 'pattern',
        raw: match[0],
        metadata: { country: 'Romania' }
      };
    }
    return undefined;
  }

  private extractNIPC(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.nipc.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.90,
        source: 'pattern',
        raw: match[0],
        metadata: { country: 'Portugal' }
      };
    }
    return undefined;
  }

  private extractNIF(text: string): ExtractionResult | undefined {
    const match = this.registrationPatterns.nif.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.90,
        source: 'pattern',
        raw: match[0],
        metadata: { country: 'Spain' }
      };
    }
    return undefined;
  }

  private extractEORI(text: string): ExtractionResult | undefined {
    const match = this.internationalPatterns.eori.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.95,
        source: 'pattern',
        raw: match[0],
        metadata: { type: 'customs' }
      };
    }
    return undefined;
  }

  private extractLEI(text: string): ExtractionResult | undefined {
    const match = this.internationalPatterns.lei.exec(text);
    if (match) {
      return {
        value: match[1],
        confidence: 0.95,
        source: 'pattern',
        raw: match[0],
        metadata: { type: 'financial' }
      };
    }
    return undefined;
  }

  private extractBalanceSheet(text: string): ExtractionResult | undefined {
    for (const pattern of this.financialPatterns.balanceSheet) {
      const match = pattern.exec(text);
      if (match) {
        const cleanValue = this.cleanFinancialValue(match[1]);
        if (cleanValue) {
          return {
            value: cleanValue,
            confidence: 0.80,
            source: 'pattern',
            raw: match[0]
          };
        }
      }
    }
    return undefined;
  }

  private extractProfitLoss(text: string): ExtractionResult | undefined {
    for (const pattern of this.financialPatterns.profitLoss) {
      const match = pattern.exec(text);
      if (match) {
        const cleanValue = this.cleanFinancialValue(match[1]);
        if (cleanValue) {
          return {
            value: cleanValue,
            confidence: 0.75,
            source: 'pattern',
            raw: match[0]
          };
        }
      }
    }
    return undefined;
  }

  private extractAddress(text: string): ExtractionResult | undefined {
    for (const pattern of this.addressPatterns.address) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1].trim(),
          confidence: 0.70,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractPostalCode(text: string): ExtractionResult | undefined {
    for (const pattern of this.addressPatterns.postalCode) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1],
          confidence: 0.85,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractEmail(text: string): ExtractionResult | undefined {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const match = emailPattern.exec(text);
    if (match) {
      return {
        value: match[0],
        confidence: 0.90,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractPhone(text: string): ExtractionResult | undefined {
    const phonePatterns = [
      /\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}/g,
      /\b\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}\b/g
    ];

    for (const pattern of phonePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[0],
          confidence: 0.75,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractRegistrationDate(text: string): ExtractionResult | undefined {
    for (const pattern of this.datePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[0],
          confidence: 0.70,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private extractFinancialYearEnd(text: string): ExtractionResult | undefined {
    const fyPatterns = [
      /(?:financial\s+year\s+end|exercice\s+clos|año\s+fiscal)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi
    ];

    for (const pattern of fyPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: match[1],
          confidence: 0.80,
          source: 'pattern',
          raw: match[0]
        };
      }
    }
    return undefined;
  }

  private detectDocumentType(text: string): ExtractionResult | undefined {
    const documentTypes = {
      'business_registration': /\b(?:business\s+registration|immatriculation|registro\s+mercantil|handelsregister)\b/gi,
      'financial_statement': /\b(?:financial\s+statement|bilan|balance\s+sheet|estado\s+financiero)\b/gi,
      'vat_certificate': /\b(?:vat\s+certificate|certificat\s+tva|certificado\s+iva)\b/gi,
      'kbis': /\b(?:extrait\s+kbis|kbis)\b/gi,
      'annual_report': /\b(?:annual\s+report|rapport\s+annuel|informe\s+anual)\b/gi
    };

    for (const [type, pattern] of Object.entries(documentTypes)) {
      if (pattern.test(text)) {
        return {
          value: type,
          confidence: 0.85,
          source: 'pattern'
        };
      }
    }

    return {
      value: 'unknown',
      confidence: 0.50,
      source: 'pattern'
    };
  }

  private inferClientType(text: string, providedType?: string): ExtractionResult | undefined {
    if (providedType) {
      return {
        value: providedType,
        confidence: 1.0,
        source: 'user_provided'
      };
    }

    const clientPatterns = {
      'business': /\b(?:société|company|enterprise|empresa|bedrijf|unternehmen)\b/gi,
      'ngo': /\b(?:ngo|ong|association|fundación|stichting|verein)\b/gi,
      'municipality': /\b(?:municipality|commune|municipio|gemeente|gemeinde|primărie)\b/gi,
      'individual': /\b(?:individual|particulier|persona\s+física|persoon|person)\b/gi
    };

    for (const [type, pattern] of Object.entries(clientPatterns)) {
      if (pattern.test(text)) {
        return {
          value: type,
          confidence: 0.70,
          source: 'inferred'
        };
      }
    }

    return {
      value: 'business', // Default assumption
      confidence: 0.50,
      source: 'default'
    };
  }

  /**
   * Get extraction quality assessment
   */
  getQualityAssessment(results: EUPatternResults): {
    overallConfidence: number;
    extractedFields: number;
    totalFields: number;
    criticalFieldsCovered: boolean;
    needsAIProcessing: boolean;
  } {
    const allFields = Object.keys(results);
    const extractedFields = allFields.filter(key => 
      results[key as keyof EUPatternResults] !== undefined
    );
    
    const confidenceScores = extractedFields
      .map(key => results[key as keyof EUPatternResults]?.confidence || 0)
      .filter(score => score > 0);
    
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    // Critical fields for EU funding applications
    const criticalFields = ['vatNumber', 'companyName', 'turnover', 'employees'];
    const criticalFieldsCovered = criticalFields.some(field => 
      results[field as keyof EUPatternResults] !== undefined
    );

    const needsAIProcessing = overallConfidence < 0.75 || 
                             extractedFields.length < allFields.length * 0.6 ||
                             !criticalFieldsCovered;

    return {
      overallConfidence,
      extractedFields: extractedFields.length,
      totalFields: allFields.length,
      criticalFieldsCovered,
      needsAIProcessing
    };
  }
}

// Singleton instance
let euPatternExtractorInstance: EUPatternExtractor | null = null;

export const getEUPatternExtractor = (): EUPatternExtractor => {
  if (!euPatternExtractorInstance) {
    euPatternExtractorInstance = new EUPatternExtractor();
  }
  return euPatternExtractorInstance;
};