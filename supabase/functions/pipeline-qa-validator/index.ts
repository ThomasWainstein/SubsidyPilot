import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QAValidationRequest {
  extractedData: any
  originalContent: string
  sourceUrl: string
  extractionId?: string
  userId?: string
  sessionId?: string
}

interface QAResult {
  qaPass: boolean
  completenessScore: number
  structuralIntegrityScore: number
  missingFields: string[]
  structureLoss: string[]
  documentsLoss: string[]
  errors: string[]
  warnings: string[]
  adminRequired: boolean
  adminNotes?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { extractedData, originalContent, sourceUrl, extractionId, userId, sessionId }: QAValidationRequest = await req.json()
    
    console.log('🔍 Starting QA validation for:', sourceUrl)
    
    // Perform QA validation
    const qaResult = await performQAValidation(extractedData, originalContent, sourceUrl)
    
    // Store QA results in database
    const { data: qaRecord, error: qaError } = await supabase
      .from('extraction_qa_results')
      .insert({
        source_url: sourceUrl,
        qa_pass: qaResult.qaPass,
        completeness_score: qaResult.completenessScore,
        structural_integrity_score: qaResult.structuralIntegrityScore,
        missing_fields: qaResult.missingFields,
        structure_loss: qaResult.structureLoss,
        documents_loss: qaResult.documentsLoss,
        errors: qaResult.errors,
        warnings: qaResult.warnings,
        admin_required: qaResult.adminRequired,
        admin_notes: qaResult.adminNotes,
        user_id: userId,
        session_id: sessionId,
        review_data: {
          extraction_id: extractionId,
          content_length: originalContent.length,
          extracted_fields: Object.keys(extractedData).length
        }
      })
      .select()
      .single()
    
    if (qaError) {
      console.error('❌ Failed to store QA results:', qaError)
      throw qaError
    }
    
    // Log user action for audit trail
    if (userId) {
      await supabase.from('user_actions').insert({
        user_id: userId,
        session_id: sessionId,
        action_type: 'qa_validation_completed',
        resource_type: 'extraction',
        resource_id: extractionId,
        action_data: {
          source_url: sourceUrl,
          qa_pass: qaResult.qaPass,
          completeness_score: qaResult.completenessScore,
          admin_required: qaResult.adminRequired
        },
        triggered_by: 'system'
      })
    }
    
    console.log('✅ QA validation completed:', {
      qaPass: qaResult.qaPass,
      completenessScore: qaResult.completenessScore,
      adminRequired: qaResult.adminRequired
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        qaResult,
        qaRecordId: qaRecord.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('❌ QA validation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function performQAValidation(extractedData: any, originalContent: string, sourceUrl: string): Promise<QAResult> {
  const result: QAResult = {
    qaPass: false,
    completenessScore: 0,
    structuralIntegrityScore: 0,
    missingFields: [],
    structureLoss: [],
    documentsLoss: [],
    errors: [],
    warnings: [],
    adminRequired: false
  }
  
  try {
    // Check completeness
    const requiredFields = ['title', 'description', 'eligibility', 'deadline', 'amount']
    const extractedFields = Object.keys(extractedData || {})
    
    result.missingFields = requiredFields.filter(field => 
      !extractedFields.includes(field) || 
      !extractedData[field] || 
      extractedData[field] === ''
    )
    
    result.completenessScore = Math.max(0, 
      (requiredFields.length - result.missingFields.length) / requiredFields.length
    )
    
    // Check structural integrity
    const contentLength = originalContent.length
    const extractedContentLength = JSON.stringify(extractedData).length
    
    if (contentLength > 0) {
      result.structuralIntegrityScore = Math.min(1.0, extractedContentLength / (contentLength * 0.1))
    }
    
    // Detect structure loss
    if (originalContent.includes('<table>') && !JSON.stringify(extractedData).includes('table')) {
      result.structureLoss.push('table_structure')
    }
    
    if (originalContent.includes('<ul>') || originalContent.includes('<ol>')) {
      if (!JSON.stringify(extractedData).includes('list') && !JSON.stringify(extractedData).includes('•')) {
        result.structureLoss.push('list_structure')
      }
    }
    
    // Check for document references
    const docRegex = /\.(pdf|doc|docx|xls|xlsx)\b/gi
    const originalDocs = originalContent.match(docRegex) || []
    const extractedDocs = JSON.stringify(extractedData).match(docRegex) || []
    
    if (originalDocs.length > extractedDocs.length) {
      result.documentsLoss = originalDocs.filter(doc => 
        !extractedDocs.some(extractedDoc => extractedDoc.toLowerCase() === doc.toLowerCase())
      )
    }
    
    // Generate warnings
    if (result.completenessScore < 0.7) {
      result.warnings.push('Low completeness score - missing key fields')
    }
    
    if (result.structuralIntegrityScore < 0.5) {
      result.warnings.push('Potential structure loss detected')
    }
    
    if (result.documentsLoss.length > 0) {
      result.warnings.push(`${result.documentsLoss.length} document references may be lost`)
    }
    
    // Generate errors for critical issues
    if (result.completenessScore < 0.4) {
      result.errors.push('Critical completeness failure - too many missing fields')
      result.adminRequired = true
      result.adminNotes = 'Manual review required for low extraction quality'
    }
    
    if (!extractedData.title || extractedData.title.length < 10) {
      result.errors.push('Title extraction failed or too short')
    }
    
    // Determine overall QA pass/fail
    result.qaPass = (
      result.completenessScore >= 0.6 &&
      result.structuralIntegrityScore >= 0.4 &&
      result.errors.length === 0
    )
    
    // Flag for admin review if quality is questionable
    if (result.completenessScore < 0.8 || result.structuralIntegrityScore < 0.7) {
      result.adminRequired = true
    }
    
  } catch (error) {
    result.errors.push(`QA validation failed: ${error.message}`)
    result.adminRequired = true
    result.adminNotes = 'QA validation encountered an error - manual review required'
  }
  
  return result
}