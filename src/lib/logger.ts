import { IS_DEVELOPMENT, FEATURES } from '@/config/environment';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(): boolean {
    return IS_DEVELOPMENT || FEATURES.DEBUG_LOGGING;
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog()) {
      console.log(`ℹ️ ${message}`, context || '');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog()) {
      console.warn(`⚠️ ${message}`, context || '');
    } else {
      // Always log warnings to a centralized system in production
      // TODO: Replace with actual logging service (Sentry, LogRocket, etc.)
      console.warn(`⚠️ ${message}`);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    // Always log errors
    console.error(`❌ ${message}`, error, context);
    
    // TODO: Send to error tracking service in production
    // if (!IS_DEVELOPMENT && error) {
    //   errorTrackingService.captureException(error, { extra: context });
    // }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog()) {
      console.log(`🔍 ${message}`, context || '');
    }
  }

  success(message: string, context?: LogContext): void {
    if (this.shouldLog()) {
      console.log(`✅ ${message}`, context || '');
    }
  }

  step(message: string, context?: LogContext): void {
    if (this.shouldLog()) {
      console.log(`📋 ${message}`, context || '');
    }
  }
}

export const logger = Logger.getInstance();