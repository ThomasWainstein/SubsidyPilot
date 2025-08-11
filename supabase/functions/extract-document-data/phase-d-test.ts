/**
 * Phase D Table Extraction Test Suite
 * Quick validation script for table extraction functionality
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Smoke test for Phase D table extraction
 * Usage: deno run --allow-net --allow-env phase-d-test.ts
 */
export async function validatePhaseD() {
  console.log('🧪 Phase D Validation Started');
  
  try {
    // 1. Check recent extractions with table data
    const { data: recentExtractions, error } = await supabase
      .from('document_extractions')
      .select(`
        id,
        created_at,
        tables_extracted,
        table_count,
        table_quality,
        table_data,
        confidence_score,
        status
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log(`📊 Found ${recentExtractions?.length || 0} recent extractions`);

    // 2. Validate Phase D extractions
    const phaseDExtractions = recentExtractions?.filter(ext => 
      ext.table_data?.metadata?.extractionMethod === 'phase-d-advanced'
    ) || [];

    console.log(`🔧 Phase D extractions: ${phaseDExtractions.length}`);

    // 3. Detailed validation for Phase D extractions
    for (const extraction of phaseDExtractions) {
      console.log(`\n📋 Extraction ${extraction.id}:`);
      console.log(`  ✓ Tables extracted: ${extraction.tables_extracted}`);
      console.log(`  ✓ Table count: ${extraction.table_count}`);
      console.log(`  ✓ Table quality: ${extraction.table_quality?.toFixed(2) || 'N/A'}`);
      console.log(`  ✓ Confidence: ${extraction.confidence_score?.toFixed(2) || 'N/A'}`);
      console.log(`  ✓ Status: ${extraction.status}`);
      
      if (extraction.table_data?.metadata) {
        const meta = extraction.table_data.metadata;
        console.log(`  ✓ AI Model: ${meta.aiModel || 'N/A'}`);
        console.log(`  ✓ Version: ${meta.version || 'N/A'}`);
        console.log(`  ✓ Extraction time: ${meta.extractionTime || 'N/A'}ms`);
        console.log(`  ✓ Processing time: ${meta.postProcessingTime || 'N/A'}ms`);
        console.log(`  ✓ Total tables: ${meta.totalTables || 'N/A'}`);
        console.log(`  ✓ Successful tables: ${meta.successfulTables || 'N/A'}`);
        console.log(`  ✓ Subsidy fields found: ${meta.subsidyFieldsFound || 'N/A'}`);
      }

      // Validate table structure
      if (extraction.table_data?.raw) {
        const rawTables = extraction.table_data.raw;
        console.log(`  ✓ Raw tables structure: ${Array.isArray(rawTables) ? 'Valid' : 'Invalid'}`);
        
        if (Array.isArray(rawTables) && rawTables.length > 0) {
          const firstTable = rawTables[0];
          console.log(`  ✓ First table headers: ${firstTable.headers?.length || 0}`);
          console.log(`  ✓ First table rows: ${firstTable.rows?.length || 0}`);
          console.log(`  ✓ First table confidence: ${firstTable.confidence?.toFixed(2) || 'N/A'}`);
        }
      }

      if (extraction.table_data?.processed) {
        const processedTables = extraction.table_data.processed;
        console.log(`  ✓ Processed tables: ${Array.isArray(processedTables) ? processedTables.length : 'Invalid'}`);
      }
    }

    // 4. Summary statistics
    const totalWithTables = recentExtractions?.filter(ext => ext.tables_extracted).length || 0;
    const avgTableCount = recentExtractions?.reduce((sum, ext) => sum + (ext.table_count || 0), 0) / (recentExtractions?.length || 1);
    const avgTableQuality = recentExtractions?.filter(ext => ext.table_quality).reduce((sum, ext) => sum + ext.table_quality, 0) / Math.max(1, recentExtractions?.filter(ext => ext.table_quality).length || 1);

    console.log(`\n📈 Summary Statistics:`);
    console.log(`  Documents with tables: ${totalWithTables}/${recentExtractions?.length || 0}`);
    console.log(`  Average table count: ${avgTableCount.toFixed(1)}`);
    console.log(`  Average table quality: ${avgTableQuality.toFixed(2)}`);
    console.log(`  Phase D adoption: ${((phaseDExtractions.length / (recentExtractions?.length || 1)) * 100).toFixed(1)}%`);

    // 5. Health check
    const healthIssues = [];
    
    if (phaseDExtractions.length === 0 && recentExtractions?.length > 0) {
      healthIssues.push('No Phase D extractions found - check ENABLE_PHASE_D flag');
    }
    
    if (phaseDExtractions.some(ext => !ext.table_data?.metadata?.aiModel)) {
      healthIssues.push('Some extractions missing AI model info');
    }
    
    if (phaseDExtractions.some(ext => ext.status === 'failed')) {
      healthIssues.push('Some Phase D extractions failed');
    }

    if (healthIssues.length > 0) {
      console.log(`\n⚠️  Health Issues:`);
      healthIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(`\n✅ Phase D is healthy!`);
    }

    return {
      success: true,
      totalExtractions: recentExtractions?.length || 0,
      phaseDCount: phaseDExtractions.length,
      healthIssues
    };

  } catch (error) {
    console.error('❌ Phase D validation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run validation if this script is executed directly
 */
if (import.meta.main) {
  const result = await validatePhaseD();
  console.log('\n🏁 Validation complete:', result);
  Deno.exit(result.success ? 0 : 1);
}