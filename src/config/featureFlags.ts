/**
 * Feature flag configuration with safe defaults.
 * Eliminates runtime dependency on VITE_* environment variables.
 */

export interface FeatureFlags {
  UI_OBSERVABILITY_ENABLED: boolean;
  UI_RESUME_AI_ENABLED: boolean;
  MONITORING_ENABLED: boolean;
}

// Static feature flag defaults (no runtime env dependency)
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  UI_OBSERVABILITY_ENABLED: true,
  UI_RESUME_AI_ENABLED: true,
  MONITORING_ENABLED: false,
};

/**
 * Get feature flags with safe defaults.
 * Can be extended to read from Supabase table if needed.
 */
export function getFeatureFlags(): FeatureFlags {
  // Return static defaults for now
  // Future enhancement: read from supabase table for runtime overrides
  return DEFAULT_FEATURE_FLAGS;
}