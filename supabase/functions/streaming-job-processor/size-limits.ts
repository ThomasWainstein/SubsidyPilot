// Size limits and async processing detection
export interface ProcessingLimits {
  maxSyncSize: number; // 10MB
  maxSyncPages: number; // 50 pages
  maxTotalSize: number; // 150MB
  memoryThreshold: number; // 100MB in memory
}

export const PROCESSING_LIMITS: ProcessingLimits = {
  maxSyncSize: 10 * 1024 * 1024, // 10MB
  maxSyncPages: 50,
  maxTotalSize: 150 * 1024 * 1024, // 150MB
  memoryThreshold: 100 * 1024 * 1024 // 100MB
};

export interface SizeAnalysis {
  fileSize: number;
  estimatedPages: number;
  estimatedMemoryUsage: number;
  processingMode: 'sync' | 'async' | 'rejected';
  reasoning: string;
  warnings: string[];
}

export class SizeLimitGuard {
  static analyzeDocument(
    fileSize: number, 
    fileName: string, 
    mimeType?: string
  ): SizeAnalysis {
    const warnings: string[] = [];
    let estimatedPages = 1;
    let processingMode: 'sync' | 'async' | 'rejected' = 'sync';
    let reasoning = '';

    // Estimate pages based on file size and type
    if (fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf') {
      // PDFs: rough estimate of 50KB per page on average
      estimatedPages = Math.max(1, Math.floor(fileSize / (50 * 1024)));
    } else if (fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
      // Images: single page but high memory usage
      estimatedPages = 1;
    } else if (fileName.toLowerCase().match(/\.(xlsx?|csv)$/i)) {
      // Spreadsheets: estimate based on file size, can be memory intensive
      estimatedPages = Math.max(1, Math.floor(fileSize / (100 * 1024)));
    }

    // Estimate memory usage (base64 encoding increases size by ~33%, plus processing overhead)
    const base64Size = fileSize * 1.33;
    const processingOverhead = fileSize * 0.5; // Additional memory for processing
    const estimatedMemoryUsage = base64Size + processingOverhead;

    // Determine processing mode
    if (fileSize > PROCESSING_LIMITS.maxTotalSize) {
      processingMode = 'rejected';
      reasoning = `File size ${this.formatSize(fileSize)} exceeds maximum limit of ${this.formatSize(PROCESSING_LIMITS.maxTotalSize)}`;
    } else if (
      fileSize > PROCESSING_LIMITS.maxSyncSize || 
      estimatedPages > PROCESSING_LIMITS.maxSyncPages ||
      estimatedMemoryUsage > PROCESSING_LIMITS.memoryThreshold
    ) {
      processingMode = 'async';
      reasoning = `Large document (${this.formatSize(fileSize)}, ~${estimatedPages} pages) requires async processing to prevent timeouts`;
      
      if (estimatedMemoryUsage > PROCESSING_LIMITS.memoryThreshold) {
        warnings.push(`High memory usage expected: ${this.formatSize(estimatedMemoryUsage)}`);
      }
    } else {
      processingMode = 'sync';
      reasoning = `Small document (${this.formatSize(fileSize)}, ~${estimatedPages} pages) suitable for real-time processing`;
    }

    // Add specific warnings
    if (fileName.toLowerCase().endsWith('.pdf') && fileSize > 5 * 1024 * 1024) {
      warnings.push('Large PDFs may contain scanned images requiring intensive OCR processing');
    }

    if (estimatedPages > 100) {
      warnings.push(`High page count (${estimatedPages}) may result in longer processing times`);
    }

    if (fileName.toLowerCase().match(/\.(tiff?|bmp)$/i)) {
      warnings.push('Uncompressed image formats use more memory and processing time');
    }

    return {
      fileSize,
      estimatedPages,
      estimatedMemoryUsage,
      processingMode,
      reasoning,
      warnings
    };
  }

  static shouldUseAsyncProcessing(analysis: SizeAnalysis): boolean {
    return analysis.processingMode === 'async';
  }

  static isRejected(analysis: SizeAnalysis): boolean {
    return analysis.processingMode === 'rejected';
  }

  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getProcessingRecommendation(analysis: SizeAnalysis): string {
    if (analysis.processingMode === 'rejected') {
      return `Document too large (${this.formatSize(analysis.fileSize)}). Maximum supported size is ${this.formatSize(PROCESSING_LIMITS.maxTotalSize)}. Consider splitting the document or using a smaller file.`;
    }

    if (analysis.processingMode === 'async') {
      return `Large document detected (${this.formatSize(analysis.fileSize)}, ~${analysis.estimatedPages} pages). Processing will use async mode with Google Cloud Storage for optimal performance and memory usage.`;
    }

    return `Document size is optimal for real-time processing (${this.formatSize(analysis.fileSize)}, ~${analysis.estimatedPages} pages).`;
  }

  static getCostEstimate(analysis: SizeAnalysis): { estimatedCost: number; explanation: string } {
    // Rough cost estimates based on Google Vision pricing
    const basePerPage = 0.0015; // $1.50 per 1000 pages
    const ocrCost = analysis.estimatedPages * basePerPage;
    
    // Add processing overhead for large documents
    const processingMultiplier = analysis.processingMode === 'async' ? 1.2 : 1.0;
    const estimatedCost = ocrCost * processingMultiplier;

    const explanation = `Estimated cost: $${estimatedCost.toFixed(4)} (${analysis.estimatedPages} pages × $${basePerPage}/page${processingMultiplier > 1 ? ' × async processing overhead' : ''})`;

    return { estimatedCost, explanation };
  }
}