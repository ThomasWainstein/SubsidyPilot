/**
 * Security Management
 * File upload security, CSP, input sanitization, and rate limiting
 */

interface SecurityConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxFilesPerUpload: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  cspEnabled: boolean;
}

interface UploadAttempt {
  timestamp: number;
  ip?: string;
  success: boolean;
  reason?: string;
}

interface SecurityMetrics {
  totalUploads: number;
  blockedUploads: number;
  rateLimitHits: number;
  cspViolations: number;
  lastAttempts: UploadAttempt[];
}

class SecurityManager {
  private config: SecurityConfig;
  private uploadAttempts: UploadAttempt[] = [];
  private rateLimitMap: Map<string, number[]> = new Map();
  private metrics: SecurityMetrics = {
    totalUploads: 0,
    blockedUploads: 0,
    rateLimitHits: 0,
    cspViolations: 0,
    lastAttempts: []
  };

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
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
      maxFilesPerUpload: 5,
      rateLimitWindow: 60 * 1000, // 1 minute
      rateLimitMax: 10, // 10 uploads per minute
      cspEnabled: true,
      ...config
    };

    this.initializeCSP();
    this.setupCleanupInterval();
  }

  validateFileUpload(files: File[], clientId?: string): {
    valid: boolean;
    errors: string[];
    allowedFiles: File[];
  } {
    const errors: string[] = [];
    const allowedFiles: File[] = [];

    this.metrics.totalUploads++;

    // Check rate limiting
    if (clientId && this.isRateLimited(clientId)) {
      errors.push('Rate limit exceeded. Please wait before uploading more files.');
      this.metrics.rateLimitHits++;
      this.recordAttempt(false, 'Rate limited');
      return { valid: false, errors, allowedFiles };
    }

    // Check number of files
    if (files.length > this.config.maxFilesPerUpload) {
      errors.push(`Maximum ${this.config.maxFilesPerUpload} files allowed per upload.`);
    }

    // Validate each file
    for (const file of files) {
      const fileErrors: string[] = [];

      // Check file size
      if (file.size > this.config.maxFileSize) {
        fileErrors.push(`File "${file.name}" exceeds maximum size of ${this.formatFileSize(this.config.maxFileSize)}.`);
      }

      // Check file type
      if (!this.config.allowedFileTypes.includes(file.type)) {
        fileErrors.push(`File "${file.name}" has unsupported type: ${file.type}.`);
      }

      // Check file name for suspicious patterns
      if (this.hasSuspiciousName(file.name)) {
        fileErrors.push(`File "${file.name}" has a suspicious name.`);
      }

      if (fileErrors.length === 0) {
        allowedFiles.push(file);
      } else {
        errors.push(...fileErrors);
      }
    }

    const valid = errors.length === 0 && allowedFiles.length > 0;

    if (!valid) {
      this.metrics.blockedUploads++;
      this.recordAttempt(false, errors.join('; '));
    } else {
      this.recordAttempt(true);
      
      // Update rate limiting
      if (clientId) {
        this.updateRateLimit(clientId);
      }
    }

    return { valid, errors, allowedFiles };
  }

  sanitizeInput(input: string): string {
    // Enhanced XSS prevention
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .replace(/eval\s*\(/gi, '') // Remove eval calls
      .replace(/script/gi, 'removed') // Replace script tag references
      .trim();
  }

  createSafeHTML(htmlString: string): string {
    // Enhanced HTML sanitization for dangerouslySetInnerHTML usage
    return htmlString
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^>]*>/gi, '') // Remove iframe tags
      .replace(/<object\b[^>]*>/gi, '') // Remove object tags
      .replace(/<embed\b[^>]*>/gi, '') // Remove embed tags
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:text\/html/gi, '') // Remove data:text/html
      .trim();
  }

  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  private isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const attempts = this.rateLimitMap.get(clientId) || [];
    
    // Remove attempts outside the window
    const recentAttempts = attempts.filter(
      timestamp => now - timestamp < this.config.rateLimitWindow
    );
    
    this.rateLimitMap.set(clientId, recentAttempts);
    
    return recentAttempts.length >= this.config.rateLimitMax;
  }

  private updateRateLimit(clientId: string): void {
    const now = Date.now();
    const attempts = this.rateLimitMap.get(clientId) || [];
    attempts.push(now);
    this.rateLimitMap.set(clientId, attempts);
  }

  private hasSuspiciousName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.scr$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.com$/i,
      /\.pif$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
      /\.sh$/i,
      /\.php$/i,
      /\.\./,
      /^\./, // Hidden files
      /[<>:"|?*]/ // Invalid filename characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private recordAttempt(success: boolean, reason?: string): void {
    const attempt: UploadAttempt = {
      timestamp: Date.now(),
      success,
      reason
    };

    this.uploadAttempts.push(attempt);
    this.metrics.lastAttempts.push(attempt);

    // Keep only last 100 attempts
    if (this.uploadAttempts.length > 100) {
      this.uploadAttempts = this.uploadAttempts.slice(-100);
    }

    if (this.metrics.lastAttempts.length > 20) {
      this.metrics.lastAttempts = this.metrics.lastAttempts.slice(-20);
    }
  }

  private initializeCSP(): void {
    if (!this.config.cspEnabled) return;

    // Report CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      this.metrics.cspViolations++;
      
      console.warn('CSP Violation:', {
        directive: event.violatedDirective,
        blocked: event.blockedURI,
        policy: event.originalPolicy,
        source: event.sourceFile,
        line: event.lineNumber
      });

      // In production, you would report this to your security monitoring service
    });

    // Set CSP meta tag if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = this.getDefaultCSP();
      document.head.appendChild(meta);
    }
  }

  private getDefaultCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  private setupCleanupInterval(): void {
    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, attempts] of this.rateLimitMap.entries()) {
        const recentAttempts = attempts.filter(
          timestamp => now - timestamp < this.config.rateLimitWindow
        );
        
        if (recentAttempts.length === 0) {
          this.rateLimitMap.delete(clientId);
        } else {
          this.rateLimitMap.set(clientId, recentAttempts);
        }
      }
    }, 5 * 60 * 1000);
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const security = new SecurityManager();
export type { SecurityConfig, SecurityMetrics, UploadAttempt };
