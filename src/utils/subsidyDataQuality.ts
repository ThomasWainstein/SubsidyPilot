import { supabase } from '@/integrations/supabase/client';

/**
 * Data quality monitoring utility for subsidies
 */
export class SubsidyDataQuality {
  /**
   * Check and log data quality issues for a subsidy
   */
  static async checkSubsidyQuality(subsidy: any): Promise<void> {
    const issues: string[] = [];
    
    // Check title quality
    if (!subsidy.title || subsidy.title === 'Subsidy Page' || subsidy.title.trim() === '') {
      issues.push('missing_or_placeholder_title');
    }
    
    // Check amount quality
    if (!subsidy.amount || (Array.isArray(subsidy.amount) && subsidy.amount.length === 0)) {
      issues.push('missing_amount');
    } else if (Array.isArray(subsidy.amount)) {
      const hasInvalidAmounts = subsidy.amount.some((amt: any) => 
        typeof amt !== 'number' || amt < 0 || amt > 1000000000
      );
      if (hasInvalidAmounts) {
        issues.push('invalid_amount_values');
      }
    }
    
    // Check description quality
    if (!subsidy.description || subsidy.description.trim() === '') {
      issues.push('missing_description');
    }
    
    // Check basic required fields
    if (!subsidy.agency && !subsidy.funding_source) {
      issues.push('missing_agency_or_source');
    }
    
    // Log to console for development
    if (issues.length > 0) {
      console.warn('Data quality issues detected:', {
        subsidyId: subsidy.id,
        issues,
        title: subsidy.title,
        agency: subsidy.agency,
        amount: subsidy.amount
      });
      
      // In production, this could be sent to an error logging service
      this.logDataQualityIssue(subsidy.id, issues);
    }
  }
  
  /**
   * Log data quality issues to the backend (for admin monitoring)
   */
  private static async logDataQualityIssue(subsidyId: string, issues: string[]): Promise<void> {
    try {
      // This could be enhanced to write to a data quality tracking table
      await supabase.from('error_log').insert({
        error_type: 'data_quality_subsidy',
        error_message: `Subsidy data quality issues: ${issues.join(', ')}`,
        metadata: {
          subsidyId,
          issues,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log data quality issue:', error);
    }
  }
  
  /**
   * Get data quality statistics for admin dashboard
   */
  static async getDataQualityStats(): Promise<{
    totalSubsidies: number;
    missingTitles: number;
    missingAmounts: number;
    missingDescriptions: number;
  }> {
    try {
      const { data: subsidies, error } = await supabase
        .from('subsidies')
        .select('id, title, amount_max, description');
      
      if (error) throw error;
      
      const stats = {
        totalSubsidies: subsidies?.length || 0,
        missingTitles: 0,
        missingAmounts: 0,
        missingDescriptions: 0
      };
      
      subsidies?.forEach(sub => {
        if (!sub.title || String(sub.title) === 'Subsidy Page') stats.missingTitles++;
        if (!sub.amount_max || (Array.isArray(sub.amount_max) && sub.amount_max.length === 0)) stats.missingAmounts++;
        if (!sub.description) stats.missingDescriptions++;
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get data quality stats:', error);
      return {
        totalSubsidies: 0,
        missingTitles: 0,
        missingAmounts: 0,
        missingDescriptions: 0
      };
    }
  }
}