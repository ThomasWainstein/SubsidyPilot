# AgriTool Document Schema Extractor

Production-ready Python module for extracting document structure from subsidy application forms and mapping them to standardized JSON schemas.

## Features

- **Multi-format Support**: PDF, DOCX, XLSX document parsing
- **Async Processing**: Configurable concurrency for high-performance batch processing
- **OCR Support**: Handles scanned documents with pytesseract
- **Robust Error Handling**: Continues processing even if individual documents fail
- **Idempotent Operations**: Safe to re-run without creating duplicates
- **Supabase Integration**: Direct database storage of schemas and extraction status
- **Production Ready**: Comprehensive logging, error tracking, and monitoring

## Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
MAX_CONCURRENT_DOCS=5          # Max concurrent document processing
DOWNLOAD_TIMEOUT=30            # Download timeout in seconds
LOG_LEVEL=INFO                 # Logging level (DEBUG, INFO, WARNING, ERROR)
```

## Usage

### Process Specific Subsidies
```bash
python document_schema_extractor.py --subsidy-ids 123e4567-e89b-12d3-a456-426614174000
```

### Process All Subsidies
```bash
python document_schema_extractor.py --all-subsidies
```

### Batch Processing with Custom Settings
```bash
python document_schema_extractor.py --all-subsidies --batch-size 20 --max-concurrent 10
```

## Schema Output Format

The extractor generates standardized JSON schemas:

```json
{
  "fields": [
    {
      "name": "applicant_name",
      "label": "Nom du demandeur",
      "type": "text",
      "required": true,
      "help": "Le nom officiel du demandeur"
    },
    {
      "name": "project_budget",
      "label": "Montant du projet",
      "type": "number",
      "required": true,
      "help": ""
    }
  ],
  "raw_unclassified": [
    "Ambiguous text that couldn't be classified as a field"
  ],
  "total_documents": 3,
  "extraction_timestamp": "2025-01-31T10:30:00Z"
}
```

## Database Integration

The module updates two Supabase tables:

### `subsidies.application_schema`
Stores the consolidated JSON schema for each subsidy.

### `document_extraction_status`
Tracks extraction status for each document:
- `extraction_status`: 'success', 'partial', 'failure'
- `field_count`: Number of fields extracted
- `coverage_percentage`: Estimated coverage (0-100%)
- `extraction_errors`: List of parsing errors
- `extracted_schema`: Raw schema data for admin review

## Performance Optimization

- **Concurrent Processing**: Uses asyncio with configurable semaphore
- **Batch Operations**: Processes subsidies in configurable batches
- **Thread Pools**: CPU-intensive parsing runs in thread pools
- **Streaming Downloads**: Memory-efficient document downloading
- **Temporary Files**: Automatic cleanup of downloaded documents

## Error Handling

- Individual document failures don't stop batch processing
- All errors are logged with detailed context
- Failed extractions are recorded in the database
- Comprehensive error reporting in final summary

## Field Type Detection

The extractor automatically infers field types:
- **text**: Default for most fields
- **number**: Amount, number, quantity fields
- **date**: Date, datum, data fields
- **email**: Email address fields
- **tel**: Phone, telephone fields
- **textarea**: Description, details fields
- **select**: Choice, option fields
- **checkbox**: Boolean/checkbox fields

## Quality Control

- Calculates coverage percentage for each extraction
- Flags extractions with <50% coverage as 'partial'
- Stores unclassified content for admin review
- Provides detailed extraction statistics

## Monitoring

View extraction progress:
```bash
# Enable debug logging
LOG_LEVEL=DEBUG python document_schema_extractor.py --all-subsidies
```

Check database for extraction status:
```sql
SELECT 
  s.title,
  des.document_type,
  des.extraction_status,
  des.field_count,
  des.coverage_percentage
FROM document_extraction_status des
JOIN subsidies s ON s.id = des.subsidy_id
ORDER BY des.created_at DESC;
```

## Language Support

The extractor handles multilingual documents:
- French (primary)
- English
- Romanian

Field labels and help text are preserved in original language.

## Troubleshooting

### Common Issues

1. **Download Timeouts**: Increase `DOWNLOAD_TIMEOUT` for slow networks
2. **Memory Issues**: Reduce `MAX_CONCURRENT_DOCS` for large documents
3. **OCR Errors**: Ensure tesseract is installed for scanned PDFs
4. **Permission Errors**: Verify Supabase service role key has full access

### Debug Mode
```bash
LOG_LEVEL=DEBUG python document_schema_extractor.py --subsidy-ids your-id
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new extraction patterns
3. Update documentation for new features
4. Test with real subsidy documents

## License

Internal AgriTool module - All rights reserved.