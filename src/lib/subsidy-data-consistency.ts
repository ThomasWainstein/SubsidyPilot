/**
 * Subsidy Data Consistency Manager
 * Ensures all components use the same data source and parsing logic
 */

import { supabase } from '@/integrations/supabase/client';
import { extractSubsidyData } from './extraction/source-extractors';
import { EnhancedFrenchParser } from './french-text-processing';

export interface UnifiedSubsidyData {
  id: string;
  title: string;
  description: string;
  agency: string;
  amount: {
    displayText: string;
    min?: number;
    max?: number;
    confidence: number;
  };
  region: {
    names: string[];
    isRestricted: boolean;
    confidence: number;
  };
  deadline: {
    date?: Date;
    description: string;
    isOpen: boolean;
    daysRemaining?: number;
    confidence: number;
  };
  eligibility: {
    criteria: string[];
    restrictions: string[];
    requirements: string[];
    confidence: number;
  };
  sector: string[];
  fundingType: string;
  applicationUrl?: string;
  source: 'subsidies' | 'subsidies_structured';
  lastUpdated: Date;
  // Legacy fields for backward compatibility
  matchConfidence?: number;
  categories?: string[];
}

export class SubsidyDataManager {
  private static cache = new Map<string, { data: UnifiedSubsidyData[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Get unified subsidy data with consistent parsing across all components
   */
  static async getUnifiedSubsidies(useCache = true): Promise<UnifiedSubsidyData[]> {
    const cacheKey = 'unified_subsidies';
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('🎯 Returning cached unified subsidies');
        return cached.data;
      }
    }

    console.log('🔄 Fetching fresh unified subsidies');
    
    try {
      // Primary source: subsidies (has processed data)
      const { data: structuredSubsidies, error: structuredError } = await supabase
        .from('subsidies')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      // Fallback source: subsidies (raw API data)
      const { data: rawSubsidies, error: rawError } = await supabase
        .from('subsidies')
        .select('*')
        .order('created_at', { ascending: false });

      if (structuredError && rawError) {
        throw new Error(`Both data sources failed: ${structuredError.message}, ${rawError.message}`);
      }

      const unifiedData: UnifiedSubsidyData[] = [];

      // Process structured subsidies first (higher quality)
      if (structuredSubsidies && !structuredError) {
        console.log(`📊 Processing ${structuredSubsidies.length} structured subsidies`);
        
        for (const subsidy of structuredSubsidies) {
          try {
            const unified = await this.processStructuredSubsidy(subsidy);
            unifiedData.push(unified);
          } catch (error) {
            console.warn(`⚠️ Failed to process structured subsidy ${subsidy.id}:`, error);
          }
        }
      }

      // Process raw subsidies as fallback for missing data
      if (rawSubsidies && !rawError) {
        console.log(`📋 Processing ${rawSubsidies.length} raw subsidies`);
        
        // Only add raw subsidies not already present in structured data
        const structuredIds = new Set(unifiedData.map(s => s.id));
        
        for (const subsidy of rawSubsidies) {
          if (!structuredIds.has(subsidy.id)) {
            try {
              const unified = await this.processRawSubsidy(subsidy);
              unifiedData.push(unified);
            } catch (error) {
              console.warn(`⚠️ Failed to process raw subsidy ${subsidy.id}:`, error);
            }
          }
        }
      }

      // Cache the results
      this.cache.set(cacheKey, { data: unifiedData, timestamp: Date.now() });
      
      console.log(`✅ Unified ${unifiedData.length} subsidies from both sources`);
      return unifiedData;
      
    } catch (error) {
      console.error('❌ Critical error in getUnifiedSubsidies:', error);
      
      // Return cached data if available, even if stale
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Returning stale cached data due to error');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Process subsidies_structured data (already extracted)
   */
  private static async processStructuredSubsidy(subsidy: any): Promise<UnifiedSubsidyData> {
    // Use source-aware extraction for consistent processing
    const extractedData = extractSubsidyData(subsidy);
    
    // Enhanced parsing with confidence scores
    const amountParsed = EnhancedFrenchParser.parseComplexAmounts(extractedData.amount || '');
    const deadlineParsed = EnhancedFrenchParser.parseDeadlines(extractedData.deadline || '');
    const eligibilityParsed = EnhancedFrenchParser.parseEligibilityCriteria(extractedData.eligibility || '');

    return {
      id: subsidy.id,
      title: extractedData.title || 'Titre non disponible',
      description: extractedData.description || '',
      agency: extractedData.agency || 'Organisme non spécifié',
      amount: {
        displayText: amountParsed.displayText,
        min: amountParsed.min,
        max: amountParsed.max,
        confidence: amountParsed.confidence
      },
      region: {
        names: extractedData.region ? [extractedData.region] : [],
        isRestricted: extractedData.isRegionRestricted || false,
        confidence: 0.8 // Structured data has high confidence
      },
      deadline: deadlineParsed,
      eligibility: eligibilityParsed,
      sector: this.extractSectors(extractedData),
      fundingType: subsidy.funding_type || 'Financement',
      applicationUrl: extractedData.applicationUrl,
      source: 'subsidies',
      lastUpdated: new Date(subsidy.updated_at || subsidy.created_at)
    };
  }

  /**
   * Process raw subsidies data (needs extraction)
   */
  private static async processRawSubsidy(subsidy: any): Promise<UnifiedSubsidyData> {
    // Enhanced parsing with confidence scores
    const title = String(subsidy.title || 'Titre non disponible');
    const description = String(subsidy.description || '');
    
    // Parse amounts from eligibility criteria or raw data
    const eligibilityCriteria = subsidy.eligibility_criteria as any;
    const amountText = eligibilityCriteria?.montants || eligibilityCriteria?.amount || '';
    const amountParsed = EnhancedFrenchParser.parseComplexAmounts(amountText);
    
    // Parse deadline
    const deadlineText = subsidy.deadline || eligibilityCriteria?.deadline || '';
    const deadlineParsed = EnhancedFrenchParser.parseDeadlines(deadlineText);
    
    // Parse eligibility
    const eligibilityText = eligibilityCriteria?.conditions || eligibilityCriteria?.eligibility || '';
    const eligibilityParsed = EnhancedFrenchParser.parseEligibilityCriteria(eligibilityText);

    return {
      id: subsidy.id,
      title,
      description,
      agency: String(eligibilityCriteria?.organisme || subsidy.agency || 'Organisme non spécifié'),
      amount: {
        displayText: amountParsed.displayText,
        min: amountParsed.min || subsidy.amount_min,
        max: amountParsed.max || subsidy.amount_max,
        confidence: amountParsed.confidence
      },
      region: {
        names: Array.isArray(subsidy.region) ? subsidy.region : (subsidy.region ? [subsidy.region] : []),
        isRestricted: this.isRegionRestricted(subsidy),
        confidence: 0.6 // Raw data has lower confidence
      },
      deadline: deadlineParsed,
      eligibility: eligibilityParsed,
      sector: this.extractSectors(subsidy),
      fundingType: subsidy.funding_type || 'Financement',
      applicationUrl: subsidy.application_url,
      source: 'subsidies',
      lastUpdated: new Date(subsidy.updated_at || subsidy.created_at)
    };
  }

  /**
   * Extract sectors with confidence scoring
   */
  private static extractSectors(data: any): string[] {
    const sectors: string[] = [];
    
    // From tags/categories
    if (Array.isArray(data.tags)) {
      sectors.push(...data.tags);
    }
    if (Array.isArray(data.categories)) {
      sectors.push(...data.categories);
    }
    
    // From title analysis
    const title = String(data.title || '').toLowerCase();
    const sectorKeywords = {
      'Agriculture Bio': ['bio', 'biologique', 'organique'],
      'Élevage': ['élevage', 'éleveur', 'bétail', 'cheptel'],
      'Viticulture': ['vin', 'vigne', 'viticult', 'vendange'],
      'Maraîchage': ['légume', 'maraîch', 'serre', 'culture'],
      'Innovation': ['innovation', 'r&d', 'recherche', 'numérique'],
      'Environnement': ['environnement', 'écologique', 'durable', 'carbone'],
      'Export': ['export', 'international', 'commerce']
    };
    
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => title.includes(keyword))) {
        sectors.push(sector);
      }
    }
    
    return [...new Set(sectors)]; // Remove duplicates
  }

  /**
   * Enhanced region restriction detection
   */
  private static isRegionRestricted(subsidy: any): boolean {
    const regions = Array.isArray(subsidy.region) ? subsidy.region : (subsidy.region ? [subsidy.region] : []);
    
    // Check for national/European programs
    const nationalIndicators = ['france', 'national', 'métropolitaine', 'européen', 'union européenne'];
    const hasNationalScope = regions.some(region => 
      nationalIndicators.some(indicator => 
        region?.toLowerCase().includes(indicator)
      )
    );
    
    return !hasNationalScope && regions.length > 0;
  }

  /**
   * Clear cache - useful for testing and data updates
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Subsidy data cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; keys: string[]; lastUpdate?: number } {
    const keys = Array.from(this.cache.keys());
    const timestamps = Array.from(this.cache.values()).map(v => v.timestamp);
    const lastUpdate = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
    
    return {
      size: this.cache.size,
      keys,
      lastUpdate
    };
  }
}