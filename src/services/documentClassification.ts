/**
 * Document Classification Service using HuggingFace Transformers
 * Provides automated document type classification with confidence scoring
 */
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface ClassificationResult {
  category: string;
  confidence: number;
  model: string;
  alternatives: Array<{ category: string; confidence: number }>;
}

export interface DocumentClassificationService {
  classifyDocument(text: string, fileName: string): Promise<ClassificationResult>;
  isReady(): boolean;
}

class HuggingFaceDocumentClassifier implements DocumentClassificationService {
  private classifier: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // Document categories mapping
  private readonly categoryMapping = {
    'legal': ['contract', 'agreement', 'legal', 'terms', 'policy', 'license'],
    'financial': ['invoice', 'receipt', 'financial', 'payment', 'budget', 'statement'],
    'environmental': ['environmental', 'sustainability', 'green', 'carbon', 'emission'],
    'technical': ['technical', 'specification', 'manual', 'guide', 'documentation'],
    'certification': ['certificate', 'certification', 'accreditation', 'standard', 'compliance'],
    'other': ['other', 'miscellaneous', 'general']
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
      console.log('🤖 Initializing document classifier...');
      
      // Use a lightweight text classification model
      this.classifier = await pipeline(
        'text-classification',
        'microsoft/DialoGPT-medium', // Fallback to a general model
        {
          device: 'webgpu',
          dtype: 'fp16',
        }
      );
      
      this.isInitialized = true;
      console.log('✅ Document classifier initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize WebGPU classifier, falling back to CPU:', error);
      
      try {
        // Fallback to CPU
        this.classifier = await pipeline(
          'text-classification',
          'distilbert-base-uncased-finetuned-sst-2-english',
          { device: 'cpu' }
        );
        this.isInitialized = true;
        console.log('✅ Document classifier initialized on CPU');
      } catch (fallbackError) {
        console.error('❌ Failed to initialize document classifier:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async classifyDocument(text: string, fileName: string): Promise<ClassificationResult> {
    try {
      await this.initialize();

      if (!this.classifier) {
        throw new Error('Classifier not initialized');
      }

      // Prepare text for classification (first 512 characters)
      const cleanText = this.preprocessText(text, fileName);
      
      // Use rule-based classification as primary method for now
      const ruleBasedResult = this.ruleBasedClassification(cleanText, fileName);
      
      // TODO: In future iterations, combine with ML model results
      // const mlResult = await this.classifier(cleanText);
      
      return {
        category: ruleBasedResult.category,
        confidence: ruleBasedResult.confidence,
        model: 'rule-based-v1',
        alternatives: ruleBasedResult.alternatives
      };
      
    } catch (error) {
      console.error('❌ Document classification failed:', error);
      
      // Fallback to rule-based classification
      const fallbackResult = this.ruleBasedClassification(text, fileName);
      return {
        ...fallbackResult,
        model: 'rule-based-fallback'
      };
    }
  }

  private preprocessText(text: string, fileName: string): string {
    // Combine filename and text content for better classification
    const fileInfo = `Filename: ${fileName}\n`;
    const truncatedText = text.substring(0, 500);
    return fileInfo + truncatedText;
  }

  private ruleBasedClassification(text: string, fileName: string): ClassificationResult {
    const lowerText = text.toLowerCase();
    const lowerFileName = fileName.toLowerCase();
    const combined = lowerText + ' ' + lowerFileName;

    const scores: Record<string, number> = {};
    
    // Initialize all categories with base score
    Object.keys(this.categoryMapping).forEach(category => {
      scores[category] = 0;
    });

    // Score based on keyword matching
    Object.entries(this.categoryMapping).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = combined.match(regex);
        if (matches) {
          scores[category] += matches.length * 10;
        }
      });
    });

    // Additional scoring based on file extension and patterns
    if (fileName.includes('invoice') || fileName.includes('receipt')) {
      scores['financial'] += 20;
    }
    if (fileName.includes('contract') || fileName.includes('agreement')) {
      scores['legal'] += 20;
    }
    if (fileName.includes('manual') || fileName.includes('spec')) {
      scores['technical'] += 20;
    }
    if (fileName.includes('cert') || fileName.includes('certificate')) {
      scores['certification'] += 20;
    }

    // Find the highest scoring category
    const sortedScores = Object.entries(scores)
      .sort(([,a], [,b]) => b - a);
    
    const topCategory = sortedScores[0];
    const maxScore = topCategory[1];
    
    // Calculate confidence based on score separation
    const confidence = Math.min(0.95, Math.max(0.1, maxScore / 100));
    
    // Build alternatives list
    const alternatives = sortedScores
      .slice(1, 4)
      .map(([category, score]) => ({
        category,
        confidence: Math.max(0.01, score / 100)
      }));

    return {
      category: topCategory[0],
      confidence,
      model: 'rule-based-v1',
      alternatives
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
let classifierInstance: DocumentClassificationService | null = null;

export const getDocumentClassifier = (): DocumentClassificationService => {
  if (!classifierInstance) {
    classifierInstance = new HuggingFaceDocumentClassifier();
  }
  return classifierInstance;
};

// Utility function for quick classification
export const classifyDocumentText = async (
  text: string, 
  fileName: string
): Promise<ClassificationResult> => {
  const classifier = getDocumentClassifier();
  return await classifier.classifyDocument(text, fileName);
};