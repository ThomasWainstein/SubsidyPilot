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

  console.log(`🔍 Extracting text from ${fileExtension} file...`);

  try {
    if (['txt', 'csv'].includes(fileExtension || '')) {
      extractedText = await fileResponse.text();
    } else if (fileExtension === 'pdf') {
      // For PDF files, try basic text extraction using OpenAI vision
      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
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
                  text: 'Extract all readable text from this document. Return the text exactly as it appears, preserving structure and formatting where possible.'
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
      } else {
        throw new Error('Vision API failed');
      }
    } else {
      // For other files (DOCX, XLSX), try to extract as text
      try {
        extractedText = await fileResponse.text();
      } catch {
        extractedText = `Document: ${fileName}, Extension: ${fileExtension}`;
      }
    }
  } catch (textError) {
    console.error('❌ Text extraction failed:', textError);
    extractedText = `Failed to extract text from ${fileName}. File type: ${fileExtension}, Size: ${fileResponse.headers.get('content-length')} bytes`;
  }

  // Log preview of extracted text for debugging
  const textPreview = extractedText.substring(0, 500);
  console.log(`📄 Text extraction preview (first 500 chars): ${textPreview}`);
  console.log(`📊 Total extracted text length: ${extractedText.length} characters`);

  if (extractedText.length < 50) {
    console.warn('⚠️ Warning: Very little text extracted from document');
  }

  return extractedText;
}