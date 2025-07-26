# AgriTool Raw Log Interpreter Agent

A robust Python agent that processes unprocessed subsidy logs from Supabase, extracts canonical fields using OpenAI Assistant, and writes structured data to the subsidies_structured table.

## Features

- **Canonical Field Extraction**: Maps every record exactly to the canonical schema using OpenAI Assistant
- **Idempotency & Concurrency Safety**: Prevents duplicate processing through PostgreSQL advisory locks
- **Rich Observability**: Comprehensive logging, audit trails, and error tracking
- **Config-Driven**: All settings configurable via environment variables
- **Security First**: No secrets in code - all credentials via environment variables
- **File Processing**: Supports PDF, DOCX, TXT, and image files with OCR
- **Error Handling**: Exponential backoff, retry logic, and Slack alerting

## Installation

1. Clone the repository and navigate to the agent directory:
```bash
cd AgriTool-Raw-Log-Interpreter
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install system dependencies for document processing:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y tesseract-ocr default-jre

# macOS
brew install tesseract openjdk
```

4. Copy and configure environment variables:
```bash
cp config.env .env
# Edit .env with your actual values
```

## Required Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for full R/W access | `eyJ...` |
| `SCRAPER_RAW_GPT_API` | OpenAI API key | `sk-...` |

## Optional Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `BATCH_SIZE` | 50 | Number of logs to process per batch |
| `POLL_INTERVAL` | 300 | Seconds between polling cycles |
| `LOG_LEVEL` | INFO | Logging verbosity (DEBUG, INFO, WARNING, ERROR) |
| `SLACK_WEBHOOK_URL` | - | Slack webhook for alerts |
| `SLACK_ALERT_THRESHOLD` | 0.25 | Failure rate threshold for alerts |
| `OPENAI_MODEL` | gpt-4o-mini | OpenAI model to use |
| `ASSISTANT_ID` | - | OpenAI Assistant ID (use `asst_...` to enable Assistants API) |

## Usage

### Continuous Processing (Production Mode)
```bash
python agent.py
```

The agent will run continuously, polling for new unprocessed logs every `POLL_INTERVAL` seconds.

### Single Batch Processing (Testing/Debug)
```bash
python agent.py --single-batch
```

Processes one batch of logs and exits. Useful for testing and debugging.

## Database Schema

The agent works with three main tables:

### raw_logs
- `id`: UUID primary key
- `payload`: Raw log content (TEXT)
- `file_refs`: Array of file references (TEXT[])
- `processed`: Processing status (BOOLEAN)
- `processed_at`: Timestamp when processed

### subsidies_structured
- `id`: UUID primary key
- `raw_log_id`: Reference to raw_logs.id
- All canonical fields (url, title, description, etc.)
- `audit`: JSON with missing fields and validation notes

### error_log
- `id`: UUID primary key
- `raw_log_id`: Reference to raw_logs.id
- `error_type`: Error category
- `error_message`: Human-readable error
- `stack_trace`: Full Python traceback
- `metadata`: Additional error context

## Canonical Fields Schema

The agent extracts exactly these fields:

```python
CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score",
    # NEW: Application Requirements & Dynamic Questionnaires
    "application_requirements", "questionnaire_steps", "requirements_extraction_status"
]
```

### New Application Requirements Features

The agent now extracts and generates:

- **`application_requirements`** (array): All required documents, forms, or proofs needed to apply (e.g., "Business Plan", "EU Farm ID", "Sustainability Report")
- **`questionnaire_steps`** (array): User-friendly questions for each requirement to guide document upload
- **`requirements_extraction_status`** (string): "extracted", "not_found", or "pending"

**Example Output:**
```json
{
  "application_requirements": [
    "Business Plan", "EU Farm ID", "Sustainability Report", "Carbon Assessment"
  ],
  "questionnaire_steps": [
    {
      "requirement": "Business Plan",
      "question": "Please upload your business plan (PDF or DOCX)."
    },
    {
      "requirement": "EU Farm ID", 
      "question": "Enter your EU Farm ID or upload supporting documentation."
    }
  ],
  "requirements_extraction_status": "extracted"
}
```

This enables frontend teams to build dynamic "Apply" flows that automatically guide users through the application process based on extracted requirements.

## File Processing

The agent can process various file types attached to raw logs:

- **PDF/DOCX**: Text extraction using Apache Tika
- **TXT**: Direct text reading
- **Images (PNG/JPG/TIFF)**: OCR using Tesseract

File references in `raw_logs.file_refs` can be:
- Public URLs (downloaded automatically)
- Supabase Storage paths (downloaded from `attachments` bucket)

## Error Handling

The agent implements comprehensive error handling:

- **Single row failures**: Logged and skipped, processing continues
- **API failures**: Exponential backoff with max 3 retries
- **High failure rates**: Slack alerts when >25% of batch fails
- **Connectivity issues**: Automatic retry with exponential backoff

## Monitoring and Observability

### Logging
- All events logged to both console and `agent.log` file
- Configurable log levels (DEBUG, INFO, WARNING, ERROR)
- Structured logging with timestamps and context

### Audit Trail
Every processed record includes an audit object:
```json
{
  "missing_fields": ["previous_acceptance_rate", "matching_algorithm_score"],
  "validation_notes": [
    "deadline parsed as 2025-03-31",
    "amount converted to EUR at scrape-time FX rate"
  ],
  "attachment_sources_used": [
    "policy_doc_123.pdf",
    "eligibility_sheet.docx"
  ]
}
```

### Alerts
Optional Slack integration for critical failures:
- High failure rates (>25% by default)
- Supabase connectivity issues
- Unexpected errors in main processing loop

## Security

- All credentials via environment variables
- Service role key required for database access
- Advisory locks prevent concurrent processing of same records
- No secrets committed to repository

## Development

### Testing
```bash
# Run unit tests
python -m pytest tests/

# Run with coverage
python -m pytest tests/ --cov=agent
```

### Docker Deployment
```bash
# Build image
docker build -t agritool-log-interpreter .

# Run container
docker run -d --env-file .env agritool-log-interpreter
```

## Troubleshooting

### Common Issues

1. **"Required environment variable missing"**
   - Ensure all required env vars are set in your `.env` file
   - Check that `.env` file is in the same directory as `agent.py`

2. **"Failed to connect to Supabase"**
   - Verify your Supabase URL and service role key
   - Check that the `raw_logs` table exists in your database

3. **"OpenAI API call failed"**
   - Verify your OpenAI API key has sufficient credits
   - Check OpenAI service status if getting 5xx errors

4. **"No unprocessed logs found"**
   - This is normal - the agent will continue polling
   - Check that you have records in `raw_logs` with `processed=false`

### Debug Mode
Run with debug logging for detailed information:
```bash
LOG_LEVEL=DEBUG python agent.py --single-batch
```

## Support

For issues and questions:
1. Check the logs in `agent.log`
2. Review the error_log table in Supabase
3. Verify all environment variables are correctly set
4. Test with `--single-batch` mode first

## License

This project is part of the AgriTool system. See main project for licensing information.