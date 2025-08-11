#!/usr/bin/env node

/**
 * Pipeline Smoke Test Script
 * 
 * Validates the end-to-end pipeline functionality:
 * 1. Starts a pipeline run
 * 2. Verifies harvest stage (must have >200 char pages)
 * 3. Triggers AI processing
 * 4. Validates subsidies_structured data is created
 * 5. Confirms pipeline reaches 100% progress
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvfgvbztagafjykncwto.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.WjV2vKFKL7FACnIGOfXAj8Qi0bPEMDJO_Qpri_QAA_A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

async function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️'
  }[type];
  console.log(`${timestamp} ${prefix} ${message}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPipelineComplete(runId: string, maxWaitTime = 300000): Promise<TestResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const { data: run, error } = await supabase
      .from('pipeline_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      return { success: false, message: `Error fetching run status: ${error.message}` };
    }

    await log(`Pipeline status: ${run.status}, stage: ${run.stage}, progress: ${run.progress}%`);

    if (run.status === 'completed') {
      return { 
        success: true, 
        message: `Pipeline completed successfully in ${Math.round((Date.now() - startTime) / 1000)}s`,
        details: run
      };
    } else if (run.status === 'failed') {
      return { 
        success: false, 
        message: `Pipeline failed: ${run.error?.message || 'Unknown error'}`,
        details: run
      };
    }

    await sleep(5000); // Poll every 5 seconds
  }

  return { success: false, message: 'Pipeline timed out after 5 minutes' };
}

async function validateHarvestStage(runId: string): Promise<TestResult> {
  await log('Validating harvest stage...');
  
  const { data: pages, error } = await supabase
    .from('raw_scraped_pages')
    .select('*')
    .eq('run_id', runId);

  if (error) {
    return { success: false, message: `Error fetching harvested pages: ${error.message}` };
  }

  if (!pages || pages.length === 0) {
    return { success: false, message: 'No pages were harvested' };
  }

  const substantialPages = pages.filter(p => {
    const contentLength = (p.text_markdown?.length || 0) + 
                        (p.raw_text?.length || 0) + 
                        (p.raw_html?.length || 0);
    return contentLength >= 200;
  });

  if (substantialPages.length === 0) {
    return { 
      success: false, 
      message: `No pages with sufficient content (>=200 chars). Got ${pages.length} pages with insufficient content.`
    };
  }

  return { 
    success: true, 
    message: `Harvest stage validated: ${substantialPages.length} substantial pages out of ${pages.length} total`,
    details: { total: pages.length, substantial: substantialPages.length }
  };
}

async function validateAIStage(runId: string): Promise<TestResult> {
  await log('Validating AI processing stage...');
  
  const { data: subsidies, error } = await supabase
    .from('subsidies_structured')
    .select('*')
    .eq('run_id', runId);

  if (error) {
    return { success: false, message: `Error fetching AI-processed subsidies: ${error.message}` };
  }

  if (!subsidies || subsidies.length === 0) {
    return { success: false, message: 'No subsidies were created by AI processing' };
  }

  return { 
    success: true, 
    message: `AI stage validated: ${subsidies.length} subsidies created`,
    details: { count: subsidies.length }
  };
}

async function runSmokeTest(): Promise<boolean> {
  await log('🧪 Starting Pipeline Smoke Test', 'info');
  
  try {
    // Step 1: Start a pipeline run
    await log('Step 1: Starting pipeline run...');
    const { data: startResult, error: startError } = await supabase.functions.invoke('pipeline-runs', {
      body: {
        action: 'start',
        config: {
          countries: ['france'],
          test_mode: true
        }
      }
    });

    if (startError) {
      await log(`Failed to start pipeline: ${startError.message}`, 'error');
      return false;
    }

    const runId = startResult.runId;
    await log(`Pipeline started with ID: ${runId}`, 'success');

    // Step 2: Wait a bit for harvest to begin
    await log('Step 2: Waiting for harvest stage...');
    await sleep(10000); // Wait 10 seconds for harvest to start

    // Step 3: Wait for pipeline completion
    await log('Step 3: Waiting for pipeline completion...');
    const completionResult = await waitForPipelineComplete(runId);
    
    if (!completionResult.success) {
      await log(completionResult.message, 'error');
      return false;
    }

    await log(completionResult.message, 'success');

    // Step 4: Validate harvest stage
    const harvestResult = await validateHarvestStage(runId);
    if (!harvestResult.success) {
      await log(harvestResult.message, 'error');
      return false;
    }
    await log(harvestResult.message, 'success');

    // Step 5: Validate AI stage
    const aiResult = await validateAIStage(runId);
    if (!aiResult.success) {
      await log(aiResult.message, 'error');
      return false;
    }
    await log(aiResult.message, 'success');

    // Step 6: Final validation
    const { data: finalRun } = await supabase
      .from('pipeline_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (finalRun?.progress !== 100) {
      await log(`Pipeline did not reach 100% progress. Final progress: ${finalRun?.progress}%`, 'error');
      return false;
    }

    await log('🎉 All smoke tests passed successfully!', 'success');
    return true;

  } catch (error) {
    await log(`Smoke test failed with error: ${error.message}`, 'error');
    return false;
  }
}

// Run the smoke test if this script is executed directly
if (require.main === module) {
  runSmokeTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runSmokeTest };