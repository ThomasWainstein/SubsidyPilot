# Security & Deployment Guide

## Environment Variables Setup

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `VITE_SUPABASE_URL` | Public | Frontend Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public | Frontend anonymous key | `eyJhbGciOiJIUz...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Scraper Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Backend service key | `eyJhbGciOiJIUz...` |

### Security Best Practices

1. **Never hardcode credentials** in source code
2. **Use GitHub Secrets** for CI/CD pipelines
3. **Use .env files** for local development (add to .gitignore)
4. **Mask sensitive logs** - never print secrets to console

### GitHub Actions Setup

In your repository settings → Secrets and variables → Actions, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Local Development

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials
3. Ensure `.env` is in `.gitignore`

### Frontend Build

The frontend automatically loads environment variables at build time using:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Scraper Deployment

The Python scraper loads credentials at runtime:
```python
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
```

## Testing Environment

### Required Dependencies

All testing dependencies are included in `requirements.txt`:
```
langdetect>=1.0.9
pytest>=7.0
```

### Running Tests

```bash
cd AgriToolScraper-main
pip install -r requirements.txt
pytest
```

## Security Checklist

- [ ] No hardcoded credentials in source code
- [ ] All secrets stored in GitHub repository secrets
- [ ] Environment variables properly configured
- [ ] Error logging masks sensitive data
- [ ] .env files excluded from version control
- [ ] Tests run without exposing credentials