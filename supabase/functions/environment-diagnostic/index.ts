import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnvironmentDiagnostic {
  timestamp: string;
  environment: string;
  secrets: {
    [key: string]: {
      present: boolean;
      keyLength?: number;
      keyPrefix?: string;
    };
  };
  deployment: {
    deployedAt: string;
    functionVersion: string;
  };
}

const REQUIRED_SECRETS = [
  'OPENAI_API_KEY',
  'SCRAPER_RAW_GPT_API', 
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY'
] as const;

const OPTIONAL_SECRETS = [
  'lovable_reguline',
  'PERPLEXITY_API_KEY'
] as const;

function checkSecretSafely(secretName: string): { present: boolean; keyLength?: number; keyPrefix?: string } {
  const value = Deno.env.get(secretName);
  
  if (!value) {
    return { present: false };
  }
  
  // Never log the actual secret, only metadata
  return {
    present: true,
    keyLength: value.length,
    keyPrefix: value.substring(0, Math.min(4, value.length)) // Safe prefix only
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: This endpoint should only be called by admin users or during deployment
    // In production, you might want to add authentication here
    
    console.log('🔍 Running environment diagnostic check...');
    
    const diagnostic: EnvironmentDiagnostic = {
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('ENVIRONMENT') || 'unknown',
      secrets: {},
      deployment: {
        deployedAt: new Date().toISOString(),
        functionVersion: '1.0.0'
      }
    };

    // Check required secrets
    console.log('📋 Checking required secrets...');
    for (const secretName of REQUIRED_SECRETS) {
      diagnostic.secrets[secretName] = checkSecretSafely(secretName);
      
      if (diagnostic.secrets[secretName].present) {
        console.log(`✅ ${secretName}: Present (${diagnostic.secrets[secretName].keyLength} chars)`);
      } else {
        console.log(`❌ ${secretName}: MISSING`);
      }
    }

    // Check optional secrets
    console.log('📋 Checking optional secrets...');
    for (const secretName of OPTIONAL_SECRETS) {
      diagnostic.secrets[secretName] = checkSecretSafely(secretName);
      
      if (diagnostic.secrets[secretName].present) {
        console.log(`✅ ${secretName}: Present (${diagnostic.secrets[secretName].keyLength} chars)`);
      } else {
        console.log(`⚠️  ${secretName}: Optional, not set`);
      }
    }

    // Calculate overall status
    const requiredSecrets = REQUIRED_SECRETS.map(name => diagnostic.secrets[name]);
    const missingRequired = requiredSecrets.filter(secret => !secret.present);
    
    const overallStatus = {
      ready: missingRequired.length === 0,
      missingRequiredCount: missingRequired.length,
      totalRequiredCount: REQUIRED_SECRETS.length,
      issues: [] as string[]
    };

    // Add specific issues
    if (missingRequired.length > 0) {
      overallStatus.issues.push(`Missing ${missingRequired.length} required secrets`);
    }

    // Check OpenAI key format specifically
    const openAIKey = diagnostic.secrets['OPENAI_API_KEY'];
    if (openAIKey.present && openAIKey.keyPrefix && !openAIKey.keyPrefix.startsWith('sk-')) {
      overallStatus.issues.push('OpenAI API key format may be invalid (should start with sk-)');
    }

    // Check Supabase URL format
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
      overallStatus.issues.push('Supabase URL format may be invalid');
    }

    console.log(`🎯 Diagnostic complete. Ready: ${overallStatus.ready}`);
    
    return new Response(
      JSON.stringify({
        status: overallStatus.ready ? 'ready' : 'configuration_error',
        diagnostic,
        overallStatus,
        message: overallStatus.ready 
          ? 'All required environment variables are configured'
          : `Configuration issues found: ${overallStatus.issues.join(', ')}`
      }, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('❌ Environment diagnostic error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'diagnostic_error',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});