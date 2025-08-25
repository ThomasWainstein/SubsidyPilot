import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LesAidesItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  amount?: string;
  deadline?: string;
  organization?: string;
  region?: string;
  sector?: string;
}

interface ParsedSubsidy {
  source: string;
  external_id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  agency?: string;
  agency_id?: string;
  region?: string[];
  tags?: string[];
  funding_type?: string;
  status: string;
  source_url: string;
  amount_min?: number;
  amount_max?: number;
  deadline?: string;
  language: string[];
  version_hash: string;
  last_synced_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { run_id, items, dry_run = false } = await req.json()
    
    if (!run_id || !items || !Array.isArray(items)) {
      throw new Error('Missing required fields: run_id, items')
    }

    console.log(`🔄 Processing ${items.length} items for run ${run_id}, dry_run: ${dry_run}`)
    
    let processed = 0
    let inserted = 0 
    let updated = 0
    let skipped = 0
    let failed = 0

    // Process each item
    for (const item of items) {
      try {
        // Update sync_item status to processing
        if (!dry_run) {
          await supabase
            .from('sync_items')
            .update({ 
              status: 'processing',
              processed_at: new Date().toISOString()
            })
            .eq('run_id', run_id)
            .eq('external_id', item.id || item.url)
        }

        // Parse the item into canonical schema
        const parsedSubsidy = await parseItem(item, supabase)
        
        if (!parsedSubsidy) {
          await logItemError(supabase, run_id, item.id || item.url, 'PARSE_ERROR', 'Failed to parse item', dry_run)
          failed++
          continue
        }

        // Check if subsidy exists
        const { data: existingSubsidy, error: fetchError } = await supabase
          .from('subsidies')
          .select('id, version_hash')
          .eq('source', 'les-aides-fr')
          .eq('external_id', parsedSubsidy.external_id)
          .maybeSingle()

        if (fetchError) {
          console.error('Fetch error:', fetchError)
          await logItemError(supabase, run_id, parsedSubsidy.external_id, 'RLS_ERROR', fetchError.message, dry_run)
          failed++
          continue
        }

        if (dry_run) {
          console.log(`[DRY RUN] Would process: ${parsedSubsidy.title.fr || parsedSubsidy.external_id}`)
          skipped++
          continue
        }

        // Insert or update based on version hash
        if (existingSubsidy) {
          if (existingSubsidy.version_hash === parsedSubsidy.version_hash) {
            // No changes, just update last_synced_at
            await supabase
              .from('subsidies')
              .update({ last_synced_at: parsedSubsidy.last_synced_at })
              .eq('id', existingSubsidy.id)
            skipped++
          } else {
            // Update existing subsidy
            const { error: updateError } = await supabase
              .from('subsidies')
              .update(parsedSubsidy)
              .eq('id', existingSubsidy.id)
            
            if (updateError) {
              console.error('Update error:', updateError)
              await logItemError(supabase, run_id, parsedSubsidy.external_id, 'VALIDATION_ERROR', updateError.message, dry_run)
              failed++
            } else {
              updated++
            }
          }
        } else {
          // Insert new subsidy
          const { error: insertError } = await supabase
            .from('subsidies')
            .insert(parsedSubsidy)
          
          if (insertError) {
            console.error('Insert error:', insertError)
            await logItemError(supabase, run_id, parsedSubsidy.external_id, 'VALIDATION_ERROR', insertError.message, dry_run)
            failed++
          } else {
            inserted++
          }
        }

        // Mark sync_item as completed
        await supabase
          .from('sync_items')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('run_id', run_id)
          .eq('external_id', parsedSubsidy.external_id)

        processed++

      } catch (error) {
        console.error('Item processing error:', error)
        await logItemError(supabase, run_id, item.id || item.url, 'UNKNOWN', error.message, dry_run)
        failed++
      }
    }

    const summary = {
      processed,
      inserted, 
      updated,
      skipped,
      failed,
      total: items.length
    }

    console.log('📊 Processing summary:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Adapter error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Les Aides adapter failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function parseItem(item: LesAidesItem, supabase: any): Promise<ParsedSubsidy | null> {
  try {
    const now = new Date().toISOString()
    
    // Parse amount
    let amountMin, amountMax
    if (item.amount) {
      const amounts = parseAmount(item.amount)
      amountMin = amounts.min
      amountMax = amounts.max
    }
    
    // Parse deadline
    let deadline: string | undefined
    if (item.deadline) {
      deadline = parseDeadline(item.deadline)
    }

    // Resolve or create agency
    let agencyId: string | undefined
    if (item.organization) {
      agencyId = await resolveAgency(supabase, item.organization)
    }

    const parsedData: ParsedSubsidy = {
      source: 'les-aides-fr',
      external_id: item.id || item.url,
      title: { fr: item.title },
      description: { fr: item.description || '' },
      agency: item.organization,
      agency_id: agencyId,
      region: item.region ? [item.region] : undefined,
      tags: item.sector ? [item.sector] : undefined,
      funding_type: 'public',
      status: 'open',
      source_url: item.url,
      amount_min: amountMin,
      amount_max: amountMax,
      deadline,
      language: ['fr'],
      version_hash: '', // Will be computed below
      last_synced_at: now
    }

    // Compute version hash
    parsedData.version_hash = await computeHash(JSON.stringify({
      title: parsedData.title,
      description: parsedData.description,
      amount_min: parsedData.amount_min,
      amount_max: parsedData.amount_max,
      deadline: parsedData.deadline,
      agency: parsedData.agency
    }))

    return parsedData

  } catch (error) {
    console.error('Parse item error:', error)
    return null
  }
}

async function resolveAgency(supabase: any, agencyName: string): Promise<string | undefined> {
  try {
    // Check if agency exists
    const { data: existing, error } = await supabase
      .from('agencies')
      .select('id')
      .eq('name', agencyName)
      .maybeSingle()

    if (error) {
      console.error('Agency lookup error:', error)
      return undefined
    }

    if (existing) {
      return existing.id
    }

    // Create new agency
    const { data: newAgency, error: insertError } = await supabase
      .from('agencies')
      .insert({
        name: agencyName,
        country_code: 'FR',
        agency_type: 'government'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Agency creation error:', insertError)
      return undefined
    }

    return newAgency.id

  } catch (error) {
    console.error('Resolve agency error:', error)
    return undefined
  }
}

function parseAmount(amountStr: string): { min?: number, max?: number } {
  // Remove currency symbols and normalize
  const cleaned = amountStr.replace(/[€$,\s]/g, '').toLowerCase()
  
  // Look for range patterns like "1000-5000" or "jusqu'à 10000"
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-')
    return {
      min: parseFloat(parts[0]) || undefined,
      max: parseFloat(parts[1]) || undefined
    }
  }
  
  if (cleaned.includes('jusqu') || cleaned.includes('max')) {
    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''))
    return { max: num || undefined }
  }
  
  const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''))
  return { min: num || undefined }
}

function parseDeadline(deadlineStr: string): string | undefined {
  try {
    // Handle various French date formats
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY  
      /(\d{4})-(\d{1,2})-(\d{1,2})/    // YYYY-MM-DD
    ]
    
    for (const pattern of datePatterns) {
      const match = deadlineStr.match(pattern)
      if (match) {
        const [, p1, p2, p3] = match
        // Assume first format is DD/MM/YYYY or DD-MM-YYYY
        if (pattern.source.includes('4')) {
          return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`
        } else {
          return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`
        }
      }
    }
    
    return undefined
  } catch {
    return undefined
  }
}

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function logItemError(
  supabase: any, 
  runId: string, 
  externalId: string, 
  errorType: string, 
  errorMessage: string,
  dryRun: boolean
) {
  if (dryRun) return
  
  try {
    await supabase
      .from('sync_items')
      .update({
        status: 'failed',
        error_type: errorType,
        error_message: errorMessage,
        processed_at: new Date().toISOString()
      })
      .eq('run_id', runId)
      .eq('external_id', externalId)
  } catch (error) {
    console.error('Failed to log item error:', error)
  }
}