/**
 * Advanced Table Post-Processing for Phase D
 * AI-powered table normalization, header standardization, and subsidy field mapping
 */

export interface ProcessedTable {
  originalTable: ExtractedTable;
  normalizedHeaders: string[];
  processedRows: ProcessedRow[];
  subsidyFields: SubsidyMapping[];
  confidence: number;
  language: string;
  processingMetrics: {
    headerNormalizationTime: number;
    valueCastingTime: number;
    subsidyMappingTime: number;
    totalProcessingTime: number;
  };
}

export interface ProcessedRow {
  originalValues: string[];
  processedValues: ProcessedValue[];
  rowConfidence: number;
}

export interface ProcessedValue {
  originalValue: string;
  processedValue: any;
  valueType: 'currency' | 'percentage' | 'date' | 'number' | 'text' | 'boolean';
  confidence: number;
  conversionNote?: string;
}

export interface SubsidyMapping {
  originalHeader: string;
  normalizedHeader: string;
  subsidyField: string;
  mappingConfidence: number;
  valueType: string;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  confidence: number;
  pageNumber?: number;
  tableIndex?: number;
  sourceFormat?: 'pdf' | 'docx' | 'xlsx';
  metadata?: {
    sheetName?: string;
    position?: { x: number; y: number; width: number; height: number };
    merged_cells?: Array<{ start: [number, number]; end: [number, number] }>;
  };
}

/**
 * Main table post-processing function
 */
export async function processTablesWithAI(
  tables: ExtractedTable[],
  documentLanguage: string,
  openAIApiKey: string
): Promise<ProcessedTable[]> {
  const startTime = Date.now();
  console.log(`🤖 Processing ${tables.length} tables with AI post-processing...`);
  
  const processedTables: ProcessedTable[] = [];
  
  for (const table of tables) {
    try {
      const processedTable = await processSingleTable(table, documentLanguage, openAIApiKey);
      processedTables.push(processedTable);
    } catch (error) {
      console.warn(`⚠️ Failed to process table ${table.tableIndex}:`, error);
      // Create a fallback processed table
      processedTables.push(createFallbackProcessedTable(table, documentLanguage));
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Table post-processing completed: ${processedTables.length} tables in ${totalTime}ms`);
  
  return processedTables;
}

/**
 * Process a single table with AI
 */
async function processSingleTable(
  table: ExtractedTable,
  documentLanguage: string,
  openAIApiKey: string
): Promise<ProcessedTable> {
  const startTime = Date.now();
  
  // Step 1: Normalize headers
  const headerNormalizationStart = Date.now();
  const normalizedHeaders = await normalizeHeaders(table.headers, documentLanguage, openAIApiKey);
  const headerNormalizationTime = Date.now() - headerNormalizationStart;
  
  // Step 2: Process and cast values
  const valueCastingStart = Date.now();
  const processedRows = await processTableValues(table.rows, normalizedHeaders, openAIApiKey);
  const valueCastingTime = Date.now() - valueCastingStart;
  
  // Step 3: Map to subsidy schema fields
  const subsidyMappingStart = Date.now();
  const subsidyFields = await mapToSubsidyFields(normalizedHeaders, table.headers, openAIApiKey);
  const subsidyMappingTime = Date.now() - subsidyMappingStart;
  
  const totalProcessingTime = Date.now() - startTime;
  
  return {
    originalTable: table,
    normalizedHeaders,
    processedRows,
    subsidyFields,
    confidence: calculateProcessingConfidence(table, processedRows, subsidyFields),
    language: documentLanguage,
    processingMetrics: {
      headerNormalizationTime,
      valueCastingTime,
      subsidyMappingTime,
      totalProcessingTime
    }
  };
}

/**
 * Normalize table headers using AI
 */
async function normalizeHeaders(
  headers: string[],
  language: string,
  openAIApiKey: string
): Promise<string[]> {
  if (headers.length === 0) return [];
  
  const prompt = buildHeaderNormalizationPrompt(headers, language);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at normalizing table headers for agricultural subsidy documents. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    const normalizedData = JSON.parse(result.choices[0].message.content);
    
    return normalizedData.normalized_headers || headers;
  } catch (error) {
    console.warn('⚠️ Header normalization failed, using original headers:', error);
    return headers;
  }
}

/**
 * Process table values with type casting
 */
async function processTableValues(
  rows: string[][],
  headers: string[],
  openAIApiKey: string
): Promise<ProcessedRow[]> {
  const processedRows: ProcessedRow[] = [];
  
  // Process in batches to avoid token limits
  const batchSize = 5;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchResults = await processValueBatch(batch, headers, openAIApiKey);
    processedRows.push(...batchResults);
  }
  
  return processedRows;
}

/**
 * Process a batch of rows for value casting
 */
async function processValueBatch(
  rowBatch: string[][],
  headers: string[],
  openAIApiKey: string
): Promise<ProcessedRow[]> {
  const prompt = buildValueProcessingPrompt(rowBatch, headers);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at processing table data for agricultural subsidy documents. Convert values to appropriate types (currency, percentage, date, number, text, boolean). Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    const processedData = JSON.parse(result.choices[0].message.content);
    
    return processedData.processed_rows || createFallbackProcessedRows(rowBatch);
  } catch (error) {
    console.warn('⚠️ Value processing failed, using fallback:', error);
    return createFallbackProcessedRows(rowBatch);
  }
}

/**
 * Map normalized headers to subsidy schema fields
 */
async function mapToSubsidyFields(
  normalizedHeaders: string[],
  originalHeaders: string[],
  openAIApiKey: string
): Promise<SubsidyMapping[]> {
  const prompt = buildSubsidyMappingPrompt(normalizedHeaders, originalHeaders);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at mapping table headers to subsidy schema fields. Map to fields like amount_min, amount_max, co_financing_rate, eligibility_criteria, deadline, etc. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    const mappingData = JSON.parse(result.choices[0].message.content);
    
    return mappingData.subsidy_mappings || [];
  } catch (error) {
    console.warn('⚠️ Subsidy mapping failed:', error);
    return [];
  }
}

/**
 * Build header normalization prompt
 */
function buildHeaderNormalizationPrompt(headers: string[], language: string): string {
  return `
Normalize these table headers from an agricultural subsidy document. The document language is: ${language}

Original headers: ${JSON.stringify(headers)}

Please normalize them to clear, standardized English terms while preserving meaning. Common subsidy terms include:
- Amount/Value → "Amount"
- Percentage/Rate → "Percentage" 
- Deadline/Due Date → "Deadline"
- Criteria/Requirements → "Criteria"
- Minimum/Max → "Minimum"/"Maximum"
- Co-financing → "Co-financing Rate"

Respond with valid JSON in this format:
{
  "normalized_headers": ["Header1", "Header2", ...]
}
`.trim();
}

/**
 * Build value processing prompt
 */
function buildValueProcessingPrompt(rows: string[][], headers: string[]): string {
  return `
Process these table rows and convert values to appropriate types. Headers: ${JSON.stringify(headers)}

Rows to process:
${rows.map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')}

For each value, determine the appropriate type:
- currency: monetary amounts (€, $, RON, etc.)
- percentage: values with % or decimal percentages
- date: any date format
- number: pure numeric values
- boolean: yes/no, true/false, active/inactive
- text: everything else

Respond with valid JSON in this format:
{
  "processed_rows": [
    {
      "originalValues": ["val1", "val2"],
      "processedValues": [
        {
          "originalValue": "val1",
          "processedValue": converted_value,
          "valueType": "currency|percentage|date|number|text|boolean",
          "confidence": 0.95,
          "conversionNote": "optional note"
        }
      ],
      "rowConfidence": 0.9
    }
  ]
}
`.trim();
}

/**
 * Build subsidy mapping prompt
 */
function buildSubsidyMappingPrompt(normalizedHeaders: string[], originalHeaders: string[]): string {
  return `
Map these table headers to standard subsidy schema fields:

Normalized headers: ${JSON.stringify(normalizedHeaders)}
Original headers: ${JSON.stringify(originalHeaders)}

Standard subsidy fields include:
- amount_min: minimum funding amount
- amount_max: maximum funding amount  
- co_financing_rate: percentage of co-financing required
- eligibility_criteria: eligibility requirements
- deadline: application deadline
- funding_type: type of funding (grant, loan, etc.)
- sector: agricultural sector
- region: geographic region
- status: subsidy status
- application_url: where to apply

Respond with valid JSON in this format:
{
  "subsidy_mappings": [
    {
      "originalHeader": "original",
      "normalizedHeader": "normalized", 
      "subsidyField": "amount_min",
      "mappingConfidence": 0.95,
      "valueType": "currency"
    }
  ]
}
`.trim();
}

/**
 * Create fallback processed table
 */
function createFallbackProcessedTable(table: ExtractedTable, language: string): ProcessedTable {
  return {
    originalTable: table,
    normalizedHeaders: table.headers,
    processedRows: createFallbackProcessedRows(table.rows),
    subsidyFields: [],
    confidence: 0.3,
    language,
    processingMetrics: {
      headerNormalizationTime: 0,
      valueCastingTime: 0,
      subsidyMappingTime: 0,
      totalProcessingTime: 0
    }
  };
}

/**
 * Create fallback processed rows
 */
function createFallbackProcessedRows(rows: string[][]): ProcessedRow[] {
  return rows.map(row => ({
    originalValues: row,
    processedValues: row.map(value => ({
      originalValue: value,
      processedValue: value,
      valueType: 'text' as const,
      confidence: 0.5
    })),
    rowConfidence: 0.5
  }));
}

/**
 * Calculate overall processing confidence
 */
function calculateProcessingConfidence(
  table: ExtractedTable,
  processedRows: ProcessedRow[],
  subsidyFields: SubsidyMapping[]
): number {
  let confidence = table.confidence * 0.4; // Base table confidence
  
  // Factor in row processing confidence
  const avgRowConfidence = processedRows.reduce((sum, row) => sum + row.rowConfidence, 0) / processedRows.length;
  confidence += avgRowConfidence * 0.3;
  
  // Factor in subsidy mapping success
  const mappingScore = subsidyFields.length > 0 ? 0.3 : 0.1;
  confidence += mappingScore;
  
  return Math.min(0.95, Math.max(0.1, confidence));
}

/**
 * Extract table metrics for database storage
 */
export function extractTableMetrics(processedTables: ProcessedTable[]): {
  tableCount: number;
  totalRows: number;
  totalCells: number;
  averageConfidence: number;
  subsidyFieldsFound: number;
  processingTimeMs: number;
  languageDetections: Record<string, number>;
} {
  const metrics = {
    tableCount: processedTables.length,
    totalRows: 0,
    totalCells: 0,
    averageConfidence: 0,
    subsidyFieldsFound: 0,
    processingTimeMs: 0,
    languageDetections: {} as Record<string, number>
  };
  
  processedTables.forEach(table => {
    metrics.totalRows += table.processedRows.length;
    metrics.totalCells += table.processedRows.reduce((sum, row) => sum + row.processedValues.length, 0);
    metrics.averageConfidence += table.confidence;
    metrics.subsidyFieldsFound += table.subsidyFields.length;
    metrics.processingTimeMs += table.processingMetrics.totalProcessingTime;
    
    const lang = table.language;
    metrics.languageDetections[lang] = (metrics.languageDetections[lang] || 0) + 1;
  });
  
  if (processedTables.length > 0) {
    metrics.averageConfidence /= processedTables.length;
  }
  
  return metrics;
}