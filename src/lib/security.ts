import { IS_PRODUCTION } from '@/config/environment';
import { logger } from './logger';
import { monitoring } from './monitoring';

export interface SecurityPolicy {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxUploadRate: number; // files per minute
  sessionTimeout: number; // milliseconds
  maxFailedAttempts: number;
  blockDuration: number; // milliseconds
}

export interface SecurityEvent {
  type: 'file_upload' | 'login_attempt' | 'suspicious_activity' | 'rate_limit_exceeded';
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  details: Record<string, any>;
}

class SecurityManager {
  private static instance: SecurityManager;
  private failedAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();
  private uploadCounts = new Map<string, { count: number; windowStart: number }>();
  private securityEvents: SecurityEvent[] = [];

  private policy: SecurityPolicy = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    maxUploadRate: IS_PRODUCTION ? 10 : 100, // Stricter in production
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxFailedAttempts: 5,
    blockDuration: 15 * 60 * 1000 // 15 minutes
  };

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  constructor() {
    this.setupSecurityHeaders();
    this.startCleanupTimer();
  }

  private setupSecurityHeaders(): void {
    if (!IS_PRODUCTION) return;

    // Content Security Policy
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https: blob:`,
      `connect-src 'self' https://gvfgvbztagafjykncwto.supabase.co wss://gvfgvbztagafjykncwto.supabase.co`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ].join('; ');

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);

    logger.info('Security headers configured');
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Cleanup failed attempts
    for (const [key, data] of this.failedAttempts.entries()) {
      if (data.blocked && now - data.lastAttempt > this.policy.blockDuration) {
        this.failedAttempts.delete(key);
      }
    }

    // Cleanup upload counts
    for (const [key, data] of this.uploadCounts.entries()) {
      if (now - data.windowStart > 60000) { // 1 minute window
        this.uploadCounts.delete(key);
      }
    }

    // Cleanup old security events (keep last 1000)
    if (this.securityEvents.length > 1000) {
      this.securityEvents.splice(0, this.securityEvents.length - 1000);
    }
  }

  validateFileUpload(file: File, userId?: string): { valid: boolean; reason?: string } {
    const clientId = userId || this.getClientIdentifier();

    // Check file size
    if (file.size > this.policy.maxFileSize) {
      this.recordSecurityEvent({
        type: 'file_upload',
        userId,
        timestamp: Date.now(),
        details: {
          reason: 'file_too_large',
          fileSize: file.size,
          maxSize: this.policy.maxFileSize,
          fileName: file.name
        }
      });

      return {
        valid: false,
        reason: `File size exceeds maximum allowed size of ${this.policy.maxFileSize / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (!this.policy.allowedFileTypes.includes(file.type)) {
      this.recordSecurityEvent({
        type: 'file_upload',
        userId,
        timestamp: Date.now(),
        details: {
          reason: 'invalid_file_type',
          fileType: file.type,
          allowedTypes: this.policy.allowedFileTypes,
          fileName: file.name
        }
      });

      return {
        valid: false,
        reason: `File type ${file.type} is not allowed. Allowed types: ${this.policy.allowedFileTypes.join(', ')}`
      };
    }

    // Check upload rate
    if (!this.checkUploadRate(clientId)) {
      this.recordSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        timestamp: Date.now(),
        details: {
          reason: 'upload_rate_exceeded',
          maxRate: this.policy.maxUploadRate,
          clientId
        }
      });

      return {
        valid: false,
        reason: `Upload rate limit exceeded. Maximum ${this.policy.maxUploadRate} files per minute.`
      };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i,
      /^\./,
      /[<>:"|?*]/,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        userId,
        timestamp: Date.now(),
        details: {
          reason: 'suspicious_filename',
          fileName: file.name
        }
      });

      return {
        valid: false,
        reason: 'Suspicious file name detected'
      };
    }

    // Record successful validation
    this.recordUpload(clientId);

    return { valid: true };
  }

  private checkUploadRate(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let uploadData = this.uploadCounts.get(clientId);
    if (!uploadData) {
      uploadData = { count: 0, windowStart: now };
      this.uploadCounts.set(clientId, uploadData);
    }

    // Reset window if expired
    if (now - uploadData.windowStart > 60000) {
      uploadData.count = 0;
      uploadData.windowStart = now;
    }

    return uploadData.count < this.policy.maxUploadRate;
  }

  private recordUpload(clientId: string): void {
    const uploadData = this.uploadCounts.get(clientId);
    if (uploadData) {
      uploadData.count++;
    }
  }

  recordFailedAttempt(identifier: string, context?: Record<string, any>): boolean {
    const now = Date.now();
    let attemptData = this.failedAttempts.get(identifier);

    if (!attemptData) {
      attemptData = { count: 0, lastAttempt: now, blocked: false };
      this.failedAttempts.set(identifier, attemptData);
    }

    attemptData.count++;
    attemptData.lastAttempt = now;

    if (attemptData.count >= this.policy.maxFailedAttempts) {
      attemptData.blocked = true;
      
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        timestamp: now,
        details: {
          reason: 'multiple_failed_attempts',
          identifier,
          attemptCount: attemptData.count,
          ...context
        }
      });

      logger.warn('Client blocked due to failed attempts', { identifier, attempts: attemptData.count });
      return true; // Blocked
    }

    return false; // Not blocked
  }

  isBlocked(identifier: string): boolean {
    const attemptData = this.failedAttempts.get(identifier);
    if (!attemptData) return false;

    if (attemptData.blocked) {
      // Check if block period has expired
      if (Date.now() - attemptData.lastAttempt > this.policy.blockDuration) {
        this.failedAttempts.delete(identifier);
        return false;
      }
      return true;
    }

    return false;
  }

  clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  private recordSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Report to monitoring
    monitoring.captureError({
      message: `Security event: ${event.type}`,
      level: 'warning',
      context: {
        securityEvent: event,
        type: 'security_violation'
      }
    });

    logger.warn('Security event recorded', event);
  }

  private getClientIdentifier(): string {
    // Create a basic client identifier (in production, use more sophisticated methods)
    return `${navigator.userAgent}_${window.location.hostname}`;
  }

  sanitizeInput(input: string): string {
    // Basic XSS prevention
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  validateJSON(jsonString: string): { valid: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      
      // Check for potentially dangerous properties
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      const jsonStr = JSON.stringify(data);
      
      if (dangerousKeys.some(key => jsonStr.includes(key))) {
        return { valid: false, error: 'Potentially dangerous JSON structure detected' };
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  getSecurityReport(): {
    blockedClients: number;
    securityEvents: number;
    recentEvents: SecurityEvent[];
    uploadCounts: number;
  } {
    return {
      blockedClients: Array.from(this.failedAttempts.values()).filter(d => d.blocked).length,
      securityEvents: this.securityEvents.length,
      recentEvents: this.securityEvents.slice(-10),
      uploadCounts: this.uploadCounts.size
    };
  }

  updatePolicy(updates: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...updates };
    logger.info('Security policy updated', updates);
  }

  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }
}

export const security = SecurityManager.getInstance();
