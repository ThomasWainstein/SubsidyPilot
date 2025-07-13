/**
 * Database operations for document extractions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ExtractedFarmData } from './openaiService.ts';

export async function storeExtractionResult(
  documentId: string,
  extractedData: ExtractedFarmData,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error: insertError } = await supabase
    .from('document_extractions')
    .insert({
      document_id: documentId,
      extracted_data: extractedData,
      extraction_type: 'openai_gpt4o',
      confidence_score: extractedData.confidence || 0,
      status: extractedData.error ? 'failed' : 'completed',
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('Failed to store extraction results:', insertError);
    throw insertError;
  }
}

export async function logExtractionError(
  documentId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: { error: 'Extraction failed' },
        extraction_type: 'openai_gpt4o',
        confidence_score: 0,
        status: 'failed',
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      });
  } catch (logError) {
    console.error('Failed to log extraction error:', logError);
  }
}