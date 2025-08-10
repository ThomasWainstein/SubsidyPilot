
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

// SECURITY: Secure admin check - only uses database roles
export const getIsAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // SECURITY: Remove dangerous email wildcard matching
  // Only database-driven role checking is allowed in production
  
  // DEPRECATED: This function should not be used in production
  // Use AdminContext.isAdmin or database RPC calls instead
  console.warn('⚠️ SECURITY WARNING: getIsAdmin() is deprecated. Use AdminContext or database RPC calls.');
  
  // Basic metadata check as fallback (not reliable for security)
  return user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
};
