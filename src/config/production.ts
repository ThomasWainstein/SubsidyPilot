import { IS_PRODUCTION, IS_DEVELOPMENT } from './environment';

export const PRODUCTION_CONFIG = {
  // Performance settings
  PERFORMANCE: {
    LAZY_LOADING_ENABLED: true,
    BUNDLE_ANALYSIS: IS_DEVELOPMENT,
    PREFETCH_ENABLED: IS_PRODUCTION,
    SERVICE_WORKER_ENABLED: IS_PRODUCTION,
    COMPRESSION_ENABLED: IS_PRODUCTION,
  },

  // Caching configuration
  CACHE: {
    STRATEGY: IS_PRODUCTION ? 'stale-while-revalidate' : 'no-cache',
    TTL: {
      DOCUMENTS: 10 * 60 * 1000, // 10 minutes
      SUBSIDIES: 60 * 60 * 1000, // 1 hour
      USER_DATA: 5 * 60 * 1000, // 5 minutes
      STATIC_ASSETS: 24 * 60 * 60 * 1000, // 24 hours
    },
    MAX_SIZE: IS_PRODUCTION ? 100 : 50,
  },

  // Monitoring configuration
  MONITORING: {
    ERROR_REPORTING: IS_PRODUCTION,
    PERFORMANCE_MONITORING: true,
    USER_ANALYTICS: IS_PRODUCTION,
    HEALTH_CHECK_INTERVAL: IS_PRODUCTION ? 5 * 60 * 1000 : 30 * 1000, // 5 min prod, 30s dev
    BATCH_SIZE: 50,
    FLUSH_INTERVAL: 30 * 1000, // 30 seconds
  },

  // Security settings
  SECURITY: {
    CSP_ENABLED: IS_PRODUCTION,
    RATE_LIMITING: IS_PRODUCTION,
    FILE_VALIDATION: true,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_ORIGINS: IS_PRODUCTION 
      ? ['https://your-domain.com', 'https://www.your-domain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  },

  // API configuration
  API: {
    TIMEOUT: IS_PRODUCTION ? 30000 : 60000, // 30s prod, 60s dev
    RETRY_ATTEMPTS: IS_PRODUCTION ? 3 : 1,
    RETRY_DELAY: 1000,
    BATCH_REQUESTS: IS_PRODUCTION,
    REQUEST_DEDUPLICATION: true,
  },

  // Database configuration
  DATABASE: {
    CONNECTION_POOL_SIZE: IS_PRODUCTION ? 20 : 5,
    QUERY_TIMEOUT: 30000,
    RETRY_FAILED_QUERIES: IS_PRODUCTION,
    ENABLE_QUERY_LOGGING: IS_DEVELOPMENT,
    OPTIMIZE_QUERIES: IS_PRODUCTION,
  },

  // Edge Functions configuration
  EDGE_FUNCTIONS: {
    TIMEOUT: 55000, // Vercel limit is 60s
    MEMORY_LIMIT: '512MB',
    CONCURRENT_EXECUTIONS: 10,
    RETRY_FAILED_INVOCATIONS: IS_PRODUCTION,
    ENABLE_WARMING: IS_PRODUCTION,
  },

  // Build and deployment
  BUILD: {
    TREE_SHAKING: true,
    MINIFICATION: IS_PRODUCTION,
    SOURCE_MAPS: IS_DEVELOPMENT,
    CHUNK_SPLITTING: IS_PRODUCTION,
    ANALYZE_BUNDLE: IS_DEVELOPMENT,
    OPTIMIZE_IMAGES: IS_PRODUCTION,
  },

  // Logging configuration
  LOGGING: {
    LEVEL: IS_PRODUCTION ? 'warn' : 'debug',
    CONSOLE_LOGGING: true,
    REMOTE_LOGGING: IS_PRODUCTION,
    LOG_ROTATION: IS_PRODUCTION,
    MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
    STRUCTURED_LOGGING: IS_PRODUCTION,
  },

  // Feature flags
  FEATURES: {
    DOCUMENT_EXTRACTION: true,
    SUBSIDY_MATCHING: true,
    REAL_TIME_UPDATES: IS_PRODUCTION,
    OFFLINE_SUPPORT: IS_PRODUCTION,
    PWA_FEATURES: IS_PRODUCTION,
    PUSH_NOTIFICATIONS: IS_PRODUCTION,
  },

  // Resource limits
  LIMITS: {
    MAX_CONCURRENT_UPLOADS: 3,
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_FILES_PER_USER: 1000,
    MAX_SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
    API_RATE_LIMIT: IS_PRODUCTION ? 100 : 1000, // requests per minute
  },

  // CDN and assets
  ASSETS: {
    CDN_ENABLED: IS_PRODUCTION,
    IMAGE_OPTIMIZATION: IS_PRODUCTION,
    LAZY_LOAD_IMAGES: true,
    WEBP_SUPPORT: true,
    ASSET_VERSIONING: IS_PRODUCTION,
  },

} as const;

// Environment-specific overrides
export const getProductionConfig = () => {
  if (IS_DEVELOPMENT) {
    return {
      ...PRODUCTION_CONFIG,
      // Development overrides
      MONITORING: {
        ...PRODUCTION_CONFIG.MONITORING,
        ERROR_REPORTING: false,
        USER_ANALYTICS: false,
      },
      SECURITY: {
        ...PRODUCTION_CONFIG.SECURITY,
        CSP_ENABLED: false,
        RATE_LIMITING: false,
      },
    };
  }

  return PRODUCTION_CONFIG;
};

export default PRODUCTION_CONFIG;