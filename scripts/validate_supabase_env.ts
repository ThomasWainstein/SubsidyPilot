#!/usr/bin/env ts-node

/**
 * Validate required Supabase environment variables.
 * Exits with code 1 if any variables are missing.
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SCRAPER_RAW_GPT_API'
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('✅ All required Supabase environment variables are set.');
