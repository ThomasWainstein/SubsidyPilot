# Quick Start Guide

Get AgriTool running locally in under 10 minutes.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **bun** package manager
- **Git** for version control
- **Supabase account** (free tier available)

## 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd agritool

# Install dependencies
npm install
# or
bun install
```

## 2. Environment Configuration

Create your environment file:

```bash
# Copy example environment
cp .env.example .env.local

# Edit with your settings
nano .env.local
```

### Required Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API (optional for local development)
OPENAI_API_KEY=your-openai-key

# Feature Flags
TRAINING_SIMULATION_MODE=true
EXTRACTION_CONFIDENCE_THRESHOLD=0.7
```

### Get Supabase Credentials

1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy URL and anon key

## 3. Database Setup

Run the included migrations:

```bash
# Initialize Supabase locally (optional)
npx supabase init
npx supabase start

# Or use your hosted Supabase project
# Migrations are in supabase/migrations/
```

## 4. Start Development Server

```bash
# Start the development server
npm run dev
# or
bun dev

# Open browser to http://localhost:5173
```

## 5. Test the Setup

### Upload a Document

1. Navigate to the dashboard
2. Click "Upload Documents"
3. Select a sample PDF or document
4. Watch automatic classification and extraction

### Review Extraction

1. Go to "Review Queue"
2. Click on a processed document
3. Make corrections to test the feedback loop
4. Submit corrections

## Development Workflow

### File Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── farm/           # Farm-specific components
│   └── review/         # Review interface
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── test/               # Test utilities and mocks
└── integrations/       # External service integrations

docs/                   # Documentation
supabase/              # Database and edge functions
```

### Key Components

- **Document Upload**: `src/components/farm/DocumentUpload.tsx`
- **Classification**: `src/services/documentClassification.ts`
- **Extraction**: `src/services/localTransformerExtraction.ts`
- **Review Interface**: `src/components/review/DocumentReviewDetail.tsx`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- documentClassification
```

### Debugging

```bash
# View browser console logs
# (Open DevTools → Console)

# Check network requests
# (Open DevTools → Network)

# Monitor Supabase logs
# (Supabase dashboard → Logs)
```

## Common Development Tasks

### Add New Document Type

1. Update classification model in `src/services/documentClassification.ts`
2. Add extraction patterns in `src/services/localTransformerExtraction.ts`
3. Update UI components for new fields
4. Add tests for the new document type

### Modify Extraction Fields

1. Edit field definitions in extraction service
2. Update database schema if needed
3. Modify review interface components
4. Update tests and documentation

### Custom ML Models

1. Train custom model (see training documentation)
2. Update model references in services
3. Test with sample documents
4. Deploy model to production

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 5173
   lsof -ti:5173 | xargs kill -9
   # Or use different port
   npm run dev -- --port 3000
   ```

2. **Supabase Connection Errors**
   - Check `.env.local` has correct credentials
   - Verify network access to Supabase
   - Check Supabase project status

3. **Module Not Found Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **TypeScript Errors**
   ```bash
   # Check types
   npm run type-check
   # Update dependencies
   npm update
   ```

### Performance Issues

- **Slow Model Loading**: Models download on first use (2-5GB)
- **Memory Usage**: Transformers use significant RAM
- **Network Timeouts**: Check HuggingFace model access

### Testing Issues

```bash
# Clear test cache
npm test -- --clearCache

# Run tests without coverage
npm test -- --coverage=false

# Skip model-dependent tests
npm test -- --testNamePattern="^(?!.*model)"
```

## Production Deployment

### Environment Setup

```bash
# Production environment variables
TRAINING_SIMULATION_MODE=false
NODE_ENV=production
VITE_SUPABASE_URL=production-url
```

### Build and Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to hosting platform
# (Vercel, Netlify, etc.)
```

### Performance Monitoring

- Monitor memory usage during extraction
- Track processing times and confidence scores
- Set up error logging and alerts
- Regular database performance reviews

## Next Steps

- 📚 Read the [Architecture Overview](../architecture/README.md)
- 🧪 Explore [Testing Guide](./testing.md)
- 🔧 Check [Configuration Options](../configuration/environment.md)
- 🚀 Review [Deployment Guide](./deployment.md)

## Getting Help

- 🐛 [Troubleshooting Guide](../troubleshooting/README.md)
- 💬 [Development Chat](https://discord.com/channels/...)
- 📧 [Technical Support](mailto:dev-support@agritool.example.com)
- 📖 [Full Documentation](../README.md)