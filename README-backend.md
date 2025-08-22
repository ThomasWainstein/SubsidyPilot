# SubsidyPilot Backend Service

This repository contains both the frontend React application and the backend document processing service for SubsidyPilot.

## Backend Service (`/server`)

The backend service handles document processing, OCR, and AI extraction for subsidy applications.

### Local Development

```bash
# Install dependencies
cd server
npm install

# Start development server
npm run dev
# or
npm start
```

The service will run on `http://localhost:8080`

### API Endpoints

- `GET /health` - Health check
- `GET /info` - Service information and capabilities
- `POST /process-document` - Process uploaded documents

### Environment Variables

Create these secrets in Google Cloud Secret Manager:

- `SUPABASE_URL` - Your Supabase project URL
- `OPENAI_API_KEY` - OpenAI API key for AI processing
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Google Cloud Run Deployment

The service automatically deploys to Cloud Run when you push to the main branch.

**Service URL:** https://subsidypilot-form-parser-838836299668.europe-west1.run.app

### Docker

Build and run locally:

```bash
# Build image
docker build -t subsidypilot-form-parser .

# Run container
docker run -p 8080:8080 subsidypilot-form-parser
```

### Features

- **Document Upload**: Supports PDF, DOCX, XLSX, images (up to 50MB)
- **OCR Processing**: Extract text from scanned documents
- **AI Extraction**: Intelligent field extraction using OpenAI
- **Multi-format Support**: Handle various document types
- **Secure Processing**: Non-root container, health checks
- **CORS Enabled**: Works with frontend applications

### Testing

Test the service:

```bash
# Health check
curl https://subsidypilot-form-parser-838836299668.europe-west1.run.app/health

# Service info
curl https://subsidypilot-form-parser-838836299668.europe-west1.run.app/info

# Process document (with file upload)
curl -X POST \
  -F "document=@sample.pdf" \
  -F "document_id=test123" \
  -F "document_type=subsidy_application" \
  https://subsidypilot-form-parser-838836299668.europe-west1.run.app/process-document
```