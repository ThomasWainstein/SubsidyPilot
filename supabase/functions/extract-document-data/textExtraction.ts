/**
 * Text Extraction Service for Farm Documents
 * Handles PDF, DOCX, XLSX, TXT, and CSV files with OCR fallback
 */

import { OCRResult, extractTextWithOCR, shouldUseOCR } from './ocrService.ts';

export interface TextExtractionResult {
  text: string;
  debugInfo: {
    extractionMethod: string;
    fileSize: number;
    processingTime: number;
    warnings?: string[];
    ocrUsed?: boolean;
    ocrResult?: OCRResult;
  };
}

/**
 * Extract text from various file types
 */
export async function extractTextFromFile(
  fileResponse: Response,
  fileName: string,
  openAIApiKey: string
): Promise<TextExtractionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  let extractionMethod = 'unknown';
  let text = '';

  try {
    const fileSize = parseInt(fileResponse.headers.get('content-length') || '0');
    const contentType = fileResponse.headers.get('content-type') || '';
    const fileExtension = fileName.toLowerCase().split('.').pop() || '';

    console.log(`🔍 Extracting text from: ${fileName} (${contentType}, ${fileSize} bytes)`);

    // Handle different file types
    if (fileExtension === 'txt' || contentType.includes('text/plain')) {
      extractionMethod = 'direct_text';
      text = await fileResponse.text();
    } 
    else if (fileExtension === 'csv' || contentType.includes('text/csv')) {
      extractionMethod = 'csv_parsing';
      text = await extractFromCSV(await fileResponse.text());
    }
    else if (fileExtension === 'pdf' || contentType.includes('application/pdf')) {
      extractionMethod = 'pdf_ocr_ai';
      text = await extractFromPDFWithAI(await fileResponse.arrayBuffer(), openAIApiKey);
    }
    else if (fileExtension === 'docx' || contentType.includes('wordprocessingml')) {
      extractionMethod = 'docx_parsing';
      text = await extractFromDOCX(await fileResponse.arrayBuffer());
    }
    else if (fileExtension === 'xlsx' || contentType.includes('spreadsheetml')) {
      extractionMethod = 'xlsx_parsing';
      text = await extractFromXLSX(await fileResponse.arrayBuffer());
    }
    else {
      extractionMethod = 'fallback_text';
      warnings.push(`Unsupported file type: ${contentType}, attempting text extraction`);
      text = await fileResponse.text();
    }

    // Clean up extracted text
    text = cleanExtractedText(text);

    // Check if OCR should be used as fallback
    let ocrUsed = false;
    let ocrResult: OCRResult | undefined;
    
    if (shouldUseOCR(text, fileSize, fileName)) {
      console.log('🔍 Text extraction coverage low, attempting OCR...');
      
      try {
        // Convert file to image buffer for OCR
        const imageBuffer = await convertToImageBuffer(fileResponse, fileExtension);
        ocrResult = await extractTextWithOCR(imageBuffer);
        
        // Use OCR text if it's significantly better
        if (ocrResult.text.length > text.length * 1.5 || ocrResult.confidence > 0.7) {
          text = ocrResult.text;
          extractionMethod = `${extractionMethod}_with_ocr`;
          ocrUsed = true;
          console.log(`✅ OCR improved extraction: ${text.length} characters, confidence: ${ocrResult.confidence}`);
        } else {
          console.log(`⚠️ OCR didn't improve extraction significantly`);
        }
      } catch (ocrError) {
        console.error('❌ OCR fallback failed:', ocrError);
        warnings.push(`OCR fallback failed: ${ocrError.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Text extraction completed: ${text.length} characters in ${processingTime}ms`);

    return {
      text,
      debugInfo: {
        extractionMethod,
        fileSize,
        processingTime,
        warnings: warnings.length > 0 ? warnings : undefined,
        ocrUsed,
        ocrResult
      }
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Text extraction failed for ${fileName}:`, error);
    
    return {
      text: '',
      debugInfo: {
        extractionMethod: `${extractionMethod}_failed`,
        fileSize: 0,
        processingTime,
        warnings: [`Extraction failed: ${error.message}`]
      }
    };
  }
}

/**
 * Extract text from CSV files
 */
async function extractFromCSV(csvContent: string): Promise<string> {
  try {
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',') || [];
    
    let extractedText = `CSV Document with ${headers.length} columns:\n`;
    extractedText += `Headers: ${headers.join(', ')}\n\n`;
    
    // Include first few rows as context
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      if (lines[i]?.trim()) {
        const values = lines[i].split(',');
        extractedText += `Row ${i}: ${values.join(' | ')}\n`;
      }
    }
    
    if (lines.length > 6) {
      extractedText += `... and ${lines.length - 6} more rows\n`;
    }
    
    return extractedText;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF using AI Vision
 */
async function extractFromPDFWithAI(pdfBuffer: ArrayBuffer, openAIApiKey: string): Promise<string> {
  try {
    console.log('🤖 Using AI for PDF text extraction...');
    
    // Convert PDF to base64 for AI processing
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract all text content from this PDF document. Focus on farm-related information like names, addresses, areas, crops, livestock, and legal details.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this PDF document:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`AI PDF extraction failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;
    
    console.log(`✅ AI PDF extraction completed: ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    console.error('❌ AI PDF extraction failed:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from DOCX files using proper DOCX parsing
 */
async function extractFromDOCX(docxBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('🔍 DOCX EXTRACTION: Starting with buffer size:', docxBuffer.byteLength);
    
    // Import JSZip for extracting DOCX content
    console.log('🔍 DOCX EXTRACTION: Importing JSZip...');
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    console.log('🔍 DOCX EXTRACTION: JSZip imported successfully, type:', typeof JSZip);
    console.log('🔍 DOCX EXTRACTION: JSZip imported successfully');
    
    // Load the DOCX file (which is a ZIP archive)
    console.log('🔍 DOCX EXTRACTION: Loading ZIP archive...');
    const zip = await JSZip.loadAsync(docxBuffer);
    console.log('🔍 DOCX EXTRACTION: ZIP loaded, files:', Object.keys(zip.files));
    console.log('🔍 DOCX EXTRACTION: ZIP object type:', typeof zip, 'JSZip constructor:', JSZip.name);
    
    // Extract the main document XML
    const documentFile = zip.file('word/document.xml');
    console.log('🔍 DOCX EXTRACTION: Document file found:', !!documentFile);
    
    if (!documentFile) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    const documentXml = await documentFile.async('text');
    console.log('🔍 DOCX EXTRACTION: Document XML length:', documentXml.length);
    console.log('🔍 DOCX EXTRACTION: Document XML preview:', documentXml.substring(0, 500));
    
    // Parse XML to extract text content
    let textContent = '';
    
    // Extract text from <w:t> tags (text runs)
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    console.log('🔍 DOCX EXTRACTION: Found text matches:', textMatches.length);
    
    textContent = textMatches
      .map(match => match.replace(/<[^>]*>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🔍 DOCX EXTRACTION: Simple text content length:', textContent.length);
    console.log('🔍 DOCX EXTRACTION: Simple text preview:', textContent.substring(0, 300));
    
    // Also extract text from <w:p> paragraphs to maintain structure
    const paragraphMatches = documentXml.match(/<w:p[^>]*>.*?<\/w:p>/gs) || [];
    console.log('🔍 DOCX EXTRACTION: Found paragraphs:', paragraphMatches.length);
    
    const paragraphs = paragraphMatches.map(para => {
      const textInPara = (para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
        .map(match => match.replace(/<[^>]*>/g, ''))
        .join(' ')
        .trim();
      return textInPara;
    }).filter(text => text.length > 0);
    
    console.log('🔍 DOCX EXTRACTION: Extracted paragraphs:', paragraphs.length);
    console.log('🔍 DOCX EXTRACTION: First few paragraphs:', paragraphs.slice(0, 3));
    
    // Use paragraph structure if available, otherwise use simple text
    const finalText = paragraphs.length > 0 ? paragraphs.join('\n') : textContent;
    
    console.log('🔍 DOCX EXTRACTION: Final text length:', finalText.length);
    console.log('🔍 DOCX EXTRACTION: Final text preview:', finalText.substring(0, 500));
    
    if (finalText.length < 50) {
      throw new Error('Insufficient text extracted from DOCX - document may be empty or corrupted');
    }
    
    console.log(`✅ DOCX extraction successful: ${finalText.length} characters`);
    return finalText;
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    console.error('❌ DOCX extraction error stack:', error.stack);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from XLSX files (basic implementation)
 */
async function extractFromXLSX(xlsxBuffer: ArrayBuffer): Promise<string> {
  try {
    // Basic XLSX text extraction - in production, use a proper XLSX parser
    const text = new TextDecoder().decode(xlsxBuffer);
    
    // Extract strings between shared strings XML (very basic)
    const stringMatches = text.match(/<t[^>]*>([^<]+)<\/t>/g) || [];
    const extractedStrings = stringMatches.map(match => 
      match.replace(/<[^>]*>/g, '').trim()
    ).filter(str => str.length > 0);
    
    if (extractedStrings.length === 0) {
      throw new Error('No text content found in XLSX');
    }
    
    return `Excel Document Content:\n${extractedStrings.join('\n')}`;
  } catch (error) {
    throw new Error(`XLSX extraction failed: ${error.message}`);
  }
}

/**
 * Clean and normalize extracted text
 */
/**
 * Convert file to image buffer for OCR processing
 */
async function convertToImageBuffer(fileResponse: Response, fileExtension: string): Promise<ArrayBuffer> {
  // For PDFs, we need to convert first page to image
  if (fileExtension === 'pdf') {
    // For now, use the original buffer - in production, you'd convert PDF to image
    return await fileResponse.clone().arrayBuffer();
  }
  
  // For image files, return as-is
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(fileExtension)) {
    return await fileResponse.clone().arrayBuffer();
  }
  
  // For other files, we can't convert to image
  throw new Error(`Cannot convert ${fileExtension} to image for OCR`);
}

/**
 * Clean and normalize extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}