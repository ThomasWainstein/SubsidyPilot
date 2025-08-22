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
    const { countryCode, vatNumber } = await req.json();

    // EU VIES VAT validation using SOAP API
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
                     xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soap:Header />
        <soap:Body>
          <tns1:checkVat>
            <tns1:countryCode>${countryCode}</tns1:countryCode>
            <tns1:vatNumber>${vatNumber}</tns1:vatNumber>
          </tns1:checkVat>
        </soap:Body>
      </soap:Envelope>`;

    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'urn:ec.europa.eu:taxud:vies:services:checkVat/checkVat'
      },
      body: soapBody
    });

    if (!response.ok) {
      throw new Error(`VIES service error: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse XML response (simple parsing for this example)
    const isValid = xmlText.includes('<ns2:valid>true</ns2:valid>');
    
    let companyName = '';
    let address = '';
    
    if (isValid) {
      // Extract company name
      const nameMatch = xmlText.match(/<ns2:name>(.*?)<\/ns2:name>/);
      if (nameMatch) companyName = nameMatch[1];
      
      // Extract address
      const addressMatch = xmlText.match(/<ns2:address>(.*?)<\/ns2:address>/);
      if (addressMatch) address = addressMatch[1];
    }

    return new Response(JSON.stringify({
      valid: isValid,
      name: companyName,
      address: address,
      countryCode,
      vatNumber,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('VAT validation error:', error);
    
    // Fallback validation using simple format check
    try {
      const { countryCode, vatNumber } = await req.json();
      const isValidFormat = this.validateVATFormat(countryCode, vatNumber);
      
      return new Response(JSON.stringify({
        valid: false,
        fallback: true,
        formatValid: isValidFormat,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      return new Response(JSON.stringify({
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});

function validateVATFormat(countryCode: string, vatNumber: string): boolean {
  const patterns: Record<string, RegExp> = {
    'AT': /^U[0-9]{8}$/,
    'BE': /^[0-9]{10}$/,
    'BG': /^[0-9]{9,10}$/,
    'CY': /^[0-9]{8}[A-Z]$/,
    'CZ': /^[0-9]{8,10}$/,
    'DE': /^[0-9]{9}$/,
    'DK': /^[0-9]{8}$/,
    'EE': /^[0-9]{9}$/,
    'EL': /^[0-9]{9}$/,
    'ES': /^[A-Z0-9][0-9]{7}[A-Z0-9]$/,
    'FI': /^[0-9]{8}$/,
    'FR': /^[A-Z0-9]{2}[0-9]{9}$/,
    'HR': /^[0-9]{11}$/,
    'HU': /^[0-9]{8}$/,
    'IE': /^[0-9][A-Z0-9\+\*][0-9]{5}[A-Z]{1,2}$/,
    'IT': /^[0-9]{11}$/,
    'LT': /^([0-9]{9}|[0-9]{12})$/,
    'LU': /^[0-9]{8}$/,
    'LV': /^[0-9]{11}$/,
    'MT': /^[0-9]{8}$/,
    'NL': /^[0-9]{9}B[0-9]{2}$/,
    'PL': /^[0-9]{10}$/,
    'PT': /^[0-9]{9}$/,
    'RO': /^[0-9]{2,10}$/,
    'SE': /^[0-9]{12}$/,
    'SI': /^[0-9]{8}$/,
    'SK': /^[0-9]{10}$/
  };

  const pattern = patterns[countryCode];
  return pattern ? pattern.test(vatNumber) : false;
}