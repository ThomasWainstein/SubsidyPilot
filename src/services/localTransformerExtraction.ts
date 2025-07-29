/**
 * Local Transformer-Based Document Extraction Service
 * Uses LayoutLM/DistilBERT models for local entity extraction with fallback to cloud
 */
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface LocalExtractionResult {
  extractedFields: ExtractedField[];
  overallConfidence: number;
  processingTime: number;
  modelUsed: string;
  fallbackRecommended: boolean;
  errorMessage?: string;
}

export interface LocalExtractionService {
  extractFromText(text: string, documentType: string): Promise<LocalExtractionResult>;
  isReady(): boolean;
  getConfidenceThreshold(): number;
  setConfidenceThreshold(threshold: number): void;
}

class HuggingFaceLocalExtractor implements LocalExtractionService {
  private nerPipeline: any = null;
  private qaPersonPipeline: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private confidenceThreshold = 0.7; // Default threshold for fallback

  // Field extraction patterns by document type
  private readonly fieldPatterns = {
    financial: [
      { field: 'invoice_number', questions: ['What is the invoice number?', 'What is the document number?'] },
      { field: 'total_amount', questions: ['What is the total amount?', 'What is the final amount?'] },
      { field: 'date', questions: ['What is the invoice date?', 'What is the document date?'] },
      { field: 'vendor_name', questions: ['Who is the vendor?', 'What is the company name?'] },
      { field: 'due_date', questions: ['When is the due date?', 'When is payment due?'] }
    ],
    legal: [
      { field: 'contract_date', questions: ['What is the contract date?', 'When was this signed?'] },
      { field: 'parties', questions: ['Who are the parties?', 'Who are the contracting parties?'] },
      { field: 'effective_date', questions: ['What is the effective date?', 'When does this take effect?'] },
      { field: 'termination_date', questions: ['What is the termination date?', 'When does this expire?'] }
    ],
    technical: [
      { field: 'document_title', questions: ['What is the document title?', 'What is this document about?'] },
      { field: 'version', questions: ['What is the version?', 'What version is this?'] },
      { field: 'date_created', questions: ['When was this created?', 'What is the creation date?'] },
      { field: 'author', questions: ['Who is the author?', 'Who created this?'] }
    ],
    certification: [
      { field: 'certificate_number', questions: ['What is the certificate number?', 'What is the certification ID?'] },
      { field: 'issue_date', questions: ['When was this issued?', 'What is the issue date?'] },
      { field: 'expiry_date', questions: ['When does this expire?', 'What is the expiry date?'] },
      { field: 'issuing_authority', questions: ['Who issued this?', 'What is the issuing authority?'] }
    ],
    other: [
      { field: 'document_type', questions: ['What type of document is this?'] },
      { field: 'date', questions: ['What is the date?', 'When was this created?'] },
      { field: 'reference', questions: ['What is the reference number?', 'What is the document reference?'] }
    ]
  };

  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🤖 Initializing local transformer extraction...');
      
      // Initialize NER pipeline for entity recognition
      this.nerPipeline = await pipeline(
        'token-classification',
        'dbmdz/bert-large-cased-finetuned-conll03-english',
        {
          device: 'webgpu',
          dtype: 'fp16',
        }
      );

      // Initialize QA pipeline for specific field extraction
      this.qaPersonPipeline = await pipeline(
        'question-answering',
        'distilbert-base-cased-distilled-squad',
        {
          device: 'webgpu',
          dtype: 'fp16',
        }
      );
      
      this.isInitialized = true;
      console.log('✅ Local transformer extraction initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize WebGPU, falling back to CPU:', error);
      
      try {
        // Fallback to CPU
        this.nerPipeline = await pipeline(
          'token-classification',
          'dbmdz/bert-large-cased-finetuned-conll03-english',
          { device: 'cpu' }
        );

        this.qaPersonPipeline = await pipeline(
          'question-answering',
          'distilbert-base-cased-distilled-squad',
          { device: 'cpu' }
        );
        
        this.isInitialized = true;
        console.log('✅ Local transformer extraction initialized on CPU');
      } catch (fallbackError) {
        console.error('❌ Failed to initialize local extraction:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async extractFromText(text: string, documentType: string): Promise<LocalExtractionResult> {
    const startTime = Date.now();
    
    try {
      await this.initialize();

      if (!this.nerPipeline || !this.qaPersonPipeline) {
        throw new Error('Extraction pipelines not initialized');
      }

      const extractedFields: ExtractedField[] = [];
      
      // Get field patterns for the document type
      const patterns = this.fieldPatterns[documentType as keyof typeof this.fieldPatterns] || this.fieldPatterns.other;
      
      // Extract fields using question-answering approach
      for (const pattern of patterns) {
        let bestAnswer = null;
        let bestScore = 0;
        
        // Try each question variant for this field
        for (const question of pattern.questions) {
          try {
            const result = await this.qaPersonPipeline({
              question,
              context: text.substring(0, 2000) // Limit context to avoid token limits
            });
            
            if (result.score > bestScore && result.score > 0.1) {
              bestAnswer = result;
              bestScore = result.score;
            }
          } catch (error) {
            console.warn(`Failed to extract for question "${question}":`, error);
          }
        }
        
        if (bestAnswer && bestAnswer.answer.trim()) {
          extractedFields.push({
            field: pattern.field,
            value: bestAnswer.answer.trim(),
            confidence: bestScore,
            startIndex: bestAnswer.start,
            endIndex: bestAnswer.end
          });
        }
      }

      // Also run NER for additional entity extraction
      try {
        const nerResults = await this.nerPipeline(text.substring(0, 1000));
        
        // Process NER results and add high-confidence entities
        if (Array.isArray(nerResults)) {
          const processedEntities = this.processNERResults(nerResults);
          extractedFields.push(...processedEntities);
        }
      } catch (error) {
        console.warn('NER extraction failed:', error);
      }

      // Calculate overall confidence
      const overallConfidence = extractedFields.length > 0 
        ? extractedFields.reduce((sum, field) => sum + field.confidence, 0) / extractedFields.length
        : 0;

      // Determine if fallback is recommended
      const fallbackRecommended = overallConfidence < this.confidenceThreshold || extractedFields.length < 2;

      const processingTime = Date.now() - startTime;

      return {
        extractedFields,
        overallConfidence,
        processingTime,
        modelUsed: 'local-transformers-v1',
        fallbackRecommended
      };

    } catch (error) {
      console.error('❌ Local extraction failed:', error);
      
      return {
        extractedFields: [],
        overallConfidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'local-transformers-v1',
        fallbackRecommended: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  private processNERResults(nerResults: any[]): ExtractedField[] {
    const entities: ExtractedField[] = [];
    const entityMap = new Map<string, { tokens: any[], confidence: number }>();
    
    // Group consecutive tokens by entity type
    for (const token of nerResults) {
      if (token.entity && token.entity.startsWith('B-') && token.score > 0.5) {
        const entityType = token.entity.substring(2); // Remove B- prefix
        const key = `${entityType}_${token.start}`;
        
        entityMap.set(key, {
          tokens: [token],
          confidence: token.score
        });
      }
    }
    
    // Convert grouped entities to extracted fields
    for (const [key, entity] of entityMap) {
      const entityType = key.split('_')[0];
      const value = entity.tokens.map(t => t.word).join(' ').replace(/##/g, '');
      
      if (value.trim() && entity.confidence > 0.5) {
        entities.push({
          field: `ner_${entityType.toLowerCase()}`,
          value: value.trim(),
          confidence: entity.confidence,
          startIndex: entity.tokens[0].start,
          endIndex: entity.tokens[entity.tokens.length - 1].end
        });
      }
    }
    
    return entities;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }
}

// Singleton instance
let extractorInstance: LocalExtractionService | null = null;

export const getLocalExtractor = (): LocalExtractionService => {
  if (!extractorInstance) {
    extractorInstance = new HuggingFaceLocalExtractor();
  }
  return extractorInstance;
};

// Utility function for quick extraction
export const extractLocallyFromText = async (
  text: string, 
  documentType: string
): Promise<LocalExtractionResult> => {
  const extractor = getLocalExtractor();
  return await extractor.extractFromText(text, documentType);
};