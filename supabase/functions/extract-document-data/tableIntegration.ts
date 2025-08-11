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
  const extractionStartTime = Date.now();
  console.log(`🔧 Phase D: Starting advanced table integration for ${fileName}`);
  
  // Environment-based configuration
  const AI_MODEL = Deno.env.get('OPENAI_TABLES_MODEL') || 'gpt-4o-mini';
  const MAX_TABLES_PER_DOC = parseInt(Deno.env.get('MAX_TABLES_PER_DOC') || '50');
  const MAX_CELLS_PER_DOC = parseInt(Deno.env.get('MAX_CELLS_PER_DOC') || '50000');
  
  console.log(`🤖 Using AI model: ${AI_MODEL} for table post-processing`);
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key is required for Phase D table processing');
  }
  
  // Step 1: Extract tables based on file type
  const extractionStart = Date.now();
  let extractedTables = await extractTablesFromDocument(fileBuffer, fileName);
  const extractionEndTime = Date.now();
  
  console.log(`📊 Extracted ${extractedTables.length} tables in ${extractionEndTime - extractionStart}ms`);
  
  // Apply resource guards
  if (extractedTables.length > MAX_TABLES_PER_DOC) {
    console.warn(`⚠️ Too many tables (${extractedTables.length} > ${MAX_TABLES_PER_DOC}), limiting to first ${MAX_TABLES_PER_DOC}`);
    extractedTables = extractedTables.slice(0, MAX_TABLES_PER_DOC);
  }
  
  const totalCells = extractedTables.reduce((sum, table) => sum + table.headers.length * table.rows.length, 0);
  if (totalCells > MAX_CELLS_PER_DOC) {
    console.warn(`⚠️ Too many cells (${totalCells} > ${MAX_CELLS_PER_DOC}), limiting processing`);
    let cellCount = 0;
    extractedTables = extractedTables.filter(table => {
      const tableCells = table.headers.length * table.rows.length;
      if (cellCount + tableCells <= MAX_CELLS_PER_DOC) {
        cellCount += tableCells;
        return true;
      }
      return false;
    });
  }
  
  // Step 2: Multi-page table detection and merging
  const mergedTables = detectAndMergeMultiPageTables(extractedTables);
  console.log(`🔗 Multi-page detection: ${extractedTables.length} → ${mergedTables.length} tables`);
  
  // Step 3: AI post-processing with improved error handling and rate limiting
  const postProcessingStartTime = Date.now();
  
  if (mergedTables.length === 0) {
    console.log('⚪ No tables to process with AI');
    return {
      extractedTables: [],
      processedTables: [],
      tableMetrics: {
        extractionTime: extractionEndTime - extractionStart,
        postProcessingTime: 0,
        totalTables: 0,
        successfulTables: 0,
        failedTables: 0,
        tableQualityScore: 0,
        detectedLanguages: [],
        subsidyFieldsFound: 0
      },
      enrichedText: '',
      tableData: {
        raw: [],
        processed: [],
        metadata: {
          extractionMethod: 'phase-d-advanced',
          version: '1.0.0',
          aiModel: AI_MODEL,
          extractionTime: extractionEndTime - extractionStart,
          postProcessingTime: 0,
          totalTables: 0,
          successfulTables: 0,
          subsidyFieldsFound: 0
        }
      }
    };
  }

  // Processing budget limits
  const BATCH_SIZE = 2; // Reduced concurrency to avoid 429s
  const MAX_PROCESSING_TIME = 12000; // 12 seconds max
  const MAX_TOTAL_ROWS = 500; // Cap total rows processed
  
  // Early abort if too many rows
  const totalRows = extractedTables.reduce((sum, table) => sum + (table.rows?.length || 0), 0);
  if (totalRows > MAX_TOTAL_ROWS) {
    console.log(`⚠️ Phase D: Too many rows (${totalRows}), processing first ${MAX_TOTAL_ROWS}`);
    // Truncate tables to stay within budget
    let processedRows = 0;
    extractedTables = extractedTables.filter(table => {
      if (processedRows + (table.rows?.length || 0) <= MAX_TOTAL_ROWS) {
        processedRows += table.rows?.length || 0;
        return true;
      }
      return false;
    });
  }

  const processedTables: ProcessedTable[] = [];
  
  for (let i = 0; i < mergedTables.length; i += BATCH_SIZE) {
    // Check time budget
    if (Date.now() - extractionStartTime > MAX_PROCESSING_TIME) {
      console.log(`⚠️ Phase D: Time budget exceeded, stopping at ${i}/${mergedTables.length} tables`);
      break;
    }

    const batch = mergedTables.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (table) => {
      const retryWithBackoff = async (attempt = 1): Promise<any> => {
        try {
          const tableText = formatTableForAI(table);
          
          const completion = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: AI_MODEL,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert at extracting subsidy and funding information from tables. 
                  
Analyze the table data and extract any subsidy, grant, or funding program information. Return ONLY a valid JSON object with this structure:
{
  "programs": [
    {
      "name": "Program name",
      "description": "Brief description",
      "minAmount": "Minimum amount (with currency)",
      "maxAmount": "Maximum amount (with currency)", 
      "coFinancingRate": "Percentage or description",
      "deadline": "Application deadline",
      "eligibility": "Eligibility criteria",
      "contactInfo": "Contact information if available"
    }
  ],
  "subsidyFieldsFound": number,
  "confidence": number
}

If no subsidy information is found, return: {"programs": [], "subsidyFieldsFound": 0, "confidence": 0}

Important: Return ONLY the JSON object, no additional text.`
                },
                {
                  role: 'user',
                  content: tableText
                }
              ],
              temperature: 0.1,
              max_tokens: 1000
            }),
          });

          // Handle rate limits with retry
          if (completion.status === 429 && attempt <= 3) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 8000);
            console.log(`Rate limited, retrying in ${backoffMs}ms (attempt ${attempt})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return retryWithBackoff(attempt + 1);
          }

          if (!completion.ok) {
            const errorText = await completion.text();
            console.error(`OpenAI API error for table ${table.id}:`, completion.status, errorText);
            throw new Error(`OpenAI API error: ${completion.status}`);
          }

          const result = await completion.json();
          const content = result.choices?.[0]?.message?.content;
          
          if (!content) {
            throw new Error('No content in OpenAI response');
          }

          // Strict JSON validation
          let aiData;
          try {
            aiData = JSON.parse(content.trim());
            
            // Validate structure
            if (typeof aiData !== 'object' || aiData === null) {
              throw new Error('Response is not a valid object');
            }
            
            if (!Array.isArray(aiData.programs)) {
              throw new Error('Missing or invalid programs array');
            }
            
            if (typeof aiData.subsidyFieldsFound !== 'number') {
              aiData.subsidyFieldsFound = aiData.programs.length;
            }
            
            if (typeof aiData.confidence !== 'number') {
              aiData.confidence = 0.5;
            }
            
          } catch (parseError) {
            console.error('Failed to parse/validate AI response:', content, parseError);
            // Fallback to empty result
            aiData = { programs: [], subsidyFieldsFound: 0, confidence: 0 };
          }

          return {
            ...table,
            aiExtracted: aiData,
            extractionConfidence: aiData.confidence || 0.5,
            tokensUsed: result.usage?.total_tokens || 0
          };
        } catch (error) {
          if (attempt <= 3 && (error.message.includes('5') || error.message.includes('timeout'))) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 8000);
            console.log(`Retrying after error: ${error.message} (attempt ${attempt})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return retryWithBackoff(attempt + 1);
          }
          
          console.error(`Error processing table ${table.id}:`, error);
          return {
            ...table,
            aiExtracted: { programs: [], subsidyFieldsFound: 0, confidence: 0 },
            extractionConfidence: 0,
            error: error.message,
            tokensUsed: 0
          };
        }
      };

      return retryWithBackoff();
    });

    const batchResults = await Promise.all(batchPromises);
    processedTables.push(...batchResults);
    
    // Jittered delay between batches
    if (i + BATCH_SIZE < mergedTables.length) {
      const delay = 300 + Math.random() * 400; // 300-700ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const postProcessingEndTime = Date.now();
  const totalSubsidyFields = processedTables.reduce((sum, table) => 
    sum + (table.aiExtracted?.subsidyFieldsFound || 0), 0
  );
  const totalTokens = processedTables.reduce((sum, table) => 
    sum + (table.tokensUsed || 0), 0
  );
  const totalProcessingTime = postProcessingEndTime - extractionStartTime;

  console.log(`🤖 AI post-processing completed in ${postProcessingEndTime - postProcessingStartTime}ms`);
  console.log(`💰 Found ${totalSubsidyFields} subsidy fields across ${processedTables.length} tables`);
  console.log(`🔢 Used ${totalTokens} tokens total, ${totalProcessingTime}ms elapsed`);

  return {
    raw: extractedTables,
    processed: processedTables,
    metadata: {
      extractionMethod: 'phase-d-advanced',
      version: '1.0.0',
      aiModel: AI_MODEL,
      extractionTime: extractionEndTime - extractionStart,
      postProcessingTime: postProcessingEndTime - postProcessingStartTime,
      totalProcessingTime,
      totalTables: extractedTables.length,
      successfulTables: processedTables.filter(t => !t.error).length,
      subsidyFieldsFound: totalSubsidyFields,
      totalTokensUsed: totalTokens,
      budgetLimits: {
        maxTables: MAX_TABLES_PER_DOC,
        maxCells: MAX_CELLS_PER_DOC,
        maxProcessingTime: MAX_PROCESSING_TIME,
        maxTotalRows: MAX_TOTAL_ROWS
      }
    }
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

/**
 * Format table for AI processing
 */
function formatTableForAI(table: ExtractedTable): string {
  let formatted = '';
  
  // Add table metadata
  if (table.pageNumber) {
    formatted += `Table from page ${table.pageNumber}\n`;
  }
  
  // Add headers
  if (table.headers.length > 0) {
    formatted += `Headers: ${table.headers.join(' | ')}\n`;
    formatted += '-'.repeat(table.headers.join(' | ').length) + '\n';
  }
  
  // Add rows (limit for API efficiency)
  const maxRows = 20;
  const rowsToProcess = table.rows.slice(0, maxRows);
  
  rowsToProcess.forEach((row, index) => {
    formatted += `${row.join(' | ')}\n`;
  });
  
  if (table.rows.length > maxRows) {
    formatted += `... and ${table.rows.length - maxRows} more rows\n`;
  }
  
  return formatted;
}