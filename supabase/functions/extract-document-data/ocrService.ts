/**
 * OCR Service with Image Preprocessing
 * Handles OCR extraction with image enhancement for better results
 */

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  method: 'tesseract' | 'fallback';
  preprocessingApplied: string[];
  debugInfo?: any;
}

export interface ImagePreprocessingOptions {
  binarization: boolean;
  deskewing: boolean;
  noiseRemoval: boolean;
  contrast: boolean;
  resize: boolean;
}

/**
 * Main OCR extraction function with preprocessing
 */
export async function extractTextWithOCR(
  imageBuffer: ArrayBuffer,
  options: ImagePreprocessingOptions = {
    binarization: true,
    deskewing: true,
    noiseRemoval: true,
    contrast: true,
    resize: true
  }
): Promise<OCRResult> {
  const startTime = Date.now();
  console.log('🔍 Starting OCR extraction with preprocessing...');
  
  try {
    // Apply image preprocessing
    const preprocessedImage = await preprocessImage(imageBuffer, options);
    
    // Perform OCR using Tesseract.js
    const ocrResult = await performTesseractOCR(preprocessedImage.buffer);
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTime,
      method: 'tesseract',
      preprocessingApplied: preprocessedImage.appliedSteps,
      debugInfo: {
        originalSize: imageBuffer.byteLength,
        preprocessedSize: preprocessedImage.buffer.byteLength,
        tesseractData: ocrResult.debugInfo
      }
    };
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    
    // Fallback to simple text extraction
    const fallbackResult = await fallbackTextExtraction(imageBuffer);
    
    return {
      text: fallbackResult,
      confidence: 0.3, // Low confidence for fallback
      processingTime: Date.now() - startTime,
      method: 'fallback',
      preprocessingApplied: [],
      debugInfo: { error: error.message, usedFallback: true }
    };
  }
}

/**
 * Image preprocessing to improve OCR accuracy
 */
async function preprocessImage(
  imageBuffer: ArrayBuffer,
  options: ImagePreprocessingOptions
): Promise<{ buffer: ArrayBuffer; appliedSteps: string[] }> {
  console.log('🖼️ Applying image preprocessing...');
  
  const appliedSteps: string[] = [];
  let processedBuffer = imageBuffer;
  
  try {
    // Import canvas for image processing
    const { createCanvas, loadImage } = await import('https://deno.land/x/canvas@v1.4.1/mod.ts');
    
    // Load image from buffer
    const imageBlob = new Blob([imageBuffer]);
    const imageUrl = URL.createObjectURL(imageBlob);
    const image = await loadImage(imageUrl);
    
    // Create canvas with appropriate size
    let width = image.width();
    let height = image.height();
    
    // Resize if image is too large (helps with processing speed)
    if (options.resize && (width > 2000 || height > 2000)) {
      const scale = Math.min(2000 / width, 2000 / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      appliedSteps.push('resize');
    }
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    ctx.drawImage(image, 0, 0, width, height);
    
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply preprocessing steps
    if (options.contrast) {
      applyContrastEnhancement(data);
      appliedSteps.push('contrast');
    }
    
    if (options.binarization) {
      applyBinarization(data);
      appliedSteps.push('binarization');
    }
    
    if (options.noiseRemoval) {
      applyNoiseRemoval(data, width, height);
      appliedSteps.push('noise_removal');
    }
    
    // Put processed data back to canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert canvas to buffer
    const processedImageData = canvas.toBuffer('image/png');
    processedBuffer = processedImageData.buffer;
    
    // Clean up
    URL.revokeObjectURL(imageUrl);
    
    console.log(`✅ Image preprocessing completed: ${appliedSteps.join(', ')}`);
    
    return { buffer: processedBuffer, appliedSteps };
  } catch (error) {
    console.error('❌ Image preprocessing failed:', error);
    return { buffer: imageBuffer, appliedSteps: ['preprocessing_failed'] };
  }
}

/**
 * Perform OCR using Tesseract.js
 */
async function performTesseractOCR(imageBuffer: ArrayBuffer): Promise<{
  text: string;
  confidence: number;
  debugInfo: any;
}> {
  console.log('🔤 Performing Tesseract OCR...');
  
  try {
    // Import Tesseract.js for Deno
    const Tesseract = await import('https://esm.sh/tesseract.js@5.0.5');
    
    // Create worker
    const worker = await Tesseract.createWorker('eng+fra+ron', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`🔤 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Configure Tesseract parameters for better accuracy
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}\\\"\\\\'-/+=@#$%^&*àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄą',
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
      tessedit_ocr_engine_mode: '1' // Neural nets LSTM engine only
    });
    
    // Recognize text
    const { data } = await worker.recognize(new Uint8Array(imageBuffer));
    
    // Terminate worker
    await worker.terminate();
    
    const confidence = data.confidence / 100; // Convert to 0-1 scale
    const text = data.text.trim();
    
    console.log(`✅ Tesseract OCR completed: ${text.length} characters, confidence: ${confidence}`);
    
    return {
      text,
      confidence,
      debugInfo: {
        confidence: data.confidence,
        wordCount: data.words?.length || 0,
        blockCount: data.blocks?.length || 0,
        meanConfidence: data.blocks?.reduce((sum: number, block: any) => sum + block.confidence, 0) / (data.blocks?.length || 1)
      }
    };
  } catch (error) {
    console.error('❌ Tesseract OCR failed:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Apply contrast enhancement to image data
 */
function applyContrastEnhancement(data: Uint8ClampedArray) {
  const factor = 1.5; // Contrast factor
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast to RGB channels
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // R
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // G
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // B
    // Alpha channel remains unchanged
  }
}

/**
 * Apply binarization (convert to black and white)
 */
function applyBinarization(data: Uint8ClampedArray) {
  const threshold = 128;
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    
    // Apply threshold
    const binaryValue = gray > threshold ? 255 : 0;
    
    data[i] = binaryValue;     // R
    data[i + 1] = binaryValue; // G
    data[i + 2] = binaryValue; // B
    // Alpha remains unchanged
  }
}

/**
 * Apply noise removal (median filter)
 */
function applyNoiseRemoval(data: Uint8ClampedArray, width: number, height: number) {
  const newData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      
      // Get surrounding pixels for median filter
      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(data[neighborIndex]); // Use R channel for grayscale
        }
      }
      
      // Apply median filter
      neighbors.sort((a, b) => a - b);
      const median = neighbors[Math.floor(neighbors.length / 2)];
      
      newData[index] = median;     // R
      newData[index + 1] = median; // G
      newData[index + 2] = median; // B
      // Alpha remains unchanged
    }
  }
  
  // Copy filtered data back
  data.set(newData);
}

/**
 * Fallback text extraction when OCR fails
 */
async function fallbackTextExtraction(imageBuffer: ArrayBuffer): Promise<string> {
  console.log('🔄 Using fallback text extraction...');
  
  try {
    // Try to extract any embedded text from the image metadata
    const text = `[OCR FAILED] Image file detected (${imageBuffer.byteLength} bytes). Manual review required.`;
    return text;
  } catch (error) {
    return '[OCR FAILED] Unable to extract text from image.';
  }
}

/**
 * Check if text extraction coverage is sufficient
 */
export function shouldUseOCR(
  extractedText: string,
  fileSize: number,
  fileName: string
): boolean {
  const textLength = extractedText.trim().length;
  const coverageRatio = textLength / fileSize;
  
  // Use OCR if:
  // 1. Very little text extracted relative to file size
  // 2. Text appears to be mostly garbled/corrupted
  // 3. File appears to be an image format
  
  const lowCoverage = coverageRatio < 0.001; // Less than 0.1% coverage
  const veryShortText = textLength < 100;
  const likelyImage = /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(fileName);
  const garbledText = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(extractedText);
  
  const shouldUse = lowCoverage || (veryShortText && (likelyImage || garbledText));
  
  console.log(`🤔 OCR decision: ${shouldUse ? 'YES' : 'NO'}`, {
    textLength,
    fileSize,
    coverageRatio: coverageRatio.toFixed(6),
    lowCoverage,
    veryShortText,
    likelyImage,
    garbledText
  });
  
  return shouldUse;
}
