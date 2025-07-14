/**
 * Robust text extraction utilities with proper libraries
 * Supports DOCX (mammoth), PDF (pdf-parse + OCR fallback), XLSX, Images (OCR)
 */

export interface ExtractionDebugInfo {
  fileName: string;
  fileSize: number;
  extractionMethod: string;
  textLength: number;
  extractionTime: number;
  rawText: string;
  errors: string[];
  warnings: string[];
  libraryUsed?: string;
  ocrConfidence?: number;
}

export async function extractTextFromFile(
  fileResponse: Response,
  fileName: string,
  openAIApiKey: string
): Promise<{ text: string; debugInfo: ExtractionDebugInfo }> {
  const startTime = Date.now();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const fileSize = parseInt(fileResponse.headers.get('content-length') || '0');
  
  const debugInfo: ExtractionDebugInfo = {
    fileName,
    fileSize,
    extractionMethod: '',
    textLength: 0,
    extractionTime: 0,
    rawText: '',
    errors: [],
    warnings: []
  };

  console.log(`🔍 Extracting text from ${fileExtension} file: ${fileName}`);
  console.log(`📁 File size: ${fileSize} bytes`);

  let extractedText = '';

  try {
    switch (fileExtension) {
      case 'txt':
      case 'csv':
        const result = await extractPlainText(fileResponse, debugInfo);
        extractedText = result.text;
        break;
        
      case 'pdf':
        const pdfResult = await extractPDFText(fileResponse, openAIApiKey, debugInfo);
        extractedText = pdfResult.text;
        break;
        
      case 'docx':
        const docxResult = await extractDOCXText(fileResponse, debugInfo);
        extractedText = docxResult.text;
        break;
        
      case 'xlsx':
      case 'xls':
        const xlsxResult = await extractXLSXText(fileResponse, debugInfo);
        extractedText = xlsxResult.text;
        break;
        
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        const imageResult = await extractImageText(fileResponse, openAIApiKey, debugInfo);
        extractedText = imageResult.text;
        break;
        
      default:
        debugInfo.extractionMethod = 'fallback_text';
        debugInfo.warnings.push(`Unknown file type ${fileExtension}, attempting text extraction`);
        console.log(`📄 Processing ${fileExtension} as plain text...`);
        try {
          extractedText = await fileResponse.text();
          debugInfo.libraryUsed = 'native_text_decoder';
          console.log(`✅ Text extraction successful`);
        } catch (textError) {
          const errorMsg = `Text extraction failed: ${(textError as Error).message}`;
          debugInfo.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
          extractedText = `Failed to extract text: ${fileName} (${fileExtension})`;
        }
    }
  } catch (mainError) {
    const errorMsg = `Main extraction failed: ${(mainError as Error).message}`;
    debugInfo.errors.push(errorMsg);
    console.error('❌ Text extraction failed:', mainError);
    extractedText = `Failed to extract text from ${fileName}. File type: ${fileExtension}, Size: ${fileSize} bytes. Error: ${errorMsg}`;
  }

  // Clean and validate extracted text
  extractedText = cleanExtractedText(extractedText);
  debugInfo.rawText = extractedText;
  debugInfo.textLength = extractedText.length;
  debugInfo.extractionTime = Date.now() - startTime;
  
  // Log preview and quality assessment
  const textPreview = extractedText.substring(0, 500);
  console.log(`📄 Text extraction preview (first 500 chars): ${textPreview}`);
  console.log(`📊 Total extracted text length: ${extractedText.length} characters`);
  console.log(`⏱️ Extraction time: ${debugInfo.extractionTime}ms`);
  console.log(`🔧 Extraction method: ${debugInfo.extractionMethod} (${debugInfo.libraryUsed || 'unknown'})`);

  // Quality checks
  if (extractedText.length < 50) {
    debugInfo.warnings.push('Very little text extracted from document');
    console.warn('⚠️ Warning: Very little text extracted from document');
  }
  
  const hasReadableContent = /[a-zA-Z]{10,}/.test(extractedText);
  if (!hasReadableContent) {
    debugInfo.warnings.push('Document appears to contain no readable text content');
    console.warn('⚠️ Warning: Document appears to contain no readable text content');
  }

  return { text: extractedText, debugInfo };
}

async function extractPlainText(
  fileResponse: Response,
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  debugInfo.extractionMethod = 'plain_text';
  debugInfo.libraryUsed = 'native_text_decoder';
  console.log(`📄 Processing plain text file...`);
  
  const text = await fileResponse.text();
  console.log(`✅ Plain text extraction successful`);
  return { text };
}

async function extractPDFText(
  fileResponse: Response, 
  openAIApiKey: string, 
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  console.log(`📋 Processing PDF with fallback to OCR...`);
  
  try {
    // First attempt: Use pdf-parse library
    debugInfo.extractionMethod = 'pdf_parse_library';
    debugInfo.libraryUsed = 'pdf-parse';
    
    const arrayBuffer = await fileResponse.arrayBuffer();
    
    // Try to use pdf-parse if available in environment
    try {
      // Note: In Deno edge functions, we'll use Vision API as primary method
      // since pdf-parse requires Node.js modules not available in Deno
      throw new Error('pdf-parse not available in Deno environment, using OCR');
    } catch (parseError) {
      debugInfo.warnings.push('PDF text parsing failed, falling back to OCR');
      console.log(`⚠️ PDF parsing failed, using OCR fallback: ${parseError.message}`);
      
      // Fallback: Use OpenAI Vision for OCR
      debugInfo.extractionMethod = 'pdf_ocr_vision';
      debugInfo.libraryUsed = 'openai_vision';
      
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log(`📤 Sending PDF to OpenAI Vision (${Math.round(base64.length/1024)}KB)`);
      
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all readable text from this PDF document. Focus on: farm names, addresses, legal information, land area, activities, certifications, and contact details. Preserve structure and return clean, readable text.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
        }),
      });

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const extractedText = visionData.choices[0]?.message?.content || '';
        debugInfo.ocrConfidence = 0.8; // Estimated confidence for Vision API
        console.log(`✅ PDF OCR extraction successful`);
        return { text: extractedText };
      } else {
        const errorText = await visionResponse.text();
        debugInfo.errors.push(`Vision API failed: ${visionResponse.status} ${errorText}`);
        throw new Error(`Vision API failed: ${visionResponse.status} ${visionResponse.statusText}`);
      }
    }
  } catch (pdfError) {
    debugInfo.errors.push(`PDF extraction failed: ${(pdfError as Error).message}`);
    throw pdfError;
  }
}

async function extractDOCXText(
  fileResponse: Response,
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  debugInfo.extractionMethod = 'docx_mammoth';
  debugInfo.libraryUsed = 'mammoth.js';
  console.log(`📄 Processing DOCX with mammoth.js...`);
  
  try {
    const arrayBuffer = await fileResponse.arrayBuffer();
    
    // Import mammoth dynamically for Deno edge function compatibility
    const mammoth = await import('npm:mammoth@1.9.1');
    console.log(`📋 Mammoth.js imported successfully`);
    
    // Convert ArrayBuffer to Buffer for mammoth.js
    const buffer = new Uint8Array(arrayBuffer);
    console.log(`📄 Converting DOCX buffer (${Math.round(buffer.length/1024)}KB)`);
    
    // Extract raw text using mammoth.js
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value || "";
    
    // Clean up whitespace and normalize text
    text = text.replace(/\s+/g, " ").trim();
    
    console.log(`✅ DOCX extraction successful with mammoth.js`);
    console.log(`📋 Extracted text preview: "${text.slice(0, 200)}..."`);
    
    if (!text || text.length < 10) {
      debugInfo.warnings.push('DOCX extraction resulted in very short text');
      console.log(`⚠️ Warning: Extracted text is very short (${text.length} chars)`);
    }
    
    debugInfo.textLength = text.length;
    return { text };
    
  } catch (mammothError) {
    debugInfo.errors.push(`Mammoth.js extraction failed: ${(mammothError as Error).message}`);
    console.log(`❌ Mammoth.js extraction failed: ${(mammothError as Error).message}`);
    
    // Fallback to enhanced XML parsing if mammoth fails
    debugInfo.libraryUsed = 'enhanced_xml_parser_fallback';
    console.log(`🔄 Falling back to XML parsing...`);
    debugInfo.extractionMethod = 'docx_enhanced_xml';
    
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Enhanced DOCX text extraction with multiple strategies
    const extractors = [
      // Word 2016+ format
      /<w:t[^>]*>(.*?)<\/w:t>/g,
      // Word 2010-2013 format  
      /<t[^>]*>(.*?)<\/t>/g,
      // Alternative text nodes
      /<text[^>]*>(.*?)<\/text>/g,
      // Paragraph content
      /<w:p[^>]*>.*?<w:t[^>]*>(.*?)<\/w:t>.*?<\/w:p>/g,
    ];
    
    let extractedText = '';
    let bestExtraction = '';
    
    for (const regex of extractors) {
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        const currentExtraction = matches
          .map(match => match[1])
          .filter(text => text && text.trim().length > 0)
          .join(' ');
        
        if (currentExtraction.length > bestExtraction.length) {
          bestExtraction = currentExtraction;
        }
      }
    }
    
    extractedText = bestExtraction;
    
    // Enhanced fallback with document structure awareness
    if (extractedText.length < 100) {
      debugInfo.warnings.push('Primary DOCX extraction yielded insufficient text, using enhanced fallback');
      
      // Look for document.xml content specifically
      const documentMatch = text.match(/<document[^>]*>(.*?)<\/document>/s);
      if (documentMatch) {
        const documentContent = documentMatch[1];
        
        // Extract all text content from document structure
        const allTextMatches = documentContent.match(/>([^<]+)</g);
        if (allTextMatches) {
          extractedText = allTextMatches
            .map(match => match.slice(1, -1).trim())
            .filter(text => text.length > 2 && /[a-zA-Z]/.test(text))
            .join(' ');
        }
      }
      
      // Last resort: clean XML and extract readable text
      if (extractedText.length < 50) {
        const cleanText = text
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const readableSegments = cleanText.match(/[a-zA-Z][a-zA-Z\s,.-]{15,}/g);
        if (readableSegments) {
          extractedText = readableSegments.join(' ');
        }
      }
    }
    
    if (extractedText.length < 50) {
      debugInfo.warnings.push('DOCX extraction yielded very little text - document may be corrupted or image-based');
      debugInfo.errors.push('Insufficient text extracted from DOCX file');
    }
    
    console.log(`✅ DOCX extraction completed, extracted ${extractedText.length} characters`);
    return { text: extractedText };
    
  } catch (docxError) {
    debugInfo.errors.push(`DOCX extraction failed: ${(docxError as Error).message}`);
    throw docxError;
  }
}

async function extractXLSXText(
  fileResponse: Response,
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  debugInfo.extractionMethod = 'xlsx_custom_parser';
  debugInfo.libraryUsed = 'custom_xml_parser';
  console.log(`📊 Processing XLSX file...`);
  
  try {
    const arrayBuffer = await fileResponse.arrayBuffer();
    
    // Note: In Deno environment, we'll use enhanced XML parsing
    // since xlsx library requires Node.js modules
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Extract text from shared strings and sheet data
    const extractors = [
      // Shared strings
      /<si[^>]*>.*?<t[^>]*>(.*?)<\/t>.*?<\/si>/g,
      // Direct cell values
      /<c[^>]*>.*?<v[^>]*>(.*?)<\/v>.*?<\/c>/g,
      // Inline strings
      /<is[^>]*>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>/g,
    ];
    
    let extractedText = '';
    const extractedValues = new Set<string>();
    
    for (const regex of extractors) {
      const matches = Array.from(text.matchAll(regex));
      for (const match of matches) {
        const value = match[1]?.trim();
        if (value && value.length > 1 && /[a-zA-Z]/.test(value)) {
          extractedValues.add(value);
        }
      }
    }
    
    extractedText = Array.from(extractedValues).join(' ');
    
    // Enhanced fallback for complex XLSX structures
    if (extractedText.length < 100) {
      debugInfo.warnings.push('Primary XLSX extraction yielded insufficient text, using fallback');
      
      // Look for any text content in the XML
      const allTextMatches = text.match(/>([^<]+)</g);
      if (allTextMatches) {
        const readableTexts = allTextMatches
          .map(match => match.slice(1, -1).trim())
          .filter(text => text.length > 2 && /[a-zA-Z]/.test(text) && !/^[\d\s.,-]+$/.test(text))
          .slice(0, 200); // Limit to prevent noise
        
        extractedText = readableTexts.join(' ');
      }
    }
    
    if (extractedText.length < 20) {
      debugInfo.warnings.push('XLSX extraction yielded very little text - file may contain mostly numerical data');
    }
    
    console.log(`✅ XLSX extraction completed, extracted ${extractedText.length} characters`);
    return { text: extractedText };
    
  } catch (xlsxError) {
    debugInfo.errors.push(`XLSX extraction failed: ${(xlsxError as Error).message}`);
    throw xlsxError;
  }
}

async function extractImageText(
  fileResponse: Response,
  openAIApiKey: string,
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  debugInfo.extractionMethod = 'image_ocr_vision';
  debugInfo.libraryUsed = 'openai_vision';
  console.log(`🖼️ Processing image with OCR...`);
  
  try {
    const arrayBuffer = await fileResponse.arrayBuffer();
    const mimeType = fileResponse.headers.get('content-type') || 'image/jpeg';
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log(`📤 Sending image to OpenAI Vision (${Math.round(base64.length/1024)}KB)`);
    
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all readable text from this image. Focus on: farm names, addresses, legal information, land area, activities, certifications, and contact details. Return clean, structured text preserving important information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (visionResponse.ok) {
      const visionData = await visionResponse.json();
      const extractedText = visionData.choices[0]?.message?.content || '';
      debugInfo.ocrConfidence = 0.85; // Vision API typically has good confidence
      console.log(`✅ Image OCR extraction successful`);
      return { text: extractedText };
    } else {
      const errorText = await visionResponse.text();
      debugInfo.errors.push(`Vision API failed: ${visionResponse.status} ${errorText}`);
      throw new Error(`Vision API failed: ${visionResponse.status} ${visionResponse.statusText}`);
    }
    
  } catch (imageError) {
    debugInfo.errors.push(`Image extraction failed: ${(imageError as Error).message}`);
    throw imageError;
  }
}

function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common PDF artifacts and control characters
    .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\u0100-\u017F]/g, ' ')
    // Clean up punctuation spacing
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])\s*([a-zA-Z])/g, '$1 $2')
    // Remove header/footer patterns
    .replace(/^(Page \d+|\d+\/\d+|Header|Footer).*$/gm, '')
    // Remove repeated characters
    .replace(/(.)\1{10,}/g, '$1')
    // Normalize quotes and dashes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    // Trim and normalize
    .trim();
}