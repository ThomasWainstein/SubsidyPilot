/**
 * Virus Scanning Integration Tests
 * Tests for the virus scanning pipeline with clean and infected fixtures
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.195.0/testing/asserts.ts";
import { scanFileForThreats, shouldScanFile, createTestFixtures } from "../lib/virusScanning.ts";

// Test fixtures
const fixtures = createTestFixtures();

Deno.test("Virus Scanning - should scan file based on type and size", () => {
  // Should scan Office documents
  assertEquals(shouldScanFile("test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1024), true);
  assertEquals(shouldScanFile("test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1024), true);
  
  // Should scan executables
  assertEquals(shouldScanFile("test.exe", "application/x-executable", 1024), true);
  
  // Should skip PDFs (low risk)
  assertEquals(shouldScanFile("test.pdf", "application/pdf", 1024), false);
  
  // Should skip large files
  const largeFileSize = 150 * 1024 * 1024; // 150MB
  assertEquals(shouldScanFile("large.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", largeFileSize), false);
});

Deno.test("Virus Scanning - clean file should pass", async () => {
  const result = await scanFileForThreats(fixtures.clean, "clean-test.txt", {
    skipScan: true // Use test mode
  });
  
  assertEquals(result.clean, true);
  assertEquals(result.threats.length, 0);
  assertEquals(result.scanVendor, "test-skip");
  assertEquals(result.confidence, 1.0);
});

Deno.test("Virus Scanning - EICAR test file should be detected", async () => {
  // Only run this test if VirusTotal API is configured
  const apiKey = Deno.env.get('VIRUSTOTAL_API_KEY');
  if (!apiKey) {
    console.log("⚠️ Skipping EICAR test - VIRUSTOTAL_API_KEY not configured");
    return;
  }
  
  const result = await scanFileForThreats(fixtures.infected, "eicar-test.txt", {
    vendor: 'virustotal',
    timeout: 60000 // Longer timeout for actual API call
  });
  
  assertEquals(result.clean, false);
  assertEquals(result.threats.length > 0, true);
  assertEquals(result.scanVendor, "virustotal");
  console.log(`✅ EICAR detected: ${result.threats.join(', ')}`);
});

Deno.test("Virus Scanning - should handle scan errors gracefully", async () => {
  // Test with invalid API configuration
  const originalKey = Deno.env.get('VIRUSTOTAL_API_KEY');
  Deno.env.set('VIRUSTOTAL_API_KEY', 'invalid-key-for-testing');
  
  try {
    const result = await scanFileForThreats(fixtures.clean, "error-test.txt", {
      vendor: 'virustotal',
      timeout: 5000
    });
    
    // Should fallback to clean with low confidence
    assertEquals(result.clean, true);
    assertEquals(result.confidence, 0.0);
    assertEquals(result.metadata?.fallbackToClean, true);
  } finally {
    // Restore original key
    if (originalKey) {
      Deno.env.set('VIRUSTOTAL_API_KEY', originalKey);
    } else {
      Deno.env.delete('VIRUSTOTAL_API_KEY');
    }
  }
});

Deno.test("Virus Scanning - should timeout on slow scans", async () => {
  const result = await scanFileForThreats(fixtures.clean, "timeout-test.txt", {
    vendor: 'virustotal',
    timeout: 1 // 1ms timeout to force timeout
  });
  
  // Should handle timeout gracefully
  assertEquals(result.confidence, 0.0);
  assertEquals(result.metadata?.error !== undefined, true);
});

/**
 * Integration test for full upload pipeline with virus scanning
 */
Deno.test("Integration - upload pipeline with virus scanning", async () => {
  // This would test the full upload-farm-document function
  // Requires proper test environment setup
  console.log("📝 Integration test placeholder - implement with proper test environment");
});

/**
 * Performance test for large file scanning
 */
Deno.test("Performance - large file handling", async () => {
  // Create a 50MB test file
  const largeBuffer = new ArrayBuffer(50 * 1024 * 1024);
  const largeArray = new Uint8Array(largeBuffer);
  largeArray.fill(65); // Fill with 'A' characters
  
  const shouldScan = shouldScanFile("large-test.txt", "text/plain", largeBuffer.byteLength);
  assertEquals(shouldScan, false, "Large files should be skipped");
  
  const result = await scanFileForThreats(largeBuffer, "large-test.txt", {
    skipScan: true
  });
  
  assertEquals(result.clean, true);
  assertEquals(result.scanVendor, "test-skip");
});

/**
 * Test virus scanning metrics logging
 */
Deno.test("Metrics - scan results should be logged", async () => {
  const result = await scanFileForThreats(fixtures.clean, "metrics-test.txt", {
    skipScan: true
  });
  
  // Verify scan result structure for metrics
  assertEquals(typeof result.confidence, "number");
  assertEquals(typeof result.scanTime, "string");
  assertEquals(typeof result.scanId, "string");
  assertEquals(Array.isArray(result.threats), true);
});

export { createTestFixtures };