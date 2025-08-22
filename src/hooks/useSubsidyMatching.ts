import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubsidyMatch {
  subsidyId: string;
  matchScore: number;
  eligibilityStatus: 'eligible' | 'potentially_eligible' | 'not_eligible';
  missingRequirements: string[];
  matchDetails: {
    clientType: boolean;
    geography: boolean;
    sector: boolean;
    size: boolean;
    financial: boolean;
    deadline: boolean;
  };
  deadline: string | null;
  fundingAmount: string;
  title: string;
  agency: string;
  confidence: number;
}

export interface MatchingFilters {
  country?: string;
  fundingType?: string;
  minAmount?: number;
  maxAmount?: number;
  deadline?: 'open' | 'closing_soon' | 'all';
}

interface UseSubsidyMatchingResult {
  matches: SubsidyMatch[];
  isMatching: boolean;
  error: string | null;
  totalMatches: number;
  highestScore: number;
  eligibleCount: number;
  findMatches: (clientProfileId?: string, clientType?: string, filters?: MatchingFilters) => Promise<SubsidyMatch[]>;
  clearMatches: () => void;
}

export const useSubsidyMatching = (): UseSubsidyMatchingResult => {
  const [matches, setMatches] = useState<SubsidyMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const { toast } = useToast();

  const findMatches = useCallback(async (
    clientProfileId?: string,
    clientType?: string,
    filters: MatchingFilters = {}
  ): Promise<SubsidyMatch[]> => {
    if (!clientProfileId && !clientType) {
      const errorMsg = 'Either client profile ID or client type is required';
      setError(errorMsg);
      toast({
        title: "Matching Error",
        description: errorMsg,
        variant: "destructive",
      });
      return [];
    }

    setIsMatching(true);
    setError(null);

    try {
      console.log('🎯 Starting subsidy matching...', { clientProfileId, clientType, filters });
      
      const { data, error: matchingError } = await supabase.functions.invoke('match-subsidies', {
        body: {
          clientProfileId,
          clientType,
          filters
        }
      });

      if (matchingError) {
        throw new Error(matchingError.message || 'Matching failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Matching failed');
      }

      const results = data.matches as SubsidyMatch[];
      setMatches(results);
      setTotalMatches(data.totalMatches || 0);
      setHighestScore(data.highestScore || 0);
      setEligibleCount(data.eligibleCount || 0);

      // Success notification
      const eligibleText = data.eligibleCount > 0 ? ` (${data.eligibleCount} eligible)` : '';
      toast({
        title: "Subsidies Matched",
        description: `Found ${results.length} matching subsidies${eligibleText}`,
      });

      console.log('✅ Subsidy matching completed:', {
        totalMatches: results.length,
        highestScore: data.highestScore,
        eligibleCount: data.eligibleCount
      });

      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown matching error';
      console.error('❌ Subsidy matching failed:', err);
      
      setError(errorMessage);
      toast({
        title: "Matching Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
    } finally {
      setIsMatching(false);
    }
  }, [toast]);

  const clearMatches = useCallback(() => {
    setMatches([]);
    setTotalMatches(0);
    setHighestScore(0);
    setEligibleCount(0);
    setError(null);
  }, []);

  return {
    matches,
    isMatching,
    error,
    totalMatches,
    highestScore,
    eligibleCount,
    findMatches,
    clearMatches,
  };
};