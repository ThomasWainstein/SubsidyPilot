# Environment Configuration

Complete guide to configuring AgriTool for different environments and use cases.

## Environment Variables

### Core Configuration

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# Application Settings
NODE_ENV=development|staging|production
VITE_APP_TITLE="AgriTool"
VITE_APP_DESCRIPTION="Agricultural Document Management Platform"
```

**Note:** When deploying edge functions, `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON` must be stored as [Supabase
secrets](https://supabase.com/docs/guides/functions/secrets) so they are
available to the runtime.

### Feature Flags

```bash
# Training Pipeline
TRAINING_SIMULATION_MODE=true|false
TRAINING_AUTO_DEPLOY=true|false
TRAINING_BATCH_SIZE=32

# Document Processing
CLASSIFICATION_CONFIDENCE_THRESHOLD=0.7
EXTRACTION_CONFIDENCE_THRESHOLD=0.7
ENABLE_LOCAL_EXTRACTION=true|false
ENABLE_CLOUD_FALLBACK=true|false

# Security
ENABLE_RLS_POLICIES=true
ENABLE_AUDIT_LOGGING=true
DATA_RETENTION_DAYS=365
```

### External Services

```bash
# OpenAI Configuration (for cloud fallback)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000

# HuggingFace Configuration
HUGGINGFACE_MODEL_CACHE=true
HUGGINGFACE_USE_WEBGPU=true
HUGGINGFACE_DEVICE=auto

# Monitoring and Analytics
SENTRY_DSN=https://your-sentry-dsn
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
NODE_ENV=development
VITE_DEV_MODE=true

# Relaxed security for development
SUPABASE_RLS_DISABLED=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Debug settings
DEBUG_CLASSIFICATION=true
DEBUG_EXTRACTION=true
LOG_LEVEL=debug

# Simulation mode enabled
TRAINING_SIMULATION_MODE=true
MOCK_EXTERNAL_APIS=true
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
VITE_STAGING_MODE=true

# Production-like security
SUPABASE_RLS_ENABLED=true
CORS_ALLOWED_ORIGINS=https://staging.agritool.app

# Limited debug output
LOG_LEVEL=info
DEBUG_PERFORMANCE=true

# Simulation mode for safety
TRAINING_SIMULATION_MODE=true
ENABLE_TELEMETRY=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
VITE_PRODUCTION_MODE=true

# Full security enabled
SUPABASE_RLS_ENABLED=true
ENABLE_AUDIT_LOGGING=true
FORCE_HTTPS=true

# Minimal logging
LOG_LEVEL=warn
DEBUG_MODE=false

# Real training (with caution)
TRAINING_SIMULATION_MODE=false
ENABLE_MONITORING=true
```

## Configuration Management

### Environment File Structure

```
project-root/
├── .env                    # Default environment variables
├── .env.local             # Local overrides (gitignored)
├── .env.development       # Development-specific
├── .env.staging          # Staging-specific
├── .env.production       # Production-specific
└── .env.example          # Template file
```

### Loading Order

Vite loads environment files in this order (later files override earlier ones):

1. `.env`
2. `.env.local`
3. `.env.[NODE_ENV]`
4. `.env.[NODE_ENV].local`

### Validation

```typescript
// src/config/environment.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON: z.string().min(1),
  TRAINING_SIMULATION_MODE: z.string().transform(val => val === 'true'),
  CLASSIFICATION_CONFIDENCE_THRESHOLD: z.string().transform(val => parseFloat(val)),
})

export const env = envSchema.parse(process.env)
```

## Feature Configuration

### Document Classification

```bash
# Classification Model Settings
CLASSIFICATION_MODEL=distilbert-base-uncased-finetuned-sst-2-english
CLASSIFICATION_DEVICE=webgpu
CLASSIFICATION_FALLBACK_DEVICE=cpu

# Performance Settings
CLASSIFICATION_MAX_TEXT_LENGTH=2000
CLASSIFICATION_BATCH_SIZE=1
CLASSIFICATION_CACHE_SIZE=100

# Confidence Thresholds
CLASSIFICATION_HIGH_CONFIDENCE=0.9
CLASSIFICATION_MEDIUM_CONFIDENCE=0.7
CLASSIFICATION_LOW_CONFIDENCE=0.5
```

### Local Extraction

```bash
# Extraction Models
NER_MODEL=dbmdz/bert-large-cased-finetuned-conll03-english
QA_MODEL=distilbert-base-cased-distilled-squad

# Processing Settings
EXTRACTION_MAX_CONTEXT_LENGTH=512
EXTRACTION_OVERLAP_LENGTH=50
EXTRACTION_MIN_CONFIDENCE=0.6

# Fallback Configuration
ENABLE_CLOUD_FALLBACK=true
FALLBACK_CONFIDENCE_THRESHOLD=0.7
FALLBACK_TIMEOUT_MS=10000
```

### Training Pipeline

```bash
# Training Settings
TRAINING_DATA_SOURCE=document_extractions
TRAINING_VALIDATION_SPLIT=0.2
TRAINING_BATCH_SIZE=32
TRAINING_EPOCHS=10
TRAINING_LEARNING_RATE=0.001

# Deployment Settings
DEPLOYMENT_ENVIRONMENT=staging
DEPLOYMENT_ROLLBACK_ENABLED=true
DEPLOYMENT_HEALTH_CHECK_URL=/health

# Simulation Settings (Development)
TRAINING_SIMULATION_MODE=true
SIMULATION_DURATION_MS=120000
SIMULATION_SUCCESS_RATE=0.95
```

## Security Configuration

### Row Level Security (RLS)

```sql
-- Enable RLS for all tables
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

-- Policies are automatically applied based on environment
```

### CORS Configuration

```bash
# Development - Allow all origins
CORS_ALLOWED_ORIGINS=*
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=*

# Production - Restrict origins
CORS_ALLOWED_ORIGINS=https://agritool.app,https://app.agritool.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE
CORS_ALLOWED_HEADERS=authorization,content-type,x-client-info
```

### Authentication

```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Performance Configuration

### Database Configuration

```bash
# Connection Settings
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
DB_STATEMENT_TIMEOUT=60000

# Query Optimization
DB_ENABLE_QUERY_CACHE=true
DB_CACHE_SIZE=100MB
DB_LOG_SLOW_QUERIES=true
DB_SLOW_QUERY_THRESHOLD=1000ms
```

### Caching Configuration

```bash
# Browser Cache
BROWSER_CACHE_MAX_AGE=3600
BROWSER_CACHE_STALE_WHILE_REVALIDATE=86400

# Model Cache
MODEL_CACHE_ENABLED=true
MODEL_CACHE_SIZE=500MB
MODEL_CACHE_TTL=86400

# API Cache
API_CACHE_ENABLED=true
API_CACHE_TTL=300
API_CACHE_SIZE=50MB
```

### Resource Limits

```bash
# Memory Limits
MAX_MEMORY_USAGE=512MB
MEMORY_WARNING_THRESHOLD=80
MEMORY_CLEANUP_THRESHOLD=90

# Processing Limits
MAX_CONCURRENT_EXTRACTIONS=10
MAX_DOCUMENT_SIZE=50MB
MAX_BATCH_SIZE=100

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=20
```

## Monitoring Configuration

### Logging

```bash
# Log Levels
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|text
LOG_DESTINATION=console|file|remote

# Log Retention
LOG_RETENTION_DAYS=30
LOG_MAX_FILE_SIZE=100MB
LOG_MAX_FILES=10

# Specific Loggers
LOG_CLASSIFICATION=debug
LOG_EXTRACTION=info
LOG_TRAINING=warn
LOG_SECURITY=error
```

### Health Checks

```bash
# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=5s

# Component Health Checks
CHECK_DATABASE=true
CHECK_STORAGE=true
CHECK_EXTERNAL_APIS=true
CHECK_ML_MODELS=true
```

### Metrics and Telemetry

```bash
# Metrics Collection
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics
METRICS_COLLECTION_INTERVAL=60s

# Telemetry
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=0.1
TELEMETRY_ENDPOINT=https://telemetry.agritool.app
```

## Configuration Validation

### Startup Validation

```typescript
// Validate critical configuration on startup
export const validateConfiguration = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate URLs
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format')
  }

  // Validate numeric values
  const numericConfigs = {
    CLASSIFICATION_CONFIDENCE_THRESHOLD: [0, 1],
    TRAINING_BATCH_SIZE: [1, 128],
  }

  Object.entries(numericConfigs).forEach(([key, [min, max]]) => {
    const value = parseFloat(process.env[key] || '0')
    if (value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}`)
    }
  })
}
```

### Runtime Validation

```typescript
// Validate configuration during runtime
export const validateRuntimeConfig = async () => {
  // Test database connection
  try {
    const { data, error } = await supabase.from('farms').select('count').limit(1)
    if (error) throw error
  } catch (error) {
    console.error('Database connection failed:', error)
  }

  // Test model loading
  try {
    const classifier = await getDocumentClassifier()
    if (!classifier.isReady()) {
      console.warn('Classification model not ready')
    }
  } catch (error) {
    console.error('Model loading failed:', error)
  }
}
```

## Deployment Configuration

### Container Configuration

```dockerfile
# Dockerfile environment handling
FROM node:18-alpine

# Set production environment
ENV NODE_ENV=production
ENV VITE_PRODUCTION_MODE=true

# Copy environment template
COPY .env.example .env

# Build application with environment
RUN npm run build
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  agritool:
    build: .
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON=${NEXT_PUBLIC_SUPABASE_ANON}
    env_file:
      - .env.production
```

### Deployment Scripts

```bash
#!/bin/bash
# deploy.sh

# Validate environment
npm run validate-env

# Build with production environment
NODE_ENV=production npm run build

# Deploy to hosting platform
npm run deploy

# Run post-deployment health checks
npm run health-check
```

## Troubleshooting

### Common Configuration Issues

1. **Missing Environment Variables**
   ```bash
   Error: Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
   Solution: Check .env file and ensure all required variables are set
   ```

2. **Invalid URL Format**
   ```bash
   Error: Invalid NEXT_PUBLIC_SUPABASE_URL format
   Solution: Ensure URL includes protocol (https://)
   ```

3. **Model Loading Failures**
   ```bash
   Error: Failed to load classification model
   Solution: Check HUGGINGFACE_MODEL_CACHE and network connectivity
   ```

### Configuration Debugging

```typescript
// Debug configuration loading
export const debugConfiguration = () => {
  console.log('Environment:', process.env.NODE_ENV)
  console.log('Configuration loaded:', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    simulationMode: process.env.TRAINING_SIMULATION_MODE,
    classificationThreshold: process.env.CLASSIFICATION_CONFIDENCE_THRESHOLD,
  })
}
```

---

## Related Documentation

- [Development Setup](../development/setup.md) - Initial environment setup
- [Security Guide](./security.md) - Security configuration details
- [Deployment Guide](./deployment.md) - Production deployment
- [Troubleshooting](../troubleshooting/configuration.md) - Configuration troubleshooting