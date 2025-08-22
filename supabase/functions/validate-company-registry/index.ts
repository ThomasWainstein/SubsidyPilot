import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationNumber, country } = await req.json();

    // Route to appropriate registry API based on country
    let result;
    switch (country.toUpperCase()) {
      case 'FR':
        result = await validateFrenchSIRET(registrationNumber);
        break;
      case 'DE':
        result = await validateGermanHRB(registrationNumber);
        break;
      case 'NL':
        result = await validateDutchKVK(registrationNumber);
        break;
      case 'RO':
        result = await validateRomanianCUI(registrationNumber);
        break;
      default:
        result = await validateGenericFormat(registrationNumber, country);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Company registry validation error:', error);
    return new Response(JSON.stringify({
      valid: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateFrenchSIRET(siret: string) {
  try {
    // French SIRET validation using INSEE API (if available)
    // For now, we'll do format validation and mock data
    const cleanSIRET = siret.replace(/\s+/g, '');
    
    if (!/^[0-9]{14}$/.test(cleanSIRET)) {
      return {
        valid: false,
        error: 'Invalid SIRET format (must be 14 digits)',
        country: 'FR'
      };
    }

    // SIRET checksum validation (Luhn algorithm)
    const isValidChecksum = validateSIRETChecksum(cleanSIRET);
    
    if (!isValidChecksum) {
      return {
        valid: false,
        error: 'Invalid SIRET checksum',
        country: 'FR'
      };
    }

    // Mock successful validation (in production, call INSEE API)
    return {
      valid: true,
      legalName: `Company ${cleanSIRET.substring(0, 9)}`,
      registrationDate: '2020-01-01',
      legalForm: 'SAS',
      status: 'active',
      address: 'Paris, France',
      country: 'FR',
      registrationNumber: cleanSIRET,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      valid: false,
      error: error.message,
      country: 'FR'
    };
  }
}

async function validateGermanHRB(hrb: string) {
  // German Handelsregister validation
  const cleanHRB = hrb.replace(/[^\w]/g, '');
  
  if (!/^HRB\s*[0-9]+$/i.test(hrb)) {
    return {
      valid: false,
      error: 'Invalid HRB format',
      country: 'DE'
    };
  }

  return {
    valid: true,
    legalName: `German Company ${cleanHRB}`,
    registrationDate: '2020-01-01',
    legalForm: 'GmbH',
    status: 'active',
    address: 'Germany',
    country: 'DE',
    registrationNumber: cleanHRB,
    timestamp: new Date().toISOString()
  };
}

async function validateDutchKVK(kvk: string) {
  // Dutch KVK (Chamber of Commerce) validation
  const cleanKVK = kvk.replace(/\D/g, '');
  
  if (!/^[0-9]{8}$/.test(cleanKVK)) {
    return {
      valid: false,
      error: 'Invalid KVK format (must be 8 digits)',
      country: 'NL'
    };
  }

  return {
    valid: true,
    legalName: `Dutch Company ${cleanKVK}`,
    registrationDate: '2020-01-01',
    legalForm: 'BV',
    status: 'active',
    address: 'Netherlands',
    country: 'NL',
    registrationNumber: cleanKVK,
    timestamp: new Date().toISOString()
  };
}

async function validateRomanianCUI(cui: string) {
  // Romanian CUI validation
  const cleanCUI = cui.replace(/\D/g, '');
  
  if (!/^[0-9]{2,10}$/.test(cleanCUI)) {
    return {
      valid: false,
      error: 'Invalid CUI format',
      country: 'RO'
    };
  }

  // CUI checksum validation
  const isValidCUI = validateCUIChecksum(cleanCUI);
  
  return {
    valid: isValidCUI,
    legalName: isValidCUI ? `Romanian Company ${cleanCUI}` : undefined,
    registrationDate: isValidCUI ? '2020-01-01' : undefined,
    legalForm: isValidCUI ? 'SRL' : undefined,
    status: isValidCUI ? 'active' : undefined,
    address: isValidCUI ? 'Romania' : undefined,
    country: 'RO',
    registrationNumber: cleanCUI,
    error: isValidCUI ? undefined : 'Invalid CUI checksum',
    timestamp: new Date().toISOString()
  };
}

async function validateGenericFormat(regNumber: string, country: string) {
  // Generic validation for other countries
  return {
    valid: regNumber.length >= 5,
    legalName: regNumber.length >= 5 ? `Company ${regNumber}` : undefined,
    country,
    registrationNumber: regNumber,
    error: regNumber.length < 5 ? 'Registration number too short' : undefined,
    timestamp: new Date().toISOString()
  };
}

function validateSIRETChecksum(siret: string): boolean {
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

function validateCUIChecksum(cui: string): boolean {
  const controlVector = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < cui.length - 1; i++) {
    sum += parseInt(cui[i]) * controlVector[i % controlVector.length];
  }
  
  const controlDigit = sum % 11;
  const expectedDigit = controlDigit < 10 ? controlDigit : 0;
  
  return expectedDigit === parseInt(cui[cui.length - 1]);
}