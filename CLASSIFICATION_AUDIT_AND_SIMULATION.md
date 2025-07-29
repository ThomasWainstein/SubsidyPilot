# Document Classification, Audit Storage, and Simulation Safeguards

## Classification Model
- Uses `distilbert-base-uncased-finetuned-sst-2-english` via `@huggingface/transformers`.
- Initialized in `src/services/documentClassification.ts` with WebGPU/CPU fallback.
- Provides rule-based classification fallback if model init fails.

## Audit Record Storage
- Audit entries are inserted into `document_extraction_reviews` table.
- Table created by migration `supabase/migrations/20250729121112-5b89e799-8e37-4e44-84ea-f7d91f473627.sql`.
- Each review stores `extraction_id`, `reviewer_id`, original & corrected data, notes, and status.
- Audit logging occurs in `src/hooks/useDocumentReview.ts` when a review is submitted.

## Simulation Safeguards
- Training and extraction pipelines include simulations to avoid running real ML training in production.
- Warning messages highlight simulation mode in `supabase/functions/training-pipeline/index.ts` and `supabase/functions/extract-document-data/lib/localExtraction.ts`.

### Enabling or Disabling Simulation
- A simple boolean flag `isSimulation` controls training simulation in `supabase/functions/training-pipeline/index.ts`.
- Replace `const isSimulation = true;` with an environment check or feature flag.
- For local extraction, rule-based simulation runs by default; replace the warning block with actual transformer logic when ready.

