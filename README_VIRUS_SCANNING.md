# Virus Scanning Setup for AgriTool Document Pipeline

## Overview

Phase C implements comprehensive virus scanning for all uploaded documents using VirusTotal API and optional ClamAV integration.

## Features

- **Pre-upload scanning**: All files are scanned before being stored
- **Multiple vendors**: VirusTotal API and ClamAV support
- **Intelligent filtering**: Only scans risky file types (Office docs, executables)
- **Size limits**: Skips files >100MB to prevent timeouts
- **Comprehensive logging**: All scan operations tracked in extraction_metrics
- **Security policies**: Infected files are rejected with detailed error messages

## Configuration

### Environment Variables

```bash
# VirusTotal API (recommended for cloud deployment)
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here

# ClamAV (for on-premises deployment)
CLAMAV_API_URL=http://localhost:3310/scan

# Scanning behavior
VIRUS_SCAN_VENDOR=virustotal  # or 'clamav'
VIRUS_SCAN_STRICT=true        # reject files if scan fails
```

### VirusTotal API Setup

1. Sign up at [VirusTotal](https://www.virustotal.com/gui/join-us)
2. Get your API key from the API section
3. Add `VIRUSTOTAL_API_KEY` to your Supabase secrets:
   ```bash
   supabase secrets set VIRUSTOTAL_API_KEY=your_key_here
   ```

### ClamAV Setup (Optional)

For on-premises deployment:

```bash
# Install ClamAV
sudo apt-get install clamav clamav-daemon

# Start ClamAV daemon
sudo systemctl start clamav-daemon

# Update virus signatures
sudo freshclam

# Run ClamAV REST API (example with Docker)
docker run -p 3310:3310 \
  -v /var/lib/clamav:/var/lib/clamav \
  clamav/clamav:latest
```

## Database Schema

The `farm_documents` table includes a `scan_results` JSONB column:

```sql
{
  "scan_vendor": "virustotal",
  "scan_time": "2024-01-15T10:30:00Z",
  "threats_detected": ["Win32.Trojan.Example"],
  "clean": false,
  "scan_id": "vt_scan_12345",
  "confidence": 0.95,
  "metadata": {
    "processingTime": 5432,
    "positives": 3,
    "total": 70
  }
}
```

## Security Policies

### File Rejection

Files are automatically rejected if:
- Virus scan detects threats (`clean: false`)
- Document status set to `rejected_infected`
- User receives detailed error with scan ID

### Scan Failures

When virus scanning fails:
- **Strict mode** (`VIRUS_SCAN_STRICT=true`): Reject file
- **Permissive mode**: Allow upload with warning logged

### Access Control

- Users can only view scan results for their own documents
- Service role can access all scan results
- Scan metadata follows existing RLS policies

## Testing

### Unit Tests

```bash
# Run virus scanning tests
deno test supabase/functions/lib/virusScanning.test.ts

# Test with EICAR file (requires API key)
VIRUSTOTAL_API_KEY=your_key deno test supabase/functions/lib/virusScanning.test.ts
```

### Test Fixtures

The system includes safe test files:
- **Clean file**: Standard text content
- **EICAR test**: Industry-standard test virus signature (harmless)

### Integration Testing

```bash
# Test full upload pipeline
curl -X POST localhost:54321/functions/v1/upload-farm-document \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -F "file=@test-document.docx" \
  -F "farmId=your-farm-id" \
  -F "category=technical"
```

## Monitoring

### Metrics Tracking

All scan operations are logged in `extraction_metrics`:
- `operation_type: 'virus_scan'`
- Processing time and success rate
- Threat detection counts
- Vendor-specific metadata

### Query Examples

```sql
-- Recent scan activity
SELECT 
  operation_type,
  success,
  duration_ms,
  metadata->>'vendor' as vendor,
  metadata->>'threats_found' as threats
FROM extraction_metrics 
WHERE operation_type = 'virus_scan'
ORDER BY created_at DESC;

-- Infected files detected
SELECT 
  file_name,
  scan_results->>'threats_detected' as threats,
  scan_results->>'scan_time' as scanned_at
FROM farm_documents 
WHERE scan_results->>'clean' = 'false';
```

## Performance

### Optimization

- **Smart filtering**: Only scans risky file types
- **Size limits**: Skips files >100MB
- **Async processing**: Scans don't block other operations
- **Caching**: VirusTotal caches results for known files

### Expected Performance

- **Small files** (<1MB): 2-5 seconds
- **Medium files** (1-10MB): 5-15 seconds  
- **Large files** (10-100MB): 15-60 seconds
- **Very large files** (>100MB): Skipped

## Troubleshooting

### Common Issues

1. **API Rate Limits**: VirusTotal free tier has 4 requests/minute
2. **Timeouts**: Large files may timeout (increase timeout or skip)
3. **False Positives**: Some engines may flag legitimate files

### Debug Logging

Enable detailed logging:
```bash
# In edge function environment
console.log('🔒 Virus scan debug info:', scanResult);
```

### Error Codes

- `400`: File rejected (infected)
- `500`: Scan service unavailable
- `timeout`: Scan took too long

## Production Deployment

### Staging Environment

```bash
# Set environment variables
supabase secrets set VIRUSTOTAL_API_KEY=your_staging_key
supabase secrets set VIRUS_SCAN_STRICT=false

# Deploy functions
supabase functions deploy upload-farm-document
```

### Production Environment

```bash
# Use production API key
supabase secrets set VIRUSTOTAL_API_KEY=your_production_key
supabase secrets set VIRUS_SCAN_STRICT=true

# Monitor deployment
supabase functions logs upload-farm-document
```

## Next Steps

After Phase C implementation:
- **Phase D**: Advanced table extraction
- **Phase E**: Real-time status tracking
- **Phase F**: Enhanced PDF preview

## Support

For issues with virus scanning:
1. Check function logs: `supabase functions logs upload-farm-document`
2. Verify API keys in secrets
3. Test with EICAR file for validation
4. Monitor `extraction_metrics` for scan performance