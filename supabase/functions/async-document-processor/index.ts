import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingJob {
  id: string;
  document_id: string;
  file_url: string;
  file_name: string;
  client_type: string;
  document_type?: string;
  config: any;
  metadata: any;
}

interface ExtractionResult {
  value?: string;
  confidence: number;
  source: string;
  position?: { start: number; end: number };
  raw?: string;
}

// Hybrid Pattern Extraction (embedded for edge function)
class FastPatternExtractor {
  extractPatterns(text: string): { [key: string]: ExtractionResult | undefined } {
    const results: { [key: string]: ExtractionResult | undefined } = {};
    
    // Use comprehensive EU pattern extractor
    const euResults = this.extractEUPatterns(text);
    
    // Map to simplified interface for backward compatibility
    results.vatNumber = euResults.vatNumber;
    results.companyName = euResults.companyName;
    results.registrationNumber = euResults.siretNumber || euResults.kvkNumber || euResults.hrbNumber || euResults.cuiNumber;
    results.turnover = euResults.turnover;
    results.employees = euResults.employees;
    results.email = euResults.email;
    results.phone = euResults.phone;
    results.address = euResults.address;
    
    // Add SME classification as additional field
    if (euResults.smeClassification) {
      results.smeClassification = euResults.smeClassification;
    }
    
    // Add document metadata
    if (euResults.documentLanguage) {
      results.documentLanguage = euResults.documentLanguage;
    }
    
    if (euResults.documentType) {
      results.documentType = euResults.documentType;
    }
    
    return results;
  }

  private extractEUPatterns(text: string): any {
    // Embedded EU extraction logic for edge function
    const results: any = {};
    
    // PIC Code (9 digits)
    const picPattern = /(?:PIC|Participant\s+Identification\s+Code)[:\s]*(\d{9})\b/gi;
    const picMatch = picPattern.exec(text);
    if (picMatch) {
      results.picCode = {
        value: picMatch[1],
        confidence: 0.95,
        source: 'pattern',
        raw: picMatch[0]
      };
    }

    // Enhanced VAT patterns for multiple countries
    const vatPatterns = [
      /(?:VAT|TVA|IVA|BTW)[:\s]*FR(\d{11})\b/gi,  // France
      /(?:VAT|USt-IdNr)[:\s]*DE(\d{9})\b/gi,      // Germany
      /(?:VAT|BTW)[:\s]*NL(\d{9})B\d{2}\b/gi,     // Netherlands
      /(?:VAT|TVA|CIF)[:\s]*RO(\d{6,10})\b/gi,    // Romania
      /(?:VAT|IVA)[:\s]*ES([A-Z]\d{7}[A-Z]|\d{8}[A-Z])\b/gi, // Spain
      /(?:VAT|TVA|CIF|CUI)[:\s]*(?:RO)?(\d{6,10})/gi // General
    ];

    for (const pattern of vatPatterns) {
      const match = pattern.exec(text);
      if (match) {
        results.vatNumber = {
          value: match[1],
          confidence: 0.90,
          source: 'pattern',
          raw: match[0]
        };
        break;
      }
    }

    // SIRET (France - 14 digits)
    const siretPattern = /(?:SIRET|Numéro\s+SIRET)[:\s]*(\d{14})\b/gi;
    const siretMatch = siretPattern.exec(text);
    if (siretMatch) {
      results.siretNumber = {
        value: siretMatch[1],
        confidence: 0.95,
        source: 'pattern',
        raw: siretMatch[0]
      };
    }

    // KVK (Netherlands - 8 digits)
    const kvkPattern = /(?:KVK|Kamer\s+van\s+Koophandel)[:\s]*(\d{8})\b/gi;
    const kvkMatch = kvkPattern.exec(text);
    if (kvkMatch) {
      results.kvkNumber = {
        value: kvkMatch[1],
        confidence: 0.90,
        source: 'pattern',
        raw: kvkMatch[0]
      };
    }

    // Enhanced company name extraction
    const companyPatterns = [
      /(?:company\s+name|nom\s+de\s+l'entreprise|denominación)[:\s]*([^\n]{3,100})/gi,
      /([A-Z][a-zA-ZÀ-ÿ\s&]{2,50})\s*(?:S\.R\.L\.|S\.A\.|SRL|SA|B\.V\.|GmbH|Ltd|Inc)/gi,
      /(?:société|company|empresa)[:\s]*([^\n]{3,80})/gi
    ];

    for (const pattern of companyPatterns) {
      const match = pattern.exec(text);
      if (match) {
        results.companyName = {
          value: match[1].trim(),
          confidence: 0.80,
          source: 'pattern',
          raw: match[0]
        };
        break;
      }
    }

    // Enhanced financial data extraction
    const turnoverPatterns = [
      /(?:chiffre\s+d'affaires|turnover|cifra\s+de\s+afaceri|facturación)[:\s]*([€$£]?[\d\s,\.]+)(?:\s*(?:EUR|RON|USD|GBP))?/gi,
      /(?:revenue|revenus|venituri|ingresos)[:\s]*([€$£]?[\d\s,\.]+)/gi
    ];

    for (const pattern of turnoverPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const cleanValue = this.cleanFinancialValue(match[1]);
        if (cleanValue) {
          results.turnover = {
            value: cleanValue,
            confidence: 0.75,
            source: 'pattern',
            raw: match[0]
          };
          break;
        }
      }
    }

    // Enhanced employee extraction
    const employeePatterns = [
      /(?:employés|employees|angajați|empleados|werknemers)[:\s]*(\d{1,6})\b/gi,
      /(\d{1,6})\s*(?:employés|employees|angajați|empleados)/gi,
      /(?:staff|personnel|personal)[:\s]*(\d{1,6})\b/gi
    ];

    for (const pattern of employeePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const employeeCount = parseInt(match[1]);
        if (employeeCount > 0 && employeeCount < 1000000) {
          results.employees = {
            value: employeeCount.toString(),
            confidence: 0.85,
            source: 'pattern',
            raw: match[0]
          };
          break;
        }
      }
    }

    // SME Classification calculation
    if (results.employees || results.turnover) {
      const employees = results.employees ? parseInt(results.employees.value) : null;
      const turnover = results.turnover ? this.parseFinancialValue(results.turnover.value) : null;

      let smeClass = 'unknown';
      if ((employees !== null && employees < 10) || (turnover !== null && turnover < 2000000)) {
        smeClass = 'micro';
      } else if ((employees !== null && employees < 50) || (turnover !== null && turnover < 10000000)) {
        smeClass = 'small';
      } else if ((employees !== null && employees < 250) || (turnover !== null && turnover < 50000000)) {
        smeClass = 'medium';
      } else {
        smeClass = 'large';
      }

      results.smeClassification = {
        value: smeClass,
        confidence: 0.90,
        source: 'calculated',
        metadata: { employees, turnover }
      };
    }

    // Language detection
    const languagePatterns = {
      french: /\b(?:société|entreprise|siret|chiffre|affaires)\b/gi,
      english: /\b(?:company|business|turnover|revenue|employees)\b/gi,
      spanish: /\b(?:empresa|sociedad|facturación|empleados)\b/gi,
      romanian: /\b(?:societate|cifra|afaceri|angajați)\b/gi,
      german: /\b(?:unternehmen|gesellschaft|umsatz|mitarbeiter)\b/gi,
      dutch: /\b(?:bedrijf|onderneming|omzet|werknemers)\b/gi
    };

    let maxMatches = 0;
    let detectedLanguage = 'unknown';
    for (const [language, pattern] of Object.entries(languagePatterns)) {
      const matches = (text.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLanguage = language;
      }
    }

    if (maxMatches > 0) {
      results.documentLanguage = {
        value: detectedLanguage,
        confidence: Math.min(0.95, 0.5 + (maxMatches * 0.1)),
        source: 'pattern'
      };
    }

    // Enhanced contact info
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = emailPattern.exec(text);
    if (emailMatch) {
      results.email = {
        value: emailMatch[0],
        confidence: 0.90,
        source: 'pattern',
        raw: emailMatch[0]
      };
    }

    const phonePatterns = [
      /\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}/g,
      /\b\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}\b/g
    ];

    for (const pattern of phonePatterns) {
      const match = pattern.exec(text);
      if (match) {
        results.phone = {
          value: match[0],
          confidence: 0.75,
          source: 'pattern',
          raw: match[0]
        };
        break;
      }
    }

    // Address extraction
    const addressPatterns = [
      /(?:address|adresse|dirección|endereço)[:\s]*([^\n]{10,100})/gi,
      /(?:rue|street|str\.|strada|calle)[:\s]*([^\n]{5,80})/gi
    ];

    for (const pattern of addressPatterns) {
      const match = pattern.exec(text);
      if (match) {
        results.address = {
          value: match[1].trim(),
          confidence: 0.70,
          source: 'pattern',
          raw: match[0]
        };
        break;
      }
    }

    return results;
  }

  private cleanFinancialValue(value: string): string | null {
    const cleaned = value.replace(/[€$£\s,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed.toString() : null;
  }

  private parseFinancialValue(value: string): number | null {
    const cleaned = value.replace(/[€$£\s,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }

  assessQuality(results: { [key: string]: ExtractionResult | undefined }): {
    overallConfidence: number;
    extractedFields: number;
    totalFields: number;
    needsAI: boolean;
  } {
    const extracted = Object.values(results).filter(r => r !== undefined);
    const totalFields = Object.keys(results).length;
    
    const avgConfidence = extracted.length > 0 
      ? extracted.reduce((sum, r) => sum + r!.confidence, 0) / extracted.length 
      : 0;

    return {
      overallConfidence: avgConfidence,
      extractedFields: extracted.length,
      totalFields,
      needsAI: avgConfidence < 0.75 || extracted.length < totalFields * 0.5
    };
  }
}

// Helper functions
async function extractTextFromBlob(blob: Blob, fileName: string): Promise<string> {
  try {
    if (fileName.toLowerCase().endsWith('.txt')) {
      return await blob.text();
    }
    
    // For other file types, return a placeholder
    // In a real implementation, you'd use proper document parsing
    return `Document content from ${fileName} - [Text extraction would be implemented here]`;
  } catch (error) {
    console.error('Text extraction error:', error);
    return `Failed to extract text from ${fileName}`;
  }
}

async function processWithCloudRun(fileBlob: Blob, job: ProcessingJob): Promise<any> {
  const cloudRunUrl = 'https://subsidypilot-form-parser-838836299668.europe-west1.run.app/process-document';
  
  const formData = new FormData();
  formData.append('document', fileBlob, job.file_name);
  formData.append('document_id', job.document_id);
  formData.append('document_type', job.document_type || 'general');

  const response = await fetch(cloudRunUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Cloud Run processing failed: ${response.statusText}`);
  }

  return await response.json();
}

function mergeResults(patternResults: { [key: string]: ExtractionResult | undefined }, aiResults: any): { [key: string]: ExtractionResult | undefined } {
  const merged: { [key: string]: ExtractionResult | undefined } = { ...patternResults };
  
  // Add AI results for fields not covered by patterns or with low confidence
  for (const [key, value] of Object.entries(aiResults || {})) {
    const patternResult = patternResults[key];
    
    // Use AI result if pattern result doesn't exist or has low confidence
    if (!patternResult || patternResult.confidence < 0.7) {
      merged[key] = {
        value: value as string,
        confidence: 0.8, // Default AI confidence
        source: 'ai',
        raw: `AI extracted: ${value}`
      };
    }
  }
  
  return merged;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Hybrid async document processor starting...');

    // Get next job to process
    const { data: jobs, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobError) {
      console.error('❌ Error fetching jobs:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No jobs to process');
      return new Response(JSON.stringify({ message: 'No jobs to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const job = jobs[0] as ProcessingJob;
    console.log(`📋 Processing job ${job.id} for document ${job.document_id}`);

    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    const startTime = Date.now();

    try {
      // PHASE 1: Download and extract text from document
      console.log(`📄 Downloading document: ${job.file_url}`);
      
      const fileResponse = await fetch(job.file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }
      
      const fileBlob = await fileResponse.blob();
      const documentText = await extractTextFromBlob(fileBlob, job.file_name);
      
      // PHASE 2: Fast Pattern Extraction
      const patternStartTime = Date.now();
      console.log('🔍 Phase 1: Pattern extraction starting...');
      
      const patternExtractor = new FastPatternExtractor();
      const patternResults = patternExtractor.extractPatterns(documentText);
      const patternTime = Date.now() - patternStartTime;
      
      console.log(`✅ Pattern extraction completed in ${patternTime}ms`);
      
      // PHASE 3: Assess if AI processing is needed
      const quality = patternExtractor.assessQuality(patternResults);
      console.log(`📊 Pattern quality: ${quality.overallConfidence.toFixed(2)} confidence, ${quality.extractedFields}/${quality.totalFields} fields extracted`);
      
      let finalResults = patternResults;
      let processingMethod = 'pattern-only';
      let cloudRunTime = 0;
      
      // PHASE 4: Conditional AI Processing
      if (quality.needsAI) {
        const aiStartTime = Date.now();
        console.log(`🤖 Phase 2: AI processing needed (confidence: ${quality.overallConfidence.toFixed(2)})`);
        
        try {
          const cloudRunResults = await processWithCloudRun(fileBlob, job);
          cloudRunTime = Date.now() - aiStartTime;
          
          if (cloudRunResults.success && cloudRunResults.extractedData) {
            // Merge pattern results with AI results (patterns have priority for high-confidence fields)
            finalResults = mergeResults(patternResults, cloudRunResults.extractedData);
            processingMethod = 'hybrid-pattern-ai';
            console.log(`✅ AI processing completed in ${cloudRunTime}ms`);
          } else {
            console.log('⚠️ AI processing failed, using pattern results only');
            processingMethod = 'pattern-fallback';
          }
        } catch (aiError) {
          console.log(`⚠️ AI processing error: ${aiError.message}, using pattern results`);
          processingMethod = 'pattern-fallback';
        }
      } else {
        console.log('⚡ No AI processing needed - pattern extraction sufficient');
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      // Calculate final confidence and metrics
      const extractedCount = Object.values(finalResults).filter(r => r !== undefined).length;
      const totalFields = Object.keys(finalResults).length;
      const finalConfidence = quality.overallConfidence;
      
      // Convert results to simple format for storage
      const extractedData: any = {};
      for (const [key, result] of Object.entries(finalResults)) {
        if (result) {
          extractedData[key] = result.value;
        }
      }
      
      // Update document_extractions with results
      await supabase
        .from('document_extractions')
        .update({
          status_v2: 'completed',
          extracted_data: extractedData,
          confidence_score: finalConfidence,
          progress_metadata: {
            ...job.metadata,
            processing_time_ms: totalProcessingTime,
            extraction_method: processingMethod,
            pattern_extraction_time: patternTime,
            ai_processing_time: cloudRunTime,
            fields_extracted: extractedCount,
            total_fields: totalFields,
            cost_optimization: {
              fields_from_patterns: Object.values(patternResults).filter(r => r !== undefined).length,
              fields_from_ai: processingMethod.includes('ai') ? extractedCount - Object.values(patternResults).filter(r => r !== undefined).length : 0,
              processing_method: processingMethod
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('document_id', job.document_id);

      // Mark job as completed
      await supabase
        .from('document_processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_time_ms: totalProcessingTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      console.log(`✅ Job ${job.id} completed with ${processingMethod} in ${totalProcessingTime}ms (pattern: ${patternTime}ms, AI: ${cloudRunTime}ms)`);

    } catch (processingError) {
      console.error('❌ Processing error:', processingError);
      
      const processingTime = Date.now() - startTime;
      const shouldRetry = job.retry_attempt < job.max_retries;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(300 * Math.pow(2, job.retry_attempt), 3600); // Max 1 hour
        const retryTime = new Date(Date.now() + retryDelay * 1000);

        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'retry_scheduled',
            retry_attempt: job.retry_attempt + 1,
            scheduled_for: retryTime.toISOString(),
            error_message: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`🔄 Job ${job.id} scheduled for retry ${job.retry_attempt + 1} at ${retryTime.toISOString()}`);
      } else {
        // Mark as failed
        await supabase
          .from('document_processing_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            processing_time_ms: processingTime,
            error_message: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Update document_extractions
        await supabase
          .from('document_extractions')
          .update({
            status_v2: 'failed',
            failure_detail: processingError.message,
            updated_at: new Date().toISOString()
          })
          .eq('document_id', job.document_id);

        console.log(`❌ Job ${job.id} failed permanently after ${job.retry_attempt} retries`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      jobId: job.id,
      documentId: job.document_id,
      status: 'processed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Async processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});