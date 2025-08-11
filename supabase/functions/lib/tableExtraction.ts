/**
 * Advanced Table Extraction Library for PDFs, DOCX, and XLSX
 * Handles structured table data with proper formatting and metadata preservation
 */

export interface TableExtractionResult {
  tables: ExtractedTable[];
  textChunks: TextChunk[];
  tableCount: number;
  processingTime: number;
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

export interface TextChunk {
  content: string;
  type: 'text' | 'table';
  pageNumber?: number;
  metadata?: {
    tableIndex?: number;
    position?: { x: number; y: number; width: number; height: number };
  };
}

/**
 * Extract tables from PDF using PDF.js with advanced table detection
 */
export async function extractTablesFromPdf(buffer: ArrayBuffer): Promise<TableExtractionResult> {
  const startTime = Date.now();
  console.log('🔍 Starting PDF table extraction...');
  
  try {
    // Import PDF.js
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    
    const allTables: ExtractedTable[] = [];
    const textChunks: TextChunk[] = [];
    let tableIndex = 0;
    
    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Extract tables using position-based analysis
        const pageResults = extractTablesFromPageContent(textContent, viewport, pageNum, tableIndex);
        
        allTables.push(...pageResults.tables);
        textChunks.push(...pageResults.textChunks);
        tableIndex += pageResults.tables.length;
        
        page.cleanup();
      } catch (pageError) {
        console.warn(`⚠️ Failed to extract tables from page ${pageNum}:`, pageError);
      }
    }
    
    pdfDoc.cleanup();
    
    console.log(`✅ PDF table extraction completed: ${allTables.length} tables found`);
    
    return {
      tables: allTables,
      textChunks,
      tableCount: allTables.length,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ PDF table extraction failed:', error);
    throw new Error(`PDF table extraction failed: ${error.message}`);
  }
}

/**
 * Extract tables from PDF page content using text positioning
 */
function extractTablesFromPageContent(textContent: any, viewport: any, pageNumber: number, startTableIndex: number) {
  const items = textContent.items;
  const tables: ExtractedTable[] = [];
  const textChunks: TextChunk[] = [];
  
  // Group text items by Y position (rows)
  const rowGroups = new Map<number, any[]>();
  
  items.forEach((item: any) => {
    if (item.str.trim()) {
      const y = Math.round(item.transform[5]);
      if (!rowGroups.has(y)) {
        rowGroups.set(y, []);
      }
      rowGroups.get(y)!.push(item);
    }
  });
  
  // Sort rows by Y position (top to bottom)
  const sortedRows = Array.from(rowGroups.entries())
    .sort((a, b) => b[0] - a[0]) // Descending Y (top to bottom)
    .map(([y, items]) => ({
      y,
      items: items.sort((a, b) => a.transform[4] - b.transform[4]) // Sort by X position
    }));
  
  // Detect table patterns
  const tableRegions = detectTableRegions(sortedRows);
  
  tableRegions.forEach((region, index) => {
    const table = extractTableFromRegion(region, pageNumber, startTableIndex + index);
    if (table.rows.length > 0) {
      tables.push(table);
      
      // Add table as text chunk
      textChunks.push({
        content: formatTableAsText(table),
        type: 'table',
        pageNumber,
        metadata: {
          tableIndex: startTableIndex + index,
          position: calculateTableBounds(region)
        }
      });
    }
  });
  
  // Add non-table text as chunks
  const nonTableText = extractNonTableText(sortedRows, tableRegions);
  if (nonTableText.trim()) {
    textChunks.push({
      content: nonTableText,
      type: 'text',
      pageNumber
    });
  }
  
  return { tables, textChunks };
}

/**
 * Detect table regions based on text alignment patterns
 */
function detectTableRegions(sortedRows: any[]): any[][] {
  const tableRegions: any[][] = [];
  let currentRegion: any[] = [];
  let inTable = false;
  
  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i];
    const isTableRow = isLikelyTableRow(row, sortedRows, i);
    
    if (isTableRow && !inTable) {
      // Start new table region
      inTable = true;
      currentRegion = [row];
    } else if (isTableRow && inTable) {
      // Continue table region
      currentRegion.push(row);
    } else if (!isTableRow && inTable) {
      // End table region
      if (currentRegion.length >= 2) { // Minimum 2 rows for a table
        tableRegions.push([...currentRegion]);
      }
      currentRegion = [];
      inTable = false;
    }
  }
  
  // Handle last region
  if (inTable && currentRegion.length >= 2) {
    tableRegions.push(currentRegion);
  }
  
  return tableRegions;
}

/**
 * Check if a row is likely part of a table
 */
function isLikelyTableRow(row: any, allRows: any[], index: number): boolean {
  const items = row.items;
  
  // Must have multiple items (columns)
  if (items.length < 2) return false;
  
  // Check for consistent spacing between items
  const spaces = [];
  for (let i = 1; i < items.length; i++) {
    spaces.push(items[i].transform[4] - items[i-1].transform[4] - items[i-1].width);
  }
  
  // If spaces are relatively consistent, likely a table
  const avgSpace = spaces.reduce((a, b) => a + b, 0) / spaces.length;
  const spaceVariance = spaces.map(s => Math.abs(s - avgSpace)).reduce((a, b) => a + b, 0) / spaces.length;
  
  return spaceVariance < avgSpace * 0.5; // Low variance indicates table structure
}

/**
 * Extract table data from a detected region
 */
function extractTableFromRegion(region: any[], pageNumber: number, tableIndex: number): ExtractedTable {
  const rows: string[][] = [];
  
  region.forEach(row => {
    const cellTexts = row.items.map((item: any) => item.str.trim()).filter((text: string) => text);
    if (cellTexts.length > 0) {
      rows.push(cellTexts);
    }
  });
  
  // Extract headers (first row) and data rows
  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);
  
  return {
    headers,
    rows: dataRows,
    confidence: calculateTableConfidence(rows),
    pageNumber,
    tableIndex,
    sourceFormat: 'pdf',
    metadata: {
      position: calculateTableBounds(region)
    }
  };
}

/**
 * Extract tables from DOCX using mammoth with table handler
 */
export async function extractTablesFromDocx(buffer: ArrayBuffer): Promise<TableExtractionResult> {
  const startTime = Date.now();
  console.log('🔍 Starting DOCX table extraction...');
  
  try {
    // Import mammoth
    const mammoth = await import('https://esm.sh/mammoth@1.6.0');
    
    const tables: ExtractedTable[] = [];
    const textChunks: TextChunk[] = [];
    
    // Extract with HTML conversion to preserve table structure
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    
    // Parse HTML to extract tables
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlResult.value, 'text/html');
    const tableTags = doc.querySelectorAll('table');
    
    tableTags.forEach((tableElement, index) => {
      const table = extractTableFromHtmlElement(tableElement, index);
      if (table.rows.length > 0) {
        tables.push(table);
        
        textChunks.push({
          content: formatTableAsText(table),
          type: 'table',
          metadata: { tableIndex: index }
        });
      }
    });
    
    // Add non-table text
    const cleanText = textResult.value
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    if (cleanText) {
      textChunks.push({
        content: cleanText,
        type: 'text'
      });
    }
    
    console.log(`✅ DOCX table extraction completed: ${tables.length} tables found`);
    
    return {
      tables,
      textChunks,
      tableCount: tables.length,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ DOCX table extraction failed:', error);
    throw new Error(`DOCX table extraction failed: ${error.message}`);
  }
}

/**
 * Extract tables from XLSX with enhanced metadata
 */
export async function extractTablesFromXlsx(buffer: ArrayBuffer): Promise<TableExtractionResult> {
  const startTime = Date.now();
  console.log('🔍 Starting XLSX table extraction...');
  
  try {
    // Import xlsx
    const XLSX = await import('https://esm.sh/xlsx@0.18.5');
    
    const workbook = XLSX.read(buffer, { type: 'array' });
    const tables: ExtractedTable[] = [];
    const textChunks: TextChunk[] = [];
    
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      // Convert to JSON with header detection
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        range: range,
        raw: false // Get formatted strings
      });
      
      if (jsonData.length > 1) {
        const headers = (jsonData[0] as string[]) || [];
        const rows = jsonData.slice(1) as string[][];
        
        // Find merged cells
        const mergedCells = worksheet['!merges'] || [];
        
        const table: ExtractedTable = {
          headers,
          rows,
          confidence: 0.95, // XLSX tables are highly structured
          tableIndex: sheetIndex,
          sourceFormat: 'xlsx',
          metadata: {
            sheetName,
            merged_cells: mergedCells.map(merge => ({
              start: [merge.s.r, merge.s.c],
              end: [merge.e.r, merge.e.c]
            }))
          }
        };
        
        tables.push(table);
        
        textChunks.push({
          content: formatTableAsText(table),
          type: 'table',
          metadata: { tableIndex: sheetIndex }
        });
      }
    });
    
    console.log(`✅ XLSX table extraction completed: ${tables.length} sheets processed`);
    
    return {
      tables,
      textChunks,
      tableCount: tables.length,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ XLSX table extraction failed:', error);
    throw new Error(`XLSX table extraction failed: ${error.message}`);
  }
}

/**
 * Extract table from HTML table element
 */
function extractTableFromHtmlElement(tableElement: Element, tableIndex: number): ExtractedTable {
  const rows: string[][] = [];
  const headerElements = tableElement.querySelectorAll('thead tr, tr:first-child');
  const bodyElements = tableElement.querySelectorAll('tbody tr, tr:not(:first-child)');
  
  let headers: string[] = [];
  
  // Extract headers
  if (headerElements.length > 0) {
    const headerCells = headerElements[0].querySelectorAll('th, td');
    headers = Array.from(headerCells).map(cell => cell.textContent?.trim() || '');
  }
  
  // Extract data rows
  bodyElements.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const rowData = Array.from(cells).map(cell => cell.textContent?.trim() || '');
    if (rowData.some(cell => cell)) { // Only add non-empty rows
      rows.push(rowData);
    }
  });
  
  return {
    headers,
    rows,
    confidence: 0.9,
    tableIndex,
    sourceFormat: 'docx'
  };
}

/**
 * Format table as readable text
 */
function formatTableAsText(table: ExtractedTable): string {
  let text = '';
  
  if (table.metadata?.sheetName) {
    text += `Sheet: ${table.metadata.sheetName}\n`;
  }
  
  // Add headers
  if (table.headers.length > 0) {
    text += `Headers: ${table.headers.join(' | ')}\n`;
    text += '-'.repeat(table.headers.join(' | ').length) + '\n';
  }
  
  // Add rows (limit to prevent excessive text)
  const maxRows = 20;
  table.rows.slice(0, maxRows).forEach((row, index) => {
    text += `${row.join(' | ')}\n`;
  });
  
  if (table.rows.length > maxRows) {
    text += `... and ${table.rows.length - maxRows} more rows\n`;
  }
  
  return text;
}

/**
 * Calculate table extraction confidence
 */
function calculateTableConfidence(rows: string[][]): number {
  if (rows.length < 2) return 0.1;
  
  let confidence = 0.5;
  
  // Check for consistent column count
  const columnCounts = rows.map(row => row.length);
  const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
  const columnVariance = columnCounts.map(c => Math.abs(c - avgColumns)).reduce((a, b) => a + b, 0) / columnCounts.length;
  
  if (columnVariance < 1) confidence += 0.3;
  
  // Check for numeric data (indicates structured content)
  const numericCells = rows.flat().filter(cell => !isNaN(parseFloat(cell))).length;
  const totalCells = rows.flat().length;
  
  if (numericCells > totalCells * 0.2) confidence += 0.2;
  
  return Math.min(0.95, confidence);
}

/**
 * Calculate table bounds from region
 */
function calculateTableBounds(region: any[]): { x: number; y: number; width: number; height: number } {
  if (region.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  const allItems = region.flatMap(row => row.items);
  const xPositions = allItems.map(item => item.transform[4]);
  const yPositions = region.map(row => row.y);
  
  return {
    x: Math.min(...xPositions),
    y: Math.min(...yPositions),
    width: Math.max(...xPositions) - Math.min(...xPositions),
    height: Math.max(...yPositions) - Math.min(...yPositions)
  };
}

/**
 * Extract non-table text from rows
 */
function extractNonTableText(sortedRows: any[], tableRegions: any[][]): string {
  const tableRows = new Set(tableRegions.flat());
  const nonTableRows = sortedRows.filter(row => !tableRows.has(row));
  
  return nonTableRows
    .map(row => row.items.map((item: any) => item.str).join(' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}