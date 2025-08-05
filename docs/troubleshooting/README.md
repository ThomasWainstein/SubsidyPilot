# Troubleshooting Guide

Common issues and solutions for AgriTool development and deployment.

## Development Issues

### Environment Setup

#### Node.js Version Conflicts
```bash
# Check current version
node --version

# Install correct version (18+ required)
nvm install 18
nvm use 18

# Or use alternative
volta install node@18
```

#### Package Installation Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Try alternative package manager
bun install
# or
yarn install
```

#### Environment Variables Not Loading
```bash
# Check file name and location
ls -la .env*

# Ensure .env.local exists
cp .env.example .env.local

# Verify variables are loaded
echo $VITE_SUPABASE_URL
```

### Build Errors

#### TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update types
npm install --save-dev @types/node @types/react

# Fix common type issues
# - Add explicit types instead of 'any'
# - Ensure imports have correct paths
# - Check component prop types
```

#### Vite Build Failures
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Check for circular dependencies
npm install --save-dev madge
npx madge --circular src/

# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Testing Issues

#### Vitest Configuration Problems
```bash
# Check vitest.config.ts syntax
npx vitest --config vitest.config.ts

# Verify test setup files
ls -la src/test/setup.ts

# Run tests with debug info
npx vitest run --reporter=verbose
```

#### Missing Test Dependencies
```bash
# Install required testing libraries (jest-dom not needed)
npm install --save-dev @testing-library/react
npm install --save-dev @testing-library/user-event

# Check mock setup
cat src/test/setup.ts
```

#### Test Timeouts and Hanging
```bash
# Increase test timeout
npx vitest --testTimeout=10000

# Run tests without parallelization
npx vitest --no-threads

# Debug specific test
npx vitest run --reporter=verbose test-file-name
```

## Supabase Integration

### Connection Issues

#### Authentication Errors
```bash
# Verify Supabase credentials
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Test connection
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" $VITE_SUPABASE_URL/rest/v1/
```

#### RLS Policy Errors
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- List policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Test policy with specific user
SET ROLE TO 'test-user-id';
SELECT * FROM documents;
```

#### Migration Issues
```bash
# Check migration status
npx supabase db status

# Apply pending migrations
npx supabase db push

# Reset database (development only)
npx supabase db reset
```

### Edge Function Problems

#### Function Deployment Failures
```bash
# Check function syntax
cd supabase/functions/function-name
deno check index.ts

# Test locally
npx supabase functions serve

# Check logs
npx supabase functions logs function-name
```

#### CORS and Network Issues
```typescript
// Add CORS headers to edge functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

return new Response(JSON.stringify(data), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

## Machine Learning Issues

### Model Loading Problems

#### HuggingFace Model Download Failures
```bash
# Check network access to HuggingFace
curl -I https://huggingface.co

# Set cache directory
export TRANSFORMERS_CACHE=/tmp/transformers_cache

# Download model manually
python -c "from transformers import pipeline; pipeline('text-classification', 'distilbert-base-uncased-finetuned-sst-2-english')"
```

#### Memory Issues with Large Models
```bash
# Monitor memory usage
htop
# or
docker stats

# Use smaller models
# Replace in src/services/documentClassification.ts:
# 'distilbert-base-uncased-finetuned-sst-2-english' (smaller)
# instead of 'bert-base-uncased' (larger)
```

#### Model Performance Issues
```javascript
// Add performance monitoring
const startTime = performance.now()
const result = await classifier(text)
const endTime = performance.now()
console.log(`Classification took ${endTime - startTime} milliseconds`)

// Use model caching
let cachedModel = null
async function getModel() {
  if (!cachedModel) {
    cachedModel = await pipeline('text-classification', MODEL_NAME)
  }
  return cachedModel
}
```

### Extraction Quality Issues

#### Low Confidence Scores
```javascript
// Debug extraction results
console.log('Extraction input:', {
  text: text.substring(0, 200) + '...',
  questions: extractionFields
})

console.log('Extraction output:', {
  answers: results,
  confidence: results.map(r => r.score)
})

// Adjust confidence thresholds
const CONFIDENCE_THRESHOLD = 0.5 // Lower for testing
```

#### Missing or Incorrect Data
```javascript
// Test with known good documents
const testCases = [
  {
    text: "Farm Name: Sunny Acres Farm",
    expectedField: "farm_name",
    expectedValue: "Sunny Acres Farm"
  }
]

// Validate extraction patterns
testCases.forEach(test => {
  const result = extractField(test.text, test.expectedField)
  console.log(`Expected: ${test.expectedValue}, Got: ${result}`)
})
```

## Performance Issues

### Slow Page Loading

#### Bundle Size Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check for large dependencies
npm install --save-dev webpack-bundle-analyzer
```

#### Database Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_documents_farm_id ON documents(farm_id);
CREATE INDEX idx_extractions_document_id ON document_extractions(document_id);

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM documents WHERE farm_id = 'uuid';
```

#### Component Optimization
```typescript
// Use React.memo for expensive components
const DocumentCard = React.memo(({ document }) => {
  // Component logic
})

// Lazy load components
const DocumentReview = lazy(() => import('./DocumentReview'))

// Optimize re-renders
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data)
}, [data])
```

### Memory Leaks

#### React Component Cleanup
```typescript
// Clean up subscriptions
useEffect(() => {
  const subscription = api.subscribe(callback)
  
  return () => {
    subscription.unsubscribe()
  }
}, [])

// Cancel pending requests
useEffect(() => {
  const controller = new AbortController()
  
  fetch(url, { signal: controller.signal })
    .then(handleResponse)
    .catch(handleError)
  
  return () => controller.abort()
}, [url])
```

#### Model Memory Management
```javascript
// Unload models when not needed
class ModelManager {
  constructor() {
    this.models = new Map()
  }
  
  async getModel(name) {
    if (!this.models.has(name)) {
      const model = await pipeline(task, name)
      this.models.set(name, model)
    }
    return this.models.get(name)
  }
  
  unloadModel(name) {
    this.models.delete(name)
  }
}
```

## Production Issues

### Deployment Problems

#### Build Failures in CI/CD
```yaml
# GitHub Actions troubleshooting
- name: Debug build environment
  run: |
    node --version
    npm --version
    df -h
    free -m

- name: Increase build memory
  run: export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Environment Variable Issues
```bash
# Check production environment
echo "Checking production variables..."
echo "SUPABASE_URL: ${VITE_SUPABASE_URL:0:20}..."
echo "NODE_ENV: $NODE_ENV"

# Verify build includes variables
grep -r "VITE_" dist/ || echo "No VITE_ variables found in build"
```

### Runtime Errors

#### Network Connectivity Issues
```javascript
// Add retry logic
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

#### Database Connection Pool Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check for long-running queries
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY query_start;
```

## Monitoring and Debugging

### Logging Setup

#### Application Logging
```typescript
// Structured logging
const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  }
}
```

#### Error Boundaries
```typescript
// Add error boundaries for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught error:', error, errorInfo)
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

### Performance Monitoring

#### Core Web Vitals
```javascript
// Monitor performance metrics
function measureWebVitals() {
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(entry.name, entry.value)
    })
  }).observe({ entryTypes: ['measure'] })
}
```

#### Database Performance
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public';
```

## Getting Help

### Debug Information to Collect

1. **System Information**
   - Node.js version
   - npm/bun version
   - Operating system
   - Available memory

2. **Error Details**
   - Full error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Console logs and network requests

3. **Environment**
   - Environment variables (sanitized)
   - Dependencies versions
   - Configuration files

### Support Channels

- 🐛 **GitHub Issues**: Report bugs and feature requests
- 💬 **Discord**: Real-time development chat
- 📧 **Email Support**: technical-support@agritool.example.com
- 📚 **Documentation**: [Full docs](../README.md)

---

## Emergency Procedures

### System Recovery

```bash
# Complete reset (development only)
rm -rf node_modules package-lock.json .env.local
npm install
cp .env.example .env.local
# Edit .env.local with correct values
npm run dev
```

### Database Recovery

```sql
-- Backup before recovery
pg_dump database_name > backup.sql

-- Reset to known good state
-- (Use Supabase dashboard or CLI)
```

Remember: When in doubt, start with the simplest solution and work up to more complex fixes. Document any new issues you discover to help future troubleshooting efforts.