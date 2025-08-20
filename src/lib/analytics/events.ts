/**
 * Privacy-compliant analytics system for user interaction tracking
 */

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  subsidy_id?: string;
  user_type?: string;
  session_id?: string;
  timestamp?: number;
}

export interface SubsidyViewEvent extends AnalyticsEvent {
  event: 'subsidy_view';
  category: 'subsidy';
  action: 'view';
  subsidy_id: string;
  subsidy_title?: string;
  subsidy_region?: string;
  subsidy_amount?: string;
  source?: 'search' | 'direct' | 'share';
}

export interface SubsidyInteractionEvent extends AnalyticsEvent {
  event: 'subsidy_interaction';
  category: 'subsidy';
  action: 'share' | 'favorite' | 'apply' | 'download' | 'contact';
  subsidy_id: string;
}

export interface SearchEvent extends AnalyticsEvent {
  event: 'search';
  category: 'search';
  action: 'query' | 'filter' | 'result_click';
  search_term?: string;
  filters_applied?: string[];
  results_count?: number;
}

export interface ErrorEvent extends AnalyticsEvent {
  event: 'error';
  category: 'error';
  action: 'page_error' | 'api_error' | 'component_error';
  error_message?: string;
  error_code?: string;
  page_url?: string;
}

/**
 * Analytics service with privacy-first approach
 */
class AnalyticsService {
  private isEnabled: boolean = true;
  private sessionId: string;
  private userId?: string;
  private consentGiven: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.consentGiven = this.checkConsent();
    
    // Disable in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development') {
      this.isEnabled = localStorage.getItem('analytics_dev_mode') === 'true';
    }
  }

  /**
   * Generate anonymous session ID
   */
  private generateSessionId(): string {
    const existing = sessionStorage.getItem('analytics_session_id');
    if (existing) return existing;
    
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  /**
   * Check if user has given analytics consent
   */
  private checkConsent(): boolean {
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'granted';
  }

  /**
   * Set analytics consent
   */
  setConsent(granted: boolean): void {
    this.consentGiven = granted;
    localStorage.setItem('analytics_consent', granted ? 'granted' : 'denied');
    
    if (!granted) {
      // Clear any existing data
      sessionStorage.removeItem('analytics_session_id');
      this.sessionId = this.generateSessionId();
    }
  }

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent): void {
    if (!this.isEnabled || !this.consentGiven) {
      return;
    }

    const enrichedEvent: AnalyticsEvent = {
      ...event,
      session_id: this.sessionId,
      timestamp: Date.now(),
      user_type: this.getUserType()
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', enrichedEvent);
    }

    // Send to analytics endpoint (could be Google Analytics, Mixpanel, etc.)
    this.sendEvent(enrichedEvent).catch(error => {
      console.warn('Analytics tracking failed:', error);
    });
  }

  /**
   * Track subsidy view
   */
  trackSubsidyView(params: {
    subsidyId: string;
    title?: string;
    region?: string;
    amount?: string;
    source?: 'search' | 'direct' | 'share';
  }): void {
    this.track({
      event: 'subsidy_view',
      category: 'subsidy',
      action: 'view',
      subsidy_id: params.subsidyId,
      subsidy_title: params.title,
      subsidy_region: params.region,
      subsidy_amount: params.amount,
      label: params.source || 'direct'
    } as SubsidyViewEvent);
  }

  /**
   * Track subsidy interaction
   */
  trackSubsidyInteraction(action: 'share' | 'favorite' | 'apply' | 'download' | 'contact', subsidyId: string): void {
    this.track({
      event: 'subsidy_interaction',
      category: 'subsidy',
      action,
      subsidy_id: subsidyId
    } as SubsidyInteractionEvent);
  }

  /**
   * Track search activity
   */
  trackSearch(params: {
    action: 'query' | 'filter' | 'result_click';
    searchTerm?: string;
    filtersApplied?: string[];
    resultsCount?: number;
  }): void {
    this.track({
      event: 'search',
      category: 'search',
      action: params.action,
      search_term: params.searchTerm,
      filters_applied: params.filtersApplied,
      results_count: params.resultsCount
    } as SearchEvent);
  }

  /**
   * Track errors
   */
  trackError(params: {
    action: 'page_error' | 'api_error' | 'component_error';
    message?: string;
    code?: string;
    url?: string;
  }): void {
    this.track({
      event: 'error',
      category: 'error',
      action: params.action,
      error_message: params.message,
      error_code: params.code,
      page_url: params.url || window.location.href
    } as ErrorEvent);
  }

  /**
   * Get user type for segmentation
   */
  private getUserType(): string {
    // This could be enhanced to detect user type from profile or behavior
    return 'anonymous';
  }

  /**
   * Send event to analytics backend
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, this would send to your analytics service
      // For now, we'll store locally for development/testing
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(event);
      
      // Keep only last 100 events locally
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(events));
      
      // TODO: Replace with actual analytics service call
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }

  /**
   * Get analytics summary (for debugging/admin)
   */
  getAnalyticsSummary(): AnalyticsEvent[] {
    if (!this.consentGiven) return [];
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();
