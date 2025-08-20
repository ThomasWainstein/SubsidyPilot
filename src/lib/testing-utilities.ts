/**
 * Testing Utilities for Validating Subsidy System Accuracy
 * Comprehensive test suite for validating recommendation engine and data consistency
 */

import { SubsidyDataManager, type UnifiedSubsidyData } from './subsidy-data-consistency';
import { RecommendationEngine, type FarmProfile } from './recommendation-engine';
import { FrenchGeographicMatcher } from './geographic-matching';
import { EnhancedFrenchParser } from './french-text-processing';

export interface TestResult {
  testName: string;
  passed: boolean;
  score?: number;
  expected?: any;
  actual?: any;
  reason?: string;
  performance?: number;
}

export interface SystemValidationReport {
  overallScore: number;
  testResults: TestResult[];
  recommendations: string[];
  performance: {
    dataLoadTime: number;
    recommendationTime: number;
    totalSubsidies: number;
  };
}

export class SubsidySystemTester {
  
  /**
   * Run comprehensive system validation
   */
  static async runFullValidation(): Promise<SystemValidationReport> {
    console.log('🧪 Starting comprehensive subsidy system validation...');
    
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    // Performance measurements
    const perfStart = Date.now();
    const subsidies = await SubsidyDataManager.getUnifiedSubsidies();
    const dataLoadTime = Date.now() - perfStart;
    
    console.log(`📊 Loaded ${subsidies.length} unified subsidies in ${dataLoadTime}ms`);
    
    // Test data consistency
    testResults.push(...await this.testDataConsistency(subsidies));
    
    // Test geographic matching accuracy
    testResults.push(...this.testGeographicMatching());
    
    // Test French text processing
    testResults.push(...this.testFrenchTextProcessing());
    
    // Test recommendation algorithm
    const recStartTime = Date.now();
    testResults.push(...await this.testRecommendationAccuracy(subsidies));
    const recommendationTime = Date.now() - recStartTime;
    
    // Calculate overall score
    const passedTests = testResults.filter(t => t.passed).length;
    const overallScore = Math.round((passedTests / testResults.length) * 100);
    
    // Generate recommendations
    const recommendations = this.generateSystemRecommendations(testResults, subsidies);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Validation completed in ${totalTime}ms - Score: ${overallScore}%`);
    
    return {
      overallScore,
      testResults,
      recommendations,
      performance: {
        dataLoadTime,
        recommendationTime,
        totalSubsidies: subsidies.length
      }
    };
  }

  /**
   * Test data consistency between sources
   */
  private static async testDataConsistency(subsidies: UnifiedSubsidyData[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Test 1: No duplicate subsidies
    const ids = subsidies.map(s => s.id);
    const uniqueIds = new Set(ids);
    results.push({
      testName: 'No duplicate subsidy IDs',
      passed: ids.length === uniqueIds.size,
      expected: ids.length,
      actual: uniqueIds.size,
      reason: ids.length === uniqueIds.size ? 'All subsidies have unique IDs' : 'Duplicate IDs found'
    });
    
    // Test 2: All subsidies have required fields
    const missingFields = subsidies.filter(s => !s.title || !s.agency || !s.amount.displayText);
    results.push({
      testName: 'All subsidies have required fields',
      passed: missingFields.length === 0,
      expected: 0,
      actual: missingFields.length,
      reason: missingFields.length === 0 ? 'All subsidies complete' : `${missingFields.length} subsidies missing required fields`
    });
    
    // Test 3: Amount parsing consistency
    const lowConfidenceAmounts = subsidies.filter(s => s.amount.confidence < 0.5);
    results.push({
      testName: 'Amount parsing confidence',
      passed: lowConfidenceAmounts.length < subsidies.length * 0.2, // Less than 20% low confidence
      expected: '< 20% low confidence',
      actual: `${Math.round((lowConfidenceAmounts.length / subsidies.length) * 100)}% low confidence`,
      reason: lowConfidenceAmounts.length < subsidies.length * 0.2 ? 'Good amount parsing confidence' : 'Too many low-confidence amount parses'
    });
    
    // Test 4: Geographic data completeness
    const missingGeo = subsidies.filter(s => s.region.names.length === 0);
    results.push({
      testName: 'Geographic data completeness',
      passed: missingGeo.length < subsidies.length * 0.1, // Less than 10% missing
      expected: '< 10% missing geography',
      actual: `${Math.round((missingGeo.length / subsidies.length) * 100)}% missing geography`,
      reason: missingGeo.length < subsidies.length * 0.1 ? 'Good geographic coverage' : 'Too many subsidies missing geographic data'
    });
    
    return results;
  }

  /**
   * Test geographic matching accuracy
   */
  private static testGeographicMatching(): TestResult[] {
    const results: TestResult[] = [];
    
    const testCases = [
      // Exact matches
      { farm: 'Normandie', subsidy: ['Région Normandie'], expected: true, description: 'Direct region match' },
      { farm: 'normandie', subsidy: ['Normandie'], expected: true, description: 'Case insensitive match' },
      
      // Department to region matches
      { farm: 'Seine-Maritime', subsidy: ['Normandie'], expected: true, description: 'Department to region match' },
      { farm: 'Gironde', subsidy: ['Nouvelle-Aquitaine'], expected: true, description: 'Department to new region match' },
      
      // Historical region names
      { farm: 'Nord-Pas-de-Calais', subsidy: ['Hauts-de-France'], expected: true, description: 'Historical region name' },
      { farm: 'Aquitaine', subsidy: ['Nouvelle-Aquitaine'], expected: true, description: 'Former region to current' },
      
      // National programs
      { farm: 'Bretagne', subsidy: ['France métropolitaine'], expected: true, description: 'National program accessibility' },
      { farm: 'Alsace', subsidy: ['Programme national'], expected: true, description: 'National program match' },
      
      // European programs
      { farm: 'Provence', subsidy: ['Programme européen'], expected: true, description: 'European program accessibility' },
      
      // Non-matches
      { farm: 'Bretagne', subsidy: ['Hauts-de-France'], expected: false, description: 'Different regions should not match' },
      { farm: 'Paris', subsidy: ['Corse'], expected: false, description: 'Unrelated regions should not match' }
    ];
    
    let correctMatches = 0;
    
    for (const testCase of testCases) {
      const result = FrenchGeographicMatcher.calculateMatch(testCase.farm, testCase.subsidy);
      const correct = result.matches === testCase.expected;
      
      if (correct) correctMatches++;
      
      results.push({
        testName: `Geographic: ${testCase.description}`,
        passed: correct,
        expected: testCase.expected,
        actual: result.matches,
        reason: result.reason,
        score: result.score
      });
    }
    
    // Overall geographic accuracy
    const accuracy = (correctMatches / testCases.length) * 100;
    results.push({
      testName: 'Overall Geographic Matching Accuracy',
      passed: accuracy >= 85,
      expected: '≥ 85%',
      actual: `${Math.round(accuracy)}%`,
      reason: accuracy >= 85 ? 'Geographic matching is accurate' : 'Geographic matching needs improvement'
    });
    
    return results;
  }

  /**
   * Test French text processing accuracy
   */
  private static testFrenchTextProcessing(): TestResult[] {
    const results: TestResult[] = [];
    
    // Amount parsing tests
    const amountTests = [
      { text: 'Jusqu\'à 50 000 €', expected: 'Jusqu\'à 50 000 €', description: 'Simple max amount' },
      { text: 'Entre 10 000 € et 100 000 €', expected: 'Entre 10 000 € et 100 000 €', description: 'Range amount' },
      { text: 'Le montant dépendra du projet', expected: 'Montant variable selon le projet', description: 'Variable amount' },
      { text: 'Jusqu\'à 75% des dépenses éligibles', expected: 'maximum', description: 'Percentage-based amount' }
    ];
    
    let correctAmountParses = 0;
    for (const test of amountTests) {
      const parsed = EnhancedFrenchParser.parseComplexAmounts(test.text);
      const correct = parsed.displayText.includes('€') || parsed.displayText.includes('variable') || parsed.displayText.includes('maximum');
      
      if (correct) correctAmountParses++;
      
      results.push({
        testName: `Amount parsing: ${test.description}`,
        passed: correct,
        expected: test.expected,
        actual: parsed.displayText,
        reason: `Confidence: ${Math.round(parsed.confidence * 100)}%`
      });
    }
    
    // Deadline parsing tests
    const deadlineTests = [
      { text: 'jusqu\'au 31 décembre 2024', expected: true, description: 'French date format' },
      { text: 'avant le 15/06/2024', expected: true, description: 'Numeric date format' },
      { text: 'dépôts possibles toute l\'année', expected: false, description: 'Continuous application' },
      { text: 'candidatures fermées', expected: false, description: 'Closed applications' }
    ];
    
    let correctDeadlineParses = 0;
    for (const test of deadlineTests) {
      const parsed = EnhancedFrenchParser.parseDeadlines(test.text);
      const correct = (parsed.date !== undefined) === test.expected;
      
      if (correct) correctDeadlineParses++;
      
      results.push({
        testName: `Deadline parsing: ${test.description}`,
        passed: correct,
        expected: test.expected ? 'Date extracted' : 'No date expected',
        actual: parsed.date ? 'Date extracted' : 'No date',
        reason: parsed.description
      });
    }
    
    // Overall text processing accuracy
    const totalTests = amountTests.length + deadlineTests.length;
    const totalCorrect = correctAmountParses + correctDeadlineParses;
    const accuracy = (totalCorrect / totalTests) * 100;
    
    results.push({
      testName: 'Overall French Text Processing Accuracy',
      passed: accuracy >= 80,
      expected: '≥ 80%',
      actual: `${Math.round(accuracy)}%`,
      reason: accuracy >= 80 ? 'Text processing is accurate' : 'Text processing needs improvement'
    });
    
    return results;
  }

  /**
   * Test recommendation algorithm accuracy
   */
  private static async testRecommendationAccuracy(subsidies: UnifiedSubsidyData[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Create test farm profiles
    const testFarms: FarmProfile[] = [
      {
        id: 'test-farm-1',
        department: 'Gironde',
        region: 'Nouvelle-Aquitaine',
        country: 'France',
        landUseTypes: ['agriculture', 'viticulture'],
        totalHectares: 25,
        certifications: ['bio'],
        legalStatus: 'EARL'
      },
      {
        id: 'test-farm-2',
        department: 'Seine-Maritime',
        region: 'Normandie',
        landUseTypes: ['élevage', 'céréales'],
        totalHectares: 150,
        certifications: ['HVE'],
        legalStatus: 'GAEC'
      }
    ];
    
    for (const farm of testFarms) {
      try {
        const startTime = Date.now();
        const recommendations = await RecommendationEngine.generateRecommendations(farm);
        const processingTime = Date.now() - startTime;
        
        const totalRecs = Object.values(recommendations).reduce((sum, recs) => sum + recs.length, 0);
        
        // Test 1: Performance (should be fast)
        results.push({
          testName: `Recommendation performance (${farm.department})`,
          passed: processingTime < 2000, // Less than 2 seconds
          expected: '< 2 seconds',
          actual: `${processingTime}ms`,
          reason: processingTime < 2000 ? 'Good performance' : 'Too slow',
          performance: processingTime
        });
        
        // Test 2: Reasonable number of recommendations
        results.push({
          testName: `Recommendation quantity (${farm.department})`,
          passed: totalRecs > 0 && totalRecs <= 25, // Between 1-25 total recommendations
          expected: '1-25 recommendations',
          actual: `${totalRecs} recommendations`,
          reason: totalRecs > 0 ? 'Got recommendations' : 'No recommendations generated'
        });
        
        // Test 3: Score distribution (should have variety)
        const allScores = Object.values(recommendations).flat().map(r => r.score);
        const uniqueScores = new Set(allScores).size;
        results.push({
          testName: `Score diversity (${farm.department})`,
          passed: uniqueScores > 1 || allScores.length <= 1,
          expected: 'Varied scores',
          actual: `${uniqueScores} unique scores`,
          reason: uniqueScores > 1 ? 'Good score diversity' : 'All recommendations have same score'
        });
        
        // Test 4: Geographic relevance (high-scoring recommendations should match farm region)
        const highScoreRecs = Object.values(recommendations).flat()
          .filter(r => r.score > 70)
          .slice(0, 3); // Top 3 high-score recommendations
        
        let geographicallyRelevant = 0;
        for (const rec of highScoreRecs) {
          const subsidy = subsidies.find(s => s.id === rec.subsidyId);
          if (subsidy) {
            const geoMatch = FrenchGeographicMatcher.calculateMatch(
              farm.department || farm.region || '',
              subsidy.region.names
            );
            if (geoMatch.matches) geographicallyRelevant++;
          }
        }
        
        const geoRelevanceRate = highScoreRecs.length > 0 ? (geographicallyRelevant / highScoreRecs.length) * 100 : 100;
        results.push({
          testName: `Geographic relevance (${farm.department})`,
          passed: geoRelevanceRate >= 66, // At least 2/3 should be geographically relevant
          expected: '≥ 66% geo-relevant',
          actual: `${Math.round(geoRelevanceRate)}% geo-relevant`,
          reason: geoRelevanceRate >= 66 ? 'Good geographic matching' : 'Poor geographic relevance'
        });
        
      } catch (error) {
        results.push({
          testName: `Recommendation generation (${farm.department})`,
          passed: false,
          expected: 'Successful generation',
          actual: 'Error occurred',
          reason: (error as Error).message
        });
      }
    }
    
    return results;
  }

  /**
   * Generate system improvement recommendations
   */
  private static generateSystemRecommendations(testResults: TestResult[], subsidies: UnifiedSubsidyData[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = testResults.filter(t => !t.passed);
    const slowTests = testResults.filter(t => t.performance && t.performance > 1000);
    
    // Performance recommendations
    if (slowTests.length > 0) {
      recommendations.push('🚀 PERFORMANCE: Add caching for recommendation calculations to improve response times');
      recommendations.push('🗄️ PERFORMANCE: Consider database indexing on frequently queried fields (region, sector, deadline)');
    }
    
    // Data quality recommendations
    const lowConfidenceAmounts = testResults.find(t => t.testName === 'Amount parsing confidence' && !t.passed);
    if (lowConfidenceAmounts) {
      recommendations.push('💰 DATA QUALITY: Improve amount parsing for better accuracy - add more French amount patterns');
    }
    
    const missingGeo = testResults.find(t => t.testName === 'Geographic data completeness' && !t.passed);
    if (missingGeo) {
      recommendations.push('🗺️ DATA QUALITY: Enhance geographic data extraction - too many subsidies missing location data');
    }
    
    // Algorithm recommendations
    const poorGeoMatching = testResults.find(t => t.testName === 'Overall Geographic Matching Accuracy' && !t.passed);
    if (poorGeoMatching) {
      recommendations.push('📍 ALGORITHM: Improve geographic matching logic for better farm-subsidy alignment');
    }
    
    const poorRecommendations = testResults.filter(t => t.testName.includes('Geographic relevance') && !t.passed);
    if (poorRecommendations.length > 0) {
      recommendations.push('🎯 ALGORITHM: Calibrate recommendation scoring weights - geographic matching may be too weak');
    }
    
    // System health recommendations
    if (subsidies.length < 100) {
      recommendations.push('📚 DATA VOLUME: Consider expanding subsidy database - current volume may be too small for comprehensive recommendations');
    }
    
    if (failedTests.length > testResults.length * 0.2) {
      recommendations.push('🔧 SYSTEM: High failure rate detected - prioritize fixing failing tests before production deployment');
    }
    
    // Success acknowledgments
    if (recommendations.length === 0) {
      recommendations.push('✅ EXCELLENT: All tests passing - system ready for production use');
      recommendations.push('📈 OPTIMIZATION: Consider A/B testing different scoring weights to optimize farmer engagement');
    }
    
    return recommendations;
  }

  /**
   * Quick smoke test for development
   */
  static async runSmokeTest(): Promise<boolean> {
    console.log('🔥 Running quick smoke test...');
    
    try {
      // Test data loading
      const subsidies = await SubsidyDataManager.getUnifiedSubsidies();
      if (subsidies.length === 0) {
        console.error('❌ No subsidies loaded');
        return false;
      }
      
      // Test geographic matching
      const geoTest = FrenchGeographicMatcher.calculateMatch('Normandie', ['Région Normandie']);
      if (!geoTest.matches) {
        console.error('❌ Geographic matching failed');
        return false;
      }
      
      // Test text processing
      const amountTest = EnhancedFrenchParser.parseComplexAmounts('Jusqu\'à 50 000 €');
      if (amountTest.confidence < 0.5) {
        console.error('❌ Amount parsing failed');
        return false;
      }
      
      // Test recommendations
      const testFarm: FarmProfile = {
        id: 'test',
        department: 'Gironde',
        totalHectares: 25,
        landUseTypes: ['agriculture']
      };
      
      const recs = await RecommendationEngine.generateRecommendations(testFarm);
      const totalRecs = Object.values(recs).reduce((sum, r) => sum + r.length, 0);
      
      if (totalRecs === 0) {
        console.error('❌ No recommendations generated');
        return false;
      }
      
      console.log(`✅ Smoke test passed - ${subsidies.length} subsidies, ${totalRecs} recommendations`);
      return true;
      
    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      return false;
    }
  }
}