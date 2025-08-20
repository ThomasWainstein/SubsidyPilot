import { supabase } from '@/integrations/supabase/client';

/**
 * Production-ready fallback strategies for API failures and service degradation
 */

interface FallbackResult {
  success: boolean;
  data?: any;
  method: 'primary' | 'fallback_1' | 'fallback_2' | 'manual_review';
  confidence: number;
  cost: number;
  processing_time_ms: number;
  errors: string[];
}

interface ServiceHealth {
  google_vision: 'healthy' | 'degraded' | 'down';
  openai: 'healthy' | 'degraded' | 'down';
  last_checked: string;
}

export class FallbackManager {
  private static readonly RETRY_DELAYS = [1000, 3000, 8000]; // Progressive backoff
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Execute extraction with intelligent fallback strategies
   */
  static async executeWithFallback(
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const result: FallbackResult = {
      success: false,
      method: 'primary',
      confidence: 0,
      cost: 0,
      processing_time_ms: 0,
      errors: []
    };

    try {
      // 1. Check service health before attempting
      const serviceHealth = await this.checkServiceHealth();
      
      // 2. Primary strategy: Hybrid OCR (Google Vision + OpenAI)
      if (serviceHealth.google_vision === 'healthy' && serviceHealth.openai === 'healthy') {
        try {
          const primaryResult = await this.executeHybridExtraction(documentId, fileUrl, fileName, clientType);
          if (primaryResult.success) {
            result.success = true;
            result.data = primaryResult.data;
            result.method = 'primary';
            result.confidence = primaryResult.confidence;
            result.cost = primaryResult.cost;
            result.processing_time_ms = Date.now() - startTime;
            return result;
          }
          result.errors.push(`Primary method failed: ${primaryResult.error}`);
        } catch (error) {
          result.errors.push(`Primary method error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 3. Fallback 1: Pure OpenAI (if Google Vision is down)
      if (serviceHealth.openai === 'healthy') {
        try {
          result.method = 'fallback_1';
          const fallback1Result = await this.executePureOpenAIExtraction(documentId, fileUrl, fileName, clientType);
          if (fallback1Result.success) {
            result.success = true;
            result.data = fallback1Result.data;
            result.confidence = fallback1Result.confidence * 0.8; // Slightly lower confidence
            result.cost = fallback1Result.cost;
            result.processing_time_ms = Date.now() - startTime;
            return result;
          }
          result.errors.push(`Fallback 1 failed: ${fallback1Result.error}`);
        } catch (error) {
          result.errors.push(`Fallback 1 error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 4. Fallback 2: Cached/Template-based extraction
      try {
        result.method = 'fallback_2';
        const fallback2Result = await this.executeTemplateBasedExtraction(documentId, fileName, clientType);
        if (fallback2Result.success) {
          result.success = true;
          result.data = fallback2Result.data;
          result.confidence = fallback2Result.confidence * 0.6; // Lower confidence for template-based
          result.cost = 0; // No API costs
          result.processing_time_ms = Date.now() - startTime;
          return result;
        }
        result.errors.push(`Fallback 2 failed: ${fallback2Result.error}`);
      } catch (error) {
        result.errors.push(`Fallback 2 error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 5. Final fallback: Queue for manual review
      result.method = 'manual_review';
      await this.queueForManualReview(documentId, fileUrl, fileName, clientType, result.errors);
      result.success = true; // Consider queuing as success
      result.confidence = 0;
      result.cost = 0;
      result.processing_time_ms = Date.now() - startTime;
      result.data = {
        status: 'queued_for_review',
        message: 'Document queued for manual processing due to system issues'
      };

    } catch (error) {
      result.errors.push(`Fallback execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processing_time_ms = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute hybrid extraction with retry logic
   */
  private static async executeHybridExtraction(
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string
  ): Promise<{ success: boolean; data?: any; confidence: number; cost: number; error?: string }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('hybrid-ocr-extraction', {
          body: {
            documentId,
            fileUrl,
            fileName,
            clientType,
            documentType: this.inferDocumentType(fileName, clientType)
          }
        });

        if (error) {
          if (attempt < 2) {
            await this.delay(this.RETRY_DELAYS[attempt]);
            continue;
          }
          return { success: false, confidence: 0, cost: 0, error: error.message };
        }

        if (data?.success) {
          return {
            success: true,
            data: data,
            confidence: data.confidence || 0,
            cost: data.costBreakdown?.totalCost || 0
          };
        }

        return { success: false, confidence: 0, cost: 0, error: 'No data returned' };
      } catch (error) {
        if (attempt < 2) {
          await this.delay(this.RETRY_DELAYS[attempt]);
          continue;
        }
        return { 
          success: false, 
          confidence: 0, 
          cost: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    return { success: false, confidence: 0, cost: 0, error: 'Max retries exceeded' };
  }

  /**
   * Execute pure OpenAI extraction (fallback when Google Vision fails)
   */
  private static async executePureOpenAIExtraction(
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string
  ): Promise<{ success: boolean; data?: any; confidence: number; cost: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: {
          documentId,
          fileUrl,
          fileName,
          documentType: this.inferDocumentType(fileName, clientType)
        }
      });

      if (error) {
        return { success: false, confidence: 0, cost: 0, error: error.message };
      }

      if (data?.success) {
        return {
          success: true,
          data: data,
          confidence: data.confidence || 0,
          cost: data.tokensUsed ? (data.tokensUsed / 1000) * 0.03 : 0.05 // Estimate
        };
      }

      return { success: false, confidence: 0, cost: 0, error: 'No data returned' };
    } catch (error) {
      return { 
        success: false, 
        confidence: 0, 
        cost: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Template-based extraction for common document types
   */
  private static async executeTemplateBasedExtraction(
    documentId: string,
    fileName: string,
    clientType: string
  ): Promise<{ success: boolean; data?: any; confidence: number; error?: string }> {
    try {
      // Look for previously processed similar documents
      const { data: similarDocs, error } = await supabase
        .from('document_extractions')
        .select('extracted_data, confidence_score')
        .ilike('file_name', `%${this.extractDocumentPattern(fileName)}%`)
        .eq('client_type', clientType)
        .gte('confidence_score', 0.8)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error || !similarDocs || similarDocs.length === 0) {
        return { success: false, confidence: 0, error: 'No similar documents found' };
      }

      // Create template from successful extractions
      const template = this.createTemplate(similarDocs);
      
      return {
        success: true,
        data: {
          extractedData: template,
          method: 'template_based',
          templateSource: similarDocs.length
        },
        confidence: 0.6 // Lower confidence for template-based
      };
    } catch (error) {
      return { 
        success: false, 
        confidence: 0, 
        error: error instanceof Error ? error.message : 'Template creation failed' 
      };
    }
  }

  /**
   * Queue document for manual review
   */
  private static async queueForManualReview(
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string,
    errors: string[]
  ): Promise<void> {
    await supabase
      .from('manual_review_queue')
      .insert({
        document_id: documentId,
        file_url: fileUrl,
        file_name: fileName,
        client_type: clientType,
        priority: 'high',
        reason: 'Automatic extraction failed',
        error_details: errors,
        queued_at: new Date().toISOString(),
        status: 'queued'
      });
  }

  /**
   * Check service health status
   */
  private static async checkServiceHealth(): Promise<ServiceHealth> {
    try {
      const { data, error } = await supabase
        .from('service_health_status')
        .select('*')
        .order('last_checked', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Default to healthy if no health data
        return {
          google_vision: 'healthy',
          openai: 'healthy',
          last_checked: new Date().toISOString()
        };
      }

      // Check if health data is stale
      const lastChecked = new Date(data.last_checked);
      const now = new Date();
      const isStale = (now.getTime() - lastChecked.getTime()) > this.HEALTH_CHECK_INTERVAL;

      if (isStale) {
        // Perform fresh health check
        return await this.performHealthCheck();
      }

      return {
        google_vision: data.google_vision_status,
        openai: data.openai_status,
        last_checked: data.last_checked
      };
    } catch {
      return {
        google_vision: 'healthy',
        openai: 'healthy',
        last_checked: new Date().toISOString()
      };
    }
  }

  /**
   * Perform active health check on services
   */
  private static async performHealthCheck(): Promise<ServiceHealth> {
    const health: ServiceHealth = {
      google_vision: 'healthy',
      openai: 'healthy',
      last_checked: new Date().toISOString()
    };

    // Quick health check - test with minimal request
    try {
      // Test Google Vision API
      const visionResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')}`
        },
        body: JSON.stringify({
          requests: [{
            image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      });
      
      health.google_vision = visionResponse.ok ? 'healthy' : 'degraded';
    } catch {
      health.google_vision = 'down';
    }

    try {
      // Test OpenAI API
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
        }
      });
      
      health.openai = openaiResponse.ok ? 'healthy' : 'degraded';
    } catch {
      health.openai = 'down';
    }

    // Store health status
    await supabase
      .from('service_health_status')
      .upsert({
        id: 1,
        google_vision_status: health.google_vision,
        openai_status: health.openai,
        last_checked: health.last_checked
      });

    return health;
  }

  // Helper methods
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static inferDocumentType(fileName: string, clientType: string): string {
    const lowerName = fileName.toLowerCase();
    
    const typeMapping: Record<string, string[]> = {
      'tax_form': ['tax', 'impot', 'declaration'],
      'identity': ['cni', 'passport', 'identity', 'identite'],
      'business_registration': ['kbis', 'k-bis', 'siret', 'siren'],
      'agricultural_subsidy': ['cap', 'pac', 'subsidy', 'aide'],
      'certification': ['bio', 'organic', 'certif'],
      'other': []
    };

    for (const [type, patterns] of Object.entries(typeMapping)) {
      if (patterns.some(pattern => lowerName.includes(pattern))) {
        return type;
      }
    }

    return clientType + '_document';
  }

  private static extractDocumentPattern(fileName: string): string {
    // Extract key pattern from filename for template matching
    const baseName = fileName.toLowerCase().replace(/\.[^/.]+$/, '');
    const patterns = baseName.match(/[a-z]+/g) || [];
    return patterns.slice(0, 2).join('_'); // First two words
  }

  private static createTemplate(similarDocs: any[]): any {
    // Create a template from successful similar documents
    const template: any = {};
    const allFields = new Set<string>();

    // Collect all possible fields
    similarDocs.forEach(doc => {
      if (doc.extracted_data) {
        Object.keys(doc.extracted_data).forEach(field => allFields.add(field));
      }
    });

    // For each field, use the most common value or leave empty
    allFields.forEach(field => {
      const values = similarDocs
        .map(doc => doc.extracted_data?.[field])
        .filter(Boolean);
      
      if (values.length > 0) {
        // Use most common value or first if all unique
        const valueCounts: Record<string, number> = {};
        values.forEach(value => {
          const strValue = String(value);
          valueCounts[strValue] = (valueCounts[strValue] || 0) + 1;
        });
        
        const mostCommon = Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)[0];
        
        template[field] = mostCommon[0];
      }
    });

    return template;
  }
}