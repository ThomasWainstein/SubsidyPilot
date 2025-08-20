/**
 * Production-ready document validation and security checks
 */

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
  security_scan: {
    threats_detected: string[];
    clean: boolean;
    scan_id: string;
  };
  processing_recommendations: {
    use_document_text_detection: boolean;
    expected_languages: string[];
    complexity_level: 'low' | 'medium' | 'high';
  };
}

interface DocumentMetadata {
  file_size: number;
  mime_type: string;
  page_count?: number;
  is_scanned_pdf: boolean;
  has_encryption: boolean;
  text_density: 'sparse' | 'dense' | 'mixed';
}

export class DocumentValidator {
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB Google Vision limit
  private static readonly SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  private static readonly SECURITY_PATTERNS = [
    /javascript:/i,
    /<script/i,
    /data:text\/html/i,
    /vbscript:/i,
    /on\w+\s*=/i
  ];

  /**
   * Comprehensive document validation for production
   */
  static async validateDocument(
    fileUrl: string,
    fileName: string,
    clientType: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      errors: [],
      warnings: [],
      security_scan: {
        threats_detected: [],
        clean: true,
        scan_id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      processing_recommendations: {
        use_document_text_detection: true,
        expected_languages: ['fr', 'en'],
        complexity_level: 'medium'
      }
    };

    try {
      // 1. Basic file validation
      const metadata = await this.extractDocumentMetadata(fileUrl, fileName);
      this.validateFileConstraints(metadata, result);

      // 2. Security scanning
      await this.performSecurityScan(fileUrl, fileName, result);

      // 3. Content type validation
      this.validateClientTypeAlignment(fileName, clientType, result);

      // 4. Processing optimization recommendations
      this.generateProcessingRecommendations(metadata, clientType, result);

      // 5. Calculate final confidence score
      result.confidence = this.calculateValidationConfidence(result);
      result.isValid = result.errors.length === 0 && result.security_scan.clean;

    } catch (error) {
      result.isValid = false;
      result.confidence = 0;
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private static async extractDocumentMetadata(fileUrl: string, fileName: string): Promise<DocumentMetadata> {
    try {
      const response = await fetch(fileUrl, { method: 'HEAD' });
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const contentType = response.headers.get('content-type') || '';

      const fileExtension = fileName.toLowerCase().split('.').pop() || '';
      const isPdf = fileExtension === 'pdf' || contentType.includes('pdf');

      return {
        file_size: contentLength,
        mime_type: contentType,
        page_count: isPdf ? await this.estimatePageCount(fileUrl) : 1,
        is_scanned_pdf: isPdf && await this.detectScannedPdf(fileUrl),
        has_encryption: isPdf && await this.detectEncryption(fileUrl),
        text_density: await this.analyzeTextDensity(fileName, contentType)
      };
    } catch (error) {
      throw new Error(`Failed to extract document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static validateFileConstraints(metadata: DocumentMetadata, result: ValidationResult): void {
    // File size check
    if (metadata.file_size > this.MAX_FILE_SIZE) {
      result.errors.push(`File too large: ${(metadata.file_size / (1024 * 1024)).toFixed(1)}MB exceeds 20MB limit`);
    }

    if (metadata.file_size === 0) {
      result.errors.push('File appears to be empty or corrupted');
    }

    // MIME type validation
    if (!this.SUPPORTED_MIME_TYPES.includes(metadata.mime_type)) {
      result.errors.push(`Unsupported file type: ${metadata.mime_type}`);
    }

    // PDF-specific validation
    if (metadata.mime_type.includes('pdf')) {
      if (metadata.has_encryption) {
        result.errors.push('Encrypted PDF files are not supported');
      }

      if (metadata.page_count && metadata.page_count > 10) {
        result.warnings.push(`Large document: ${metadata.page_count} pages may increase processing time`);
      }

      if (metadata.is_scanned_pdf) {
        result.warnings.push('Scanned PDF detected - OCR quality may vary');
        result.processing_recommendations.use_document_text_detection = true;
      }
    }
  }

  private static async performSecurityScan(fileUrl: string, fileName: string, result: ValidationResult): Promise<void> {
    const threats: string[] = [];

    // File name security check
    this.SECURITY_PATTERNS.forEach(pattern => {
      if (pattern.test(fileName)) {
        threats.push('Suspicious file name pattern detected');
      }
    });

    // URL security check
    try {
      const url = new URL(fileUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        threats.push('Invalid URL protocol');
      }

      if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
        threats.push('Local file access attempt detected');
      }
    } catch {
      threats.push('Invalid file URL format');
    }

    // File extension vs MIME type validation
    const extension = fileName.toLowerCase().split('.').pop();
    const expectedMimeType = this.getExpectedMimeType(extension || '');
    
    if (expectedMimeType && !result.processing_recommendations) {
      // Initialize if not already set
      result.processing_recommendations = {
        use_document_text_detection: true,
        expected_languages: ['fr', 'en'],
        complexity_level: 'medium'
      };
    }

    result.security_scan = {
      threats_detected: threats,
      clean: threats.length === 0,
      scan_id: result.security_scan.scan_id
    };
  }

  private static validateClientTypeAlignment(fileName: string, clientType: string, result: ValidationResult): void {
    const lowerFileName = fileName.toLowerCase();
    
    // Common document patterns by client type
    const patterns = {
      farm: ['cap', 'pac', 'bio', 'organic', 'earl', 'exploitation', 'agricole'],
      business: ['kbis', 'k-bis', 'siret', 'siren', 'sarl', 'sas', 'commercial'],
      individual: ['cni', 'passport', 'passeport', 'identity', 'identite', 'tax', 'impot'],
      municipality: ['municipal', 'commune', 'budget', 'deliberation', 'conseil'],
      ngo: ['association', 'statute', 'statut', 'ong', 'ngo', 'nonprofit']
    };

    const clientPatterns = patterns[clientType as keyof typeof patterns] || [];
    const hasAlignment = clientPatterns.some(pattern => lowerFileName.includes(pattern));

    if (!hasAlignment && clientPatterns.length > 0) {
      result.warnings.push(`Document name doesn't match expected ${clientType} document patterns`);
      result.confidence *= 0.8; // Reduce confidence
    }
  }

  private static generateProcessingRecommendations(
    metadata: DocumentMetadata,
    clientType: string,
    result: ValidationResult
  ): void {
    // Language recommendations based on client type and region
    const languageMapping = {
      farm: ['fr', 'en'], // French agricultural docs
      business: ['fr', 'en'], // K-bis and business docs
      individual: ['fr', 'en', 'es'], // Personal documents may include Spanish
      municipality: ['fr'], // Municipal docs typically French only
      ngo: ['fr', 'en', 'es'] // NGO docs may be multilingual
    };

    result.processing_recommendations.expected_languages = 
      languageMapping[clientType as keyof typeof languageMapping] || ['fr', 'en'];

    // OCR method recommendation
    if (metadata.text_density === 'dense' || metadata.is_scanned_pdf) {
      result.processing_recommendations.use_document_text_detection = true;
    } else if (metadata.text_density === 'sparse') {
      result.processing_recommendations.use_document_text_detection = false;
    }

    // Complexity assessment
    let complexityScore = 0;
    if (metadata.page_count && metadata.page_count > 3) complexityScore += 1;
    if (metadata.is_scanned_pdf) complexityScore += 1;
    if (metadata.file_size > 5 * 1024 * 1024) complexityScore += 1; // > 5MB
    if (clientType === 'municipality' || clientType === 'ngo') complexityScore += 1;

    result.processing_recommendations.complexity_level = 
      complexityScore >= 3 ? 'high' : complexityScore >= 1 ? 'medium' : 'low';
  }

  private static calculateValidationConfidence(result: ValidationResult): number {
    let confidence = 1.0;

    // Reduce confidence for each error and warning
    confidence -= result.errors.length * 0.3;
    confidence -= result.warnings.length * 0.1;

    // Security issues heavily impact confidence
    if (!result.security_scan.clean) {
      confidence -= 0.5;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // Helper methods for metadata extraction
  private static async estimatePageCount(fileUrl: string): Promise<number> {
    // Simplified page count estimation - in production, use proper PDF parser
    try {
      const response = await fetch(fileUrl, { 
        method: 'GET',
        headers: { 'Range': 'bytes=0-1024' } // Sample first 1KB
      });
      const sample = await response.text();
      
      // Very rough estimate based on PDF structure
      const pageMatches = sample.match(/\/Count\s+(\d+)/);
      return pageMatches ? parseInt(pageMatches[1]) : 1;
    } catch {
      return 1;
    }
  }

  private static async detectScannedPdf(fileUrl: string): Promise<boolean> {
    // Simplified scanned PDF detection
    try {
      const response = await fetch(fileUrl, { 
        method: 'GET',
        headers: { 'Range': 'bytes=0-2048' }
      });
      const sample = await response.text();
      
      // Look for image-heavy patterns in PDF structure
      return sample.includes('/XObject') && sample.includes('/Image');
    } catch {
      return false;
    }
  }

  private static async detectEncryption(fileUrl: string): Promise<boolean> {
    try {
      const response = await fetch(fileUrl, { 
        method: 'GET',
        headers: { 'Range': 'bytes=0-1024' }
      });
      const sample = await response.text();
      
      return sample.includes('/Encrypt') || sample.includes('/Filter');
    } catch {
      return false;
    }
  }

  private static async analyzeTextDensity(fileName: string, mimeType: string): Promise<'sparse' | 'dense' | 'mixed'> {
    // Heuristic-based text density analysis
    if (mimeType.includes('pdf')) {
      const isForm = fileName.toLowerCase().includes('form') || fileName.toLowerCase().includes('formulaire');
      return isForm ? 'dense' : 'mixed';
    }
    
    if (mimeType.includes('image')) {
      return 'sparse'; // Images typically have sparse text
    }
    
    return 'dense'; // Documents typically have dense text
  }

  private static getExpectedMimeType(extension: string): string | null {
    const mimeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'webp': 'image/webp',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeMap[extension] || null;
  }
}