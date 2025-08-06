/**
 * Text Extraction Service for Farm Documents
 * Handles PDF, DOCX, XLSX, TXT, and CSV files
 */

export interface TextExtractionResult {
  text: string;
  debugInfo: {
    extractionMethod: string;
    fileSize: number;
    processingTime: number;
    warnings?: string[];
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

    const processingTime = Date.now() - startTime;
    console.log(`✅ Text extraction completed: ${text.length} characters in ${processingTime}ms`);

    return {
      text,
      debugInfo: {
        extractionMethod,
        fileSize,
        processingTime,
        warnings: warnings.length > 0 ? warnings : undefined
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
 * Extract text from DOCX files (basic implementation)
 */
async function extractFromDOCX(docxBuffer: ArrayBuffer): Promise<string> {
  try {
    // Basic DOCX text extraction - in production, use a proper DOCX parser
    const text = new TextDecoder().decode(docxBuffer);
    
    // Extract readable text between XML tags (very basic)
    const textContent = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (textContent.length < 100) {
      throw new Error('Insufficient text extracted from DOCX');
    }
    
    return textContent;
  } catch (error) {
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
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}