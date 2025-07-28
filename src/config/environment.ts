
// CRITICAL: Environment variable access for client-side code
// All environment variables MUST use standardized uppercase format
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_DEVELOPMENT = import.meta.env.DEV;

// Feature flags
export const FEATURES = {
  ADMIN_PANEL: true,
  SEEDING: IS_DEVELOPMENT, // Only allow seeding in development
  DEBUG_LOGGING: IS_DEVELOPMENT,
} as const;

// Admin configuration
export const ADMIN_CONFIG = {
  ALLOWED_EMAILS: [
    'admin@agritool.com',
    'thomas@lovable.dev',
    // Add more admin emails here
  ],
  REQUIRE_ADMIN_ROLE: IS_PRODUCTION, // In production, require explicit admin role
} as const;

export const getIsAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // In development, allow admin emails
  if (IS_DEVELOPMENT && ADMIN_CONFIG.ALLOWED_EMAILS.includes(user.email)) {
    return true;
  }
  
  // In production, require explicit admin role
  if (IS_PRODUCTION && ADMIN_CONFIG.REQUIRE_ADMIN_ROLE) {
    return user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
  }
  
  // Fallback to email check
  return ADMIN_CONFIG.ALLOWED_EMAILS.includes(user.email) || 
         user.email?.includes('admin') || 
         user.user_metadata?.role === 'admin';
};
