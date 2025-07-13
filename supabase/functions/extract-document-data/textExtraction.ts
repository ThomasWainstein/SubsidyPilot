/**
 * Text extraction utilities for different file types
 */

export async function extractTextFromFile(
  fileResponse: Response,
  fileName: string,
  openAIApiKey: string
): Promise<string> {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  let extractedText = '';

  console.log(`🔍 Extracting text from ${fileExtension} file: ${fileName}`);
  console.log(`📁 File size: ${fileResponse.headers.get('content-length')} bytes`);

  try {
    if (['txt', 'csv'].includes(fileExtension || '')) {
      extractedText = await fileResponse.text();
      console.log(`✅ Plain text extraction successful`);
    } else if (fileExtension === 'pdf') {
      console.log(`📋 Processing PDF with OpenAI Vision API...`);
      // For PDF files, try basic text extraction using OpenAI vision
      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log(`📤 Sending PDF to OpenAI Vision (${Math.round(base64.length/1024)}KB)`);
      
      // Use OpenAI to extract text from PDF as image
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
                  text: 'Extract all readable text from this document. Return the text exactly as it appears, preserving structure and formatting where possible. Focus on agricultural/farm-related information if present.'
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
        extractedText = visionData.choices[0]?.message?.content || '';
        console.log(`✅ PDF Vision extraction successful`);
      } else {
        const errorText = await visionResponse.text();
        console.error(`❌ Vision API failed: ${visionResponse.status}`, errorText);
        throw new Error(`Vision API failed: ${visionResponse.status} ${visionResponse.statusText}`);
      }
    } else if (fileExtension === 'docx') {
      console.log(`📄 Processing DOCX file...`);
      // For DOCX files, we'll try basic text extraction
      // Note: This is a simplified approach. In production, you'd want a proper DOCX parser
      try {
        const arrayBuffer = await fileResponse.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Basic DOCX text extraction (looks for text between XML tags)
        const xmlTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        const matches = text.match(xmlTextRegex);
        if (matches) {
          extractedText = matches.map(match => match.replace(/<[^>]*>/g, '')).join(' ');
          console.log(`✅ DOCX text extraction successful`);
        } else {
          console.warn(`⚠️ No text found in DOCX structure, trying fallback`);
          extractedText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } catch (docxError) {
        console.error(`❌ DOCX parsing failed:`, docxError);
        extractedText = `DOCX parsing failed: ${fileName}`;
      }
    } else {
      console.log(`📄 Processing ${fileExtension} as plain text...`);
      // For other files, try to extract as text
      try {
        extractedText = await fileResponse.text();
        console.log(`✅ Text extraction successful`);
      } catch (textError) {
        console.error(`❌ Text extraction failed:`, textError);
        extractedText = `Failed to extract text: ${fileName} (${fileExtension})`;
      }
    }
  } catch (textError) {
    console.error('❌ Text extraction failed:', textError);
    extractedText = `Failed to extract text from ${fileName}. File type: ${fileExtension}, Size: ${fileResponse.headers.get('content-length')} bytes. Error: ${(textError as Error).message}`;
  }

  // Clean and validate extracted text
  extractedText = extractedText.trim();
  
  // Log preview of extracted text for debugging
  const textPreview = extractedText.substring(0, 500);
  console.log(`📄 Text extraction preview (first 500 chars): ${textPreview}`);
  console.log(`📊 Total extracted text length: ${extractedText.length} characters`);

  // Check text quality
  if (extractedText.length < 50) {
    console.warn('⚠️ Warning: Very little text extracted from document');
  }
  
  const hasReadableContent = /[a-zA-Z]{10,}/.test(extractedText);
  if (!hasReadableContent) {
    console.warn('⚠️ Warning: Document appears to contain no readable text content');
  }

  return extractedText;
}