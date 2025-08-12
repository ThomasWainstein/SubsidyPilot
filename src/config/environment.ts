
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

// Admin configuration - database-driven roles only
export const ADMIN_CONFIG = {
  REQUIRE_DATABASE_ROLES: true, // Always require database-driven roles
} as const;
