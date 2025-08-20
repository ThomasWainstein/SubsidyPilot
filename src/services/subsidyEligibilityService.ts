import { supabase } from '@/integrations/supabase/client';

interface SubsidyEligibilityScore {
  subsidyId: string;
  farmId: string;
  score: number;
  blockedReasons: string[];
  requiredActions: string[];
  amount: number | null;
  deadline: string | null;
}

interface EligibilityResult {
  readyToApply: SubsidyEligibilityScore[];
  needsAction: SubsidyEligibilityScore[];
  totalReadyValue: number;
  totalBlockedValue: number;
}

export class SubsidyEligibilityService {
  
  /**
   * Calculate farm eligibility for all available subsidies
   */
  static async calculateFarmEligibility(farmId: string): Promise<EligibilityResult> {
    // Get farm details
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (farmError || !farm) {
      throw new Error(`Farm not found: ${farmError?.message}`);
    }

    // Get farm documents to check completion
    const { data: documents } = await supabase
      .from('farm_documents')
      .select('category, processing_status')
      .eq('farm_id', farmId);

    // Get available subsidies 
    const { data: subsidies } = await supabase
      .from('subsidies_structured')
      .select('id, title, description, amount, deadline, region, categories, eligibility')
      .eq('archived', false);

    if (!subsidies) {
      return { readyToApply: [], needsAction: [], totalReadyValue: 0, totalBlockedValue: 0 };
    }

    const readyToApply: SubsidyEligibilityScore[] = [];
    const needsAction: SubsidyEligibilityScore[] = [];

    for (const subsidy of subsidies) {
      console.log(`\nProcessing subsidy: "${subsidy.title}"`);
      console.log('Raw amount field:', subsidy.amount);
      
      const eligibilityResult = this.assessSubsidyEligibility(farm, subsidy, documents || []);
      
      console.log(`Eligibility result - Score: ${eligibilityResult.score}, Parsed Amount: ${eligibilityResult.amount}`);
      
      if (eligibilityResult.score >= 0.9) {
        readyToApply.push(eligibilityResult);
        console.log('→ Added to READY TO APPLY');
      } else if (eligibilityResult.score >= 0.3) {
        needsAction.push(eligibilityResult);
        console.log('→ Added to NEEDS ACTION');
      } else {
        console.log('→ Score too low, not included');
      }
    }

    return {
      readyToApply,
      needsAction,
      totalReadyValue: readyToApply.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalBlockedValue: needsAction.reduce((sum, s) => sum + (s.amount || 0), 0)
    };
  }

  /**
   * Assess a single subsidy's eligibility for a farm
   */
  private static assessSubsidyEligibility(
    farm: any, 
    subsidy: any, 
    documents: any[]
  ): SubsidyEligibilityScore {
    let score = 1.0;
    const blockedReasons: string[] = [];
    const requiredActions: string[] = [];

    // Parse amount from subsidy data
    const amount = this.parseSubsidyAmount(subsidy.amount);

    // Check geographic eligibility
    if (subsidy.region && Array.isArray(subsidy.region)) {
      const isEligibleRegion = subsidy.region.includes('all') || 
                              subsidy.region.includes(farm.department) ||
                              subsidy.region.includes(farm.country);
      
      if (!isEligibleRegion) {
        score = 0; // Hard requirement
        blockedReasons.push(`Not available in ${farm.department || farm.country}`);
      }
    }

    // Check farm size requirements (extract from description/eligibility text)
    const farmSizeRequirement = this.extractFarmSizeRequirement(subsidy.eligibility || '');
    if (farmSizeRequirement && farm.total_hectares) {
      if (farm.total_hectares < farmSizeRequirement.min) {
        score *= 0.2;
        blockedReasons.push(`Farm too small (${farm.total_hectares}ha < ${farmSizeRequirement.min}ha required)`);
      } else if (farmSizeRequirement.max && farm.total_hectares > farmSizeRequirement.max) {
        score *= 0.2;
        blockedReasons.push(`Farm too large (${farm.total_hectares}ha > ${farmSizeRequirement.max}ha limit)`);
      }
    }

    // Check activity type matching
    if (subsidy.categories && Array.isArray(subsidy.categories) && farm.land_use_types) {
      const hasActivityMatch = subsidy.categories.some(category => 
        farm.land_use_types.some((landUse: string) => 
          landUse.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(landUse.toLowerCase())
        )
      );
      
      if (!hasActivityMatch) {
        score *= 0.5;
        blockedReasons.push('Farm activities do not match subsidy categories');
      }
    }

    // Check legal status requirements
    if (subsidy.eligibility?.includes('SRL') && farm.legal_status !== 'srl') {
      score *= 0.7;
      blockedReasons.push(`Legal status (${farm.legal_status}) may not be optimal`);
    }

    // Check document completion
    const requiredDocTypes = this.extractRequiredDocuments(subsidy.eligibility || '');
    const missingDocs = requiredDocTypes.filter(docType => 
      !documents.some(doc => 
        doc.category?.toLowerCase().includes(docType.toLowerCase()) &&
        doc.processing_status === 'completed'
      )
    );

    if (missingDocs.length > 0) {
      score *= (1 - (missingDocs.length * 0.2)); // Reduce score by 20% per missing doc type
      requiredActions.push(`Upload missing documents: ${missingDocs.join(', ')}`);
    }

    // Check profile completion
    const profileCompleteness = this.calculateProfileCompleteness(farm);
    if (profileCompleteness < 0.8) {
      score *= 0.8;
      requiredActions.push('Complete farm profile information');
    }

    return {
      subsidyId: subsidy.id,
      farmId: farm.id,
      score: Math.max(0, score),
      blockedReasons,
      requiredActions,
      amount,
      deadline: subsidy.deadline
    };
  }

  /**
   * Enhanced French amount parser for subsidy amounts
   */
  private static parseSubsidyAmount(amountField: any): number | null {
    if (!amountField) return null;
    
    // Console log for debugging
    console.log('Parsing amount field:', amountField, 'Type:', typeof amountField);
    
    if (Array.isArray(amountField) && amountField.length > 0) {
      return Math.max(...amountField.filter(a => typeof a === 'number'));
    }
    
    if (typeof amountField === 'number') {
      return amountField;
    }
    
    if (typeof amountField === 'string') {
      // Enhanced French parsing patterns
      const frenchPatterns = [
        // Range patterns - take maximum value
        /entre\s+([\d\s]+)\s*€?\s+et\s+([\d\s]+)\s*€?/i,           // "entre 2 000 € et 50 000 €"
        /de\s+([\d\s]+)\s*€?\s+à\s+([\d\s]+)\s*€?/i,               // "de 1000€ à 15000€"
        /([\d\s]+)\s*€?\s*[-–]\s*([\d\s]+)\s*€?/i,                 // "2 000 € - 50 000 €"
        
        // Single amount patterns
        /jusqu'?à\s+([\d\s]+)\s*(?:euros?|€)/i,                    // "jusqu'à 25 000 €"
        /maximum\s+de\s+([\d\s]+)\s*(?:euros?|€)/i,                // "maximum de 50000€"
        /plafond\s+de\s+([\d\s]+)\s*(?:euros?|€)/i,                // "plafond de 25000€"
        /aide\s+de\s+([\d\s]+)\s*(?:euros?|€)/i,                   // "aide de 15000€"
        /([\d\s]+)\s*(?:euros?|€)/i                                // "25 000 euros"
      ];

      for (const pattern of frenchPatterns) {
        const match = amountField.match(pattern);
        if (match) {
          console.log('Pattern matched:', pattern.source, 'Match:', match);
          
          // For range patterns, take the maximum (second capture group)
          if (match[2]) {
            const maxAmount = match[2].replace(/\s/g, '');
            const parsed = parseInt(maxAmount, 10);
            console.log('Range parsed - max amount:', parsed);
            return parsed || null;
          } else {
            // Single amount (first capture group)
            const amount = match[1].replace(/\s/g, '');
            const parsed = parseInt(amount, 10);
            console.log('Single amount parsed:', parsed);
            return parsed || null;
          }
        }
      }
      
      // Fallback to original logic for any numeric string
      const match = amountField.match(/[\d\s,]+/);
      if (match) {
        const cleanNumber = match[0].replace(/[\s,]/g, '');
        const parsed = parseInt(cleanNumber, 10);
        console.log('Fallback parsing:', parsed);
        return parsed || null;
      }
    }
    
    console.log('No amount could be parsed');
    return null;
  }

  /**
   * Extract farm size requirements from eligibility text
   */
  private static extractFarmSizeRequirement(eligibilityText: string): { min?: number, max?: number } | null {
    // Look for patterns like "minimum 10 hectares", "> 50 ha", "between 20-100 ha"
    const patterns = [
      /minimum\s+(\d+)\s*(?:hectares?|ha)/i,
      />\s*(\d+)\s*(?:hectares?|ha)/i,
      /(\d+)\s*(?:hectares?|ha)\s*minimum/i,
      /between\s+(\d+)[-–]\s*(\d+)\s*(?:hectares?|ha)/i
    ];

    for (const pattern of patterns) {
      const match = eligibilityText.match(pattern);
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]) };
        } else {
          return { min: parseInt(match[1]) };
        }
      }
    }

    return null;
  }

  /**
   * Extract required document types from eligibility text
   */
  private static extractRequiredDocuments(eligibilityText: string): string[] {
    const docTypes: string[] = [];
    
    // Common agricultural document patterns
    if (/tax|fiscal|revenue/i.test(eligibilityText)) {
      docTypes.push('tax_documents');
    }
    if (/insurance|assurance/i.test(eligibilityText)) {
      docTypes.push('insurance');
    }
    if (/compliance|conformité|certificate/i.test(eligibilityText)) {
      docTypes.push('compliance_certificate');
    }
    if (/identity|identité|registration/i.test(eligibilityText)) {
      docTypes.push('business_registration');
    }

    return docTypes;
  }

  /**
   * Calculate farm profile completeness
   */
  private static calculateProfileCompleteness(farm: any): number {
    const requiredFields = [
      'name', 'address', 'legal_status', 'total_hectares', 
      'land_use_types', 'department', 'livestock_present'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = farm[field];
      return value !== null && value !== undefined && value !== '';
    });

    return completedFields.length / requiredFields.length;
  }
}