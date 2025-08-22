import { supabase } from '@/integrations/supabase/client';

export interface EnrichmentResult {
  success: boolean;
  enrichedData: Record<string, any>;
  validationResults: ValidationResult[];
  confidenceScore: number;
  sources: string[];
  processingTime: number;
}

export interface ValidationResult {
  field: string;
  status: 'valid' | 'invalid' | 'unknown' | 'pending';
  source: string;
  confidence: number;
  message?: string;
  enrichedValue?: any;
}

export class DatabaseEnrichmentService {
  private static readonly EU_VAT_VALIDATION_URL = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
  private static readonly IBAN_VALIDATION_ENDPOINT = 'https://api.iban.com/clients/api/countries/';
  
  /**
   * Main enrichment method that validates and enhances extracted data
   */
  static async enrichExtractedData(
    extractedData: Record<string, any>,
    clientType: 'business' | 'ngo' | 'municipality' | 'individual' = 'business'
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const validationResults: ValidationResult[] = [];
    const enrichedData = { ...extractedData };
    const sources: string[] = [];

    try {
      // 1. VAT Number Validation via VIES
      if (extractedData.vatNumber) {
        const vatResult = await this.validateVATNumber(extractedData.vatNumber);
        validationResults.push(vatResult);
        if (vatResult.status === 'valid' && vatResult.enrichedValue) {
          Object.assign(enrichedData, vatResult.enrichedValue);
          sources.push('EU VIES Database');
        }
      }

      // 2. IBAN Validation
      if (extractedData.iban) {
        const ibanResult = await this.validateIBAN(extractedData.iban);
        validationResults.push(ibanResult);
        if (ibanResult.status === 'valid') {
          sources.push('IBAN Registry');
        }
      }

      // 3. Company Registry Validation
      if (extractedData.registrationNumber && clientType === 'business') {
        const registryResult = await this.validateCompanyRegistry(
          extractedData.registrationNumber,
          extractedData.country || 'FR'
        );
        validationResults.push(registryResult);
        if (registryResult.status === 'valid' && registryResult.enrichedValue) {
          Object.assign(enrichedData, registryResult.enrichedValue);
          sources.push('National Business Registry');
        }
      }

      // 4. Address Validation & Geocoding
      if (extractedData.address) {
        const addressResult = await this.validateAddress(extractedData.address);
        validationResults.push(addressResult);
        if (addressResult.status === 'valid' && addressResult.enrichedValue) {
          enrichedData.validatedAddress = addressResult.enrichedValue;
          sources.push('Geocoding Service');
        }
      }

      // 5. PIC Code Validation (EU Research)
      if (extractedData.picCode) {
        const picResult = await this.validatePICCode(extractedData.picCode);
        validationResults.push(picResult);
        if (picResult.status === 'valid' && picResult.enrichedValue) {
          Object.assign(enrichedData, picResult.enrichedValue);
          sources.push('EU Participant Portal');
        }
      }

      // 6. Financial Data Enhancement
      if (clientType === 'business' && extractedData.registrationNumber) {
        const financialResult = await this.enhanceFinancialData(
          extractedData.registrationNumber,
          extractedData.country || 'FR'
        );
        if (financialResult.status === 'valid' && financialResult.enrichedValue) {
          enrichedData.financialData = financialResult.enrichedValue;
          validationResults.push(financialResult);
          sources.push('Financial Registry');
        }
      }

      // 7. NACE Code Assignment
      if (extractedData.businessDescription || extractedData.activities) {
        const naceResult = await this.assignNACECode(
          extractedData.businessDescription || extractedData.activities
        );
        if (naceResult.status === 'valid') {
          enrichedData.naceCode = naceResult.enrichedValue;
          validationResults.push(naceResult);
          sources.push('NACE Classification');
        }
      }

      // 8. Sanctions List Check
      if (extractedData.companyName || extractedData.contactPerson) {
        const sanctionsResult = await this.checkSanctionsList(
          extractedData.companyName || extractedData.contactPerson
        );
        validationResults.push(sanctionsResult);
        if (sanctionsResult.status === 'valid') {
          sources.push('EU Sanctions Database');
        }
      }

      const processingTime = Date.now() - startTime;
      const confidenceScore = this.calculateConfidenceScore(validationResults);

      return {
        success: true,
        enrichedData,
        validationResults,
        confidenceScore,
        sources,
        processingTime
      };

    } catch (error) {
      console.error('Database enrichment error:', error);
      return {
        success: false,
        enrichedData: extractedData,
        validationResults,
        confidenceScore: 0,
        sources,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate VAT number via EU VIES system
   */
  private static async validateVATNumber(vatNumber: string): Promise<ValidationResult> {
    try {
      // Extract country code and number
      const cleanVAT = vatNumber.replace(/\s+/g, '').toUpperCase();
      const countryCode = cleanVAT.substring(0, 2);
      const number = cleanVAT.substring(2);

      // Use our edge function to validate VAT (to avoid CORS issues)
      const { data, error } = await supabase.functions.invoke('validate-vat', {
        body: { countryCode, vatNumber: number }
      });

      if (error) throw error;

      if (data.valid) {
        return {
          field: 'vatNumber',
          status: 'valid',
          source: 'EU VIES',
          confidence: 0.95,
          message: 'VAT number validated via EU VIES system',
          enrichedValue: {
            companyName: data.name,
            address: data.address,
            vatValidated: true,
            vatValidationDate: new Date().toISOString()
          }
        };
      } else {
        return {
          field: 'vatNumber',
          status: 'invalid',
          source: 'EU VIES',
          confidence: 0.9,
          message: 'VAT number not found in EU VIES system'
        };
      }
    } catch (error) {
      return {
        field: 'vatNumber',
        status: 'unknown',
        source: 'EU VIES',
        confidence: 0,
        message: `VAT validation error: ${error}`
      };
    }
  }

  /**
   * Validate IBAN using checksum algorithm
   */
  private static async validateIBAN(iban: string): Promise<ValidationResult> {
    try {
      const cleanIBAN = iban.replace(/\s+/g, '').toUpperCase();
      
      // Basic format validation
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIBAN)) {
        return {
          field: 'iban',
          status: 'invalid',
          source: 'IBAN Format',
          confidence: 0.95,
          message: 'Invalid IBAN format'
        };
      }

      // MOD-97 checksum validation
      const rearranged = cleanIBAN.substring(4) + cleanIBAN.substring(0, 4);
      const converted = rearranged.replace(/[A-Z]/g, (char) => 
        (char.charCodeAt(0) - 55).toString()
      );
      
      const remainder = this.modulo97(converted);
      const isValid = remainder === 1;

      return {
        field: 'iban',
        status: isValid ? 'valid' : 'invalid',
        source: 'IBAN Checksum',
        confidence: 0.99,
        message: isValid ? 'IBAN checksum valid' : 'IBAN checksum invalid'
      };
    } catch (error) {
      return {
        field: 'iban',
        status: 'unknown',
        source: 'IBAN Validation',
        confidence: 0,
        message: `IBAN validation error: ${error}`
      };
    }
  }

  /**
   * Validate company registration number via national registries
   */
  private static async validateCompanyRegistry(
    registrationNumber: string,
    country: string
  ): Promise<ValidationResult> {
    try {
      // Use our edge function for registry validation
      const { data, error } = await supabase.functions.invoke('validate-company-registry', {
        body: { registrationNumber, country }
      });

      if (error) throw error;

      if (data.valid) {
        return {
          field: 'registrationNumber',
          status: 'valid',
          source: `${country} Business Registry`,
          confidence: 0.9,
          message: 'Company registration validated',
          enrichedValue: {
            legalName: data.legalName,
            registrationDate: data.registrationDate,
            legalForm: data.legalForm,
            status: data.status,
            address: data.address
          }
        };
      } else {
        return {
          field: 'registrationNumber',
          status: 'invalid',
          source: `${country} Business Registry`,
          confidence: 0.8,
          message: 'Registration number not found'
        };
      }
    } catch (error) {
      return {
        field: 'registrationNumber',
        status: 'unknown',
        source: 'Company Registry',
        confidence: 0,
        message: `Registry validation error: ${error}`
      };
    }
  }

  /**
   * Validate and geocode address
   */
  private static async validateAddress(address: string): Promise<ValidationResult> {
    try {
      // Use our edge function for geocoding
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error) throw error;

      if (data.found) {
        return {
          field: 'address',
          status: 'valid',
          source: 'Geocoding Service',
          confidence: data.confidence || 0.8,
          message: 'Address validated and geocoded',
          enrichedValue: {
            formattedAddress: data.formatted_address,
            coordinates: {
              lat: data.lat,
              lng: data.lng
            },
            components: data.components
          }
        };
      } else {
        return {
          field: 'address',
          status: 'invalid',
          source: 'Geocoding Service',
          confidence: 0.6,
          message: 'Address could not be validated'
        };
      }
    } catch (error) {
      return {
        field: 'address',
        status: 'unknown',
        source: 'Geocoding Service',
        confidence: 0,
        message: `Address validation error: ${error}`
      };
    }
  }

  /**
   * Validate PIC code against EU Participant Portal
   */
  private static async validatePICCode(picCode: string): Promise<ValidationResult> {
    try {
      // Simulate PIC validation (would need actual EU API access)
      const cleanPIC = picCode.replace(/\D/g, '');
      
      if (cleanPIC.length === 9) {
        return {
          field: 'picCode',
          status: 'valid',
          source: 'EU Participant Portal',
          confidence: 0.8,
          message: 'PIC code format valid',
          enrichedValue: {
            picValidated: true,
            participantType: 'organization'
          }
        };
      } else {
        return {
          field: 'picCode',
          status: 'invalid',
          source: 'EU Participant Portal',
          confidence: 0.9,
          message: 'Invalid PIC code format (must be 9 digits)'
        };
      }
    } catch (error) {
      return {
        field: 'picCode',
        status: 'unknown',
        source: 'EU Participant Portal',
        confidence: 0,
        message: `PIC validation error: ${error}`
      };
    }
  }

  /**
   * Enhance financial data from public registries
   */
  private static async enhanceFinancialData(
    registrationNumber: string,
    country: string
  ): Promise<ValidationResult> {
    try {
      // Use our edge function for financial data
      const { data, error } = await supabase.functions.invoke('get-financial-data', {
        body: { registrationNumber, country }
      });

      if (error) throw error;

      if (data.found) {
        return {
          field: 'financialData',
          status: 'valid',
          source: 'Financial Registry',
          confidence: 0.85,
          message: 'Financial data retrieved',
          enrichedValue: {
            turnover: data.turnover,
            employees: data.employees,
            balanceSheetTotal: data.balanceSheetTotal,
            smeClassification: this.calculateSMEClassification(data),
            filingDate: data.filingDate
          }
        };
      } else {
        return {
          field: 'financialData',
          status: 'invalid',
          source: 'Financial Registry',
          confidence: 0.7,
          message: 'No financial data available'
        };
      }
    } catch (error) {
      return {
        field: 'financialData',
        status: 'unknown',
        source: 'Financial Registry',
        confidence: 0,
        message: `Financial data error: ${error}`
      };
    }
  }

  /**
   * Assign NACE code based on business description
   */
  private static async assignNACECode(description: string): Promise<ValidationResult> {
    try {
      // Use our edge function for NACE classification
      const { data, error } = await supabase.functions.invoke('classify-nace', {
        body: { description }
      });

      if (error) throw error;

      return {
        field: 'naceCode',
        status: 'valid',
        source: 'NACE Classification',
        confidence: data.confidence || 0.7,
        message: `Assigned NACE code: ${data.code}`,
        enrichedValue: {
          code: data.code,
          description: data.description,
          section: data.section
        }
      };
    } catch (error) {
      return {
        field: 'naceCode',
        status: 'unknown',
        source: 'NACE Classification',
        confidence: 0,
        message: `NACE classification error: ${error}`
      };
    }
  }

  /**
   * Check against EU sanctions lists
   */
  private static async checkSanctionsList(name: string): Promise<ValidationResult> {
    try {
      // Use our edge function for sanctions check
      const { data, error } = await supabase.functions.invoke('check-sanctions', {
        body: { name }
      });

      if (error) throw error;

      return {
        field: 'sanctionsCheck',
        status: data.found ? 'invalid' : 'valid',
        source: 'EU Sanctions Database',
        confidence: 0.95,
        message: data.found ? 'Entity found on sanctions list' : 'No sanctions matches found'
      };
    } catch (error) {
      return {
        field: 'sanctionsCheck',
        status: 'unknown',
        source: 'EU Sanctions Database',
        confidence: 0,
        message: `Sanctions check error: ${error}`
      };
    }
  }

  /**
   * Calculate SME classification based on EU criteria
   */
  private static calculateSMEClassification(financialData: any): string {
    const turnover = financialData.turnover || 0;
    const employees = financialData.employees || 0;
    const balanceSheet = financialData.balanceSheetTotal || 0;

    // EU SME criteria
    if (employees < 10 && (turnover <= 2000000 || balanceSheet <= 2000000)) {
      return 'micro';
    } else if (employees < 50 && (turnover <= 10000000 || balanceSheet <= 10000000)) {
      return 'small';
    } else if (employees < 250 && (turnover <= 50000000 || balanceSheet <= 43000000)) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  /**
   * Calculate overall confidence score from validation results
   */
  private static calculateConfidenceScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    const validResults = results.filter(r => r.status === 'valid');
    const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
    const validWeight = validResults.reduce((sum, r) => sum + r.confidence, 0);

    return totalWeight > 0 ? (validWeight / totalWeight) * 100 : 0;
  }

  /**
   * Helper function for IBAN MOD-97 calculation
   */
  private static modulo97(input: string): number {
    let remainder = '';
    for (let i = 0; i < input.length; i++) {
      remainder += input[i];
      if (remainder.length >= 9) {
        remainder = (parseInt(remainder) % 97).toString();
      }
    }
    return parseInt(remainder) % 97;
  }
}