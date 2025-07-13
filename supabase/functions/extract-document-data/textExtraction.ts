/**
 * Advanced text extraction utilities with proper library support
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
    if (['txt', 'csv'].includes(fileExtension || '')) {
      debugInfo.extractionMethod = 'plain_text';
      extractedText = await fileResponse.text();
      console.log(`✅ Plain text extraction successful`);
      
    } else if (fileExtension === 'pdf') {
      const result = await extractPDFText(fileResponse, openAIApiKey, debugInfo);
      extractedText = result.text;
      
    } else if (fileExtension === 'docx') {
      const result = await extractDOCXText(fileResponse, debugInfo);
      extractedText = result.text;
      
    } else {
      debugInfo.extractionMethod = 'fallback_text';
      debugInfo.warnings.push(`Unknown file type ${fileExtension}, attempting text extraction`);
      console.log(`📄 Processing ${fileExtension} as plain text...`);
      try {
        extractedText = await fileResponse.text();
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

async function extractPDFText(
  fileResponse: Response, 
  openAIApiKey: string, 
  debugInfo: ExtractionDebugInfo
): Promise<{ text: string }> {
  debugInfo.extractionMethod = 'pdf_ocr_vision';
  console.log(`📋 Processing PDF with OpenAI Vision OCR...`);
  
  try {
    const arrayBuffer = await fileResponse.arrayBuffer();
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
                text: 'Extract all readable text from this PDF document. Focus on: farm names, addresses, legal information, land area, activities, certifications, and contact details. Return text in a structured format preserving key information.'
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
      console.log(`✅ PDF OCR extraction successful`);
      return { text: extractedText };
    } else {
      const errorText = await visionResponse.text();
      debugInfo.errors.push(`Vision API failed: ${visionResponse.status} ${errorText}`);
      throw new Error(`Vision API failed: ${visionResponse.status} ${visionResponse.statusText}`);
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
  debugInfo.extractionMethod = 'docx_advanced';
  console.log(`📄 Processing DOCX with advanced extraction...`);
  
  try {
    const arrayBuffer = await fileResponse.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Look for document content in various XML structures
    const extractors = [
      /<w:t[^>]*>(.*?)<\/w:t>/g,
      /<t[^>]*>(.*?)<\/t>/g,
    ];
    
    let extractedText = '';
    
    for (const regex of extractors) {
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        extractedText = matches
          .map(match => match[1])
          .filter(text => text && text.trim().length > 0)
          .join(' ');
        
        if (extractedText.length > 100) {
          console.log(`✅ DOCX text extraction successful`);
          break;
        }
      }
    }
    
    // Fallback: extract any text between angle brackets
    if (extractedText.length < 100) {
      debugInfo.warnings.push('Primary DOCX extraction yielded insufficient text, using fallback method');
      const cleanText = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const readableText = cleanText.match(/[a-zA-Z][a-zA-Z\s,.-]{10,}/g);
      if (readableText) {
        extractedText = readableText.join(' ');
      } else {
        extractedText = cleanText;
      }
    }
    
    if (extractedText.length < 50) {
      debugInfo.warnings.push('DOCX extraction yielded very little text');
    }
    
    return { text: extractedText };
    
  } catch (docxError) {
    debugInfo.errors.push(`DOCX extraction failed: ${(docxError as Error).message}`);
    throw docxError;
  }
}

function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common PDF artifacts
    .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
    // Clean up punctuation spacing
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])\s*([a-zA-Z])/g, '$1 $2')
    // Remove header/footer patterns
    .replace(/^(Page \d+|\d+\/\d+|Header|Footer).*$/gm, '')
    // Trim and normalize
    .trim();
}