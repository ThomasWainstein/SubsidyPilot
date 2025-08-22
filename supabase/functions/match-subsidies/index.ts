import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SubsidyMatch {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientProfileId, clientType, filters = {} } = await req.json();

    if (!clientProfileId && !clientType) {
      throw new Error('Either clientProfileId or clientType is required');
    }

    console.log(`🎯 Matching subsidies for client type: ${clientType}`);

    // Get client profile data
    let clientProfile = null;
    if (clientProfileId) {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientProfileId)
        .single();
      
      if (error) {
        console.error('Error fetching client profile:', error);
      } else {
        clientProfile = data;
      }
    }

    // Get available subsidies
    let subsidyQuery = supabase
      .from('subsidies')
      .select('*')
      .eq('status', 'open');

    // Apply filters if provided
    if (filters.country) {
      subsidyQuery = subsidyQuery.contains('region', [filters.country]);
    }
    
    if (filters.fundingType) {
      subsidyQuery = subsidyQuery.eq('funding_type', filters.fundingType);
    }

    const { data: subsidies, error: subsidiesError } = await subsidyQuery;

    if (subsidiesError) {
      throw subsidiesError;
    }

    if (!subsidies || subsidies.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        matches: [],
        totalMatches: 0,
        message: 'No subsidies found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate matches for each subsidy
    const matches: SubsidyMatch[] = [];

    for (const subsidy of subsidies) {
      const match = calculateMatch(subsidy, clientType, clientProfile);
      if (match.matchScore > 20) { // Only include matches above 20%
        matches.push(match);
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Limit results
    const limitedMatches = matches.slice(0, 50);

    console.log(`✅ Found ${limitedMatches.length} matching subsidies (avg score: ${Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)}%)`);

    return new Response(JSON.stringify({
      success: true,
      matches: limitedMatches,
      totalMatches: matches.length,
      highestScore: matches[0]?.matchScore || 0,
      eligibleCount: matches.filter(m => m.eligibilityStatus === 'eligible').length,
      message: `Found ${limitedMatches.length} matching subsidies`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Subsidy matching error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateMatch(subsidy: any, clientType: string, clientProfile: any): SubsidyMatch {
  let score = 0;
  const maxScore = 100;
  const missingRequirements: string[] = [];
  
  const matchDetails = {
    clientType: false,
    geography: false,
    sector: false,
    size: false,
    financial: false,
    deadline: false,
  };

  // 1. Client Type Matching (30 points)
  const eligibilityText = subsidy.eligibility_criteria?.en || subsidy.eligibility_criteria?.fr || '';
  
  if (clientType === 'business') {
    if (eligibilityText.toLowerCase().includes('entreprise') || 
        eligibilityText.toLowerCase().includes('company') ||
        eligibilityText.toLowerCase().includes('sme') ||
        eligibilityText.toLowerCase().includes('pme')) {
      score += 30;
      matchDetails.clientType = true;
    } else {
      missingRequirements.push('Business entity required');
    }
  } else if (clientType === 'ngo') {
    if (eligibilityText.toLowerCase().includes('association') ||
        eligibilityText.toLowerCase().includes('non-profit') ||
        eligibilityText.toLowerCase().includes('ong')) {
      score += 30;
      matchDetails.clientType = true;
    } else {
      missingRequirements.push('Non-profit organization required');
    }
  } else if (clientType === 'municipality') {
    if (eligibilityText.toLowerCase().includes('collectivité') ||
        eligibilityText.toLowerCase().includes('municipality') ||
        eligibilityText.toLowerCase().includes('commune')) {
      score += 30;
      matchDetails.clientType = true;
    } else {
      missingRequirements.push('Municipal entity required');
    }
  } else if (clientType === 'farmer') {
    if (eligibilityText.toLowerCase().includes('agricole') ||
        eligibilityText.toLowerCase().includes('farm') ||
        eligibilityText.toLowerCase().includes('rural')) {
      score += 30;
      matchDetails.clientType = true;
    } else {
      missingRequirements.push('Agricultural activity required');
    }
  } else if (clientType === 'individual') {
    if (eligibilityText.toLowerCase().includes('individual') ||
        eligibilityText.toLowerCase().includes('particulier') ||
        eligibilityText.toLowerCase().includes('personne')) {
      score += 30;
      matchDetails.clientType = true;
    } else {
      missingRequirements.push('Individual eligibility required');
    }
  }

  // 2. Geographic Matching (20 points)
  if (clientProfile?.profile_data?.country) {
    const clientCountry = clientProfile.profile_data.country.toLowerCase();
    if (subsidy.region && subsidy.region.some((r: string) => r.toLowerCase().includes(clientCountry))) {
      score += 20;
      matchDetails.geography = true;
    } else if (!subsidy.region || subsidy.region.length === 0) {
      score += 15; // Assume EU-wide if no region specified
      matchDetails.geography = true;
    } else {
      missingRequirements.push(`Geographic eligibility (${clientCountry.toUpperCase()})`);
    }
  } else {
    score += 10; // Partial credit if no client country data
  }

  // 3. Sector/Activity Matching (20 points)
  if (clientProfile?.profile_data?.sector || clientProfile?.profile_data?.nace_code) {
    const clientSector = clientProfile.profile_data.sector?.toLowerCase() || '';
    const subsidySectors = subsidy.tags || [];
    
    if (subsidySectors.some((tag: string) => 
        clientSector.includes(tag.toLowerCase()) || 
        tag.toLowerCase().includes(clientSector))) {
      score += 20;
      matchDetails.sector = true;
    } else {
      score += 5; // Partial credit - might still be eligible
      missingRequirements.push('Sector alignment verification needed');
    }
  } else {
    score += 10; // Partial credit if no sector data
  }

  // 4. Size Criteria (15 points)
  if (clientType === 'business' && clientProfile?.profile_data) {
    const employees = clientProfile.profile_data.employees;
    const turnover = clientProfile.profile_data.turnover;
    
    // Check SME criteria in eligibility text
    if (eligibilityText.toLowerCase().includes('pme') || 
        eligibilityText.toLowerCase().includes('sme') ||
        eligibilityText.toLowerCase().includes('small')) {
      if (employees <= 250 && turnover <= 50000000) {
        score += 15;
        matchDetails.size = true;
      } else {
        missingRequirements.push('SME size criteria (≤250 employees, ≤€50M turnover)');
      }
    } else {
      score += 10; // Assume eligible if no size restriction
      matchDetails.size = true;
    }
  } else {
    score += 10; // Partial credit for non-business entities
  }

  // 5. Financial Thresholds (10 points)
  const amountText = subsidy.amount?.en || subsidy.amount?.fr || '';
  if (amountText) {
    score += 10; // Basic eligibility if funding amount exists
    matchDetails.financial = true;
  } else {
    score += 5;
    missingRequirements.push('Funding amount verification needed');
  }

  // 6. Deadline Check (5 points)
  if (subsidy.deadline) {
    const deadline = new Date(subsidy.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline > 0) {
      score += 5;
      matchDetails.deadline = true;
    } else {
      score = Math.max(0, score - 20); // Penalty for expired deadlines
      missingRequirements.push('Application deadline has passed');
    }
  } else {
    score += 3; // Partial credit if no deadline specified
  }

  // Determine eligibility status
  let eligibilityStatus: 'eligible' | 'potentially_eligible' | 'not_eligible';
  if (score >= 70 && matchDetails.clientType && matchDetails.deadline) {
    eligibilityStatus = 'eligible';
  } else if (score >= 40) {
    eligibilityStatus = 'potentially_eligible';
  } else {
    eligibilityStatus = 'not_eligible';
  }

  return {
    subsidyId: subsidy.id,
    matchScore: Math.min(score, maxScore),
    eligibilityStatus,
    missingRequirements,
    matchDetails,
    deadline: subsidy.deadline,
    fundingAmount: amountText || 'Amount not specified',
    title: subsidy.title?.en || subsidy.title?.fr || subsidy.title || 'Untitled Subsidy',
    agency: subsidy.agency || 'Unknown Agency',
    confidence: Math.min(score / maxScore, 1.0)
  };
}