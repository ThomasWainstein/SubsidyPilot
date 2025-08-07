import { logger } from './logger';
import { monitoring } from './monitoring';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface UserAction {
  id: string;
  userId?: string;
  sessionId: string;
  action: string;
  category: 'navigation' | 'interaction' | 'form' | 'upload' | 'system';
  properties: Record<string, any>;
  timestamp: number;
  duration?: number;
  metadata?: {
    userAgent: string;
    viewport: { width: number; height: number };
    referrer?: string;
    path: string;
  };
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  actions: number;
  bounced: boolean;
  converted: boolean;
  conversionGoal?: string;
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

export interface ConversionFunnel {
  name: string;
  steps: Array<{
    name: string;
    selector?: string;
    url?: string;
    event?: string;
  }>;
  conversionRates: number[];
  dropoffPoints: Array<{ step: number; rate: number }>;
}

class UserAnalytics {
  private static instance: UserAnalytics;
  private currentSession: UserSession | null = null;
  private actionQueue: UserAction[] = [];
  private conversionGoals = new Map<string, { completed: boolean; timestamp?: number }>();
  private heatmapData = new Map<string, Array<{ x: number; y: number; intensity: number }>>();
  private batchInterval?: NodeJS.Timeout;
  private isDestroyed = false;

  static getInstance(): UserAnalytics {
    if (!UserAnalytics.instance) {
      UserAnalytics.instance = new UserAnalytics();
    }
    return UserAnalytics.instance;
  }

  constructor() {
    this.initializeSession();
    this.setupEventListeners();
    this.startBatchProcessor();
  }

  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      pageViews: 1,
      actions: 0,
      bounced: false,
      converted: false,
      deviceInfo: this.getDeviceInfo()
    };

    // Track session start
    this.trackAction('session_start', 'system', {
      sessionId,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      landingPage: window.location.pathname
    });

    logger.debug('User session initialized', { sessionId });
  }

  private setupEventListeners(): void {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackAction('page_hidden', 'system');
      } else {
        this.trackAction('page_visible', 'system');
      }
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Click tracking with heatmap data
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      this.trackAction('click', 'interaction', {
        elementType: target.tagName.toLowerCase(),
        elementId: target.id,
        elementClass: target.className,
        text: target.textContent?.substring(0, 100),
        coordinates: { x: event.clientX, y: event.clientY }
      });

      // Collect heatmap data
      this.addHeatmapPoint(event.clientX, event.clientY);
    });

    // Form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackAction('form_submit', 'form', {
        formId: form.id,
        formClass: form.className,
        fieldCount: form.elements.length
      });
    });

    // Scroll tracking
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercentage = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        this.trackAction('scroll', 'interaction', {
          percentage: scrollPercentage,
          depth: window.scrollY
        });
      }, 250);
    });

    // Route changes (for SPAs)
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });
  }

  trackAction(
    action: string, 
    category: UserAction['category'], 
    properties: Record<string, any> = {},
    duration?: number
  ): void {
    if (!this.currentSession) return;

    const actionData: UserAction = {
      id: this.generateActionId(),
      userId: this.getCurrentUserId(),
      sessionId: this.currentSession.id,
      action,
      category,
      properties,
      timestamp: Date.now(),
      duration,
      metadata: {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        referrer: document.referrer,
        path: window.location.pathname
      }
    };

    this.actionQueue.push(actionData);
    this.currentSession.actions++;

    // Check for conversion goals
    this.checkConversionGoals(action, properties);

    logger.debug('User action tracked', { action, category, properties });

    // Report to monitoring system
    monitoring.reportUserAction(action, { category, ...properties });
  }

  trackPageView(path?: string): void {
    if (!this.currentSession) return;

    const currentPath = path || window.location.pathname;
    
    this.trackAction('page_view', 'navigation', {
      path: currentPath,
      title: document.title,
      search: window.location.search,
      hash: window.location.hash
    });

    this.currentSession.pageViews++;

    // Check if this is a bounce (single page view)
    if (this.currentSession.pageViews === 1) {
      setTimeout(() => {
        if (this.currentSession && this.currentSession.pageViews === 1) {
          this.currentSession.bounced = true;
          this.trackAction('bounce', 'system');
        }
      }, 10000); // 10 seconds to determine bounce
    }
  }

  trackConversion(goalName: string, value?: number, properties?: Record<string, any>): void {
    if (!this.currentSession) return;

    this.currentSession.converted = true;
    this.currentSession.conversionGoal = goalName;

    this.conversionGoals.set(goalName, {
      completed: true,
      timestamp: Date.now()
    });

    this.trackAction('conversion', 'system', {
      goal: goalName,
      value,
      ...properties
    });

    monitoring.captureMetric({
      name: 'conversion_event',
      value: value || 1,
      timestamp: Date.now(),
      context: { goal: goalName, sessionId: this.currentSession.id }
    });

    logger.info('Conversion tracked', { goal: goalName, value });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.trackAction('error_occurred', 'system', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.name,
      ...context
    });

    monitoring.captureError({
      message: error.message,
      stack: error.stack,
      level: 'error',
      context: {
        sessionId: this.currentSession?.id,
        userId: this.getCurrentUserId(),
        ...context
      }
    });
  }

  trackFeatureUsage(featureName: string, duration?: number, metadata?: Record<string, any>): void {
    this.trackAction('feature_used', 'interaction', {
      feature: featureName,
      duration,
      ...metadata
    });

    monitoring.reportFeatureUsage(featureName, duration);
  }

  trackFormInteraction(formId: string, fieldName: string, interactionType: 'focus' | 'blur' | 'change'): void {
    this.trackAction('form_interaction', 'form', {
      formId,
      fieldName,
      interactionType
    });
  }

  // Funnel analysis
  createConversionFunnel(name: string, steps: ConversionFunnel['steps']): ConversionFunnel {
    const funnel: ConversionFunnel = {
      name,
      steps,
      conversionRates: [],
      dropoffPoints: []
    };

    // Calculate conversion rates (simplified - in real implementation, analyze historical data)
    let previousCount = 100; // Assume 100 users at start
    
    steps.forEach((step, index) => {
      const conversionRate = Math.max(0.3, Math.random() * 0.8); // Simulate 30-80% conversion
      const currentCount = Math.floor(previousCount * conversionRate);
      
      funnel.conversionRates.push((currentCount / 100) * 100); // Percentage of original
      
      if (index > 0) {
        const dropoffRate = ((previousCount - currentCount) / previousCount) * 100;
        funnel.dropoffPoints.push({ step: index, rate: dropoffRate });
      }
      
      previousCount = currentCount;
    });

    return funnel;
  }

  // Heatmap functionality
  private addHeatmapPoint(x: number, y: number, intensity: number = 1): void {
    const path = window.location.pathname;
    
    if (!this.heatmapData.has(path)) {
      this.heatmapData.set(path, []);
    }

    this.heatmapData.get(path)!.push({ x, y, intensity });

    // Limit heatmap data points
    const points = this.heatmapData.get(path)!;
    if (points.length > 1000) {
      points.splice(0, points.length - 1000);
    }
  }

  getHeatmapData(path?: string): Array<{ x: number; y: number; intensity: number }> {
    const currentPath = path || window.location.pathname;
    return this.heatmapData.get(currentPath) || [];
  }

  // Session management
  private endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    this.trackAction('session_end', 'system', {
      duration: this.currentSession.duration,
      pageViews: this.currentSession.pageViews,
      actions: this.currentSession.actions,
      bounced: this.currentSession.bounced,
      converted: this.currentSession.converted
    });

    // Send remaining actions
    this.processBatch();

    logger.debug('User session ended', {
      sessionId: this.currentSession.id,
      duration: this.currentSession.duration,
      pageViews: this.currentSession.pageViews
    });
  }

  // Batch processing
  private startBatchProcessor(): void {
    if (this.isDestroyed) return;
    
    this.batchInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.processBatch();
    }, 10000); // Send batch every 10 seconds
  }

  private processBatch(): void {
    if (this.actionQueue.length === 0) return;

    const batch = [...this.actionQueue];
    this.actionQueue = [];

    if (PRODUCTION_CONFIG.MONITORING.USER_ANALYTICS) {
      this.sendAnalyticsData(batch);
    }

    logger.debug('Analytics batch processed', { actionCount: batch.length });
  }

  private async sendAnalyticsData(actions: UserAction[]): Promise<void> {
    try {
      // In production, send to analytics service
      // For now, log the data structure
      logger.debug('Would send analytics data', {
        actionCount: actions.length,
        sessionId: this.currentSession?.id
      });
    } catch (error) {
      logger.error('Failed to send analytics data', error as Error);
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // In real implementation, get from auth context
    return undefined;
  }

  private getDeviceInfo(): UserSession['deviceInfo'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/mobile/.test(userAgent)) deviceType = 'mobile';
    else if (/tablet|ipad/.test(userAgent)) deviceType = 'tablet';

    let os = 'unknown';
    if (/windows/.test(userAgent)) os = 'windows';
    else if (/mac/.test(userAgent)) os = 'macos';
    else if (/linux/.test(userAgent)) os = 'linux';
    else if (/android/.test(userAgent)) os = 'android';
    else if (/ios/.test(userAgent)) os = 'ios';

    let browser = 'unknown';
    if (/chrome/.test(userAgent)) browser = 'chrome';
    else if (/firefox/.test(userAgent)) browser = 'firefox';
    else if (/safari/.test(userAgent)) browser = 'safari';
    else if (/edge/.test(userAgent)) browser = 'edge';

    return { type: deviceType, os, browser };
  }

  private checkConversionGoals(action: string, properties: Record<string, any>): void {
    // Define conversion goals
    const goals = [
      { name: 'document_upload', trigger: 'upload_complete' },
      { name: 'farm_registration', trigger: 'form_submit', properties: { formId: 'farm-form' } },
      { name: 'subsidy_application', trigger: 'application_submit' }
    ];

    goals.forEach(goal => {
      if (action === goal.trigger) {
        const goalMet = !goal.properties || 
          Object.entries(goal.properties).every(([key, value]) => properties[key] === value);
        
        if (goalMet && !this.conversionGoals.has(goal.name)) {
          this.trackConversion(goal.name);
        }
      }
    });
  }

  // Public API for getting analytics data
  getSessionData(): UserSession | null {
    return this.currentSession;
  }

  getActionHistory(): UserAction[] {
    return [...this.actionQueue];
  }

  getConversionData(): Array<{ goal: string; completed: boolean; timestamp?: number }> {
    return Array.from(this.conversionGoals.entries()).map(([goal, data]) => ({
      goal,
      ...data
    }));
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    this.isDestroyed = true;
    
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = undefined;
    }
    
    // Send any remaining analytics data before cleanup
    this.processBatch();
    
    // Clear data structures
    this.actionQueue = [];
    this.conversionGoals.clear();
    this.heatmapData.clear();
    this.currentSession = null;
    
    logger.info('User analytics cleaned up');
  }
}

export const userAnalytics = UserAnalytics.getInstance();