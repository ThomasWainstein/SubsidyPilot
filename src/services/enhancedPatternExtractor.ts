/**
 * Enhanced Pattern Extractor with Romanian and French Validation
 * Uses composition with the base pattern extraction service
 */

import { PatternExtractionService, PatternExtractionResults, ExtractionResult } from './patternExtractionService';
import { ValidationService } from './validationService';

interface CountrySpecificResults extends PatternExtractionResults {
  // Romanian-specific fields
  cui?: ExtractionResult;
  cif?: ExtractionResult;
  tradeRegisterNumber?: ExtractionResult;
  cnp?: ExtractionResult;
  
  // French-specific fields
  sirenNumber?: ExtractionResult;
  siretNumber?: ExtractionResult;
  rcsNumber?: ExtractionResult;
  apeNafCode?: ExtractionResult;
  kbisIdentified?: ExtractionResult;
  
  // Document type detection
  documentCountry?: ExtractionResult;
  documentType?: ExtractionResult;
}

class EnhancedPatternExtractor {
  private baseExtractor = new PatternExtractionService();

  /**
   * Get extraction summary using base extractor
   */
  getExtractionSummary(results: CountrySpecificResults) {
    return this.baseExtractor.getExtractionSummary(results);
  }
  // Romanian patterns from research
  private readonly romanianPatterns = {
    cui: /(?:CUI|Cod\s+Unic\s+de\s+[IÎ]nregistrare)[:\s]*(\d{6,10})/gi,
    cuiGeneral: /\b(\d{6,10})\b/g,
    cif: /(?:CIF|VAT)[:\s]*(?:RO)?(\d{6,10})|RO(\d{6,10})/gi,
    tradeRegister: /(?:Numărul\s+de\s+ordine\s+în\s+Registrul\s+Comerţului[:\s]*)?J(\d{2})\/(\d{1,9})\/(\d{4})/gi,
    iban: /\b(?:IBAN[:\s]*)?RO(\d{22})\b/gi,
    cnp: /(?:CNP|Cod\s+Numeric\s+Personal)[:\s]*([1-8]\d{12})\b/gi,
    anafCertificate: /(?:Certificat\s+de\s+cazier\s+fiscal|Tax\s+clearance\s+certificate|ANAF|Agenția\s+Națională\s+de\s+Administrare\s+Fiscală)/gi,
  };

  // French patterns from research
  private readonly frenchPatterns = {
    siren: /(?:SIREN|Numéro\s+SIREN)[:\s]*(\d{9})\b/gi,
    sirenGeneral: /\b(\d{9})\b/g,
    siret: /(?:SIRET|Numéro\s+SIRET)[:\s]*(\d{14})\b/gi,
    siretGeneral: /\b(\d{14})\b/g,
    rcs: /(?:RCS|Registre\s+du\s+Commerce\s+et\s+des\s+Sociétés)\s+([A-Z\s]+)(\d{3})\s*(\d{3})\s*(\d{3})/gi,
    vatFr: /(?:TVA|N°\s*TVA)[:\s]*FR(\d{11})\b/gi,
    apeNaf: /(?:APE|NAF)[:\s]*(\d{4}[A-Z])\b/gi,
    ibanFr: /\b(?:IBAN[:\s]*)?FR(\d{25})\b/gi,
    kbis: /(?:EXTRAIT\s+K\s*BIS|Greffe\s+du\s+Tribunal\s+de\s+Commerce|Code\s+de\s+vérification|Dénomination\s+sociale)/gi,
  };

  // Document headers for country detection
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
   * Enhanced extraction with Romanian and French validation
   */
  extractPatternsEnhanced(text: string): CountrySpecificResults {
    // Start with base extraction
    const baseResults = this.baseExtractor.extractPatterns(text);
    const enhancedResults: CountrySpecificResults = { ...baseResults };

    // Detect document country first
    enhancedResults.documentCountry = this.detectDocumentCountry(text);
    
    // Romanian-specific extractions
    enhancedResults.cui = this.extractRomanianCUI(text);
    enhancedResults.cif = this.extractRomanianCIF(text);
    enhancedResults.tradeRegisterNumber = this.extractRomanianTradeRegister(text);
    enhancedResults.cnp = this.extractRomanianCNP(text);
    
    // French-specific extractions
    enhancedResults.sirenNumber = this.extractFrenchSIREN(text);
    enhancedResults.siretNumber = this.extractFrenchSIRET(text);
    enhancedResults.rcsNumber = this.extractFrenchRCS(text);
    enhancedResults.apeNafCode = this.extractFrenchAPE(text);
    enhancedResults.kbisIdentified = this.detectKBIS(text);

    return enhancedResults;
  }

  private detectDocumentCountry(text: string): ExtractionResult | undefined {
    // Check Romanian headers
    for (const pattern of this.documentHeaders.romanian) {
      if (pattern.test(text)) {
        return {
          value: 'Romania',
          confidence: 0.95,
          source: 'pattern',
          raw: 'Romanian document headers detected'
        };
      }
    }
    
    // Check French headers
    for (const pattern of this.documentHeaders.french) {
      if (pattern.test(text)) {
        return {
          value: 'France',
          confidence: 0.95,
          source: 'pattern',
          raw: 'French document headers detected'
        };
      }
    }
    
    return undefined;
  }

  private extractRomanianCUI(text: string): ExtractionResult | undefined {
    const match = this.romanianPatterns.cui.exec(text);
    if (match) {
      const cui = match[1];
      const isValid = ValidationService.validateRomanianCUI(cui);
      
      return {
        value: cui,
        confidence: isValid ? 0.98 : 0.70, // High confidence if validation passes
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractRomanianCIF(text: string): ExtractionResult | undefined {
    const match = this.romanianPatterns.cif.exec(text);
    if (match) {
      const cifNumber = match[1] || match[2];
      const isValid = ValidationService.validateRomanianCUI(cifNumber); // CIF uses same validation as CUI
      
      return {
        value: `RO${cifNumber}`,
        confidence: isValid ? 0.98 : 0.75,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractRomanianTradeRegister(text: string): ExtractionResult | undefined {
    const match = this.romanianPatterns.tradeRegister.exec(text);
    if (match) {
      const [, county, number, year] = match;
      const fullNumber = `J${county}/${number}/${year}`;
      
      // Validate county code (01-52)
      const countyCode = parseInt(county);
      const isValidCounty = countyCode >= 1 && countyCode <= 52;
      
      return {
        value: fullNumber,
        confidence: isValidCounty ? 0.95 : 0.80,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractRomanianCNP(text: string): ExtractionResult | undefined {
    const match = this.romanianPatterns.cnp.exec(text);
    if (match) {
      const cnp = match[1];
      const isValid = ValidationService.validateRomanianCNP(cnp);
      
      return {
        value: cnp,
        confidence: isValid ? 0.98 : 0.60,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractFrenchSIREN(text: string): ExtractionResult | undefined {
    const match = this.frenchPatterns.siren.exec(text);
    if (match) {
      const siren = match[1];
      const isValid = ValidationService.validateFrenchSIREN(siren);
      
      return {
        value: siren,
        confidence: isValid ? 0.98 : 0.65,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractFrenchSIRET(text: string): ExtractionResult | undefined {
    const match = this.frenchPatterns.siret.exec(text);
    if (match) {
      const siret = match[1];
      const isValid = ValidationService.validateFrenchSIRET(siret);
      
      return {
        value: siret,
        confidence: isValid ? 0.98 : 0.65,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractFrenchRCS(text: string): ExtractionResult | undefined {
    const match = this.frenchPatterns.rcs.exec(text);
    if (match) {
      const [, city, part1, part2, part3] = match;
      const siren = `${part1}${part2}${part3}`;
      const rcsNumber = `RCS ${city.trim()} ${part1} ${part2} ${part3}`;
      
      // Validate the SIREN component
      const isValid = ValidationService.validateFrenchSIREN(siren);
      
      return {
        value: rcsNumber,
        confidence: isValid ? 0.95 : 0.70,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }

  private extractFrenchAPE(text: string): ExtractionResult | undefined {
    const match = this.frenchPatterns.apeNaf.exec(text);
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

  private detectKBIS(text: string): ExtractionResult | undefined {
    const match = this.frenchPatterns.kbis.exec(text);
    if (match) {
      return {
        value: 'KBIS Document Detected',
        confidence: 0.95,
        source: 'pattern',
        position: { start: match.index!, end: match.index! + match[0].length },
        raw: match[0]
      };
    }
    return undefined;
  }
}

// Singleton instance
let enhancedPatternExtractorInstance: EnhancedPatternExtractor | null = null;

export const getEnhancedPatternExtractor = (): EnhancedPatternExtractor => {
  if (!enhancedPatternExtractorInstance) {
    enhancedPatternExtractorInstance = new EnhancedPatternExtractor();
  }
  return enhancedPatternExtractorInstance;
};

export { EnhancedPatternExtractor };
export type { CountrySpecificResults };