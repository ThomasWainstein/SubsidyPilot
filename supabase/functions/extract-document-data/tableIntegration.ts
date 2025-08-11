/**
 * Phase D Table Integration Module
 * Integrates advanced table extraction into the main document processing pipeline
 */

import { extractTablesFromPdf, extractTablesFromDocx, extractTablesFromXlsx } from '../lib/tableExtraction.ts';
import { processTablesWithAI, extractTableMetrics } from '../lib/tablePostProcessor.ts';
import type { ExtractedTable, ProcessedTable } from '../lib/tablePostProcessor.ts';

export interface TableIntegrationResult {
  extractedTables: ExtractedTable[];
  processedTables: ProcessedTable[];
  tableMetrics: {
    extractionTime: number;
    postProcessingTime: number;
    totalTables: number;
    successfulTables: number;
    failedTables: number;
    tableQualityScore: number;
    detectedLanguages: string[];
    subsidyFieldsFound: number;
  };
  enrichedText: string;
  tableData: {
    raw: ExtractedTable[];
    processed: ProcessedTable[];
    metadata: any;
  };
}

/**
 * Main table integration function for Phase D
 */
export async function integrateTableExtraction(
  fileBuffer: ArrayBuffer,
  fileName: string,
  documentLanguage: string,
  openAIApiKey: string
): Promise<TableIntegrationResult> {
  const startTime = Date.now();
  console.log(`🔧 Phase D: Starting advanced table integration for ${fileName}`);
  
  // Guards: prevent runaway processing
  const MAX_TABLES = parseInt(Deno.env.get('MAX_TABLES_PER_DOC') || '50');
  const MAX_CELLS = parseInt(Deno.env.get('MAX_CELLS_PER_DOC') || '50000');
  
  // Step 1: Extract tables based on file type
  const extractionStart = Date.now();
  const extractedTables = await extractTablesFromDocument(fileBuffer, fileName);
  const extractionTime = Date.now() - extractionStart;
  
  console.log(`📊 Extracted ${extractedTables.length} tables in ${extractionTime}ms`);
  
  // Apply guards
  if (extractedTables.length > MAX_TABLES) {
    console.warn(`⚠️ Too many tables (${extractedTables.length} > ${MAX_TABLES}), limiting to first ${MAX_TABLES}`);
    extractedTables.splice(MAX_TABLES);
  }
  
  const totalCells = extractedTables.reduce((sum, table) => sum + table.headers.length * table.rows.length, 0);
  if (totalCells > MAX_CELLS) {
    console.warn(`⚠️ Too many cells (${totalCells} > ${MAX_CELLS}), limiting processing`);
    // Truncate tables to stay under limit
    let cellCount = 0;
    const limitedTables = [];
    for (const table of extractedTables) {
      const tableCells = table.headers.length * table.rows.length;
      if (cellCount + tableCells <= MAX_CELLS) {
        limitedTables.push(table);
        cellCount += tableCells;
      } else {
        break;
      }
    }
    extractedTables.splice(0, extractedTables.length, ...limitedTables);
  }
  
  // Step 2: AI post-processing
  const postProcessingStart = Date.now();
  const modelName = Deno.env.get('OPENAI_TABLES_MODEL') || 'gpt-4o-mini';
  console.log(`🤖 Using AI model: ${modelName} for table post-processing`);
  const processedTables = await processTablesWithAI(extractedTables, documentLanguage, openAIApiKey, modelName);
  const postProcessingTime = Date.now() - postProcessingStart;
  
  console.log(`🤖 AI post-processing completed in ${postProcessingTime}ms`);
  
  // Step 3: Generate metrics and enriched content
  const tableMetrics = generateTableMetrics(extractedTables, processedTables, extractionTime, postProcessingTime);
  const enrichedText = generateEnrichedText(processedTables);
  
  // Step 4: Prepare table data for database storage
  const tableData = {
    raw: extractedTables,
    processed: processedTables,
    metadata: {
      extractionMethod: 'phase-d-advanced',
      version: '1.0.0',
      aiModel: modelName,
      guardsApplied: {
        maxTables: MAX_TABLES,
        maxCells: MAX_CELLS,
        tablesLimited: extractedTables.length === MAX_TABLES,
        cellsLimited: totalCells > MAX_CELLS
      },
      ...tableMetrics
    }
  };
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Phase D table integration completed in ${totalTime}ms`);
  
  return {
    extractedTables,
    processedTables,
    tableMetrics,
    enrichedText,
    tableData
  };
}

/**
 * Extract tables from document based on file type
 */
async function extractTablesFromDocument(buffer: ArrayBuffer, fileName: string): Promise<ExtractedTable[]> {
  const extension = fileName.toLowerCase().split('.').pop();
  
  try {
    switch (extension) {
      case 'pdf':
        const pdfResult = await extractTablesFromPdf(buffer);
        return pdfResult.tables;
        
      case 'docx':
        const docxResult = await extractTablesFromDocx(buffer);
        return docxResult.tables;
        
      case 'xlsx':
        const xlsxResult = await extractTablesFromXlsx(buffer);
        return xlsxResult.tables;
        
      default:
        console.warn(`⚠️ Unsupported file type for table extraction: ${extension}`);
        return [];
    }
  } catch (error) {
    console.error(`❌ Table extraction failed for ${fileName}:`, error);
    return [];
  }
}

/**
 * Generate comprehensive table metrics
 */
function generateTableMetrics(
  extractedTables: ExtractedTable[],
  processedTables: ProcessedTable[],
  extractionTime: number,
  postProcessingTime: number
) {
  const successfulTables = processedTables.filter(t => t.confidence > 0.5).length;
  const failedTables = extractedTables.length - successfulTables;
  
  // Calculate table quality score
  const qualityScores = processedTables.map(t => t.confidence);
  const tableQualityScore = qualityScores.length > 0 
    ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
    : 0;
  
  // Detect languages
  const detectedLanguages = [...new Set(processedTables.map(t => t.language))];
  
  // Count subsidy fields found
  const subsidyFieldsFound = processedTables.reduce((total, table) => 
    total + table.subsidyFields.length, 0
  );
  
  return {
    extractionTime,
    postProcessingTime,
    totalTables: extractedTables.length,
    successfulTables,
    failedTables,
    tableQualityScore,
    detectedLanguages,
    subsidyFieldsFound
  };
}

/**
 * Generate enriched text with table content
 */
function generateEnrichedText(processedTables: ProcessedTable[]): string {
  let enrichedText = '';
  
  processedTables.forEach((table, index) => {
    enrichedText += `\n\n=== TABLE ${index + 1} ===\n`;
    
    // Add source information
    if (table.originalTable.metadata?.sheetName) {
      enrichedText += `Sheet: ${table.originalTable.metadata.sheetName}\n`;
    }
    if (table.originalTable.pageNumber) {
      enrichedText += `Page: ${table.originalTable.pageNumber}\n`;
    }
    
    // Add subsidy field mappings if found
    if (table.subsidyFields.length > 0) {
      enrichedText += `Subsidy Fields Detected: ${table.subsidyFields.map(f => f.subsidyField).join(', ')}\n`;
    }
    
    // Add normalized headers
    enrichedText += `Headers: ${table.normalizedHeaders.join(' | ')}\n`;
    enrichedText += '-'.repeat(table.normalizedHeaders.join(' | ').length) + '\n';
    
    // Add processed rows (limit for readability)
    const maxRows = 15;
    table.processedRows.slice(0, maxRows).forEach((row, rowIndex) => {
      const displayValues = row.processedValues.map(val => {
        // Format processed values with type hints
        if (val.valueType === 'currency' && typeof val.processedValue === 'number') {
          return `€${val.processedValue.toLocaleString()}`;
        } else if (val.valueType === 'percentage' && typeof val.processedValue === 'number') {
          return `${val.processedValue}%`;
        } else if (val.valueType === 'date') {
          return val.processedValue;
        } else {
          return String(val.processedValue);
        }
      });
      
      enrichedText += `${displayValues.join(' | ')}\n`;
    });
    
    if (table.processedRows.length > maxRows) {
      enrichedText += `... and ${table.processedRows.length - maxRows} more rows\n`;
    }
    
    enrichedText += `\nTable Confidence: ${(table.confidence * 100).toFixed(1)}%\n`;
  });
  
  return enrichedText;
}

/**
 * Multi-page table detection and merging
 */
export function detectAndMergeMultiPageTables(tables: ExtractedTable[]): ExtractedTable[] {
  if (tables.length <= 1) return tables;
  
  const mergedTables: ExtractedTable[] = [];
  let currentTable: ExtractedTable | null = null;
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    
    if (currentTable && isTableContinuation(currentTable, table)) {
      // Merge with previous table
      currentTable = mergeTablePages(currentTable, table);
    } else {
      // Start new table or add completed table
      if (currentTable) {
        mergedTables.push(currentTable);
      }
      currentTable = { ...table };
    }
  }
  
  // Add the last table
  if (currentTable) {
    mergedTables.push(currentTable);
  }
  
  console.log(`🔗 Multi-page detection: ${tables.length} → ${mergedTables.length} tables`);
  return mergedTables;
}

/**
 * Check if a table is a continuation of the previous one
 */
function isTableContinuation(prevTable: ExtractedTable, currentTable: ExtractedTable): boolean {
  // Must be consecutive pages
  const pageGap = (currentTable.pageNumber || 0) - (prevTable.pageNumber || 0);
  if (pageGap !== 1) return false;
  
  // Headers should be similar or current table has no headers
  if (currentTable.headers.length === 0) return true;
  
  // Check header similarity
  const similarity = calculateHeaderSimilarity(prevTable.headers, currentTable.headers);
  return similarity > 0.8;
}

/**
 * Calculate header similarity between two tables
 */
function calculateHeaderSimilarity(headers1: string[], headers2: string[]): number {
  if (headers1.length === 0 || headers2.length === 0) return 0;
  
  const set1 = new Set(headers1.map(h => h.toLowerCase().trim()));
  const set2 = new Set(headers2.map(h => h.toLowerCase().trim()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Merge two table pages
 */
function mergeTablePages(table1: ExtractedTable, table2: ExtractedTable): ExtractedTable {
  return {
    ...table1,
    rows: [...table1.rows, ...table2.rows],
    confidence: Math.min(table1.confidence, table2.confidence),
    metadata: {
      ...table1.metadata,
      pageRange: `${table1.pageNumber}-${table2.pageNumber}`,
      mergedFrom: [table1.tableIndex, table2.tableIndex]
    }
  };
}

/**
 * Validate table structure and quality
 */
export function validateTableQuality(table: ExtractedTable): {
  isValid: boolean;
  quality: number;
  issues: string[];
} {
  const issues: string[] = [];
  let quality = 1.0;
  
  // Check minimum requirements
  if (table.headers.length === 0) {
    issues.push('No headers detected');
    quality -= 0.3;
  }
  
  if (table.rows.length === 0) {
    issues.push('No data rows found');
    quality -= 0.5;
  }
  
  // Check column consistency
  const expectedColumns = table.headers.length;
  const inconsistentRows = table.rows.filter(row => row.length !== expectedColumns);
  
  if (inconsistentRows.length > 0) {
    issues.push(`${inconsistentRows.length} rows have inconsistent column count`);
    quality -= (inconsistentRows.length / table.rows.length) * 0.3;
  }
  
  // Check for empty cells
  const totalCells = table.rows.reduce((sum, row) => sum + row.length, 0);
  const emptyCells = table.rows.reduce((sum, row) => 
    sum + row.filter(cell => !cell || cell.trim() === '').length, 0
  );
  
  const emptyRatio = totalCells > 0 ? emptyCells / totalCells : 0;
  if (emptyRatio > 0.5) {
    issues.push('High percentage of empty cells');
    quality -= emptyRatio * 0.2;
  }
  
  quality = Math.max(0.1, quality);
  const isValid = quality > 0.3 && table.headers.length > 0 && table.rows.length > 0;
  
  return { isValid, quality, issues };
}

/**
 * Error handling and fallback for table processing
 */
export function handleTableExtractionErrors(
  fileName: string,
  error: Error,
  fallbackTables: ExtractedTable[] = []
): {
  success: boolean;
  tables: ExtractedTable[];
  errorDetails: {
    message: string;
    type: string;
    fallbackUsed: boolean;
  };
} {
  console.error(`❌ Table extraction error for ${fileName}:`, error);
  
  const errorType = error.message.includes('PDF') ? 'pdf_parsing' :
                   error.message.includes('DOCX') ? 'docx_parsing' :
                   error.message.includes('XLSX') ? 'xlsx_parsing' :
                   'unknown';
  
  return {
    success: fallbackTables.length > 0,
    tables: fallbackTables,
    errorDetails: {
      message: error.message,
      type: errorType,
      fallbackUsed: fallbackTables.length > 0
    }
  };
}