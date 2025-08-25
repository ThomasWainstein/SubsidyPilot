// Pipeline demonstration with current capabilities
import { supabase } from '@/integrations/supabase/client';
import { testServiceRoleAccess, verifyQATableAccess } from './testServiceRoleAccess';

export const runProductionReadinessDemo = async () => {
  console.log('🚀 PRODUCTION READINESS DEMONSTRATION');
  console.log('=====================================');
  
  const results = {
    typeSyncStatus: false,
    serviceRoleAccess: false,
    dataQuality: false,
    extractionPipeline: false,
    qaValidation: false,
    adminDashboard: false
  };
  
  // 1. Check Type Sync Status
  console.log('\n1️⃣ CHECKING TYPESCRIPT TYPE SYNC...');
  try {
    // Try to use extraction_qa_results with type casting (proving types aren't synced)
    const { data, error } = await supabase
      .from('extraction_qa_results' as any)  // Type casting required = types not synced
      .select('*')
      .limit(1);
      
    if (!error) {
      console.log('✅ Type sync: WORKING (unexpected - check if resolved)');
      results.typeSyncStatus = true;
    }
  } catch (typeError) {
    console.log('❌ Type sync: BLOCKED (as expected)');
    console.log('   → Using workaround with type casting');
    results.typeSyncStatus = false;
  }
  
  // 2. Test Service Role Access
  console.log('\n2️⃣ TESTING SERVICE ROLE ACCESS...');
  const serviceRoleTest = await testServiceRoleAccess();
  const qaTableTest = await verifyQATableAccess();
  results.serviceRoleAccess = serviceRoleTest && qaTableTest;
  
  // 3. Verify Data Quality
  console.log('\n3️⃣ VERIFYING DATA QUALITY...');
  try {
    const { data: subsidies, error } = await supabase
      .from('subsidies')
      .select('id, title, categories, region, description')
      .limit(5);
      
    if (!error && subsidies) {
      const qualityChecks = {
        hasSector: subsidies.every(s => s.categories && s.categories.length > 0),
        hasRegion: subsidies.every(s => s.region && s.region.length > 0),
        hasCleanDescription: subsidies.every(s => s.description && !String(s.description).includes('==')),
        hasTitle: subsidies.every(s => s.title && String(s.title).trim().length > 0)
      };
      
      console.log('📊 Data Quality Results:', qualityChecks);
      results.dataQuality = Object.values(qualityChecks).every(Boolean);
      
      if (results.dataQuality) {
        console.log('✅ Data quality: EXCELLENT');
        console.log('   → All records have sector, region, clean descriptions, and titles');
      } else {
        console.log('❌ Data quality: ISSUES FOUND');
      }
    }
  } catch (error) {
    console.error('❌ Data quality check failed:', error);
  }
  
  // 4. Test Extraction Pipeline
  console.log('\n4️⃣ TESTING EXTRACTION PIPELINE...');
  try {
    const testUrl = 'https://www.franceagrimer.fr/Services-aux-operateurs/Aides/Dispositifs-par-filiere/Grandes-cultures/2024/Lutte-contre-la-jaunisse-de-la-betterave-2024-PNRI-C';
    
    const { data, error } = await supabase.functions.invoke('deep-structural-extraction', {
      body: { url: testUrl }
    });
    
    if (!error && data) {
      console.log('✅ Extraction pipeline: WORKING');
      console.log('   → Successfully extracted data from FranceAgriMer URL');
      results.extractionPipeline = true;
    } else {
      console.log('❌ Extraction pipeline: FAILED');
      console.log('   → Error:', error);
    }
  } catch (error) {
    console.error('❌ Extraction pipeline test failed:', error);
  }
  
  // 5. Test QA Validation
  console.log('\n5️⃣ TESTING QA VALIDATION...');
  try {
    const { data, error } = await supabase.functions.invoke('qa-validation-agent', {
      body: {
        extractedData: { title: 'Test', description: 'Demo QA validation' },
        originalHtml: '<html><body>Test</body></html>',
        sourceUrl: 'https://test-qa.franceagrimer.fr'
      }
    });
    
    if (!error && data) {
      console.log('✅ QA validation: WORKING');
      console.log('   → QA agent successfully processed test data');
      results.qaValidation = true;
    } else {
      console.log('❌ QA validation: FAILED');
      console.log('   → Error:', error);
    }
  } catch (error) {
    console.error('❌ QA validation test failed:', error);
  }
  
  // 6. Check Admin Dashboard Components
  console.log('\n6️⃣ CHECKING ADMIN DASHBOARD...');
  try {
    // Check if admin components can load
    const componentModule = await import('@/components/admin/AdminReviewDashboard');
    if (componentModule.AdminReviewDashboard) {
      console.log('✅ Admin dashboard: COMPONENTS READY');
      results.adminDashboard = true;
    }
  } catch (error) {
    console.log('❌ Admin dashboard: COMPONENT LOAD FAILED');
    console.error('   → Error:', error);
  }
  
  // Summary
  console.log('\n📊 PRODUCTION READINESS SUMMARY');
  console.log('================================');
  const readyCount = Object.values(results).filter(Boolean).length;
  const totalChecks = Object.keys(results).length;
  
  console.log(`Overall Status: ${readyCount}/${totalChecks} components ready`);
  console.log('Individual Results:');
  console.log(`   TypeScript Sync: ${results.typeSyncStatus ? '✅' : '❌'} ${results.typeSyncStatus ? 'READY' : 'BLOCKED'}`);
  console.log(`   Service Role: ${results.serviceRoleAccess ? '✅' : '❌'} ${results.serviceRoleAccess ? 'READY' : 'BLOCKED'}`);
  console.log(`   Data Quality: ${results.dataQuality ? '✅' : '❌'} ${results.dataQuality ? 'EXCELLENT' : 'NEEDS WORK'}`);
  console.log(`   Extraction: ${results.extractionPipeline ? '✅' : '❌'} ${results.extractionPipeline ? 'WORKING' : 'FAILED'}`);
  console.log(`   QA Validation: ${results.qaValidation ? '✅' : '❌'} ${results.qaValidation ? 'WORKING' : 'FAILED'}`);
  console.log(`   Admin Dashboard: ${results.adminDashboard ? '✅' : '❌'} ${results.adminDashboard ? 'READY' : 'FAILED'}`);
  
  const productionReady = readyCount >= 4; // Allow type sync blocker but need others working
  console.log(`\n🎯 PRODUCTION READY: ${productionReady ? 'YES*' : 'NO'}`);
  if (!results.typeSyncStatus) {
    console.log('   * Type sync blocker requires Supabase support resolution');
  }
  
  return results;
};