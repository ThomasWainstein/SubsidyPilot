/**
 * Enhanced Document Parsers with Streaming, OCR, and Proper Error Handling
 * Deno-compatible parsers for PDF, DOCX, XLSX with chunking support
 */

import { crypto } from "https://deno.land/std@0.195.0/crypto/mod.ts";
import { 
  extractTablesFromPdf, 
  extractTablesFromDocx, 
  extractTablesFromXlsx,
  type TableExtractionResult,
  type ExtractedTable,
  type TextChunk
} from './tableExtraction.ts';

export interface ParsedDocument {
  text: string;
  chunks: TextChunk[];
  metadata: {
    pages?: number;
    language?: string;
    fileSize: number;
    mimeType: string;
    processingTime: number;
    extractionMethod: string;
    confidence: number;
    hash: string;
  };
  tables?: ExtractedTable[];
  tableCount?: number;
}

export interface TextChunk {
  content: string;
  type: 'text' | 'table';
  pageNumber?: number;
  metadata?: {
    tableIndex?: number;
    position?: { x: number; y: number; width: number; height: number };
  };
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  confidence: number;
  pageNumber?: number;
  tableIndex?: number;
  sourceFormat?: 'pdf' | 'docx' | 'xlsx';
  metadata?: {
    sheetName?: string; // For XLSX
    position?: { x: number; y: number; width: number; height: number }; // For PDF
    merged_cells?: Array<{ start: [number, number]; end: [number, number] }>; // For XLSX
  };
}

export interface ParseOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  enableOCR?: boolean;
  ocrFallbackThreshold?: number;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  maxChunkSize: 4000,
  overlapSize: 200,
  enableOCR: true,
  ocrFallbackThreshold: 0.3
};

/**
 * Detect MIME type using magic bytes
 */
export async function detectMimeType(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  
  // PDF signature
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  
  // ZIP-based formats (DOCX, XLSX)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    // Check for DOCX/XLSX specific signatures
    const text = new TextDecoder().decode(buffer.slice(0, 1000));
    if (text.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (text.includes('xl/')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/zip';
  }
  
  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    return 'image/jpeg';
  }
  
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  
  return 'application/octet-stream';
}

/**
 * Parse PDF using PDF.js with table extraction
 */
export async function parsePdfNative(buffer: ArrayBuffer, options: ParseOptions = {}): Promise<ParsedDocument> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    console.log('🔍 Starting native PDF parsing with table extraction...');
    
    // Extract tables first
    const tableResult = await extractTablesFromPdf(buffer);
    
    // Import PDF.js for text extraction
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    console.log(`📄 PDF loaded: ${numPages} pages, ${tableResult.tableCount} tables`);
    
    // Combine table chunks with any remaining text
    const processedChunks = combineTextAndTableChunks(tableResult.textChunks, opts.maxChunkSize);
    const fullText = tableResult.textChunks.map(chunk => chunk.content).join('\n\n');
    
    pdfDoc.cleanup();
    
    const confidence = calculateTextConfidence(fullText, buffer.byteLength);
    
    console.log(`✅ PDF parsing completed: ${fullText.length} chars, ${processedChunks.length} chunks, ${tableResult.tableCount} tables`);
    
    return {
      text: fullText,
      chunks: processedChunks,
      tables: tableResult.tables,
      tableCount: tableResult.tableCount,
      metadata: {
        pages: numPages,
        language: detectLanguage(fullText),
        fileSize: buffer.byteLength,
        mimeType: 'application/pdf',
        processingTime: Date.now() - startTime,
        extractionMethod: 'pdf-native-with-tables',
        confidence,
        hash: await calculateHash(buffer)
      }
    };
  } catch (error) {
    console.error('❌ Native PDF parsing failed:', error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * OCR fallback for scanned documents
 */
export async function runOcrFallback(buffer: ArrayBuffer, mimeType: string): Promise<ParsedDocument> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting OCR processing...');
    
    // Import Tesseract.js
    const Tesseract = await import('https://esm.sh/tesseract.js@5.0.4');
    
    let imageBuffer: ArrayBuffer;
    
    if (mimeType === 'application/pdf') {
      // Convert PDF first page to image for OCR
      imageBuffer = await convertPdfToImage(buffer);
    } else {
      imageBuffer = buffer;
    }
    
    // Run Tesseract OCR
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(new Uint8Array(imageBuffer));
    await worker.terminate();
    
    const confidence = data.confidence / 100;
    const processedText = normalizeText(data.text);
    const chunks = chunkText(processedText, 4000, 200);
    
    console.log(`✅ OCR completed: ${processedText.length} chars, confidence: ${confidence}`);
    
    return {
      text: processedText,
      chunks,
      metadata: {
        fileSize: buffer.byteLength,
        mimeType,
        processingTime: Date.now() - startTime,
        extractionMethod: 'ocr-tesseract',
        confidence,
        hash: await calculateHash(buffer),
        language: detectLanguage(processedText)
      }
    };
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Parse DOCX using mammoth with table extraction
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting DOCX parsing with table extraction...');
    
    // Extract tables first
    const tableResult = await extractTablesFromDocx(buffer);
    
    // Combine chunks
    const processedChunks = combineTextAndTableChunks(tableResult.textChunks, 4000);
    const fullText = tableResult.textChunks.map(chunk => chunk.content).join('\n\n');
    
    console.log(`✅ DOCX parsing completed: ${fullText.length} chars, ${tableResult.tableCount} tables`);
    
    return {
      text: fullText,
      chunks: processedChunks,
      tables: tableResult.tables,
      tableCount: tableResult.tableCount,
      metadata: {
        fileSize: buffer.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        processingTime: Date.now() - startTime,
        extractionMethod: 'docx-mammoth-with-tables',
        confidence: 0.95,
        hash: await calculateHash(buffer),
        language: detectLanguage(fullText)
      }
    };
  } catch (error) {
    console.error('❌ DOCX parsing failed:', error);
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
}

/**
 * Parse XLSX with enhanced table structure
 */
export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting XLSX parsing with enhanced table extraction...');
    
    // Use enhanced XLSX table extraction
    const tableResult = await extractTablesFromXlsx(buffer);
    
    // Combine chunks
    const processedChunks = combineTextAndTableChunks(tableResult.textChunks, 4000);
    const fullText = tableResult.textChunks.map(chunk => chunk.content).join('\n\n');
    
    console.log(`✅ XLSX parsing completed: ${tableResult.tableCount} sheets, ${fullText.length} chars`);
    
    return {
      text: fullText,
      chunks: processedChunks,
      tables: tableResult.tables,
      tableCount: tableResult.tableCount,
      metadata: {
        fileSize: buffer.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        processingTime: Date.now() - startTime,
        extractionMethod: 'xlsx-enhanced',
        confidence: 0.95,
        hash: await calculateHash(buffer),
        language: detectLanguage(fullText)
      }
    };
  } catch (error) {
    console.error('❌ XLSX parsing failed:', error);
    throw new Error(`XLSX parsing failed: ${error.message}`);
  }
}

/**
 * Normalize and clean extracted text
 */
export function normalizeText(text: string): string {
  return text
    // Normalize Unicode
    .normalize('NFC')
    // Fix line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Chunk text with overlap for better context preservation
 */
export function chunkText(text: string, maxSize: number = 4000, overlap: number = 200): string[] {
  if (text.length <= maxSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastSentence, lastNewline);
      
      if (breakPoint > start + maxSize * 0.8) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Combine text and table chunks while respecting size limits
 */
function combineTextAndTableChunks(textChunks: TextChunk[], maxSize: number): TextChunk[] {
  const result: TextChunk[] = [];
  let currentTextChunk = '';
  let currentPageNumber: number | undefined;
  
  for (const chunk of textChunks) {
    if (chunk.type === 'table') {
      // Tables get their own chunk always
      if (currentTextChunk.trim()) {
        result.push({
          content: currentTextChunk.trim(),
          type: 'text',
          pageNumber: currentPageNumber
        });
        currentTextChunk = '';
      }
      result.push(chunk);
    } else {
      // Accumulate text chunks
      if (currentTextChunk.length + chunk.content.length > maxSize) {
        if (currentTextChunk.trim()) {
          result.push({
            content: currentTextChunk.trim(),
            type: 'text',
            pageNumber: currentPageNumber
          });
        }
        currentTextChunk = chunk.content;
        currentPageNumber = chunk.pageNumber;
      } else {
        currentTextChunk += (currentTextChunk ? '\n\n' : '') + chunk.content;
        currentPageNumber = currentPageNumber || chunk.pageNumber;
      }
    }
  }
  
  // Add final text chunk
  if (currentTextChunk.trim()) {
    result.push({
      content: currentTextChunk.trim(),
      type: 'text',
      pageNumber: currentPageNumber
    });
  }
  
  return result;
}

/**
 * Calculate confidence based on text characteristics
 */
function calculateTextConfidence(text: string, fileSize: number): number {
  const textLength = text.length;
  const wordsCount = text.split(/\s+/).length;
  const avgWordLength = textLength / wordsCount;
  
  let confidence = 0.5; // Base confidence
  
  // Text density
  const textDensity = textLength / fileSize;
  if (textDensity > 0.01) confidence += 0.3;
  
  // Word characteristics
  if (avgWordLength > 3 && avgWordLength < 10) confidence += 0.2;
  
  // Text length
  if (textLength > 100) confidence += 0.1;
  
  return Math.min(0.95, Math.max(0.1, confidence));
}

/**
 * Basic language detection
 */
function detectLanguage(text: string): string {
  const sample = text.slice(0, 1000).toLowerCase();
  
  // Romanian
  if (/\b(și|cu|de|la|în|pe|pentru|din|este|sunt|avea|face)\b/.test(sample)) {
    return 'ro';
  }
  
  // French
  if (/\b(et|de|le|la|les|des|du|avec|pour|dans|sur|être|avoir)\b/.test(sample)) {
    return 'fr';
  }
  
  // Spanish
  if (/\b(y|de|el|la|los|las|del|con|para|en|por|ser|estar|tener)\b/.test(sample)) {
    return 'es';
  }
  
  // Default to English
  return 'en';
}

/**
 * Calculate SHA-256 hash of buffer
 */
async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert PDF first page to image for OCR
 */
async function convertPdfToImage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // This is a simplified implementation
  // In production, you'd use a proper PDF to image converter
  console.log('📸 Converting PDF to image for OCR...');
  
  // For now, return the PDF buffer (Tesseract can handle some PDFs directly)
  return buffer;
}

/**
 * Main document parser entry point
 */
export async function parseDocument(
  buffer: ArrayBuffer, 
  fileName: string, 
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  const mimeType = await detectMimeType(buffer);
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log(`🔍 Parsing document: ${fileName} (${mimeType}, ${buffer.byteLength} bytes)`);
  
  try {
    switch (mimeType) {
      case 'application/pdf':
        try {
          const result = await parsePdfNative(buffer, opts);
          
          // Check if OCR fallback is needed
          if (opts.enableOCR && result.metadata.confidence < opts.ocrFallbackThreshold) {
            console.log('📸 Low confidence, trying OCR fallback...');
            const ocrResult = await runOcrFallback(buffer, mimeType);
            
            if (ocrResult.text.length > result.text.length * 1.5) {
              return {
                ...ocrResult,
                metadata: {
                  ...ocrResult.metadata,
                  extractionMethod: 'pdf-native-with-ocr-fallback'
                }
              };
            }
          }
          
          return result;
        } catch (pdfError) {
          if (opts.enableOCR) {
            console.log('🔄 PDF parsing failed, falling back to OCR...');
            return await runOcrFallback(buffer, mimeType);
          }
          throw pdfError;
        }
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseDocx(buffer);
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return await parseXlsx(buffer);
        
      case 'image/jpeg':
      case 'image/png':
        if (opts.enableOCR) {
          return await runOcrFallback(buffer, mimeType);
        }
        throw new Error('OCR is disabled for image files');
        
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`❌ Document parsing failed for ${fileName}:`, error);
    throw error;
  }
}