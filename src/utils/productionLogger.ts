/**
 * Production-safe logging utility
 * Only logs in development mode, silent in production
 */

const isDevelopment = import.meta.env.DEV;

export const prodLogger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    // Always log warnings
    console.warn(`⚠️ ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    // Always log errors
    console.error(`❌ ${message}`, ...args);
  },
  
  // For temporary debugging that should be removed
  temp: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`🚧 TEMP: ${message}`, ...args);
    }
  }
};

// Legacy console.log replacement
export const devLog = isDevelopment ? console.log : () => {};