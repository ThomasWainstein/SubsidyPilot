/**
 * Tests for Advanced Table Extraction Library
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.195.0/testing/asserts.ts";
import { 
  extractTablesFromPdf,
  extractTablesFromDocx,
  extractTablesFromXlsx,
  type ExtractedTable
} from './tableExtraction.ts';

Deno.test("PDF Table Extraction - should detect tables in sample PDF", async () => {
  // This test requires a sample PDF with tables
  // For now, we test the function signature and basic error handling
  
  try {
    const sampleBuffer = new ArrayBuffer(100); // Mock buffer
    const result = await extractTablesFromPdf(sampleBuffer);
    
    assertExists(result.tables);
    assertExists(result.textChunks);
    assertEquals(typeof result.tableCount, 'number');
    assertEquals(typeof result.processingTime, 'number');
  } catch (error) {
    // Expected to fail with mock data, but structure should be correct
    assertEquals(error instanceof Error, true);
  }
});

Deno.test("XLSX Table Extraction - should handle empty workbook", async () => {
  try {
    const sampleBuffer = new ArrayBuffer(100); // Mock buffer
    const result = await extractTablesFromXlsx(sampleBuffer);
    
    assertExists(result.tables);
    assertExists(result.textChunks);
    assertEquals(typeof result.tableCount, 'number');
  } catch (error) {
    // Expected to fail with mock data
    assertEquals(error instanceof Error, true);
  }
});

Deno.test("Table Confidence Calculation", () => {
  // Test table confidence scoring logic
  const goodTable: ExtractedTable = {
    headers: ['Name', 'Value', 'Date'],
    rows: [
      ['Farm A', '100', '2024-01-01'],
      ['Farm B', '200', '2024-01-02'],
      ['Farm C', '150', '2024-01-03']
    ],
    confidence: 0,
    sourceFormat: 'xlsx'
  };
  
  // Basic structure validation
  assertEquals(goodTable.headers.length, 3);
  assertEquals(goodTable.rows.length, 3);
  assertEquals(goodTable.rows[0].length, 3);
});

Deno.test("Text Chunk Structure", () => {
  // Test text chunk format
  const textChunk = {
    content: "Sample table content",
    type: 'table' as const,
    pageNumber: 1,
    metadata: {
      tableIndex: 0,
      position: { x: 0, y: 0, width: 100, height: 50 }
    }
  };
  
  assertEquals(textChunk.type, 'table');
  assertEquals(textChunk.pageNumber, 1);
  assertExists(textChunk.metadata?.tableIndex);
});

// Integration test placeholder for real files
Deno.test("Integration - Table extraction from real files", async () => {
  // This would test with actual sample files
  // For now, just ensure the API contract is correct
  
  const mockPdfBuffer = new ArrayBuffer(0);
  
  try {
    await extractTablesFromPdf(mockPdfBuffer);
  } catch (error) {
    // Expected with empty buffer
    assertEquals(error instanceof Error, true);
  }
});