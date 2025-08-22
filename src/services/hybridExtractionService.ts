/**
 * Hybrid Extraction Service
 * Integrates pattern extraction with Cloud Run processing
 * Implements the cascading confidence strategy
 */

import { getPatternExtractionService, PatternExtractionResults, ExtractionResult } from './patternExtractionService';
import { getCloudRunDocumentService, CloudRunProcessingRequest, CloudRunProcessingResponse } from './cloudRunDocumentService';

export interface HybridExtractionResult {
  patternResults: PatternExtractionResults;
  cloudRunResults?: any;
  finalData: any;
  processingStats: {
    patternExtractionTime: number;
    cloudRunProcessingTime?: number;
    totalProcessingTime: number;
    costOptimization: {
      fieldsFromPatterns: number;
      fieldsFromAI: number;
      estimatedCostSaved: number; // in percentage
    };
  };
  qualityMetrics: {
    overallConfidence: number;
    fieldsRequiringReview: string[];
    extractionCompleteness: number; // percentage
  };
}

export interface HybridExtractionOptions {
  confidenceThreshold: number; // When to escalate to AI (default: 0.8)
  useAIForNarrativeFields: boolean; // Whether to use AI for complex fields
  priorityFields: string[]; // Fields that must have high confidence
  documentType?: string;
  clientType?: string;
}

class HybridExtractionService {
  private patternService = getPatternExtractionService();
  private cloudRunService = getCloudRunDocumentService();

  /**
   * Process document using hybrid approach
   */
  async processDocument(
    documentText: string,
    request: CloudRunProcessingRequest,
    options: HybridExtractionOptions = this.getDefaultOptions()
  ): Promise<HybridExtractionResult> {
    const startTime = Date.now();

    // PHASE 1: Pattern Extraction (Fast & Free)
    const patternStartTime = Date.now();
    console.log('🔍 Phase 1: Pattern extraction starting...');
    
    const patternResults = this.patternService.extractPatterns(documentText);
    const patternExtractionTime = Date.now() - patternStartTime;
    
    console.log(`✅ Pattern extraction completed in ${patternExtractionTime}ms`);

    // PHASE 2: Evaluate what needs AI processing
    const fieldsNeedingAI = this.identifyFieldsForAI(patternResults, options);
    
    let cloudRunResults: CloudRunProcessingResponse | undefined;
    let cloudRunProcessingTime = 0;

    // PHASE 3: Selective AI Processing
    if (fieldsNeedingAI.length > 0 || options.useAIForNarrativeFields) {
      console.log(`🤖 Phase 2: AI processing needed for ${fieldsNeedingAI.length} fields`);
      
      const aiStartTime = Date.now();
      cloudRunResults = await this.cloudRunService.processDocument({
        ...request,
        extractionOptions: {
          ...request.extractionOptions,
          // Note: Fields needing AI attention logged for future enhancement
          confidenceThreshold: 0.6 // Lower threshold for AI processing
        }
      });
      cloudRunProcessingTime = Date.now() - aiStartTime;
      
      console.log(`✅ AI processing completed in ${cloudRunProcessingTime}ms`);
    } else {
      console.log('⚡ No AI processing needed - all fields extracted with high confidence');
    }

    // PHASE 4: Merge and optimize results
    const finalData = this.mergeResults(patternResults, cloudRunResults?.extractedData);
    
    const totalProcessingTime = Date.now() - startTime;

    // Calculate optimization metrics
    const patternFields = Object.values(patternResults).filter(Boolean).length;
    const aiFields = fieldsNeedingAI.length;
    const totalFields = patternFields + aiFields;
    const estimatedCostSaved = totalFields > 0 ? Math.round((patternFields / totalFields) * 100) : 0;

    // Quality assessment
    const qualityMetrics = this.assessQuality(patternResults, options, cloudRunResults);

    return {
      patternResults,
      cloudRunResults: cloudRunResults?.extractedData,
      finalData,
      processingStats: {
        patternExtractionTime,
        cloudRunProcessingTime,
        totalProcessingTime,
        costOptimization: {
          fieldsFromPatterns: patternFields,
          fieldsFromAI: aiFields,
          estimatedCostSaved
        }
      },
      qualityMetrics
    };
  }

  /**
   * Identify which fields need AI processing
   */
  private identifyFieldsForAI(
    patternResults: PatternExtractionResults,
    options: HybridExtractionOptions
  ): string[] {
    const fieldsNeedingAI: string[] = [];

    // Check each extracted field against confidence threshold
    for (const [fieldName, result] of Object.entries(patternResults)) {
      if (!result) {
        // Field not extracted at all - might need AI
        if (options.priorityFields.includes(fieldName)) {
          fieldsNeedingAI.push(fieldName);
        }
        continue;
      }

      // Check if confidence is below threshold
      if (result.confidence < options.confidenceThreshold) {
        fieldsNeedingAI.push(fieldName);
      }

      // Priority fields that must be highly accurate
      if (options.priorityFields.includes(fieldName) && result.confidence < 0.9) {
        fieldsNeedingAI.push(fieldName);
      }
    }

    // Always use AI for narrative fields if requested
    if (options.useAIForNarrativeFields) {
      const narrativeFields = [
        'businessDescription',
        'projectSummary',
        'technicalCapacity',
        'riskAssessment',
        'companyActivities'
      ];
      fieldsNeedingAI.push(...narrativeFields);
    }

    return [...new Set(fieldsNeedingAI)]; // Remove duplicates
  }

  /**
   * Merge pattern and AI results intelligently
   */
  private mergeResults(
    patternResults: PatternExtractionResults,
    aiResults?: any
  ): any {
    const merged: any = {};

    // Start with pattern results (they're more reliable for structured data)
    for (const [fieldName, result] of Object.entries(patternResults)) {
      if (result && result.confidence >= 0.7) {
        merged[fieldName] = {
          value: result.value,
          source: 'pattern',
          confidence: result.confidence
        };
      }
    }

    // Add AI results for fields not covered by patterns or low confidence
    if (aiResults) {
      for (const [fieldName, value] of Object.entries(aiResults)) {
        // Use AI result if pattern result doesn't exist or has low confidence
        const patternResult = patternResults[fieldName as keyof PatternExtractionResults];
        
        if (!patternResult || patternResult.confidence < 0.7) {
          merged[fieldName] = {
            value,
            source: 'ai',
            confidence: 0.8 // Default AI confidence
          };
        }
      }
    }

    return merged;
  }

  /**
   * Assess overall quality of extraction
   */
  private assessQuality(
    patternResults: PatternExtractionResults,
    options: HybridExtractionOptions,
    cloudRunResults?: CloudRunProcessingResponse
  ): {
    overallConfidence: number;
    fieldsRequiringReview: string[];
    extractionCompleteness: number;
  } {
    const allFields = Object.entries(patternResults);
    const extractedFields = allFields.filter(([_, result]) => result !== undefined);
    
    // Calculate overall confidence
    const confidenceScores = extractedFields
      .map(([_, result]) => result!.confidence)
      .filter(score => !isNaN(score));
    
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    // Identify fields requiring human review
    const fieldsRequiringReview: string[] = [];
    
    for (const [fieldName, result] of extractedFields) {
      // Flag for review if confidence is low or it's a priority field with medium confidence
      if (!result || result.confidence < 0.6 || 
          (options.priorityFields.includes(fieldName) && result.confidence < 0.8)) {
        fieldsRequiringReview.push(fieldName);
      }
    }

    // Calculate completeness
    const totalPossibleFields = Object.keys(patternResults).length;
    const extractionCompleteness = (extractedFields.length / totalPossibleFields) * 100;

    return {
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      fieldsRequiringReview,
      extractionCompleteness: Math.round(extractionCompleteness)
    };
  }

  /**
   * Get default processing options
   */
  private getDefaultOptions(): HybridExtractionOptions {
    return {
      confidenceThreshold: 0.8,
      useAIForNarrativeFields: false,
      priorityFields: ['vatNumber', 'registrationNumber', 'turnover', 'employees'],
      documentType: 'general',
      clientType: 'business'
    };
  }

  /**
   * Get processing recommendations based on document type
   */
  getRecommendedOptions(documentType: string, clientType: string): HybridExtractionOptions {
    const baseOptions = this.getDefaultOptions();

    switch (documentType) {
      case 'business_registration':
        return {
          ...baseOptions,
          priorityFields: ['vatNumber', 'registrationNumber', 'companyName', 'legalForm'],
          confidenceThreshold: 0.9, // High accuracy needed for legal docs
          useAIForNarrativeFields: false
        };

      case 'financial_statements':
        return {
          ...baseOptions,
          priorityFields: ['turnover', 'employees', 'balanceSheetTotal', 'vatNumber'],
          confidenceThreshold: 0.85,
          useAIForNarrativeFields: false
        };

      case 'business_plan':
        return {
          ...baseOptions,
          priorityFields: ['companyName', 'vatNumber'],
          confidenceThreshold: 0.7,
          useAIForNarrativeFields: true // Business plans need narrative understanding
        };

      case 'subsidy_application':
        return {
          ...baseOptions,
          priorityFields: ['vatNumber', 'registrationNumber', 'turnover', 'employees'],
          confidenceThreshold: 0.8,
          useAIForNarrativeFields: true // Need to understand requirements
        };

      default:
        return baseOptions;
    }
  }
}

// Singleton instance
let hybridExtractionServiceInstance: HybridExtractionService | null = null;

export const getHybridExtractionService = (): HybridExtractionService => {
  if (!hybridExtractionServiceInstance) {
    hybridExtractionServiceInstance = new HybridExtractionService();
  }
  return hybridExtractionServiceInstance;
};

export { HybridExtractionService };