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

    // Route to appropriate financial registry based on country
    let result;
    switch (country.toUpperCase()) {
      case 'FR':
        result = await getFrenchFinancialData(registrationNumber);
        break;
      case 'DE':
        result = await getGermanFinancialData(registrationNumber);
        break;
      case 'RO':
        result = await getRomanianFinancialData(registrationNumber);
        break;
      default:
        result = await getMockFinancialData(registrationNumber, country);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Financial data retrieval error:', error);
    return new Response(JSON.stringify({
      found: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getFrenchFinancialData(siret: string) {
  // In production, would use INSEE API or other French business databases
  // For now, generate realistic mock data based on SIRET
  const seed = parseInt(siret.substring(0, 4));
  
  return {
    found: true,
    turnover: Math.floor((seed % 1000) * 10000) + 50000, // 50K to 10M
    employees: Math.floor((seed % 50)) + 1, // 1 to 50
    balanceSheetTotal: Math.floor((seed % 5000) * 1000) + 25000,
    filingDate: '2023-12-31',
    currency: 'EUR',
    year: 2023,
    country: 'FR',
    registrationNumber: siret,
    timestamp: new Date().toISOString()
  };
}

async function getGermanFinancialData(hrb: string) {
  // Mock German financial data
  const seed = parseInt(hrb.replace(/\D/g, '').substring(0, 4) || '1000');
  
  return {
    found: true,
    turnover: Math.floor((seed % 2000) * 25000) + 100000,
    employees: Math.floor((seed % 100)) + 5,
    balanceSheetTotal: Math.floor((seed % 10000) * 2000) + 50000,
    filingDate: '2023-12-31',
    currency: 'EUR',
    year: 2023,
    country: 'DE',
    registrationNumber: hrb,
    timestamp: new Date().toISOString()
  };
}

async function getRomanianFinancialData(cui: string) {
  // Mock Romanian financial data
  const seed = parseInt(cui.substring(0, 3) || '100');
  
  return {
    found: true,
    turnover: Math.floor((seed % 500) * 5000) + 20000, // 20K to 2.5M
    employees: Math.floor((seed % 25)) + 1,
    balanceSheetTotal: Math.floor((seed % 1000) * 1000) + 15000,
    filingDate: '2023-12-31',
    currency: 'RON',
    year: 2023,
    country: 'RO',
    registrationNumber: cui,
    timestamp: new Date().toISOString()
  };
}

async function getMockFinancialData(regNumber: string, country: string) {
  // Generic mock financial data
  const seed = regNumber.length > 0 ? regNumber.charCodeAt(0) : 100;
  
  return {
    found: Math.random() > 0.3, // 70% success rate for mock data
    turnover: Math.floor((seed % 1000) * 8000) + 30000,
    employees: Math.floor((seed % 40)) + 2,
    balanceSheetTotal: Math.floor((seed % 2000) * 1500) + 20000,
    filingDate: '2023-12-31',
    currency: 'EUR',
    year: 2023,
    country,
    registrationNumber: regNumber,
    timestamp: new Date().toISOString()
  };
}