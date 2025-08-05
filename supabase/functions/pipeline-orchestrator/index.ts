import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PipelineRequest {
  action: 'start_scraping' | 'start_ai_processing' | 'generate_forms' | 'health_check' | 'get_status'
  config?: {
    countries?: string[]
    batch_size?: number
    priority?: 'high' | 'medium' | 'low'
    force_extraction?: boolean
  }
  execution_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, config = {}, execution_id } = await req.json() as PipelineRequest

    console.log(`Pipeline orchestrator action: ${action}`, { config, execution_id })

    // Log the audit entry
    await supabase
      .from('integration_audit_log')
      .insert({
        operation_type: action,
        component_from: 'pipeline_orchestrator',
        component_to: 'system',
        operation_data: { config, execution_id },
        success: true
      })

    switch (action) {
      case 'start_scraping':
        return await handleScrapingExecution(supabase, config)
        
      case 'start_ai_processing':
        return await handleAIProcessing(supabase, config)
        
      case 'generate_forms':
        return await handleFormGeneration(supabase, config)
        
      case 'health_check':
        return await handleHealthCheck(supabase)
        
      case 'get_status':
        return await handleStatusCheck(supabase, execution_id)
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Pipeline orchestrator error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleScrapingExecution(supabase: any, config: any) {
  const countries = config.countries || ['romania', 'france']
  const batch_size = config.batch_size || 100
  
  // Create pipeline execution record
  const { data: execution, error } = await supabase
    .from('pipeline_executions')
    .insert({
      execution_type: 'scraping',
      status: 'running',
      config: { countries, batch_size, priority: config.priority },
      batch_size,
      country: countries.join(',')
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create execution record: ${error.message}`)
  }

  // Log system health metric
  await supabase
    .from('system_health_metrics')
    .insert({
      metric_type: 'pipeline',
      metric_name: 'scraping_started',
      value: 1,
      tags: { countries, batch_size, execution_id: execution.id }
    })

  // In production, this would trigger GitHub Actions workflow
  // For now, we'll simulate the process
  console.log(`Starting scraping for countries: ${countries.join(', ')}`)
  
  // Update execution status (simulate processing)
  setTimeout(async () => {
    await supabase
      .from('pipeline_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_count: batch_size,
        success_count: Math.floor(batch_size * 0.95), // 95% success rate
        failure_count: Math.floor(batch_size * 0.05),
        metrics: {
          processing_time_minutes: 45,
          pages_processed: batch_size,
          documents_extracted: Math.floor(batch_size * 0.7)
        }
      })
      .eq('id', execution.id)
  }, 5000) // Simulate 5 second processing

  return new Response(
    JSON.stringify({
      success: true,
      execution_id: execution.id,
      status: 'started',
      estimated_completion: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      countries,
      batch_size
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAIProcessing(supabase: any, config: any) {
  // Get pending subsidies for AI processing
  const { data: subsidies, error: subsidiesError } = await supabase
    .from('subsidies')
    .select('id, title, description, url')
    .limit(config.batch_size || 50)

  if (subsidiesError) {
    throw new Error(`Failed to fetch subsidies: ${subsidiesError.message}`)
  }

  // Create AI processing execution
  const { data: execution, error } = await supabase
    .from('pipeline_executions')
    .insert({
      execution_type: 'ai_processing',
      status: 'running',
      config: { 
        batch_size: subsidies.length, 
        force_extraction: config.force_extraction 
      },
      batch_size: subsidies.length
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create AI processing execution: ${error.message}`)
  }

  // Process subsidies through AI pipeline (simulate)
  let processed = 0
  let success = 0

  for (const subsidy of subsidies) {
    try {
      // Call AI processing for each subsidy
      const aiResult = await processSubsidyWithAI(subsidy)
      
      // Record quality metrics
      await supabase
        .from('quality_metrics')
        .insert({
          execution_id: execution.id,
          component: 'ai_processing',
          quality_type: 'extraction_confidence',
          score: aiResult.confidence,
          confidence: aiResult.confidence,
          details: { subsidy_id: subsidy.id, processing_time: aiResult.processing_time }
        })

      success++
    } catch (error) {
      console.error(`Failed to process subsidy ${subsidy.id}:`, error)
    }
    processed++
  }

  // Update execution with results
  await supabase
    .from('pipeline_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processed_count: processed,
      success_count: success,
      failure_count: processed - success,
      metrics: {
        average_confidence: success > 0 ? 0.92 : 0,
        processing_time_minutes: Math.ceil(processed * 0.5)
      }
    })
    .eq('id', execution.id)

  return new Response(
    JSON.stringify({
      success: true,
      execution_id: execution.id,
      processed_count: processed,
      success_count: success,
      failure_count: processed - success
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleFormGeneration(supabase: any, config: any) {
  // Get subsidies that need form generation
  const { data: subsidies, error } = await supabase
    .from('subsidies')
    .select(`
      id, title, url,
      subsidy_form_schemas (id, schema)
    `)
    .is('subsidy_form_schemas.id', null)
    .limit(config.batch_size || 20)

  if (error) {
    throw new Error(`Failed to fetch subsidies for form generation: ${error.message}`)
  }

  // Create form generation execution
  const { data: execution, error: execError } = await supabase
    .from('pipeline_executions')
    .insert({
      execution_type: 'form_generation',
      status: 'running',
      config: { batch_size: subsidies.length },
      batch_size: subsidies.length
    })
    .select()
    .single()

  if (execError) {
    throw new Error(`Failed to create form generation execution: ${execError.message}`)
  }

  let generated = 0
  for (const subsidy of subsidies) {
    try {
      // Generate form schema (simulate)
      const formSchema = await generateFormSchema(subsidy)
      
      // Save form schema
      const { data: schema, error: schemaError } = await supabase
        .from('subsidy_form_schemas')
        .insert({
          subsidy_id: subsidy.id,
          schema: formSchema,
          version: '1.0'
        })
        .select()
        .single()

      if (!schemaError) {
        // Create form instance
        await supabase
          .from('application_form_instances')
          .insert({
            subsidy_id: subsidy.id,
            form_schema_id: schema.id,
            generated_config: {
              auto_population: true,
              validation_enabled: true,
              multi_step: formSchema.sections?.length > 3
            },
            generation_metrics: {
              confidence: 0.9,
              field_count: formSchema.sections?.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0) || 0
            }
          })
        
        generated++
      }
    } catch (error) {
      console.error(`Failed to generate form for subsidy ${subsidy.id}:`, error)
    }
  }

  // Update execution
  await supabase
    .from('pipeline_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processed_count: subsidies.length,
      success_count: generated,
      failure_count: subsidies.length - generated
    })
    .eq('id', execution.id)

  return new Response(
    JSON.stringify({
      success: true,
      execution_id: execution.id,
      forms_generated: generated,
      total_subsidies: subsidies.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleHealthCheck(supabase: any) {
  const checks = []
  
  // Database connectivity
  try {
    const { error } = await supabase.from('pipeline_executions').select('count').single()
    checks.push({ component: 'database', status: error ? 'error' : 'healthy', message: error?.message })
  } catch (error) {
    checks.push({ component: 'database', status: 'error', message: error.message })
  }

  // Recent execution status
  try {
    const { data: recentExecutions } = await supabase
      .from('pipeline_executions')
      .select('status, execution_type')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false })
      .limit(10)

    const failedCount = recentExecutions?.filter(e => e.status === 'failed').length || 0
    const totalCount = recentExecutions?.length || 0
    
    checks.push({
      component: 'pipeline_executions',
      status: failedCount / Math.max(totalCount, 1) > 0.2 ? 'warning' : 'healthy',
      message: `${failedCount}/${totalCount} failed in last 24h`
    })
  } catch (error) {
    checks.push({ component: 'pipeline_executions', status: 'error', message: error.message })
  }

  // System metrics
  await supabase
    .from('system_health_metrics')
    .insert({
      metric_type: 'system',
      metric_name: 'health_check_performed',
      value: 1,
      tags: { timestamp: new Date().toISOString() }
    })

  const overallStatus = checks.some(c => c.status === 'error') ? 'error' : 
                       checks.some(c => c.status === 'warning') ? 'warning' : 'healthy'

  return new Response(
    JSON.stringify({
      success: true,
      overall_status: overallStatus,
      checks,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleStatusCheck(supabase: any, execution_id?: string) {
  if (!execution_id) {
    // Get overall system status
    const { data: recentExecutions } = await supabase
      .from('pipeline_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    return new Response(
      JSON.stringify({
        success: true,
        recent_executions: recentExecutions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get specific execution status
  const { data: execution, error } = await supabase
    .from('pipeline_executions')
    .select(`
      *,
      quality_metrics (*)
    `)
    .eq('id', execution_id)
    .single()

  if (error) {
    throw new Error(`Execution not found: ${error.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      execution
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper functions
async function processSubsidyWithAI(subsidy: any) {
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 100))
  return {
    confidence: 0.85 + Math.random() * 0.15,
    processing_time: 50 + Math.random() * 100
  }
}

async function generateFormSchema(subsidy: any) {
  // Simulate form schema generation
  return {
    id: `form_${subsidy.id}`,
    title: `Application for ${subsidy.title?.en || subsidy.title}`,
    description: "Complete application form for subsidy",
    estimatedTime: 15,
    sections: [
      {
        id: 'personal_info',
        title: 'Personal Information',
        fields: [
          { id: 'name', type: 'text', label: 'Full Name', required: true },
          { id: 'email', type: 'email', label: 'Email Address', required: true }
        ]
      },
      {
        id: 'farm_details',
        title: 'Farm Details',
        fields: [
          { id: 'farm_name', type: 'text', label: 'Farm Name', required: true },
          { id: 'size', type: 'number', label: 'Farm Size (hectares)', required: true }
        ]
      }
    ],
    documents: [
      { id: 'identity', title: 'Identity Document', required: true, type: 'pdf' },
      { id: 'ownership', title: 'Land Ownership Certificate', required: true, type: 'pdf' }
    ]
  }
}