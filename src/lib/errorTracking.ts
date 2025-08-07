import { logger } from './logger';
import { monitoring } from './monitoring';

export interface ErrorEvent {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  url: string;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  context: Record<string, any>;
  fingerprint: string; // For grouping similar errors
  count: number; // How many times this error occurred
  resolved: boolean;
  resolvedAt?: number;
  tags: string[];
}

export interface ErrorGroup {
  fingerprint: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  events: ErrorEvent[];
  resolved: boolean;
  title: string;
  affectedUsers: Set<string>;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    errorCount?: { threshold: number; timeWindow: number };
    errorRate?: { threshold: number; timeWindow: number };
    newError?: boolean;
    level?: ('error' | 'warning' | 'info')[];
  };
  actions: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
  cooldown: number; // Minimum time between alerts
  lastTriggered?: number;
}

class ErrorTracking {
  private static instance: ErrorTracking;
  private errors: Map<string, ErrorGroup> = new Map();
  private alertRules: AlertRule[] = [];
  private errorQueue: ErrorEvent[] = [];
  private filters = new Map<string, (error: ErrorEvent) => boolean>();

  static getInstance(): ErrorTracking {
    if (!ErrorTracking.instance) {
      ErrorTracking.instance = new ErrorTracking();
    }
    return ErrorTracking.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
    this.initializeDefaultFilters();
    this.initializeDefaultAlertRules();
    this.startBatchProcessor();
  }

  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        type: 'javascript_error'
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    });

    // Network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError({
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : args[0].toString()),
            type: 'network_error',
            status: response.status,
            statusText: response.statusText
          });
        }
        
        return response;
      } catch (error) {
        this.captureError({
          message: `Network request failed: ${(error as Error).message}`,
          stack: (error as Error).stack,
          url: typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : args[0].toString()),
          type: 'network_error'
        });
        throw error;
      }
    };
  }

  captureError(errorData: {
    message: string;
    stack?: string;
    url?: string;
    userId?: string;
    sessionId?: string;
    level?: 'error' | 'warning' | 'info';
    context?: Record<string, any>;
    tags?: string[];
    [key: string]: any;
  }): void {
    const error: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level: errorData.level || 'error',
      message: errorData.message,
      stack: errorData.stack,
      url: errorData.url || window.location.href,
      userId: errorData.userId,
      sessionId: errorData.sessionId,
      userAgent: navigator.userAgent,
      context: errorData.context || {},
      fingerprint: this.generateFingerprint(errorData),
      count: 1,
      resolved: false,
      tags: errorData.tags || []
    };

    // Apply filters
    const shouldCapture = Array.from(this.filters.values()).every(filter => filter(error));
    if (!shouldCapture) {
      return;
    }

    this.processError(error);
    this.errorQueue.push(error);

    logger.error('Error captured', new Error(error.message), {
      errorId: error.id,
      fingerprint: error.fingerprint,
      level: error.level
    });

    // Send to monitoring system
    monitoring.captureError({
      message: error.message,
      stack: error.stack,
      level: error.level,
      context: {
        errorId: error.id,
        fingerprint: error.fingerprint,
        ...error.context
      }
    });
  }

  private processError(error: ErrorEvent): void {
    const existing = this.errors.get(error.fingerprint);

    if (existing) {
      // Update existing error group
      existing.count += error.count;
      existing.lastSeen = error.timestamp;
      existing.events.push(error);
      
      if (error.userId) {
        existing.affectedUsers.add(error.userId);
      }

      // Keep only last 100 events per group
      if (existing.events.length > 100) {
        existing.events = existing.events.slice(-100);
      }
    } else {
      // Create new error group
      const group: ErrorGroup = {
        fingerprint: error.fingerprint,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        count: error.count,
        level: error.level,
        message: error.message,
        events: [error],
        resolved: false,
        title: this.generateErrorTitle(error),
        affectedUsers: error.userId ? new Set([error.userId]) : new Set()
      };

      this.errors.set(error.fingerprint, group);
    }

    // Check alert rules
    this.checkAlertRules(error);
  }

  private generateFingerprint(errorData: any): string {
    // Create a unique fingerprint for grouping similar errors
    const components = [
      errorData.message,
      this.normalizeStackTrace(errorData.stack),
      errorData.type || 'unknown'
    ];

    const content = components.filter(Boolean).join('|');
    return this.hashString(content);
  }

  private normalizeStackTrace(stack?: string): string {
    if (!stack) return '';
    
    // Remove line numbers and file paths for grouping
    return stack
      .split('\n')
      .map(line => line.replace(/:\d+:\d+/g, '').replace(/https?:\/\/[^/]+/g, ''))
      .slice(0, 3) // Only use first 3 lines
      .join('\n');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateErrorTitle(error: ErrorEvent): string {
    // Generate a user-friendly title for the error
    if (error.context.type === 'network_error') {
      return `Network Error: ${error.context.status || 'Request Failed'}`;
    }
    
    if (error.context.type === 'unhandled_promise_rejection') {
      return 'Unhandled Promise Rejection';
    }

    // Extract the main error from the message
    const match = error.message.match(/^(\w+Error): (.+)$/);
    if (match) {
      return `${match[1]}: ${match[2].substring(0, 50)}...`;
    }

    return error.message.substring(0, 60) + (error.message.length > 60 ? '...' : '');
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Alert system
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    logger.info('Error alert rule added', { name: rule.name, id: rule.id });
  }

  removeAlertRule(ruleId: string): void {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      const removed = this.alertRules.splice(index, 1)[0];
      logger.info('Error alert rule removed', { name: removed.name, id: removed.id });
    }
  }

  private checkAlertRules(error: ErrorEvent): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const shouldTrigger = this.evaluateAlertRule(rule, error);
      
      if (shouldTrigger && this.canTriggerAlert(rule)) {
        this.triggerAlert(rule, error);
      }
    });
  }

  private evaluateAlertRule(rule: AlertRule, error: ErrorEvent): boolean {
    const { conditions } = rule;

    // Check level condition
    if (conditions.level && !conditions.level.includes(error.level)) {
      return false;
    }

    // Check new error condition
    if (conditions.newError) {
      const group = this.errors.get(error.fingerprint);
      if (group && group.count > 1) {
        return false; // Not a new error
      }
    }

    // Check error count condition
    if (conditions.errorCount) {
      const { threshold, timeWindow } = conditions.errorCount;
      const cutoff = Date.now() - timeWindow;
      
      let count = 0;
      this.errors.forEach(group => {
        count += group.events.filter(e => e.timestamp >= cutoff).length;
      });
      
      if (count < threshold) {
        return false;
      }
    }

    // Check error rate condition
    if (conditions.errorRate) {
      const { threshold, timeWindow } = conditions.errorRate;
      const cutoff = Date.now() - timeWindow;
      
      let errorCount = 0;
      let totalEvents = 0;
      
      this.errors.forEach(group => {
        const recentEvents = group.events.filter(e => e.timestamp >= cutoff);
        errorCount += recentEvents.filter(e => e.level === 'error').length;
        totalEvents += recentEvents.length;
      });
      
      const rate = totalEvents > 0 ? (errorCount / totalEvents) * 100 : 0;
      if (rate < threshold) {
        return false;
      }
    }

    return true;
  }

  private canTriggerAlert(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return true;
    return Date.now() - rule.lastTriggered >= rule.cooldown;
  }

  private triggerAlert(rule: AlertRule, error: ErrorEvent): void {
    rule.lastTriggered = Date.now();

    const alertData = {
      rule: rule.name,
      error: {
        message: error.message,
        level: error.level,
        url: error.url,
        timestamp: error.timestamp
      },
      triggerTime: Date.now()
    };

    // Execute alert actions
    if (rule.actions.email && rule.actions.email.length > 0) {
      this.sendEmailAlert(rule.actions.email, alertData);
    }

    if (rule.actions.webhook) {
      this.sendWebhookAlert(rule.actions.webhook, alertData);
    }

    if (rule.actions.slack) {
      this.sendSlackAlert(rule.actions.slack, alertData);
    }

    logger.warn('Error alert triggered', {
      rule: rule.name,
      error: error.message,
      level: error.level
    });
  }

  private async sendEmailAlert(emails: string[], data: any): Promise<void> {
    // In production, send actual email
    logger.info('Would send email alert', { emails, data });
  }

  private async sendWebhookAlert(webhookUrl: string, data: any): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      logger.info('Webhook alert sent', { url: webhookUrl });
    } catch (error) {
      logger.error('Failed to send webhook alert', error as Error);
    }
  }

  private async sendSlackAlert(slackUrl: string, data: any): Promise<void> {
    try {
      const message = {
        text: `🚨 Error Alert: ${data.rule}`,
        attachments: [
          {
            color: data.error.level === 'error' ? 'danger' : 'warning',
            fields: [
              { title: 'Message', value: data.error.message, short: false },
              { title: 'Level', value: data.error.level, short: true },
              { title: 'URL', value: data.error.url, short: true }
            ]
          }
        ]
      };

      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      logger.info('Slack alert sent');
    } catch (error) {
      logger.error('Failed to send Slack alert', error as Error);
    }
  }

  // Filtering
  addFilter(name: string, filter: (error: ErrorEvent) => boolean): void {
    this.filters.set(name, filter);
    logger.debug('Error filter added', { name });
  }

  removeFilter(name: string): void {
    if (this.filters.delete(name)) {
      logger.debug('Error filter removed', { name });
    }
  }

  private initializeDefaultFilters(): void {
    // Filter out common noise
    this.addFilter('ignore_extensions', (error) => {
      const extensionPatterns = [
        /chrome-extension:/,
        /moz-extension:/,
        /safari-extension:/
      ];
      
      return !extensionPatterns.some(pattern => 
        pattern.test(error.url) || pattern.test(error.message)
      );
    });

    this.addFilter('ignore_cross_origin', (error) => {
      return error.message !== 'Script error.';
    });
  }

  private initializeDefaultAlertRules(): void {
    this.addAlertRule({
      id: 'critical_errors',
      name: 'Critical Errors',
      enabled: true,
      conditions: {
        level: ['error'],
        newError: true
      },
      actions: {
        email: ['admin@agritool.com']
      },
      cooldown: 300000 // 5 minutes
    });

    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      enabled: true,
      conditions: {
        errorRate: { threshold: 10, timeWindow: 300000 } // 10% in 5 minutes
      },
      actions: {
        email: ['admin@agritool.com']
      },
      cooldown: 600000 // 10 minutes
    });
  }

  // Batch processing
  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatch();
    }, 30000); // Process every 30 seconds
  }

  private processBatch(): void {
    if (this.errorQueue.length === 0) return;

    const batch = [...this.errorQueue];
    this.errorQueue = [];

    // In production, send to error tracking service
    this.sendErrorBatch(batch);

    logger.debug('Error batch processed', { errorCount: batch.length });
  }

  private async sendErrorBatch(errors: ErrorEvent[]): Promise<void> {
    try {
      // In production, send to service like Sentry
      logger.debug('Would send error batch to tracking service', {
        errorCount: errors.length
      });
    } catch (error) {
      logger.error('Failed to send error batch', error as Error);
    }
  }

  // Resolution management
  resolveError(fingerprint: string): void {
    const group = this.errors.get(fingerprint);
    if (group) {
      group.resolved = true;
      logger.info('Error resolved', { fingerprint, title: group.title });
    }
  }

  unresolveError(fingerprint: string): void {
    const group = this.errors.get(fingerprint);
    if (group) {
      group.resolved = false;
      logger.info('Error unresolved', { fingerprint, title: group.title });
    }
  }

  // Public API
  getErrorGroups(filters?: {
    resolved?: boolean;
    level?: ('error' | 'warning' | 'info')[];
    timeRange?: number;
  }): ErrorGroup[] {
    let groups = Array.from(this.errors.values());

    if (filters) {
      if (filters.resolved !== undefined) {
        groups = groups.filter(group => group.resolved === filters.resolved);
      }

      if (filters.level) {
        groups = groups.filter(group => filters.level!.includes(group.level));
      }

      if (filters.timeRange) {
        const cutoff = Date.now() - filters.timeRange;
        groups = groups.filter(group => group.lastSeen >= cutoff);
      }
    }

    return groups.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getErrorGroup(fingerprint: string): ErrorGroup | undefined {
    return this.errors.get(fingerprint);
  }

  getErrorStats(timeRange?: number): {
    totalErrors: number;
    uniqueErrors: number;
    errorsByLevel: Record<string, number>;
    topErrors: Array<{ fingerprint: string; title: string; count: number }>;
    affectedUsers: number;
  } {
    const cutoff = timeRange ? Date.now() - timeRange : 0;
    const groups = Array.from(this.errors.values()).filter(group => 
      !timeRange || group.lastSeen >= cutoff
    );

    const totalErrors = groups.reduce((sum, group) => sum + group.count, 0);
    const uniqueErrors = groups.length;

    const errorsByLevel: Record<string, number> = {};
    groups.forEach(group => {
      errorsByLevel[group.level] = (errorsByLevel[group.level] || 0) + group.count;
    });

    const topErrors = groups
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(group => ({
        fingerprint: group.fingerprint,
        title: group.title,
        count: group.count
      }));

    const allAffectedUsers = new Set<string>();
    groups.forEach(group => {
      group.affectedUsers.forEach(user => allAffectedUsers.add(user));
    });

    return {
      totalErrors,
      uniqueErrors,
      errorsByLevel,
      topErrors,
      affectedUsers: allAffectedUsers.size
    };
  }
}

export const errorTracking = ErrorTracking.getInstance();
