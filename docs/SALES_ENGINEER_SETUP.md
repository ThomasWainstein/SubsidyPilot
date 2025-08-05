# Sales Engineer Demo Setup

This guide describes how to run a local dry‑run of the AFIR scraping pipeline.
It targets sales engineers who need a reproducible demo environment.

## 1. Environment variables
Set the following variables before running any scripts:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON="public-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="service-role-key"
export OPENAI_API_KEY="sk-demo"
```

These values are placeholders; replace them with valid credentials when
connecting to a real Supabase instance or OpenAI account.

## 2. Sample data
A sample subsidy for the Romanian AFIR agency is provided at
`batches/sample_afir.json`. It can be used to exercise the AI processing
stage without hitting the live portal.

## 3. Run the dry‑run demo

```bash
python main.py --mode scraping --country romania --agency afir --dry-run
```

This command loads the AFIR scraper through the factory, returns sample data
and skips Supabase writes. The output demonstrates the end‑to‑end data flow
from scraping to structured subsidy records.
