/**
 * Intelligent Subsidy Recommendation Engine
 * Personalized subsidy discovery with machine learning-like scoring
 */

import { supabase } from '@/integrations/supabase/client';
import { SubsidyDataManager, type UnifiedSubsidyData } from './subsidy-data-consistency';
import { FrenchGeographicMatcher } from './geographic-matching';

export interface RecommendationScore {
  subsidyId: string;
  score: number;
  reasons: string[];
  category: 'quickWin' | 'highValue' | 'expiringSoon' | 'newOpportunity' | 'popular';
  confidence: number;
  estimatedValue?: string;
  blockers?: string[];
  nextSteps?: string[];
}

export interface FarmProfile {
  id: string;
  region?: string;
  department?: string;
  country?: string;
  landUseTypes?: string[];
  totalHectares?: number;
  livestockPresent?: boolean;
  certifications?: string[];
  legalStatus?: string;
  matchingTags?: string[];
  revenue?: string;
  staffCount?: number;
}

export interface SubsidyData {
  id: string;
  title: string;
  description?: string;
  region?: string[];
  eligibilityCriteria?: any;
  amountMin?: number;
  amountMax?: number;
  deadline?: string;
  agency?: string;
  fundingType?: string;
  createdAt?: string;
  apiSource?: string;
}

export class RecommendationEngine {
  
  /**
   * Generate personalized recommendations for a farm
   */
  static async generateRecommendations(farmProfile: FarmProfile): Promise<{
    quickWins: RecommendationScore[];
    highValue: RecommendationScore[];
    expiringSoon: RecommendationScore[];
    newOpportunities: RecommendationScore[];
    popular: RecommendationScore[];
  }> {
    try {
      console.log('🎯 Generating recommendations for farm:', farmProfile.id);
      
      // Use unified data source for consistency
      const subsidies = await SubsidyDataManager.getUnifiedSubsidies();
      console.log(`📊 Processing ${subsidies.length} unified subsidies`);

      const allScores = subsidies.map(subsidy => 
        this.calculateRecommendationScore(farmProfile, subsidy)
      );

      return {
        quickWins: allScores
          .filter(score => score.category === 'quickWin')
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        
        highValue: allScores
          .filter(score => score.category === 'highValue')
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        
        expiringSoon: allScores
          .filter(score => score.category === 'expiringSoon')
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        
        newOpportunities: allScores
          .filter(score => score.category === 'newOpportunity')
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        
        popular: allScores
          .filter(score => score.category === 'popular')
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {
        quickWins: [],
        highValue: [],
        expiringSoon: [],
        newOpportunities: [],
        popular: []
      };
    }
  }

  /**
   * Calculate recommendation score for a specific subsidy
   */
  private static calculateRecommendationScore(
    farm: FarmProfile,
    subsidy: UnifiedSubsidyData
  ): RecommendationScore {
    let score = 0;
    const reasons: string[] = [];
    const blockers: string[] = [];
    const nextSteps: string[] = [];
    let category: RecommendationScore['category'] = 'popular';
    let confidence = 0.5;

    // Geographic matching (high importance) - Use enhanced matcher
    const farmLocation = farm.department || farm.region || farm.country || '';
    const geoMatch = FrenchGeographicMatcher.calculateMatch(farmLocation, subsidy.region.names);
    score += geoMatch.score;
    if (geoMatch.matches) reasons.push(geoMatch.reason);
    if (geoMatch.blocker) blockers.push(geoMatch.blocker);
    confidence = Math.max(confidence, geoMatch.confidence);

    // Sector/activity matching
    const sectorScore = this.calculateSectorMatch(farm, subsidy);
    score += sectorScore.score;
    if (sectorScore.reason) reasons.push(sectorScore.reason);
    if (sectorScore.blocker) blockers.push(sectorScore.blocker);

    // Farm size compatibility
    const sizeScore = this.calculateSizeMatch(farm, subsidy);
    score += sizeScore.score;
    if (sizeScore.reason) reasons.push(sizeScore.reason);
    if (sizeScore.blocker) blockers.push(sizeScore.blocker);

    // Certification matching
    const certScore = this.calculateCertificationMatch(farm, subsidy);
    score += certScore.score;
    if (certScore.reason) reasons.push(certScore.reason);

    // Deadline urgency
    const deadlineInfo = this.analyzeDeadline(subsidy);
    if (deadlineInfo.isExpiringSoon) {
      score += 15;
      reasons.push(`Date limite proche: ${deadlineInfo.daysRemaining} jours restants`);
      category = 'expiringSoon';
    }

    // Amount value analysis
    const valueInfo = this.analyzeValue(subsidy);
    if (valueInfo.isHighValue) {
      score += 20;
      reasons.push(`Montant élevé: ${valueInfo.displayAmount}`);
      if (category !== 'expiringSoon') category = 'highValue';
    }

    // Quick win detection (low barriers, high success rate)
    const quickWinScore = this.calculateQuickWinPotential(farm, subsidy);
    if (quickWinScore.isQuickWin) {
      score += 25;
      reasons.push('Application simple avec peu de prérequis');
      if (category !== 'expiringSoon' && category !== 'highValue') {
        category = 'quickWin';
      }
    }

    // New opportunity detection
    if (this.isNewOpportunity(subsidy)) {
      score += 10;
      reasons.push('Nouvelle opportunité de financement');
      if (category === 'popular') category = 'newOpportunity';
    }

    // Add estimated value
    const estimatedValue = this.estimatePersonalizedValue(farm, subsidy);

    // Generate next steps
    if (score > 50) {
      nextSteps.push('Examiner les critères d\'éligibilité détaillés');
      nextSteps.push('Préparer les documents requis');
      if (deadlineInfo.daysRemaining && deadlineInfo.daysRemaining < 30) {
        nextSteps.push('URGENT: Soumettre la candidature rapidement');
      }
    }

    return {
      subsidyId: subsidy.id,
      score: Math.min(100, score),
      reasons,
      category,
      confidence,
      estimatedValue,
      blockers: blockers.length > 0 ? blockers : undefined,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined
    };
  }

  /**
   * Calculate geographic compatibility
   */
  private static calculateGeographicMatch(farm: FarmProfile, subsidy: SubsidyData): {
    score: number;
    matches: boolean;
    reason?: string;
    blocker?: string;
    confidence: number;
  } {
    const farmRegion = farm.department || farm.region || farm.country || '';
    const subsidyRegions = Array.isArray(subsidy.region) ? subsidy.region : (subsidy.region ? [subsidy.region] : []);
    
    // Check if farm region matches any subsidy region
    const hasMatch = subsidyRegions.some(region => {
      if (!region) return false;
      return region.toLowerCase().includes(farmRegion.toLowerCase()) ||
             farmRegion.toLowerCase().includes(region.toLowerCase());
    });

    if (hasMatch) {
      return {
        score: 30,
        matches: true,
        reason: `Éligible dans votre région: ${farmRegion}`,
        confidence: 0.9
      };
    }

    // Check for national programs
    const isNational = subsidyRegions.some(region => 
      region?.toLowerCase().includes('france') || 
      region?.toLowerCase().includes('national') ||
      region?.toLowerCase().includes('métropolitaine')
    );

    if (isNational) {
      return {
        score: 20,
        matches: true,
        reason: 'Programme national - accessible partout en France',
        confidence: 0.8
      };
    }

    // Check for European programs
    if (farm.country?.toLowerCase() === 'france' && 
        (subsidy.agency?.toLowerCase().includes('europe') || 
         subsidy.title?.toLowerCase().includes('européen'))) {
      return {
        score: 15,
        matches: true,
        reason: 'Programme européen accessible en France',
        confidence: 0.7
      };
    }

    return {
      score: 0,
      matches: false,
      blocker: `Programme limité à: ${subsidyRegions.join(', ')}`,
      confidence: 0.8
    };
  }

  /**
   * Calculate sector/activity compatibility
   */
  private static calculateSectorMatch(farm: FarmProfile, subsidy: UnifiedSubsidyData): {
    score: number;
    reason?: string;
    blocker?: string;
  } {
    const farmActivities = farm.landUseTypes || [];
    const farmTags = farm.matchingTags || [];
    
    // Extract sectors from title and description
    const subsidyText = `${subsidy.title} ${subsidy.description || ''}`.toLowerCase();
    
    // Check subsidy sectors
    const subsidySectors = subsidy.sector || [];
    const sectorMatches = farmActivities.filter(activity => 
      subsidySectors.some(sector => sector.toLowerCase().includes(activity.toLowerCase()))
    );

    if (sectorMatches.length > 0) {
      return {
        score: 25,
        reason: `Correspond à vos activités: ${sectorMatches.join(', ')}`
      };
    }
    
    // Agriculture-specific keywords
    const agricultureKeywords = [
      'agricol', 'bio', 'élevage', 'culture', 'exploitation', 'ferme',
      'agriculteur', 'éleveur', 'maraîcher', 'viticult', 'arboricult'
    ];

    const hasAgricultureMatch = agricultureKeywords.some(keyword => 
      subsidyText.includes(keyword)
    );

    if (hasAgricultureMatch) {
      return {
        score: 15,
        reason: 'Programme destiné au secteur agricole'
      };
    }

    // Check for general business support
    const generalBusinessKeywords = [
      'entreprise', 'innovation', 'développement', 'investissement',
      'modernisation', 'équipement'
    ];

    const hasGeneralMatch = generalBusinessKeywords.some(keyword => 
      subsidyText.includes(keyword)
    );

    if (hasGeneralMatch) {
      return {
        score: 10,
        reason: 'Programme général d\'aide aux entreprises'
      };
    }

    return {
      score: 0,
      blocker: 'Secteur d\'activité non correspondant'
    };
  }

  /**
   * Calculate farm size compatibility
   */
  private static calculateSizeMatch(farm: FarmProfile, subsidy: UnifiedSubsidyData): {
    score: number;
    reason?: string;
    blocker?: string;
  } {
    const farmSize = farm.totalHectares || 0;
    const subsidyText = `${subsidy.title} ${subsidy.description || ''}`.toLowerCase();

    // Check for size-specific mentions
    if (subsidyText.includes('petite') || subsidyText.includes('micro')) {
      if (farmSize < 20) {
        return { score: 15, reason: 'Adapté aux petites exploitations' };
      } else {
        return { score: 0, blocker: 'Réservé aux petites exploitations' };
      }
    }

    if (subsidyText.includes('grande') || subsidyText.includes('importante')) {
      if (farmSize > 100) {
        return { score: 15, reason: 'Adapté aux grandes exploitations' };
      } else {
        return { score: 0, blocker: 'Réservé aux grandes exploitations' };
      }
    }

    // No size restriction mentioned - assume compatible
    return { score: 5, reason: 'Aucune restriction de taille mentionnée' };
  }

  /**
   * Calculate certification matching
   */
  private static calculateCertificationMatch(farm: FarmProfile, subsidy: UnifiedSubsidyData): {
    score: number;
    reason?: string;
  } {
    const farmCerts = farm.certifications || [];
    const subsidyText = `${subsidy.title} ${subsidy.description || ''}`.toLowerCase();

    if (farmCerts.includes('bio') && subsidyText.includes('bio')) {
      return { score: 20, reason: 'Bonification pour certification bio' };
    }

    if (farmCerts.includes('HVE') && subsidyText.includes('environnement')) {
      return { score: 15, reason: 'Compatible avec certification HVE' };
    }

    return { score: 0 };
  }

  /**
   * Analyze deadline urgency
   */
  private static analyzeDeadline(subsidy: UnifiedSubsidyData): {
    isExpiringSoon: boolean;
    daysRemaining?: number;
  } {
    return {
      isExpiringSoon: subsidy.deadline.daysRemaining !== undefined && subsidy.deadline.daysRemaining <= 30,
      daysRemaining: subsidy.deadline.daysRemaining
    };
  }

  /**
   * Analyze subsidy value
   */
  private static analyzeValue(subsidy: UnifiedSubsidyData): {
    isHighValue: boolean;
    displayAmount?: string;
  } {
    const maxAmount = subsidy.amount.max || 0;
    const minAmount = subsidy.amount.min || 0;

    const isHighValue = maxAmount > 50000 || minAmount > 20000;

    return { 
      isHighValue, 
      displayAmount: subsidy.amount.displayText 
    };
  }

  /**
   * Calculate quick win potential
   */
  private static calculateQuickWinPotential(farm: FarmProfile, subsidy: UnifiedSubsidyData): {
    isQuickWin: boolean;
  } {
    const subsidyText = `${subsidy.title} ${subsidy.description || ''}`.toLowerCase();
    
    // Simple application indicators
    const simpleIndicators = [
      'simple', 'facile', 'automatique', 'sans condition',
      'déclaratif', 'en ligne', 'rapide'
    ];

    // Complex application indicators
    const complexIndicators = [
      'dossier complet', 'étude', 'audit', 'expertise',
      'certification requise', 'appel à projet'
    ];

    const hasSimpleIndicators = simpleIndicators.some(indicator => 
      subsidyText.includes(indicator)
    );

    const hasComplexIndicators = complexIndicators.some(indicator => 
      subsidyText.includes(indicator)
    );

    // Quick win if simple indicators present and no complex ones
    const isQuickWin = hasSimpleIndicators && !hasComplexIndicators;

    return { isQuickWin };
  }

  /**
   * Check if subsidy is a new opportunity
   */
  private static isNewOpportunity(subsidy: UnifiedSubsidyData): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return subsidy.lastUpdated > thirtyDaysAgo;
  }

  /**
   * Estimate personalized value for the farm
   */
  private static estimatePersonalizedValue(farm: FarmProfile, subsidy: UnifiedSubsidyData): string | undefined {
    const farmSize = farm.totalHectares || 0;
    const maxAmount = subsidy.amount.max || 0;
    
    if (!maxAmount || !farmSize) return undefined;

    // Rough estimation based on farm size
    let estimatedAmount = 0;
    if (farmSize < 20) {
      estimatedAmount = Math.min(maxAmount, maxAmount * 0.3);
    } else if (farmSize < 100) {
      estimatedAmount = Math.min(maxAmount, maxAmount * 0.6);
    } else {
      estimatedAmount = maxAmount;
    }

    if (estimatedAmount > 1000) {
      return `Estimation pour votre exploitation: ${Math.round(estimatedAmount).toLocaleString('fr-FR')} €`;
    }

    return undefined;
  }
}