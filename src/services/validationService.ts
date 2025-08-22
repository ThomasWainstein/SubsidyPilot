/**
 * Validation Service for Romanian and French Document Numbers
 * Implements official validation algorithms
 */

export class ValidationService {
  /**
   * Validate Romanian CUI (Company Unique Registration Code)
   * Uses the official control vector algorithm: 753217532
   */
  static validateRomanianCUI(cui: string): boolean {
    // Remove RO prefix if present
    if (cui.startsWith('RO')) {
      cui = cui.substring(2);
    }
    
    // Must be 6-10 digits
    if (!/^\d{6,10}$/.test(cui)) {
      return false;
    }
    
    // For CUIs shorter than 10 digits, pad with leading zeros
    cui = cui.padStart(10, '0');
    
    const controlVector = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const checkDigit = parseInt(cui.slice(-1));
    const number = cui.slice(0, -1);
    
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
      sum += parseInt(number[i]) * controlVector[i];
    }
    
    let controlDigit = (sum * 10) % 11;
    if (controlDigit === 10) controlDigit = 0;
    
    return checkDigit === controlDigit;
  }

  /**
   * Validate French SIREN number
   * Uses the Luhn algorithm
   */
  static validateFrenchSIREN(siren: string): boolean {
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(siren)) {
      return false;
    }
    
    // Apply Luhn algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(siren[i]);
      
      // Double every second digit from right
      if ((9 - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Validate French SIRET number
   * SIRET = SIREN + 5-digit establishment code
   */
  static validateFrenchSIRET(siret: string): boolean {
    // Must be exactly 14 digits
    if (!/^\d{14}$/.test(siret)) {
      return false;
    }
    
    // Extract SIREN (first 9 digits) and validate it
    const siren = siret.substring(0, 9);
    return this.validateFrenchSIREN(siren);
  }

  /**
   * Validate Romanian CNP (Personal Numerical Code)
   * Format: SYYMMDDJJNNNC
   */
  static validateRomanianCNP(cnp: string): boolean {
    // Must be exactly 13 digits
    if (!/^\d{13}$/.test(cnp)) {
      return false;
    }
    
    // First digit validation (gender/century)
    const firstDigit = parseInt(cnp[0]);
    if (![1, 2, 3, 4, 5, 6, 7, 8].includes(firstDigit)) {
      return false;
    }
    
    // Extract date components
    const year = parseInt(cnp.substring(1, 3));
    const month = parseInt(cnp.substring(3, 5));
    const day = parseInt(cnp.substring(5, 7));
    
    // Basic date validation
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }
    
    // County code validation (JJ)
    const county = parseInt(cnp.substring(7, 9));
    if (county < 1 || (county > 52 && county !== 99)) { // 99 for diaspora
      return false;
    }
    
    // Calculate check digit
    const controlVector = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    const checkDigit = parseInt(cnp[12]);
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * controlVector[i];
    }
    
    const calculatedCheck = sum % 11;
    const finalCheck = calculatedCheck === 10 ? 1 : calculatedCheck;
    
    return checkDigit === finalCheck;
  }

  /**
   * Validate IBAN with MOD-97 algorithm
   */
  static validateIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic format check
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
      return false;
    }
    
    // Check length by country
    const countryLengths: { [key: string]: number } = {
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
    const expectedLength = countryLengths[countryCode];
    
    if (!expectedLength || iban.length !== expectedLength) {
      return false;
    }
    
    // MOD-97 validation
    // Move first 4 characters to end
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // Convert letters to numbers (A=10, B=11, etc.)
    let numericString = '';
    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numericString += (char.charCodeAt(0) - 55).toString();
      } else {
        numericString += char;
      }
    }
    
    // Calculate MOD 97
    let remainder = 0;
    for (const digit of numericString) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }
    
    return remainder === 1;
  }

  /**
   * Get detailed validation result with error messages
   */
  static validateWithDetails(
    value: string, 
    type: 'cui' | 'siren' | 'siret' | 'cnp' | 'iban'
  ): { valid: boolean; errors: string[]; corrected?: string } {
    const errors: string[] = [];
    let corrected: string | undefined;
    
    switch (type) {
      case 'cui':
        const cleanCUI = value.replace(/^RO/, '').replace(/\D/g, '');
        if (cleanCUI.length < 6 || cleanCUI.length > 10) {
          errors.push('CUI must be 6-10 digits');
        }
        const validCUI = this.validateRomanianCUI(value);
        if (!validCUI && cleanCUI.length >= 6) {
          errors.push('Invalid CUI check digit');
        }
        corrected = cleanCUI.length >= 6 ? cleanCUI : undefined;
        return { valid: validCUI, errors, corrected };
        
      case 'siren':
        const cleanSIREN = value.replace(/\D/g, '');
        if (cleanSIREN.length !== 9) {
          errors.push('SIREN must be exactly 9 digits');
        }
        const validSIREN = this.validateFrenchSIREN(cleanSIREN);
        if (!validSIREN && cleanSIREN.length === 9) {
          errors.push('Invalid SIREN check digit (Luhn algorithm)');
        }
        corrected = cleanSIREN.length === 9 ? cleanSIREN : undefined;
        return { valid: validSIREN, errors, corrected };
        
      case 'siret':
        const cleanSIRET = value.replace(/\D/g, '');
        if (cleanSIRET.length !== 14) {
          errors.push('SIRET must be exactly 14 digits');
        }
        const validSIRET = this.validateFrenchSIRET(cleanSIRET);
        if (!validSIRET && cleanSIRET.length === 14) {
          errors.push('Invalid SIRET (SIREN component fails validation)');
        }
        corrected = cleanSIRET.length === 14 ? cleanSIRET : undefined;
        return { valid: validSIRET, errors, corrected };
        
      case 'cnp':
        const cleanCNP = value.replace(/\D/g, '');
        if (cleanCNP.length !== 13) {
          errors.push('CNP must be exactly 13 digits');
        }
        const validCNP = this.validateRomanianCNP(cleanCNP);
        if (!validCNP && cleanCNP.length === 13) {
          errors.push('Invalid CNP format or check digit');
        }
        corrected = cleanCNP.length === 13 ? cleanCNP : undefined;
        return { valid: validCNP, errors, corrected };
        
      case 'iban':
        const cleanIBAN = value.replace(/\s/g, '').toUpperCase();
        const validIBAN = this.validateIBAN(cleanIBAN);
        if (!validIBAN) {
          errors.push('Invalid IBAN format or check digits');
        }
        corrected = cleanIBAN;
        return { valid: validIBAN, errors, corrected };
        
      default:
        return { valid: false, errors: ['Unknown validation type'] };
    }
  }
}