/**
 * Enhanced French Text Processing Engine
 * Advanced parsing for French subsidy data with confidence scoring
 */

export interface ParsedAmount {
  min?: number;
  max?: number;
  rate?: number; // Percentage rate (e.g., 70% coverage)
  conditions?: string;
  displayText: string;
  confidence: number;
}

export interface ParsedDeadline {
  date?: Date;
  description: string;
  isOpen: boolean;
  daysRemaining?: number;
  confidence: number;
}

export interface ParsedEligibility {
  criteria: string[];
  restrictions: string[];
  requirements: string[];
  confidence: number;
}

export class EnhancedFrenchParser {
  
  /**
   * Parse complex French amount patterns
   */
  static parseComplexAmounts(text: string): ParsedAmount {
    if (!text || typeof text !== 'string') {
      return { displayText: "Montant non spécifié", confidence: 0 };
    }

    const normalizedText = text.toLowerCase().trim();
    let confidence = 0.5;

    // Pattern 1: "Entre X € et Y €"
    const betweenPattern = /entre\s+(\d{1,3}(?:\s?\d{3})*)\s*€\s+et\s+(\d{1,3}(?:\s?\d{3})*)\s*€/i;
    const betweenMatch = normalizedText.match(betweenPattern);
    if (betweenMatch) {
      const min = parseInt(betweenMatch[1].replace(/\s/g, ''));
      const max = parseInt(betweenMatch[2].replace(/\s/g, ''));
      confidence = 0.9;
      
      // Check for percentage conditions
      const percentagePattern = /(\d+)%\s+des?\s+(dépenses?|coûts?|investissements?)/i;
      const percentageMatch = text.match(percentagePattern);
      const rate = percentageMatch ? parseInt(percentageMatch[1]) / 100 : undefined;
      
      return {
        min,
        max,
        rate,
        conditions: this.extractConditions(text),
        displayText: `Entre ${min.toLocaleString('fr-FR')} € et ${max.toLocaleString('fr-FR')} €${rate ? ` (${Math.round(rate * 100)}% max)` : ''}`,
        confidence
      };
    }

    // Pattern 2: "Jusqu'à X €" or "Maximum X €"
    const maxPattern = /(?:jusqu'à|maximum|plafond\s+de|au\s+maximum)\s+(\d{1,3}(?:\s?\d{3})*)\s*€/i;
    const maxMatch = normalizedText.match(maxPattern);
    if (maxMatch) {
      const max = parseInt(maxMatch[1].replace(/\s/g, ''));
      confidence = 0.8;
      
      const percentagePattern = /(\d+)%/i;
      const percentageMatch = text.match(percentagePattern);
      const rate = percentageMatch ? parseInt(percentageMatch[1]) / 100 : undefined;
      
      return {
        max,
        rate,
        conditions: this.extractConditions(text),
        displayText: `Jusqu'à ${max.toLocaleString('fr-FR')} €${rate ? ` (${Math.round(rate * 100)}% max)` : ''}`,
        confidence
      };
    }

    // Pattern 3: "À partir de X €" or "Minimum X €"
    const minPattern = /(?:à\s+partir\s+de|minimum|au\s+moins)\s+(\d{1,3}(?:\s?\d{3})*)\s*€/i;
    const minMatch = normalizedText.match(minPattern);
    if (minMatch) {
      const min = parseInt(minMatch[1].replace(/\s/g, ''));
      confidence = 0.7;
      
      return {
        min,
        conditions: this.extractConditions(text),
        displayText: `À partir de ${min.toLocaleString('fr-FR')} €`,
        confidence
      };
    }

    // Pattern 4: Variable amounts
    const variablePatterns = [
      /dépendra?\s+du\s+projet/i,
      /selon\s+le\s+projet/i,
      /variable/i,
      /non\s+précisé/i,
      /sur\s+devis/i
    ];

    for (const pattern of variablePatterns) {
      if (pattern.test(normalizedText)) {
        confidence = 0.6;
        return {
          conditions: text,
          displayText: "Montant variable selon le projet",
          confidence
        };
      }
    }

    // Pattern 5: Simple amount "X €"
    const simplePattern = /(\d{1,3}(?:\s?\d{3})*)\s*€/i;
    const simpleMatch = normalizedText.match(simplePattern);
    if (simpleMatch) {
      const amount = parseInt(simpleMatch[1].replace(/\s/g, ''));
      confidence = 0.5;
      
      return {
        max: amount,
        displayText: `${amount.toLocaleString('fr-FR')} €`,
        confidence
      };
    }

    return {
      displayText: text.length > 100 ? text.substring(0, 100) + "..." : text,
      confidence: 0.3
    };
  }

  /**
   * Parse French deadline patterns
   */
  static parseDeadlines(text: string): ParsedDeadline {
    if (!text || typeof text !== 'string') {
      return { description: "Date limite non spécifiée", isOpen: false, confidence: 0 };
    }

    const normalizedText = text.toLowerCase().trim();
    let confidence = 0.5;

    // Pattern 1: "jusqu'au DD/MM/YYYY" or "avant le DD/MM/YYYY"
    const datePattern = /(?:jusqu'au|avant\s+le|date\s+limite\s*:?)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(dateMatch[3]);
      const deadline = new Date(year, month, day);
      const today = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      confidence = 0.9;
      return {
        date: deadline,
        description: `Date limite: ${deadline.toLocaleDateString('fr-FR')}`,
        isOpen: daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        confidence
      };
    }

    // Pattern 2: "31 décembre 2024"
    const frenchDatePattern = /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i;
    const frenchDateMatch = text.match(frenchDatePattern);
    if (frenchDateMatch) {
      const monthNames = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
      };
      
      const day = parseInt(frenchDateMatch[1]);
      const month = monthNames[frenchDateMatch[2].toLowerCase() as keyof typeof monthNames];
      const year = parseInt(frenchDateMatch[3]);
      const deadline = new Date(year, month, day);
      const today = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      confidence = 0.8;
      return {
        date: deadline,
        description: `Date limite: ${deadline.toLocaleDateString('fr-FR')}`,
        isOpen: daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        confidence
      };
    }

    // Pattern 3: Continuous application
    const continuousPatterns = [
      /dépôts?\s+possibles?\s+toute\s+l'année/i,
      /candidatures?\s+ouvertes?\s+en\s+permanence/i,
      /pas\s+de\s+date\s+limite/i,
      /en\s+continu/i
    ];

    for (const pattern of continuousPatterns) {
      if (pattern.test(normalizedText)) {
        confidence = 0.7;
        return {
          description: "Candidatures ouvertes en continu",
          isOpen: true,
          confidence
        };
      }
    }

    // Pattern 4: Closed or suspended
    const closedPatterns = [
      /suspendu/i,
      /fermé/i,
      /plus\s+de\s+candidatures?/i,
      /clos/i
    ];

    for (const pattern of closedPatterns) {
      if (pattern.test(normalizedText)) {
        confidence = 0.8;
        return {
          description: "Candidatures fermées",
          isOpen: false,
          confidence
        };
      }
    }

    return {
      description: text.length > 100 ? text.substring(0, 100) + "..." : text,
      isOpen: true, // Assume open if can't determine
      confidence: 0.3
    };
  }

  /**
   * Parse eligibility criteria from French HTML/text
   */
  static parseEligibilityCriteria(text: string): ParsedEligibility {
    if (!text || typeof text !== 'string') {
      return { criteria: [], restrictions: [], requirements: [], confidence: 0 };
    }

    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    const criteria: string[] = [];
    const restrictions: string[] = [];
    const requirements: string[] = [];
    let confidence = 0.5;

    // Extract criteria by common patterns
    const criteriaPatterns = [
      /être\s+(?:une?\s+)?([^,\.\;]+)(?:,|\.|;|$)/gi,
      /les\s+bénéficiaires?\s+(?:doivent|peuvent)\s+([^,\.\;]+)(?:,|\.|;|$)/gi,
      /conditions?\s*:?\s*([^,\.\;]+)(?:,|\.|;|$)/gi
    ];

    for (const pattern of criteriaPatterns) {
      let match;
      while ((match = pattern.exec(cleanText)) !== null) {
        const criterion = match[1].trim();
        if (criterion.length > 5 && criterion.length < 200) {
          criteria.push(criterion);
          confidence = Math.min(confidence + 0.1, 0.9);
        }
      }
    }

    // Extract restrictions
    const restrictionPatterns = [
      /ne\s+(?:pas|peuvent)\s+([^,\.\;]+)(?:,|\.|;|$)/gi,
      /exclus?\s*:?\s*([^,\.\;]+)(?:,|\.|;|$)/gi,
      /interdit\s+(?:de|aux)\s+([^,\.\;]+)(?:,|\.|;|$)/gi
    ];

    for (const pattern of restrictionPatterns) {
      let match;
      while ((match = pattern.exec(cleanText)) !== null) {
        const restriction = match[1].trim();
        if (restriction.length > 5 && restriction.length < 200) {
          restrictions.push(restriction);
          confidence = Math.min(confidence + 0.1, 0.9);
        }
      }
    }

    // Extract requirements (documents, certifications, etc.)
    const requirementPatterns = [
      /(?:fournir|présenter|joindre)\s+([^,\.\;]+)(?:,|\.|;|$)/gi,
      /documents?\s+(?:requis|nécessaires?|obligatoires?)\s*:?\s*([^,\.\;]+)(?:,|\.|;|$)/gi,
      /certification\s+([^,\.\;]+)(?:,|\.|;|$)/gi
    ];

    for (const pattern of requirementPatterns) {
      let match;
      while ((match = pattern.exec(cleanText)) !== null) {
        const requirement = match[1].trim();
        if (requirement.length > 5 && requirement.length < 200) {
          requirements.push(requirement);
          confidence = Math.min(confidence + 0.1, 0.9);
        }
      }
    }

    return {
      criteria: [...new Set(criteria)], // Remove duplicates
      restrictions: [...new Set(restrictions)],
      requirements: [...new Set(requirements)],
      confidence
    };
  }

  /**
   * Extract conditions from amount text
   */
  private static extractConditions(text: string): string | undefined {
    const conditionPatterns = [
      /selon\s+le\s+projet/i,
      /en\s+fonction\s+de/i,
      /sous\s+conditions?/i,
      /avec\s+un\s+plafond/i,
      /\d+%\s+des?\s+dépenses?/i
    ];

    for (const pattern of conditionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Extract contact information from French text
   */
  static parseContactInfo(text: string): {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    organization?: string;
  } {
    if (!text || typeof text !== 'string') return {};

    const result: any = {};

    // Email pattern
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emailMatch = text.match(emailPattern);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Phone pattern (French)
    const phonePattern = /(?:(?:\+33|0)[1-9](?:[0-9]{8}|\s[0-9]{2}\s[0-9]{2}\s[0-9]{2}\s[0-9]{2}))/g;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }

    // Website pattern
    const websitePattern = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g;
    const websiteMatch = text.match(websitePattern);
    if (websiteMatch) {
      result.website = websiteMatch[0].startsWith('www.') ? `https://${websiteMatch[0]}` : websiteMatch[0];
    }

    return result;
  }
}