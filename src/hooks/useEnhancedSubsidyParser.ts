import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FrenchSubsidyParser, ParsedSubsidyContent } from '@/lib/extraction/french-subsidy-parser';

interface ParsedSubsidyData {
  funding: {
    type: string;
    percentage?: number;
    minAmount?: number;
    maxAmount?: number;
    investmentMin?: number;
    investmentMax?: number;
    currency: string;
    conditions?: string;
    description?: string;
  };
  eligibility: {
    entityTypes: string[];
    sectors: string[];
    geographicScope: string[];
    sizeRequirements?: string;
    specificConditions?: string[];
  };
  applicationProcess?: {
    steps: string[];
    timeline?: string;
    requiredDocuments?: string[];
    contactInfo?: string;
    beforeProjectStart?: boolean;
  };
  deadline?: {
    type: string;
    date?: string;
    description?: string;
  };
  keyInformation?: {
    issuingBody?: string;
    programName?: string;
    sector?: string;
    region?: string;
  };
  confidence?: number;
  extractedAt?: string;
  processingMethod?: 'local' | 'ai-enhanced' | 'hybrid';
}

interface UseEnhancedSubsidyParserOptions {
  onSuccess?: (data: ParsedSubsidyData) => void;
  onError?: (error: string) => void;
  minConfidenceForLocal?: number; // If local confidence is below this, use AI
  alwaysPreferLocal?: boolean; // Skip AI entirely if true
}

export const useEnhancedSubsidyParser = (options: UseEnhancedSubsidyParserOptions = {}) => {
  const { 
    minConfidenceForLocal = 0.6, // Only use AI if local confidence < 60%
    alwaysPreferLocal = false 
  } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedSubsidyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<{
    localAttempted: boolean;
    localConfidence?: number;
    aiUsed: boolean;
    processingTime: number;
  } | null>(null);

  const parseSubsidy = async (subsidyId: string, forceReprocess = false) => {
    const startTime = Date.now();
    setIsProcessing(true);
    setError(null);
    setParsedData(null);

    try {
      // STEP 1: Check for existing cached data first
      if (!forceReprocess) {
        const { data: existingSubsidy, error: fetchError } = await supabase
        .from('subsidies')
        .select('*')
        .eq('id', subsidyId)
        .single();

        // Check if we have cached enhanced data (this field may not exist yet)
        const cachedData = (existingSubsidy as any)?.enhanced_funding_info;
        if (!fetchError && cachedData) {
          setParsedData(cachedData);
          toast.success('Données enrichies récupérées du cache', { duration: 2000 });
          options.onSuccess?.(cachedData);
          return cachedData;
        }
      }

      // STEP 2: Get subsidy data for processing
      const { data: subsidy, error: fetchError } = await supabase
        .from('subsidies')
        .select('*')
        .eq('id', subsidyId)
        .single();

      if (fetchError || !subsidy) {
        throw new Error(`Failed to fetch subsidy: ${fetchError?.message}`);
      }

      // STEP 3: ENHANCED LOCAL PARSING FIRST (Primary Strategy)
      console.log('🚀 Starting enhanced local parsing...');
      const localResult = parseSubsidyLocally(subsidy);
      
      const stats = {
        localAttempted: true,
        localConfidence: localResult?.confidence || 0,
        aiUsed: false,
        processingTime: 0
      };

      // STEP 4: Decide if local result is sufficient
      const isLocalSufficient = localResult && 
        localResult.confidence >= minConfidenceForLocal &&
        hasRequiredFields(localResult);

      if (isLocalSufficient || alwaysPreferLocal) {
        // Local parsing was successful - use it!
        localResult.processingMethod = 'local';
        setParsedData(localResult);
        
        // Cache the local result
        await cacheResult(subsidyId, localResult);
        
        stats.processingTime = Date.now() - startTime;
        setProcessingStats(stats);
        
        toast.success(`Analyse locale terminée (${Math.round(localResult.confidence * 100)}% confiance)`, { 
          duration: 2000 
        });
        
        options.onSuccess?.(localResult);
        return localResult;
      }

      // STEP 5: AI Enhancement for missing/low-confidence data
      if (!alwaysPreferLocal) {
        console.log(`🤖 Local confidence ${Math.round((localResult?.confidence || 0) * 100)}% < ${Math.round(minConfidenceForLocal * 100)}%, using AI enhancement...`);
        
        stats.aiUsed = true;
        const aiResult = await performAIEnhancement(subsidyId, subsidy, localResult);
        
        if (aiResult) {
          aiResult.processingMethod = localResult ? 'hybrid' : 'ai-enhanced';
          setParsedData(aiResult);
          
          stats.processingTime = Date.now() - startTime;
          setProcessingStats(stats);
          
          toast.success(`Analyse ${aiResult.processingMethod === 'hybrid' ? 'hybride' : 'IA'} terminée (${Math.round(aiResult.confidence * 100)}% confiance)`, { 
            duration: 3000 
          });
          
          options.onSuccess?.(aiResult);
          return aiResult;
        }
      }

      // STEP 6: Fallback to local result even if confidence is low
      if (localResult) {
        localResult.processingMethod = 'local';
        setParsedData(localResult);
        
        stats.processingTime = Date.now() - startTime;
        setProcessingStats(stats);
        
        toast.warning(`Analyse locale avec confiance limitée (${Math.round(localResult.confidence * 100)}%)`, { 
          duration: 3000 
        });
        
        options.onSuccess?.(localResult);
        return localResult;
      }

      throw new Error('Aucune méthode d\'extraction n\'a réussi');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement';
      setError(errorMessage);
      toast.error(`Erreur d'analyse: ${errorMessage}`, { duration: 4000 });
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSubsidyLocally = (subsidy: any): ParsedSubsidyData | null => {
    try {
      // Combine ALL available content sources for maximum extraction
      const contentSources = [
        subsidy.title,
        subsidy.description,
        subsidy.eligibility,
        subsidy.funding_markdown,
        subsidy.description_markdown,
        
        // Raw data extraction (rich HTML content)
        subsidy.raw_data?.fiche ? 
          cleanHtmlContent(subsidy.raw_data.fiche) : '',
        
        // LesAides.fr specific data
        subsidy.lesAidesData?.description,
        subsidy.lesAidesData?.montants,
        subsidy.lesAidesData?.conditions,
        subsidy.lesAidesData?.demarches,
        
        // Any other structured fields
        subsidy.funding_details,
        subsidy.application_process,
      ].filter(Boolean);

      const content = contentSources.join('\n\n');

      if (!content.trim()) {
        return null;
      }

      console.log(`📝 Parsing ${content.length} chars locally for subsidy ${subsidy.id?.substring(0, 8)}...`);
      
      // Use enhanced French parser
      const parsed = FrenchSubsidyParser.parse(content);
      
      // Convert to expected format with all extracted data
      const result: ParsedSubsidyData = {
        funding: parsed.funding[0] ? {
          type: parsed.funding[0].type,
          percentage: parsed.funding[0].percentage,
          minAmount: parsed.funding[0].minAmount,
          maxAmount: parsed.funding[0].maxAmount,
          investmentMin: parsed.funding[0].investmentMin,
          investmentMax: parsed.funding[0].investmentMax,
          currency: parsed.funding[0].currency,
          conditions: parsed.funding[0].conditions,
          description: parsed.funding[0].originalText,
        } : {
          type: 'unknown',
          currency: 'EUR',
        },
        eligibility: {
          entityTypes: parsed.eligibility.entityTypes,
          sectors: parsed.eligibility.sectors,
          geographicScope: parsed.eligibility.geographicScope,
          specificConditions: parsed.eligibility.specificConditions || [],
        },
        applicationProcess: parsed.applicationProcess ? {
          steps: parsed.applicationProcess.steps,
          timeline: parsed.applicationProcess.timeline,
          requiredDocuments: parsed.applicationProcess.requiredDocuments,
          contactInfo: parsed.applicationProcess.contactInfo,
          beforeProjectStart: parsed.applicationProcess.beforeProjectStart,
        } : undefined,
        deadline: parsed.deadline ? {
          type: parsed.deadline.type,
          date: parsed.deadline.date,
          description: parsed.deadline.description,
        } : undefined,
        keyInformation: {
          issuingBody: subsidy.agency,
          programName: subsidy.title,
          sector: Array.isArray(subsidy.sector) ? subsidy.sector.join(', ') : subsidy.sector,
          region: Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region,
        },
        confidence: parsed.confidence,
        extractedAt: new Date().toISOString(),
        processingMethod: 'local',
      };

      console.log(`✅ Local parsing confidence: ${Math.round(parsed.confidence * 100)}%`);
      return result;
    } catch (parseError) {
      console.error('❌ Local parsing failed:', parseError);
      return null;
    }
  };

  const performAIEnhancement = async (
    subsidyId: string, 
    subsidy: any, 
    localResult?: ParsedSubsidyData
  ): Promise<ParsedSubsidyData | null> => {
    try {
      const { data, error: processError } = await supabase.functions.invoke(
        'enhanced-subsidy-parser',
        {
          body: { 
            subsidyId,
            forceReprocess: true,
            localResult, // Pass local result for hybrid processing
          }
        }
      );

      if (processError || !data.success) {
        console.warn('AI enhancement failed:', processError?.message || data.error);
        return null;
      }

      return data.data;
    } catch (err) {
      console.warn('AI enhancement error:', err);
      return null;
    }
  };

  // Helper function to check if result has minimum required fields
  const hasRequiredFields = (result: ParsedSubsidyData): boolean => {
    return !!(
      (result.funding.type !== 'unknown' && 
       (result.funding.percentage || result.funding.minAmount || result.funding.maxAmount)) ||
      result.eligibility.entityTypes.length > 0 ||
      result.eligibility.geographicScope.length > 0
    );
  };

  // Helper to clean HTML content
  const cleanHtmlContent = (htmlContent: any): string => {
    if (!htmlContent) return '';
    
    const content = typeof htmlContent === 'string' ? htmlContent : JSON.stringify(htmlContent);
    
    return content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&euro;/g, '€')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Cache result to database
  const cacheResult = async (subsidyId: string, result: ParsedSubsidyData) => {
    try {
      await supabase
        .from('subsidies')
        .update({
          enhanced_funding_info: JSON.parse(JSON.stringify(result)),
          extraction_completeness_score: Math.round(result.confidence * 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', subsidyId);
    } catch (error) {
      console.warn('Failed to cache result:', error);
    }
  };

  const reset = () => {
    setIsProcessing(false);
    setError(null);
    setParsedData(null);
    setProcessingStats(null);
  };

  // Utility functions for working with parsed data
  const getFundingDisplay = (data?: ParsedSubsidyData): string => {
    if (!data?.funding) return 'Montant non spécifié';
    
    const { funding } = data;
    
    switch (funding.type) {
      case 'percentage_with_range':
        if (funding.percentage && funding.investmentMin && funding.investmentMax) {
          const aidMin = funding.minAmount?.toLocaleString() || '0';
          const aidMax = funding.maxAmount?.toLocaleString() || '0';
          return `${funding.percentage}% sur investissement €${funding.investmentMin.toLocaleString()} - €${funding.investmentMax.toLocaleString()} (aide: €${aidMin} - €${aidMax})`;
        }
        return `${funding.percentage}% de subvention`;
      case 'percentage':
        if (funding.percentage) {
          return `${funding.percentage}% de subvention`;
        }
        break;
      case 'range':
        if (funding.minAmount && funding.maxAmount) {
          return `€${funding.minAmount.toLocaleString()} - €${funding.maxAmount.toLocaleString()}`;
        }
        break;
      case 'maximum':
        if (funding.maxAmount) {
          return `Jusqu'à €${funding.maxAmount.toLocaleString()}`;
        }
        break;
      case 'minimum':
        if (funding.minAmount) {
          return `À partir de €${funding.minAmount.toLocaleString()}`;
        }
        break;
    }
    
    return funding.description || funding.conditions || 'Montant à déterminer';
  };

  const getEligibilityDisplay = (data?: ParsedSubsidyData): string[] => {
    if (!data?.eligibility) return [];
    
    const safeArray = (arr: any): string[] => {
      if (Array.isArray(arr)) return arr;
      if (typeof arr === 'string') return [arr];
      return [];
    };
    
    return [
      ...safeArray(data.eligibility.entityTypes),
      ...safeArray(data.eligibility.sectors),
      ...safeArray(data.eligibility.geographicScope)
    ].filter(Boolean);
  };

  const getDeadlineDisplay = (data?: ParsedSubsidyData): string => {
    if (!data?.deadline) return 'Non spécifiée';
    
    const { deadline } = data;
    
    switch (deadline.type) {
      case 'fixed':
        return deadline.date ? `Date limite: ${deadline.date}` : deadline.description || 'Date fixe';
      case 'rolling':
        return 'Candidatures en continu';
      case 'annual':
        return 'Appel d\'offres annuel';
      default:
        return deadline.description || 'Non spécifiée';
    }
  };

  const getProcessingMethodDisplay = (data?: ParsedSubsidyData): {
    method: string;
    icon: string;
    color: string;
  } => {
    switch (data?.processingMethod) {
      case 'local':
        return { method: 'Analyse locale', icon: '🚀', color: 'text-blue-600' };
      case 'ai-enhanced':
        return { method: 'IA enrichie', icon: '🤖', color: 'text-purple-600' };
      case 'hybrid':
        return { method: 'Hybride', icon: '⚡', color: 'text-emerald-600' };
      default:
        return { method: 'Standard', icon: '📋', color: 'text-gray-600' };
    }
  };

  const getConfidenceLevel = (data?: ParsedSubsidyData): 'low' | 'medium' | 'high' => {
    if (!data?.confidence) return 'low';
    
    if (data.confidence >= 0.7) return 'high';
    if (data.confidence >= 0.5) return 'medium';
    return 'low';
  };

  return {
    // Core functions
    parseSubsidy,
    parseSubsidyLocally,
    isProcessing,
    parsedData,
    error,
    reset,
    processingStats,
    
    // Utility functions for display
    getFundingDisplay,
    getEligibilityDisplay,
    getDeadlineDisplay,
    getProcessingMethodDisplay,
    getConfidenceLevel,
    
    // Configuration
    minConfidenceForLocal,
    alwaysPreferLocal,
  };
};