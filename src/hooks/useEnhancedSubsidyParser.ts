import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedSubsidyData {
  funding: {
    type: string;
    percentage?: number;
    minAmount?: number;
    maxAmount?: number;
    currency: string;
    conditions?: string;
    investmentRange?: { min: number | null; max: number | null };
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
}

interface UseEnhancedSubsidyParserOptions {
  onSuccess?: (data: ParsedSubsidyData) => void;
  onError?: (error: string) => void;
}

export const useEnhancedSubsidyParser = (options: UseEnhancedSubsidyParserOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedSubsidyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseSubsidy = async (subsidyId: string, forceReprocess = false) => {
    setIsProcessing(true);
    setError(null);
    setParsedData(null);

    try {
      const { data, error: processError } = await supabase.functions.invoke(
        'enhanced-subsidy-parser',
        {
          body: { 
            subsidyId,
            forceReprocess
          }
        }
      );

      if (processError) {
        throw new Error(processError.message || 'Processing failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      setParsedData(data.data);
      
      if (data.cached) {
        toast.success('Données enrichies récupérées du cache');
      } else {
        toast.success('Analyse enrichie terminée avec succès');
      }
      
      options.onSuccess?.(data.data);
      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement';
      setError(errorMessage);
      toast.error(`Erreur d'analyse: ${errorMessage}`);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setIsProcessing(false);
    setError(null);
    setParsedData(null);
  };

  // Utility functions for working with parsed data
  const getFundingDisplay = (data?: ParsedSubsidyData): string => {
    if (!data?.funding) return 'Montant non spécifié';
    
    const { funding } = data;
    
    switch (funding.type) {
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
    
    return funding.description || 'Montant à déterminer';
  };

  const getEligibilityDisplay = (data?: ParsedSubsidyData): string[] => {
    if (!data?.eligibility) return [];
    
    return [
      ...data.eligibility.entityTypes,
      ...data.eligibility.sectors,
      ...data.eligibility.geographicScope
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

  return {
    parseSubsidy,
    isProcessing,
    parsedData,
    error,
    reset,
    // Utility functions
    getFundingDisplay,
    getEligibilityDisplay,
    getDeadlineDisplay
  };
};