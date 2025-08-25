import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LesAidesDetailResponse {
  numero: number;
  nom: string;
  sigle: string;
  revision: number;
  generation: string;
  validation: string;
  nouveau: boolean;
  implantation: string; // E/N/T
  uri: string;
  aps: boolean;
  domaines: number[];
  moyens: number[];
  auteur: string;
  organisme: {
    numero: number;
    sigle: string;
    raison_sociale: string;
    implantation: string;
    adresses: Array<{
      libelle: string;
      interlocuteur: string;
      adresse: string;
      email: string;
      service: string;
      telephone: string;
      telecopie: string;
      web: string;
    }>;
  };
  objet: string; // HTML content
  conditions: string; // HTML content
  montants: string; // HTML content
  conseils: string; // HTML content
  references: string; // HTML content
  restrictions: string[];
  criteres: {
    pour: Array<{ libelle: string; enfants?: any[] }>;
    contre: Array<{ libelle: string; enfants?: any[] }>;
  };
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
  country: string;
  raw_data?: any;
  backfill_target_id?: string;
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

    const { run_id, items, dry_run = false, backfill = false } = await req.json()
    
    if (!run_id || !items || !Array.isArray(items)) {
      throw new Error('Missing required fields: run_id, items')
    }

    console.log(`🔄 Processing ${items.length} items for run ${run_id}, dry_run: ${dry_run}, backfill: ${backfill}`)
    
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
          const externalId = item.numero?.toString() || item.external_id
          await supabase
            .from('sync_items')
            .update({ 
              status: 'processing',
              processed_at: new Date().toISOString()
            })
            .eq('run_id', run_id)
            .eq('external_id', externalId)
        }

        // Parse the item into canonical schema
        const parsedSubsidy = await parseItem(item, supabase, backfill)
        
        if (!parsedSubsidy) {
          const externalId = item.numero?.toString() || item.external_id || 'unknown'
          await logItemError(supabase, run_id, externalId, 'PARSE_ERROR', 'Failed to parse item', dry_run)
          failed++
          continue
        }

        if (dry_run) {
          console.log(`[DRY RUN] Would process: ${parsedSubsidy.title.fr} (${parsedSubsidy.external_id})`)
          skipped++
          continue
        }

        if (backfill && item.backfill_target_id) {
          // Update existing record by ID
          const { error: updateError } = await supabase
            .from('subsidies')
            .update({
              title: parsedSubsidy.title,
              description: parsedSubsidy.description,
              agency: parsedSubsidy.agency,
              agency_id: parsedSubsidy.agency_id,
              source_url: parsedSubsidy.source_url,
              amount_min: parsedSubsidy.amount_min,
              amount_max: parsedSubsidy.amount_max,
              deadline: parsedSubsidy.deadline,
              tags: parsedSubsidy.tags,
              funding_type: parsedSubsidy.funding_type,
              version_hash: parsedSubsidy.version_hash,
              last_synced_at: parsedSubsidy.last_synced_at,
              raw_data: parsedSubsidy.raw_data
            })
            .eq('id', item.backfill_target_id)
          
          if (updateError) {
            console.error('Backfill update error:', updateError)
            await logItemError(supabase, run_id, parsedSubsidy.external_id, 'VALIDATION_ERROR', updateError.message, dry_run)
            failed++
          } else {
            updated++
            console.log(`🔄 Backfilled: ${parsedSubsidy.title.fr}`)
          }
        } else {
          // Regular flow: check if exists and upsert
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
        }

        // Mark sync_item as completed
        if (!dry_run) {
          await supabase
            .from('sync_items')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('run_id', run_id)
            .eq('external_id', parsedSubsidy.external_id)
        }

        processed++

      } catch (error) {
        console.error('Item processing error:', error)
        const externalId = item.numero?.toString() || item.external_id || 'unknown'
        await logItemError(supabase, run_id, externalId, 'UNKNOWN', error.message, dry_run)
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

async function parseItem(item: LesAidesDetailResponse | any, supabase: any, isBackfill: boolean = false): Promise<ParsedSubsidy | null> {
  try {
    const now = new Date().toISOString()
    
    // Handle both full detail responses and search result items
    const numero = item.numero
    const nom = item.nom
    const uri = item.uri
    
    if (!numero || !nom) {
      console.error('Missing required fields: numero or nom', item)
      return null
    }

    // Parse amount from montants HTML field
    let amountMin, amountMax
    if (item.montants) {
      const amounts = parseAmountFromHtml(item.montants)
      amountMin = amounts.min
      amountMax = amounts.max
    }
    
    // Parse deadline from conditions/montants HTML 
    let deadline: string | undefined
    if (item.conditions || item.montants) {
      deadline = parseDeadlineFromHtml(item.conditions || item.montants)
    }

    // Resolve or create agency using organisme data
    let agencyId: string | undefined
    let agencyName: string | undefined
    
    if (item.organisme?.raison_sociale) {
      agencyName = item.organisme.raison_sociale
      agencyId = await resolveAgency(supabase, agencyName, item.organisme.sigle, item.organisme.adresses?.[0]?.web)
    } else if (item.sigle) {
      agencyName = item.sigle
      agencyId = await resolveAgency(supabase, agencyName)
    }

    // Build tags from multiple sources
    const tags = []
    if (item.implantation === 'E') tags.push('european')
    else if (item.implantation === 'N') tags.push('national')  
    else if (item.implantation === 'T') tags.push('territorial')
    if (item.aps) tags.push('aps')
    if (item.nouveau) tags.push('new')
    
    // Add domain and means as tags
    if (item.domaines?.length) {
      item.domaines.forEach((d: number) => tags.push(`domain:${d}`))
    }
    if (item.moyens?.length) {
      item.moyens.forEach((m: number) => tags.push(`means:${m}`))
    }

    // Determine funding type from means
    let fundingType = 'public'
    if (item.moyens?.includes(822)) fundingType = 'equity' // Intervention en fonds propres
    else if (item.moyens?.includes(827)) fundingType = 'loan' // Avance − Prêts − Garanties
    else if (item.moyens?.includes(833)) fundingType = 'grant' // Subvention

    const parsedData: ParsedSubsidy = {
      source: 'les-aides-fr',
      external_id: numero.toString(),
      title: { fr: nom },
      description: { fr: stripHtmlTags(item.objet || item.resume || '') },
      agency: agencyName,
      agency_id: agencyId,
      region: undefined, // Will be enhanced with search scenario region
      tags: tags.length > 0 ? tags : undefined,
      funding_type: fundingType,
      status: 'open',
      source_url: uri || `https://les-aides.fr/aide/${numero}`,
      amount_min: amountMin,
      amount_max: amountMax,
      deadline,
      language: ['fr'],
      country: 'FR',
      version_hash: '', // Will be computed below
      last_synced_at: now,
      raw_data: {
        search_scenario: item.search_scenario,
        api_response: item,
        organisme: item.organisme,
        is_backfill: isBackfill
      }
    }

    // Add search scenario region if available
    if (item.search_scenario?.region && !parsedData.region) {
      const regionMap: Record<number, string> = {
        84: 'Auvergne-Rhône-Alpes', 11: 'Île-de-France', 32: 'Hauts-de-France',
        75: 'Nouvelle-Aquitaine', 76: 'Occitanie', 93: 'Provence-Alpes-Côte d\'Azur',
        44: 'Grand Est', 52: 'Pays de la Loire', 53: 'Bretagne', 28: 'Normandie'
      }
      const regionName = regionMap[item.search_scenario.region]
      if (regionName) {
        parsedData.region = [regionName]
      }
    }

    // Compute version hash including key fields for change detection
    parsedData.version_hash = await computeHash(JSON.stringify({
      title: parsedData.title,
      description: stripHtmlTags(parsedData.description.fr || ''),
      amount_min: parsedData.amount_min,
      amount_max: parsedData.amount_max,
      deadline: parsedData.deadline,
      agency: parsedData.agency,
      funding_type: parsedData.funding_type,
      tags: parsedData.tags,
      validation: item.validation,
      revision: item.revision,
      uri: parsedData.source_url
    }))

    // Set backfill target if this is a backfill operation
    if (isBackfill && item.backfill_target_id) {
      parsedData.backfill_target_id = item.backfill_target_id
    }

    return parsedData

  } catch (error) {
    console.error('Parse item error:', error, 'Item keys:', Object.keys(item))
    return null
  }
}

async function resolveAgency(supabase: any, agencyName: string, sigle?: string, website?: string): Promise<string | undefined> {
  try {
    // Clean agency name
    const cleanName = agencyName.trim()
    
    // Check if agency exists by name or sigle
    const { data: existing, error } = await supabase
      .from('agencies')
      .select('id')
      .or(`name.eq.${cleanName},code.eq.${sigle || cleanName}`)
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
        name: cleanName,
        code: sigle || cleanName.substring(0, 50), // Limit code length
        country_code: 'FR',
        agency_type: 'government',
        website: website || null,
        contact_info: website ? { website } : {}
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Agency creation error:', insertError)
      return undefined
    }

    console.log(`🏛️ Created agency: ${cleanName} (${newAgency.id})`)
    return newAgency.id

  } catch (error) {
    console.error('Resolve agency error:', error)
    return undefined
  }
}

function parseAmountFromHtml(amountHtml: string): { min?: number, max?: number } {
  if (!amountHtml) return {}
  
  // Remove HTML tags and normalize text
  const text = stripHtmlTags(amountHtml).toLowerCase()
  
  // Look for currency amounts in euros
  const euroRegex = /(\d+(?:[,.\s]\d+)*)\s*(?:€|euros?|eur)/gi
  const matches = text.match(euroRegex)
  
  if (!matches) return {}
  
  // Extract numbers from currency matches
  const amounts = matches.map(match => {
    const numStr = match.replace(/[€euros?eur,\s]/gi, '').replace('.', '')
    return parseInt(numStr) || 0
  }).filter(n => n > 0)
  
  if (amounts.length === 0) return {}
  if (amounts.length === 1) return { min: amounts[0] }
  
  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts)
  }
}

function parseDeadlineFromHtml(htmlContent: string): string | undefined {
  if (!htmlContent) return undefined
  
  const text = stripHtmlTags(htmlContent)
  
  // Look for French date patterns
  const datePatterns = [
    /(\d{1,2})\s*(?:er|e)?\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})/gi,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    /(\d{1,2})-(\d{1,2})-(\d{4})/g,
    /(\d{4})-(\d{1,2})-(\d{1,2})/g
  ]
  
  const monthNames: Record<string, string> = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  }
  
  for (const pattern of datePatterns) {
    const match = pattern.exec(text)
    if (match) {
      if (pattern.source.includes('janvier')) {
        // French month name format
        const day = match[1].padStart(2, '0')
        const month = monthNames[match[2].toLowerCase()]
        const year = match[3]
        if (month) {
          return `${year}-${month}-${day}`
        }
      } else if (pattern.source.includes('4')) {
        // YYYY-MM-DD format
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      } else {
        // DD/MM/YYYY or DD-MM-YYYY format
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
      }
    }
  }
  
  return undefined
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
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