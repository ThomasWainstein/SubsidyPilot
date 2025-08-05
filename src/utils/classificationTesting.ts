/**
 * Testing utilities for document classification system
 */
import { classifyDocumentText } from '@/services/documentClassification';
import { supabase } from '@/integrations/supabase/client';

interface TestDocument {
  fileName: string;
  content: string;
  expectedCategory: string;
  description: string;
}

// Test documents for validation
export const testDocuments: TestDocument[] = [
  {
    fileName: 'farm_equipment_invoice.pdf',
    content: 'INVOICE #12345\nDate: 2024-01-15\nBill To: Green Valley Farm\nItem: Tractor Model X200\nAmount: €45,000.00\nTax: €9,000.00\nTotal: €54,000.00\nPayment Terms: Net 30 days',
    expectedCategory: 'financial',
    description: 'Equipment purchase invoice'
  },
  {
    fileName: 'land_lease_agreement.pdf', 
    content: 'LAND LEASE AGREEMENT\nThis agreement is entered into between the parties on January 1, 2024.\nWHEREAS the Lessor owns certain agricultural land...\nThe parties agree to the following terms and conditions:\n1. Term of lease shall be 5 years\n2. Rent shall be paid monthly',
    expectedCategory: 'legal',
    description: 'Land lease contract'
  },
  {
    fileName: 'organic_certification.pdf',
    content: 'ORGANIC CERTIFICATION\nCertificate No: ORG-2024-001\nThis certifies that Green Valley Farm meets all requirements for organic farming practices.\nStandard: EU Organic Regulation\nIssued by: Organic Standards Authority\nValid until: December 31, 2024',
    expectedCategory: 'certification',
    description: 'Organic farming certificate'
  },
  {
    fileName: 'irrigation_manual.pdf',
    content: 'IRRIGATION SYSTEM INSTALLATION MANUAL\nStep 1: Site preparation\nStep 2: Pipe installation\nStep 3: Control system setup\nTechnical specifications:\n- Water pressure: 2.5 bar\n- Flow rate: 100 L/min\nMaintenance procedures...',
    expectedCategory: 'technical',
    description: 'Equipment installation guide'
  },
  {
    fileName: 'environmental_impact_report.pdf',
    content: 'ENVIRONMENTAL IMPACT ASSESSMENT\nCarbon footprint analysis for sustainable farming practices.\nGreenhouse gas emissions: 15% reduction achieved\nRenewable energy usage: 40% of total consumption\nWater conservation measures implemented\nBiodiversity enhancement initiatives',
    expectedCategory: 'environmental',
    description: 'Sustainability report'
  },
  {
    fileName: 'meeting_notes.txt',
    content: 'Farm Team Meeting Notes\nDate: March 15, 2024\nAttendees: Farm manager, field workers\nTopics discussed:\n- Planting schedule for spring\n- Equipment maintenance\n- Weather forecast considerations',
    expectedCategory: 'other',
    description: 'General meeting notes'
  }
];

export interface ClassificationTestResult {
  fileName: string;
  expected: string;
  predicted: string;
  confidence: number;
  correct: boolean;
  alternatives: Array<{ category: string; confidence: number }>;
}

export const runClassificationTests = async (): Promise<{
  results: ClassificationTestResult[];
  accuracy: number;
  totalTests: number;
  passed: number;
  failed: number;
}> => {
  console.log('🧪 Starting document classification tests...');
  
  const results: ClassificationTestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testDoc of testDocuments) {
    try {
      console.log(`🔍 Testing: ${testDoc.fileName}`);
      
      const classification = await classifyDocumentText(testDoc.content, testDoc.fileName);
      const correct = classification.category === testDoc.expectedCategory;
      
      if (correct) {
        passed++;
        console.log(`✅ PASS: ${testDoc.fileName} -> ${classification.category} (${Math.round(classification.confidence * 100)}%)`);
      } else {
        failed++;
        console.log(`❌ FAIL: ${testDoc.fileName} -> Expected: ${testDoc.expectedCategory}, Got: ${classification.category} (${Math.round(classification.confidence * 100)}%)`);
      }

      results.push({
        fileName: testDoc.fileName,
        expected: testDoc.expectedCategory,
        predicted: classification.category,
        confidence: classification.confidence,
        correct,
        alternatives: classification.alternatives
      });

    } catch (error) {
      failed++;
      console.error(`💥 ERROR testing ${testDoc.fileName}:`, error);
      
      results.push({
        fileName: testDoc.fileName,
        expected: testDoc.expectedCategory,
        predicted: 'ERROR',
        confidence: 0,
        correct: false,
        alternatives: []
      });
    }
  }

  const accuracy = testDocuments.length > 0 ? (passed / testDocuments.length) * 100 : 0;
  
  console.log('\n📊 Classification Test Results:');
  console.log(`Total Tests: ${testDocuments.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Accuracy: ${accuracy.toFixed(1)}%`);

  return {
    results,
    accuracy,
    totalTests: testDocuments.length,
    passed,
    failed
  };
};

export const testClassificationAccuracy = async (farmId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_classification_logs')
      .select(`
        *,
        farm_documents!inner(farm_id, file_name, category)
      `)
      .eq('farm_documents.farm_id', farmId);

    if (error) throw error;

    const total = data.length;
    const correct = data.filter(log => log.agrees).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    // Category-specific accuracy
    const categoryStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    
    data.forEach(log => {
      const category = log.user_selected_category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, correct: 0, accuracy: 0 };
      }
      categoryStats[category].total++;
      if (log.agrees) {
        categoryStats[category].correct++;
      }
    });

    // Calculate accuracy per category
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    return {
      overall: {
        total,
        correct,
        accuracy: Math.round(accuracy * 10) / 10
      },
      byCategory: categoryStats,
      recentClassifications: data.slice(-10).map(log => ({
        fileName: log.farm_documents?.file_name || 'Unknown',
        predicted: log.predicted_category,
        userSelected: log.user_selected_category,
        confidence: Math.round(log.prediction_confidence * 100),
        agrees: log.agrees,
        timestamp: log.created_at
      }))
    };

  } catch (error) {
    console.error('Error analyzing classification accuracy:', error);
    return null;
  }
};

// Development utility to quickly test classification
export const quickClassifyText = async (text: string, fileName: string = 'test.txt') => {
  console.log('🔍 Quick classification test:');
  console.log('Text:', text.substring(0, 100) + '...');
  console.log('Filename:', fileName);
  
  try {
    const result = await classifyDocumentText(text, fileName);
    console.log('📊 Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Classification failed:', error);
    return null;
  }
};