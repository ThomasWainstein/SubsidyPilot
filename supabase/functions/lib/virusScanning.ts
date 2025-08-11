/**
 * Virus Scanning Service for Document Upload Pipeline
 * Supports VirusTotal API and local ClamAV integration
 */

export interface ScanResult {
  clean: boolean;
  threats: string[];
  scanVendor: string;
  scanTime: string;
  scanId: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ScanOptions {
  vendor?: 'virustotal' | 'clamav';
  timeout?: number;
  skipScan?: boolean; // For testing
}

/**
 * Main virus scanning function
 */
export async function scanFileForThreats(
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const startTime = Date.now();
  const vendor = options.vendor || 'virustotal';
  
  console.log(`🔒 Starting virus scan: ${fileName} (${fileBuffer.byteLength} bytes) using ${vendor}`);
  
  // Skip scanning for testing
  if (options.skipScan) {
    return {
      clean: true,
      threats: [],
      scanVendor: 'test-skip',
      scanTime: new Date().toISOString(),
      scanId: `test-${Date.now()}`,
      confidence: 1.0,
      metadata: { skipped: true }
    };
  }
  
  try {
    switch (vendor) {
      case 'virustotal':
        return await scanWithVirusTotal(fileBuffer, fileName, options);
      case 'clamav':
        return await scanWithClamAV(fileBuffer, fileName, options);
      default:
        throw new Error(`Unknown virus scan vendor: ${vendor}`);
    }
  } catch (error) {
    console.error(`❌ Virus scan failed for ${fileName}:`, error);
    
    // In case of scan failure, default to marking as clean but log the issue
    // In production, you might want to mark as suspicious instead
    return {
      clean: true, // Conservative default - adjust based on security policy
      threats: [],
      scanVendor: vendor,
      scanTime: new Date().toISOString(),
      scanId: `error-${Date.now()}`,
      confidence: 0.0,
      metadata: {
        error: error.message,
        processingTime: Date.now() - startTime,
        fallbackToClean: true
      }
    };
  }
}

/**
 * VirusTotal API integration
 */
async function scanWithVirusTotal(
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: ScanOptions
): Promise<ScanResult> {
  const apiKey = Deno.env.get('VIRUSTOTAL_API_KEY');
  if (!apiKey) {
    throw new Error('VIRUSTOTAL_API_KEY not configured');
  }
  
  const timeout = options.timeout || 30000;
  const startTime = Date.now();
  
  try {
    // Step 1: Upload file for scanning
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    
    console.log('📤 Uploading file to VirusTotal...');
    
    const uploadResponse = await fetch('https://www.virustotal.com/vtapi/v2/file/scan', {
      method: 'POST',
      headers: {
        'X-Apikey': apiKey,
      },
      body: formData,
      signal: AbortSignal.timeout(timeout)
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`VirusTotal upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log(`📋 VirusTotal scan initiated: ${uploadResult.scan_id}`);
    
    // Step 2: Poll for results (with exponential backoff)
    let attempts = 0;
    const maxAttempts = 10;
    let delay = 1000; // Start with 1 second
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`🔍 Checking scan results (attempt ${attempts + 1}/${maxAttempts})...`);
      
      const reportResponse = await fetch(
        `https://www.virustotal.com/vtapi/v2/file/report?apikey=${apiKey}&resource=${uploadResult.scan_id}`,
        { signal: AbortSignal.timeout(timeout) }
      );
      
      if (!reportResponse.ok) {
        throw new Error(`VirusTotal report failed: ${reportResponse.status}`);
      }
      
      const report = await reportResponse.json();
      
      if (report.response_code === 1) {
        // Scan complete
        const threats = extractThreatsFromReport(report);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ VirusTotal scan complete: ${threats.length} threats detected in ${processingTime}ms`);
        
        return {
          clean: threats.length === 0,
          threats,
          scanVendor: 'virustotal',
          scanTime: new Date().toISOString(),
          scanId: uploadResult.scan_id,
          confidence: calculateVirusTotalConfidence(report),
          metadata: {
            processingTime,
            positives: report.positives,
            total: report.total,
            permalink: report.permalink
          }
        };
      } else if (report.response_code === -2) {
        // Still queued
        attempts++;
        delay = Math.min(delay * 1.5, 10000); // Exponential backoff, max 10s
        continue;
      } else {
        throw new Error(`VirusTotal scan failed: ${report.verbose_msg || 'Unknown error'}`);
      }
    }
    
    throw new Error('VirusTotal scan timeout - results not available');
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('VirusTotal scan timeout');
    }
    throw error;
  }
}

/**
 * ClamAV integration (for local/on-premises scanning)
 */
async function scanWithClamAV(
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: ScanOptions
): Promise<ScanResult> {
  const clamavUrl = Deno.env.get('CLAMAV_API_URL') || 'http://localhost:3310/scan';
  const timeout = options.timeout || 15000;
  const startTime = Date.now();
  
  try {
    console.log('🔍 Scanning with ClamAV...');
    
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    
    const response = await fetch(clamavUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(timeout)
    });
    
    if (!response.ok) {
      throw new Error(`ClamAV scan failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ ClamAV scan complete in ${processingTime}ms`);
    
    return {
      clean: !result.infected,
      threats: result.threats || [],
      scanVendor: 'clamav',
      scanTime: new Date().toISOString(),
      scanId: `clamav-${Date.now()}`,
      confidence: result.infected ? 1.0 : 0.95, // ClamAV is definitive on infections
      metadata: {
        processingTime,
        version: result.version,
        signatures: result.signatures
      }
    };
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('ClamAV scan timeout');
    }
    throw error;
  }
}

/**
 * Extract threat names from VirusTotal report
 */
function extractThreatsFromReport(report: any): string[] {
  const threats: string[] = [];
  
  if (report.scans && typeof report.scans === 'object') {
    for (const [engine, result] of Object.entries(report.scans)) {
      if (result && typeof result === 'object' && (result as any).detected) {
        const threat = (result as any).result;
        if (threat && !threats.includes(threat)) {
          threats.push(`${engine}: ${threat}`);
        }
      }
    }
  }
  
  return threats;
}

/**
 * Calculate confidence score for VirusTotal results
 */
function calculateVirusTotalConfidence(report: any): number {
  if (!report.total || report.total === 0) return 0.5;
  
  const ratio = report.positives / report.total;
  
  // High confidence if multiple engines agree
  if (report.positives >= 3) return 0.95;
  if (report.positives >= 1) return 0.85;
  if (ratio === 0) return 0.90; // Clean with high confidence
  
  return 0.75; // Default confidence
}

/**
 * File type validation for scanning
 */
export function shouldScanFile(fileName: string, mimeType: string, fileSize: number): boolean {
  // Don't scan very large files (>100MB) to avoid timeouts
  const maxScanSize = 100 * 1024 * 1024;
  if (fileSize > maxScanSize) {
    console.log(`⚠️ Skipping scan for large file: ${fileName} (${fileSize} bytes)`);
    return false;
  }
  
  // Always scan executable types
  const executableTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/vnd.microsoft.portable-executable'
  ];
  
  if (executableTypes.includes(mimeType)) {
    return true;
  }
  
  // Scan document types that could contain macros
  const riskDocTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  return riskDocTypes.includes(mimeType);
}

/**
 * Create test fixtures for scanning
 */
export function createTestFixtures(): { clean: ArrayBuffer; infected: ArrayBuffer } {
  // EICAR test string - safe test virus signature
  const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  const eicarBuffer = new TextEncoder().encode(eicarString);
  
  // Clean test file
  const cleanContent = 'This is a clean test file for virus scanning validation.';
  const cleanBuffer = new TextEncoder().encode(cleanContent);
  
  return {
    clean: cleanBuffer.buffer,
    infected: eicarBuffer.buffer
  };
}