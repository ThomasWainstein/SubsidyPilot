
// CRITICAL: Environment variable access for client-side code
// All environment variables MUST use standardized uppercase format
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_DEVELOPMENT = import.meta.env.DEV;

// Feature flags
export const FEATURES = {
  ADMIN_PANEL: true,
  SEEDING: IS_DEVELOPMENT, // Only allow seeding in development
  DEBUG_LOGGING: IS_DEVELOPMENT,
  ALLOW_MOCK_DATA: IS_DEVELOPMENT, // Prevent mock data in production
  TESTING_MODE: IS_DEVELOPMENT && typeof window !== 'undefined' && (window as any).__TESTING__,
} as const;

// SECURITY: Deprecated admin configuration - replaced with database-driven roles
// This configuration is now only used for development bootstrapping
export const ADMIN_CONFIG = {
  // SECURITY: Hardcoded admin emails removed for production security
  DEVELOPMENT_BOOTSTRAP_EMAILS: IS_DEVELOPMENT ? [
    'admin@agritool.com', // Only for local development
  ] : [],
  REQUIRE_DATABASE_ROLES: true, // Always require database-driven roles
} as const;

// SECURITY: Deprecated admin check - DO NOT USE
// Use AdminContext.isAdmin or supabase RPC calls instead
export const getIsAdmin = (user: any): boolean => {
  console.error('🚨 SECURITY ERROR: getIsAdmin() is deprecated and unsafe. Use AdminContext.isAdmin instead.');
  return false; // Always return false to prevent unauthorized access
};
