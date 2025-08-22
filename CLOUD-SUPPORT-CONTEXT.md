# SubsidyPilot Cloud Run Integration - Support Context

## Project Overview
We are building **SubsidyPilot**, an AI-powered platform that automates subsidy and public funding applications. The platform uses document extraction, intelligent form completion, and multi-source data aggregation to simplify the application process.

## Current Architecture & Integrations

### 1. Frontend Application
- **Technology**: React + TypeScript + Vite
- **Hosting**: Lovable platform (development environment)
- **Repository**: Connected to GitHub with bidirectional sync
- **Database**: Supabase (PostgreSQL with Row Level Security)

### 2. Document Processing Backend (Google Cloud Run)
- **Service Name**: `subsidypilot-form-parser`
- **Project ID**: `subsidypilot` (Project Number: 838836299668)
- **Region**: `europe-west1` (Belgium)
- **Repository**: Connected to GitHub for automatic deployments
- **Purpose**: AI-powered document extraction and processing using OpenAI GPT models

### 3. Integration Architecture
```
Frontend (Lovable) 
    ↓ HTTP Requests
Supabase Edge Function (cloud-run-proxy)
    ↓ Proxies to
Google Cloud Run (subsidypilot-form-parser)
    ↓ Uses
OpenAI API for document processing
```

## Current Implementation Details

### GitHub Integration
- **Repository**: SubsidyPilot (private)
- **Branch**: main
- **Deployment Trigger**: Automatic on push to main branch
- **Build System**: Google Cloud Build with `cloudbuild.yaml`

### Google Cloud Run Service Configuration
- **CPU**: 1 vCPU
- **Memory**: 2Gi
- **Timeout**: 300s (5 minutes)
- **Max Instances**: 10
- **Port**: 8080
- **Environment**: Node.js 18 Alpine

### Environment Variables & Secrets
- **SUPABASE_URL**: `https://gvfgvbztagafjykncwto.supabase.co` (public, set as env var)
- **OPENAI_API_KEY**: Stored in Google Secret Manager (private)
- **SUPABASE_SERVICE_ROLE_KEY**: Stored in Google Secret Manager (private)
- **NODE_ENV**: production

### Service Account Permissions
The Cloud Run service uses the default compute service account:
`838836299668-compute@developer.gserviceaccount.com`

**Required Roles**:
- `roles/secretmanager.secretAccessor` (for accessing stored secrets)

## Current Issues

### 1. Container Startup Failure
```
Error: Cannot find module '/workspace/index.js'
The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout.
```

### 2. Recent Changes Made
- Changed `WORKDIR` from `/workspace` to `/app` in Dockerfile
- Updated file paths to match new working directory
- Fixed package.json location and entry point
- Set `SUPABASE_URL` as environment variable instead of secret

### 3. Expected Service Endpoints
The Cloud Run service should expose:
- `GET /health` - Health check endpoint
- `GET /info` - Service information
- `POST /process` - Document processing endpoint

## File Structure (Backend)
```
server/
├── package.json (entry point: "index.js")
├── index.js (Express.js server)
└── (other server files)

Dockerfile (builds from server/ directory)
cloudbuild.yaml (deployment configuration)
```

## Integration Flow
1. **Frontend** uploads document via Supabase storage
2. **Supabase Edge Function** (`cloud-run-proxy`) receives processing request
3. **Edge Function** forwards request to Cloud Run service
4. **Cloud Run Service** processes document using OpenAI API
5. **Results** are returned through the same chain back to frontend

## Questions for Cloud Support

1. **Container Startup**: Why is the container looking for `/workspace/index.js` when we've set `WORKDIR /app`?

2. **Secret Manager Access**: Are the service account permissions correctly configured for accessing secrets?

3. **Build Process**: Is our `cloudbuild.yaml` configuration optimal for a Node.js application?

4. **Networking**: Are there any network policies or VPC configurations that could affect the service?

5. **Debugging**: What's the best way to debug container startup issues in Cloud Run?

6. **Performance**: Are our resource allocations (1 CPU, 2Gi memory) appropriate for AI document processing?

7. **Security**: Are we following best practices for secret management and service account permissions?

## Additional Context

### Business Requirements
- Process documents up to 50MB in size
- Handle PDF, DOCX, XLSX, images (JPG, PNG)
- Response time target: <30 seconds for document processing
- Expected volume: 100+ documents per day

### Tech Stack Dependencies
- **OpenAI API**: GPT-4 models for document analysis
- **Supabase**: Database and file storage
- **Express.js**: HTTP server framework
- **Multer**: File upload handling

## Current Status
- Service deployment failing at container startup
- Frontend integration ready and waiting
- Supabase proxy function configured and deployed
- GitHub CI/CD pipeline configured but failing due to container issues

## Request
We need assistance in:
1. Diagnosing the container startup failure
2. Ensuring proper secret access configuration
3. Optimizing the deployment for AI workloads
4. Implementing proper monitoring and logging
5. Performance tuning recommendations

Thank you for your assistance in resolving these Cloud Run deployment issues.