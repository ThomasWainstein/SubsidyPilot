# Advanced Table Extraction - Phase D

This document describes the enhanced table extraction capabilities implemented for PDFs, DOCX, and XLSX files.

## Features

### 1. PDF Table Extraction
- **Position-based Analysis**: Detects tables by analyzing text positioning and alignment patterns
- **Structure Preservation**: Maintains row/column relationships and cell boundaries
- **Page-aware Processing**: Associates tables with specific page numbers
- **Confidence Scoring**: Evaluates table quality based on structural consistency

### 2. DOCX Table Extraction
- **HTML Conversion**: Uses mammoth.js HTML conversion to preserve table structure
- **DOM Parsing**: Extracts table elements with proper header/row distinction
- **Text Integration**: Combines table data with document narrative text

### 3. XLSX Enhanced Processing
- **Multi-sheet Support**: Processes all worksheets in the workbook
- **Merged Cell Handling**: Preserves merged cell information and structure
- **Cell Coordinate Tracking**: Maintains original spreadsheet positioning
- **Type Preservation**: Distinguishes between text and numeric cell content

## API Usage

### Core Functions

```typescript
// Extract tables from PDF
const pdfResult = await extractTablesFromPdf(buffer);

// Extract tables from DOCX
const docxResult = await extractTablesFromDocx(buffer);

// Extract tables from XLSX
const xlsxResult = await extractTablesFromXlsx(buffer);
```

### Result Structure

```typescript
interface TableExtractionResult {
  tables: ExtractedTable[];        // Structured table data
  textChunks: TextChunk[];         // Combined text and table chunks
  tableCount: number;              // Total tables found
  processingTime: number;          // Extraction duration (ms)
}

interface ExtractedTable {
  headers: string[];               // Column headers
  rows: string[][];               // Table data rows
  confidence: number;             // Quality score (0-1)
  pageNumber?: number;            // Source page (PDF)
  tableIndex?: number;            // Table sequence number
  sourceFormat?: 'pdf' | 'docx' | 'xlsx';
  metadata?: {
    sheetName?: string;           // Excel sheet name
    position?: {                  // Table position
      x: number; y: number; 
      width: number; height: number;
    };
    merged_cells?: Array<{        // Excel merged cells
      start: [number, number]; 
      end: [number, number];
    }>;
  };
}
```

## Integration with AI Extraction

Tables are automatically integrated into the AI extraction process:

1. **Text Chunks**: Tables are converted to readable text format and included in document chunks
2. **Structured Data**: Raw table data is passed to AI for enhanced field extraction
3. **Context Preservation**: Table context is maintained alongside narrative text
4. **Priority Handling**: Table data takes precedence over narrative text for conflicting information

## Database Storage

### New Columns in `document_extractions`:
- `table_count` (INTEGER): Number of tables extracted
- `table_data` (JSONB): Full structured table data with metadata

### Example Storage:
```sql
INSERT INTO document_extractions (
  document_id,
  extracted_data,
  table_count,
  table_data,
  confidence_score
) VALUES (
  'doc-123',
  '{"farmName": "Sample Farm", ...}',
  2,
  '[
    {
      "headers": ["Crop", "Area", "Yield"],
      "rows": [["Wheat", "50", "2.5"], ["Corn", "30", "3.2"]],
      "confidence": 0.9,
      "pageNumber": 1,
      "sourceFormat": "pdf"
    }
  ]',
  0.85
);
```

## Performance Considerations

### Memory Management
- **Streaming Processing**: Large PDFs processed page-by-page to prevent memory issues
- **Lazy Loading**: Tables loaded on-demand rather than all at once
- **Cleanup**: Automatic resource cleanup after processing

### Size Limits
- **Table Data Limit**: 10MB maximum per table_data field
- **Row Limit**: 1000 rows maximum per table (with overflow warnings)
- **Text Chunk Limit**: 4KB per chunk with intelligent splitting

### Processing Time
- **PDF**: ~2-5 seconds per page with tables
- **DOCX**: ~1-3 seconds for typical documents
- **XLSX**: ~500ms-2 seconds depending on sheet complexity

## Testing

### Test Files Required
Create test fixtures in `tests/fixtures/`:
- `sample_table.pdf` - PDF with embedded tables
- `scanned_table.pdf` - Scanned PDF requiring OCR
- `document_with_tables.docx` - DOCX with table structures
- `complex_spreadsheet.xlsx` - XLSX with multiple sheets and merged cells

### Running Tests
```bash
# Run table extraction tests
deno test supabase/functions/lib/tableExtraction.test.ts

# Run integration tests
deno test supabase/functions/lib/documentParsers.test.ts
```

### Test Coverage
- ✅ PDF table detection algorithms
- ✅ DOCX table parsing via mammoth
- ✅ XLSX multi-sheet processing
- ✅ Table confidence scoring
- ✅ Text chunk combination
- ✅ Memory limit handling
- ✅ Error recovery and fallbacks

## Error Handling

### Common Issues
1. **Malformed PDFs**: Graceful degradation to text-only extraction
2. **Complex Tables**: Confidence scoring helps identify extraction quality
3. **Large Files**: Memory limits prevent browser crashes
4. **OCR Integration**: Tables excluded from OCR unless specifically required

### Monitoring
- Extraction metrics logged to `extraction_metrics` table
- Processing time tracked per operation
- Table count and confidence scores recorded
- Error details preserved for debugging

## Future Enhancements

### Planned Improvements
- **Machine Learning**: Train models on table detection patterns
- **Image Tables**: OCR integration for image-based tables
- **Table Validation**: Schema validation against expected structures
- **Performance Optimization**: Parallel processing for multi-page documents

### API Extensions
- **Custom Parsers**: Plugin architecture for domain-specific table formats
- **Export Options**: Direct export to CSV/JSON from extracted tables
- **Real-time Preview**: Live table extraction during upload

## Security Considerations

- **Input Validation**: All uploaded files validated before processing
- **Resource Limits**: Processing timeouts prevent infinite loops
- **Memory Protection**: Automatic cleanup prevents memory leaks
- **Access Control**: Table data respects existing RLS policies

## Troubleshooting

### Common Problems

1. **No Tables Detected**
   - Check if document actually contains structured tables
   - Verify table format is supported (not image-based)
   - Review confidence thresholds

2. **Incomplete Table Data**
   - Check for merged cells or complex formatting
   - Verify column alignment in source document
   - Review text extraction quality

3. **Performance Issues**
   - Monitor memory usage during extraction
   - Check file size and page count
   - Review processing time metrics

### Debug Information
All extraction attempts include detailed debug information:
- Processing time breakdown
- Table detection confidence scores
- Memory usage statistics
- Error details and stack traces

For additional support, check the extraction logs in the Supabase dashboard.