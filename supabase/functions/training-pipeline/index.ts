import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, ...params } = await req.json();
    
    console.log(`🚀 Training pipeline action: ${action}`);
    
    switch (action) {
      case 'extract_training_data':
        return await extractTrainingData(supabase, params);
      case 'preprocess_data':
        return await preprocessData(supabase, params);
      case 'trigger_training':
        return await triggerTraining(supabase, params);
      case 'get_training_status':
        return await getTrainingStatus(supabase, params);
      case 'deploy_model':
        return await deployModel(supabase, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Training pipeline error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function extractTrainingData(supabase: any, params: any) {
  console.log('📊 Extracting training data from review corrections...');
  
  const { farm_id, since_date, max_records = 1000 } = params;
  
  // Query for approved/reviewed corrections with associated document data
  let query = supabase
    .from('document_extraction_reviews')
    .select(`
      *,
      document_extractions!inner(
        document_id,
        extracted_data,
        confidence_score,
        extraction_type,
        farm_documents!inner(
          id,
          file_name,
          file_url,
          category,
          mime_type,
          farms!inner(id, user_id)
        )
      )
    `)
    .in('review_status', ['reviewed', 'approved'])
    .order('created_at', { ascending: false })
    .limit(max_records);

  if (farm_id) {
    query = query.eq('document_extractions.farm_documents.farm_id', farm_id);
  }
  
  if (since_date) {
    query = query.gte('created_at', since_date);
  }

  const { data: reviews, error } = await query;
  
  if (error) {
    throw new Error(`Failed to extract training data: ${error.message}`);
  }

  // Process and structure the training data
  const trainingDataset = [];
  const qualityIssues = [];
  
  for (const review of reviews || []) {
    try {
      const document = review.document_extractions?.farm_documents;
      const originalData = review.original_data || {};
      const correctedData = review.corrected_data || {};
      
      // Quality checks
      const hasValidCorrections = Object.keys(correctedData).length > 0;
      const hasDocumentContext = document?.file_name && document?.category;
      
      if (!hasValidCorrections || !hasDocumentContext) {
        qualityIssues.push({
          review_id: review.id,
          issue: !hasValidCorrections ? 'No corrections found' : 'Missing document context'
        });
        continue;
      }
      
      // Extract field-level changes for training
      const fieldChanges = [];
      for (const [field, correctedValue] of Object.entries(correctedData)) {
        const originalValue = originalData[field];
        
        if (originalValue !== correctedValue) {
          fieldChanges.push({
            field,
            original_value: originalValue,
            corrected_value: correctedValue,
            confidence_delta: review.document_extractions?.confidence_score || 0
          });
        }
      }
      
      trainingDataset.push({
        document_id: document.id,
        file_name: document.file_name,
        category: document.category,
        mime_type: document.mime_type,
        review_id: review.id,
        reviewer_id: review.reviewer_id,
        review_date: review.created_at,
        field_changes: fieldChanges,
        original_extraction: originalData,
        corrected_extraction: correctedData,
        reviewer_notes: review.reviewer_notes,
        extraction_confidence: review.document_extractions?.confidence_score || 0
      });
      
    } catch (error) {
      console.error('Error processing review:', review.id, error);
      qualityIssues.push({
        review_id: review.id,
        issue: `Processing error: ${error.message}`
      });
    }
  }
  
  console.log(`✅ Extracted ${trainingDataset.length} training samples with ${qualityIssues.length} quality issues`);
  
  return new Response(
    JSON.stringify({
      success: true,
      dataset: trainingDataset,
      quality_issues: qualityIssues,
      metadata: {
        total_samples: trainingDataset.length,
        quality_issues_count: qualityIssues.length,
        extraction_date: new Date().toISOString(),
        query_params: params
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function preprocessData(supabase: any, params: any) {
  console.log('🔄 Preprocessing training data for model format...');
  
  const { dataset, target_format = 'bio_tagging' } = params;
  
  if (!dataset || !Array.isArray(dataset)) {
    throw new Error('Dataset is required and must be an array');
  }
  
  const preprocessedData = [];
  const entityTypes = new Set();
  
  for (const sample of dataset) {
    try {
      // Generate BIO tagging format for NER training
      const tokens = [];
      const labels = [];
      
      // Extract corrected entities
      const entities = sample.corrected_extraction || {};
      
      // Create entity mappings for common fields
      const entityMapping: Record<string, string> = {
        farm_name: 'ORG',
        owner_name: 'PERSON',
        address: 'LOC',
        phone: 'PHONE',
        email: 'EMAIL',
        registration_number: 'ID',
        tax_id: 'ID',
        total_area: 'AREA',
        date: 'DATE',
        amount: 'MONEY'
      };
      
      // Simple tokenization and labeling
      for (const [field, value] of Object.entries(entities)) {
        if (value && typeof value === 'string') {
          const fieldTokens = value.split(/\s+/);
          const entityType = entityMapping[field] || 'MISC';
          entityTypes.add(entityType);
          
          fieldTokens.forEach((token, index) => {
            tokens.push(token);
            // BIO tagging: B- for beginning, I- for inside
            labels.push(index === 0 ? `B-${entityType}` : `I-${entityType}`);
          });
        }
      }
      
      // Add some O (Outside) labels for context
      const contextTokens = ['Document', 'contains', 'the', 'following', 'information', ':'];
      contextTokens.forEach(token => {
        tokens.push(token);
        labels.push('O');
      });
      
      preprocessedData.push({
        id: sample.document_id,
        file_name: sample.file_name,
        category: sample.category,
        tokens,
        labels,
        confidence_score: sample.extraction_confidence,
        review_metadata: {
          review_id: sample.review_id,
          reviewer_notes: sample.reviewer_notes,
          field_changes_count: sample.field_changes?.length || 0
        }
      });
      
    } catch (error) {
      console.error('Error preprocessing sample:', sample.document_id, error);
    }
  }
  
  // Generate training statistics
  const labelStats = {};
  preprocessedData.forEach(sample => {
    sample.labels.forEach((label: string) => {
      labelStats[label] = (labelStats[label] || 0) + 1;
    });
  });
  
  console.log(`✅ Preprocessed ${preprocessedData.length} samples with ${entityTypes.size} entity types`);
  
  return new Response(
    JSON.stringify({
      success: true,
      preprocessed_data: preprocessedData,
      metadata: {
        total_samples: preprocessedData.length,
        entity_types: Array.from(entityTypes),
        label_distribution: labelStats,
        target_format,
        preprocessing_date: new Date().toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function triggerTraining(supabase: any, params: any) {
  console.log('🎯 Triggering model training...');
  
  const { 
    training_data, 
    model_type = 'layoutlm-v3', 
    training_config = {},
    farm_id 
  } = params;
  
  if (!training_data || !Array.isArray(training_data)) {
    throw new Error('Training data is required');
  }
  
  // Create training job record
  const trainingJob = {
    id: crypto.randomUUID(),
    farm_id: farm_id || null,
    model_type,
    status: 'queued',
    config: {
      learning_rate: training_config.learning_rate || 2e-5,
      batch_size: training_config.batch_size || 8,
      epochs: training_config.epochs || 3,
      validation_split: training_config.validation_split || 0.2,
      ...training_config
    },
    dataset_size: training_data.length,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    error_message: null,
    metrics: null
  };
  
  // Store training job in database
  const { error: insertError } = await supabase
    .from('model_training_jobs')
    .insert(trainingJob);
  
  if (insertError) {
    console.error('Failed to create training job:', insertError);
    // Continue anyway, just log the error
  }
  
  // WARNING: This is a simulation for MVP/development purposes only!
  // In production, this should trigger actual model training infrastructure
  const isSimulation = true; // TODO: Replace with environment check or feature flag
  
  if (isSimulation) {
    console.log('⚠️  WARNING: Running training SIMULATION - not actual model training!');
  }
  
  console.log('🔄 Training simulation started...');
  
  // Background task to simulate training
  setTimeout(async () => {
    try {
      console.log('📚 Simulating model training...');
      
      // Update job status to running
      await supabase
        .from('model_training_jobs')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', trainingJob.id);
      
      // Simulate training time
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Simulate training metrics
      const mockMetrics = {
        final_loss: 0.15 + Math.random() * 0.1,
        validation_f1: 0.85 + Math.random() * 0.1,
        validation_precision: 0.82 + Math.random() * 0.1,
        validation_recall: 0.88 + Math.random() * 0.1,
        training_epochs: training_config.epochs || 3,
        best_epoch: Math.floor(Math.random() * (training_config.epochs || 3)) + 1
      };
      
      // Update job as completed
      await supabase
        .from('model_training_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metrics: mockMetrics
        })
        .eq('id', trainingJob.id);
      
      console.log('✅ Training simulation completed with metrics:', mockMetrics);
      
    } catch (error) {
      console.error('❌ Training simulation failed:', error);
      
      await supabase
        .from('model_training_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', trainingJob.id);
    }
  }, 1000);
  
  return new Response(
    JSON.stringify({
      success: true,
      training_job_id: trainingJob.id,
      status: 'queued',
      message: 'Training job has been queued and will start shortly',
      estimated_duration: '5-10 minutes',
      config: trainingJob.config
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getTrainingStatus(supabase: any, params: any) {
  const { training_job_id, farm_id } = params;
  
  let query = supabase
    .from('model_training_jobs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (training_job_id) {
    query = query.eq('id', training_job_id);
  } else if (farm_id) {
    query = query.eq('farm_id', farm_id);
  }
  
  const { data: jobs, error } = await query.limit(10);
  
  if (error) {
    throw new Error(`Failed to get training status: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      training_jobs: jobs || [],
      total_jobs: jobs?.length || 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deployModel(supabase: any, params: any) {
  console.log('🚀 Deploying trained model...');
  
  const { training_job_id, deployment_environment = 'production' } = params;
  
  // Get training job details
  const { data: job, error: jobError } = await supabase
    .from('model_training_jobs')
    .select('*')
    .eq('id', training_job_id)
    .single();
  
  if (jobError || !job) {
    throw new Error(`Training job not found: ${training_job_id}`);
  }
  
  if (job.status !== 'completed') {
    throw new Error(`Cannot deploy model from job with status: ${job.status}`);
  }
  
  // Create deployment record
  const deployment = {
    id: crypto.randomUUID(),
    training_job_id,
    model_type: job.model_type,
    environment: deployment_environment,
    version: `v${Date.now()}`,
    status: 'deploying',
    deployed_at: new Date().toISOString(),
    metrics: job.metrics,
    config: {
      confidence_threshold: 0.75,
      fallback_to_cloud: true,
      ...job.config
    }
  };
  
  // Store deployment record
  const { error: deployError } = await supabase
    .from('model_deployments')
    .insert(deployment);
  
  if (deployError) {
    console.error('Failed to create deployment record:', deployError);
  }
  
  // WARNING: This is a simulation for MVP/development purposes only!
  console.log('⚠️  WARNING: Running deployment SIMULATION - not actual model deployment!');
  
  // Simulate deployment process
  setTimeout(async () => {
    await supabase
      .from('model_deployments')
      .update({ status: 'active' })
      .eq('id', deployment.id);
    
    console.log('✅ Model deployment completed');
  }, 2000);
  
  return new Response(
    JSON.stringify({
      success: true,
      deployment_id: deployment.id,
      version: deployment.version,
      status: 'deploying',
      message: 'Model deployment started',
      metrics: job.metrics
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}