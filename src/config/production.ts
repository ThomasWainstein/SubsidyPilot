/**
 * Production Configuration
 * Environment-specific settings, performance tuning, and feature flags
 */

interface ProductionConfig {
  // Environment
  environment: 'development' | 'staging' | 'production';
  
  // Performance
  performance: {
    enableWebVitals: boolean;
    enablePrefetch: boolean;
    enableServiceWorker: boolean;
    lazyLoadThreshold: number;
    imageOptimization: boolean;
    bundleAnalysis: boolean;
  };

  // Caching
  caching: {
    enableQueryCache: boolean;
    enableDocumentCache: boolean;
    enableSubsidyCache: boolean;
    queryStaleTime: number;
    queryCacheTime: number;
    maxCacheSize: number;
  };

  // Security
  security: {
    enableCSP: boolean;
    enableRateLimit: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    sessionTimeout: number;
  };

  // Monitoring
  monitoring: {
    enableErrorTracking: boolean;
    enablePerformanceTracking: boolean;
    enableUserAnalytics: boolean;
    healthCheckInterval: number;
    maxErrorsStored: number;
  };

  // Features
  features: {
    enableAdvancedFilters: boolean;
    enableBulkOperations: boolean;
    enableRealtimeUpdates: boolean;
    enableOfflineMode: boolean;
    enableExperimentalFeatures: boolean;
  };

  // API
  api: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    batchSize: number;
    rateLimitPerMinute: number;
  };

  // Build
  build: {
    enableSourceMaps: boolean;
    enableMinification: boolean;
    enableCompression: boolean;
    chunkSizeLimit: number;
    assetSizeLimit: number;
  };
}

// Production configuration structure

const baseConfig: ProductionConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
  
  performance: {
    enableWebVitals: true,
    enablePrefetch: true,
    enableServiceWorker: false, // Enable when PWA is implemented
    lazyLoadThreshold: 300,
    imageOptimization: true,
    bundleAnalysis: process.env.ANALYZE === 'true'
  },

  caching: {
    enableQueryCache: true,
    enableDocumentCache: true,
    enableSubsidyCache: true,
    queryStaleTime: 5 * 60 * 1000, // 5 minutes
    queryCacheTime: 10 * 60 * 1000, // 10 minutes
    maxCacheSize: 100
  },

  security: {
    enableCSP: true,
    enableRateLimit: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp'
    ],
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },

  monitoring: {
    enableErrorTracking: true,
    enablePerformanceTracking: true,
    enableUserAnalytics: false, // Enable when analytics service is configured
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    maxErrorsStored: 100
  },

  features: {
    enableAdvancedFilters: true,
    enableBulkOperations: true,
    enableRealtimeUpdates: false, // Enable when realtime subscriptions are implemented
    enableOfflineMode: false, // Enable when service worker is implemented
    enableExperimentalFeatures: process.env.NODE_ENV === 'development'
  },

  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    batchSize: 50,
    rateLimitPerMinute: 100
  },

  build: {
    enableSourceMaps: process.env.NODE_ENV === 'development',
    enableMinification: process.env.NODE_ENV === 'production',
    enableCompression: process.env.NODE_ENV === 'production',
    chunkSizeLimit: 500 * 1024, // 500KB
    assetSizeLimit: 250 * 1024  // 250KB
  }
};

// Environment-specific overrides
const environmentConfigs: Record<string, Partial<ProductionConfig>> = {
  development: {
    security: {
      ...baseConfig.security,
      enableCSP: false, // Easier development
      enableRateLimit: false
    },
    monitoring: {
      ...baseConfig.monitoring,
      enableErrorTracking: false,
      enableUserAnalytics: false
    },
    features: {
      ...baseConfig.features,
      enableExperimentalFeatures: true
    }
  },

  staging: {
    monitoring: {
      ...baseConfig.monitoring,
      enableUserAnalytics: false // No tracking in staging
    },
    features: {
      ...baseConfig.features,
      enableExperimentalFeatures: true
    }
  },

  production: {
    performance: {
      ...baseConfig.performance,
      enableServiceWorker: true // Enable in production when ready
    },
    monitoring: {
      ...baseConfig.monitoring,
      enableUserAnalytics: true // Enable when privacy compliance is ready
    },
    features: {
      ...baseConfig.features,
      enableOfflineMode: true, // Enable when service worker is ready
      enableExperimentalFeatures: false
    }
  }
};

// Merge base config with environment-specific config
function createProductionConfig(): ProductionConfig {
  const environment = process.env.NODE_ENV || 'development';
  const envConfig = environmentConfigs[environment] || {};
  
  return {
    ...baseConfig,
    ...envConfig,
    performance: { ...baseConfig.performance, ...envConfig.performance },
    caching: { ...baseConfig.caching, ...envConfig.caching },
    security: { ...baseConfig.security, ...envConfig.security },
    monitoring: { ...baseConfig.monitoring, ...envConfig.monitoring },
    features: { ...baseConfig.features, ...envConfig.features },
    api: { ...baseConfig.api, ...envConfig.api },
    build: { ...baseConfig.build, ...envConfig.build }
  };
}

export const productionConfig = createProductionConfig();

// Backward compatibility export
export const PRODUCTION_CONFIG = productionConfig;

// Helper functions
export const isProduction = () => productionConfig.environment === 'production';
export const isDevelopment = () => productionConfig.environment === 'development';
export const isStaging = () => productionConfig.environment === 'staging';

export const getFeatureFlag = (feature: keyof ProductionConfig['features']): boolean => {
  return productionConfig.features[feature];
};

export const getPerformanceSetting = (setting: keyof ProductionConfig['performance']) => {
  return productionConfig.performance[setting];
};

export const getSecuritySetting = (setting: keyof ProductionConfig['security']) => {
  return productionConfig.security[setting];
};

export type { ProductionConfig };