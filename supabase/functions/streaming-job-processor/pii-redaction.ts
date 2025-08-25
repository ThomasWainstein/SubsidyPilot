// PII redaction and EU compliance utilities
export interface RedactionConfig {
  enableRedaction: boolean;
  logSamplingRate: number; // 0.0 to 1.0
  retentionTtlDays: number;
  redactionPatterns: RedactionPattern[];
}

export interface RedactionPattern {
  name: string;
  regex: RegExp;
  replacement: string;
  severity: 'high' | 'medium' | 'low';
}

export class PIIRedactor {
  private static readonly DEFAULT_PATTERNS: RedactionPattern[] = [
    {
      name: 'email',
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[EMAIL_REDACTED]',
      severity: 'high'
    },
    {
      name: 'siren',
      regex: /\b\d{9}\b/g,
      replacement: '[SIREN_REDACTED]',
      severity: 'high'
    },
    {
      name: 'siret',
      regex: /\b\d{14}\b/g,
      replacement: '[SIRET_REDACTED]',
      severity: 'high'
    },
    {
      name: 'french_vat',
      regex: /\bFR\d{11}\b/g,
      replacement: '[VAT_REDACTED]',
      severity: 'medium'
    },
    {
      name: 'phone_french',
      regex: /\b0[1-9](?:[0-9]{8})\b/g,
      replacement: '[PHONE_REDACTED]',
      severity: 'medium'
    },
    {
      name: 'iban',
      regex: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}\b/g,
      replacement: '[IBAN_REDACTED]',
      severity: 'high'
    },
    {
      name: 'credit_card',
      regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      replacement: '[CARD_REDACTED]',
      severity: 'high'
    },
    {
      name: 'french_postal',
      regex: /\b\d{5}\b/g,
      replacement: '[POSTAL_REDACTED]',
      severity: 'low'
    }
  ];

  private config: RedactionConfig;

  constructor(config?: Partial<RedactionConfig>) {
    this.config = {
      enableRedaction: true,
      logSamplingRate: 0.1, // Log only 10% for performance
      retentionTtlDays: 90,
      redactionPatterns: PIIRedactor.DEFAULT_PATTERNS,
      ...config
    };
  }

  redactText(text: string): {
    redacted: string;
    detections: Array<{
      pattern: string;
      count: number;
      severity: string;
    }>;
  } {
    if (!this.config.enableRedaction) {
      return { redacted: text, detections: [] };
    }

    let redacted = text;
    const detections: Array<{ pattern: string; count: number; severity: string }> = [];

    for (const pattern of this.config.redactionPatterns) {
      const matches = text.match(pattern.regex);
      if (matches && matches.length > 0) {
        redacted = redacted.replace(pattern.regex, pattern.replacement);
        detections.push({
          pattern: pattern.name,
          count: matches.length,
          severity: pattern.severity
        });
      }
    }

    return { redacted, detections };
  }

  redactLogData(logData: any): any {
    if (!this.config.enableRedaction) {
      return logData;
    }

    // Sample logs for performance
    if (Math.random() > this.config.logSamplingRate) {
      return { ...logData, _sampled: true };
    }

    const redacted = JSON.parse(JSON.stringify(logData));

    // Recursively redact string values
    this.recursiveRedact(redacted);

    return redacted;
  }

  private recursiveRedact(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const result = this.redactText(obj[key]);
        obj[key] = result.redacted;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.recursiveRedact(obj[key]);
      }
    }
  }

  createRedactionReport(text: string): {
    originalLength: number;
    redactedLength: number;
    piiDetected: boolean;
    detections: Array<{ pattern: string; count: number; severity: string }>;
    riskScore: number;
  } {
    const { redacted, detections } = this.redactText(text);

    // Calculate risk score based on detections
    const riskScore = detections.reduce((score, detection) => {
      const severityMultiplier = detection.severity === 'high' ? 3 : detection.severity === 'medium' ? 2 : 1;
      return score + (detection.count * severityMultiplier);
    }, 0);

    return {
      originalLength: text.length,
      redactedLength: redacted.length,
      piiDetected: detections.length > 0,
      detections,
      riskScore: Math.min(10, riskScore) // Cap at 10
    };
  }

  shouldRetainData(riskScore: number): boolean {
    // High risk data (score > 7) should be deleted immediately
    // Medium risk (3-7) follows normal TTL
    // Low risk (0-3) can be retained longer
    return riskScore <= 7;
  }
}

// EU compliance utilities
export class EUComplianceManager {
  static getVisionEndpoint(region: 'eu' | 'global' = 'eu'): string {
    // Always use EU endpoint for EU compliance
    return region === 'eu' 
      ? 'https://eu-vision.googleapis.com'
      : 'https://vision.googleapis.com';
  }

  static validateDataResidency(request: any): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check endpoint
    if (request.endpoint && !request.endpoint.includes('eu-vision')) {
      issues.push('Using non-EU Vision API endpoint');
      recommendations.push('Switch to eu-vision.googleapis.com endpoint');
    }

    // Check data retention
    if (!request.retentionPolicy) {
      issues.push('No data retention policy specified');
      recommendations.push('Implement data retention and deletion policy');
    }

    // Check consent
    if (!request.userConsent) {
      issues.push('User consent not documented');
      recommendations.push('Ensure explicit user consent for document processing');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  static createGDPRDeleteRequest(documentId: string, reason: string): {
    deleteRequest: any;
    estimatedDeletionDate: Date;
  } {
    const now = new Date();
    const estimatedDeletionDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    return {
      deleteRequest: {
        documentId,
        reason,
        requestedAt: now.toISOString(),
        status: 'pending',
        gdprCompliant: true
      },
      estimatedDeletionDate
    };
  }

  static logComplianceEvent(event: {
    type: 'data_processed' | 'data_deleted' | 'consent_given' | 'access_requested';
    documentId?: string;
    userId?: string;
    metadata?: any;
  }): void {
    const redactor = new PIIRedactor();
    const redactedMetadata = redactor.redactLogData(event.metadata || {});

    console.log('🇪🇺 GDPR Compliance Event:', {
      type: event.type,
      timestamp: new Date().toISOString(),
      documentId: event.documentId,
      userId: event.userId ? '[USER_ID_HASH]' : undefined, // Hash in production
      metadata: redactedMetadata,
      region: 'EU'
    });
  }
}

// Ring buffer for efficient log sampling
export class LogRingBuffer {
  private buffer: any[];
  private size: number;
  private index: number = 0;

  constructor(size: number = 1000) {
    this.size = size;
    this.buffer = new Array(size);
  }

  add(logEntry: any): void {
    this.buffer[this.index] = {
      ...logEntry,
      timestamp: new Date().toISOString(),
      _ringIndex: this.index
    };
    this.index = (this.index + 1) % this.size;
  }

  getRecent(count: number = 100): any[] {
    const entries = [];
    let idx = (this.index - 1 + this.size) % this.size;
    
    for (let i = 0; i < Math.min(count, this.size); i++) {
      if (this.buffer[idx] !== undefined) {
        entries.push(this.buffer[idx]);
      }
      idx = (idx - 1 + this.size) % this.size;
    }
    
    return entries.reverse();
  }

  flush(): any[] {
    const entries = this.getRecent(this.size);
    this.buffer = new Array(this.size);
    this.index = 0;
    return entries;
  }
}