# Local Document Extraction

Local transformer-based extraction provides reliable document processing without external API dependencies.

## Overview

The local extraction service uses HuggingFace transformers to extract structured data from document text. This provides:

- **Privacy**: No data leaves your infrastructure
- **Reliability**: No external API dependencies
- **Cost Control**: No per-request charges
- **Customization**: Fine-tune models for your use case

## How It Works

### 1. Model Loading

```typescript
import { pipeline } from '@huggingface/transformers'

// Load question-answering model
const qa = await pipeline(
  'question-answering',
  'distilbert-base-cased-distilled-squad'
)
```

### 2. Field Extraction

The service extracts predefined fields using question-answering:

```typescript
const fields = {
  farm_name: "What is the farm name?",
  owner_name: "Who is the farm owner?",
  total_area: "What is the total farm area?",
  location: "Where is the farm located?"
}
```

### 3. Confidence Scoring

Each extraction includes a confidence score:

- **High (0.8+)**: Generally accurate, minimal review needed
- **Medium (0.5-0.8)**: May need human verification
- **Low (<0.5)**: Likely inaccurate, requires review

### 4. Fallback Strategy

If local extraction confidence is too low, the system can:

- Trigger OpenAI API extraction
- Request human review
- Log for model improvement

## Configuration

### Environment Variables

```bash
# Extraction confidence threshold
EXTRACTION_CONFIDENCE_THRESHOLD=0.7

# Enable/disable OpenAI fallback
OPENAI_FALLBACK_ENABLED=true

# Model cache settings
TRANSFORMERS_CACHE_DIR=/app/.cache/transformers
```

### Model Selection

Default models can be customized in `src/services/localTransformerExtraction.ts`:

```typescript
const MODEL_CONFIGS = {
  qa: 'distilbert-base-cased-distilled-squad',
  classification: 'distilbert-base-uncased-finetuned-sst-2-english'
}
```

## Performance Optimization

### Model Caching

- Models are cached after first load
- Use persistent cache directories in production
- Consider model warm-up for faster response times

### Memory Management

- Models consume significant memory (200MB-1GB)
- Monitor memory usage in production
- Consider model quantization for reduced footprint

### Processing Time

- First extraction: 2-5 seconds (model loading)
- Subsequent extractions: 200-500ms
- Batch processing can improve throughput

## Development Setup

### Local Testing

```bash
# Install dependencies
npm install

# Run extraction tests
npm test -- localTransformerExtraction

# Test with sample document
npm run test:extraction -- sample-invoice.pdf
```

### Mock Configuration

For testing without model downloads:

```typescript
// In test setup
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    predict: vi.fn().mockResolvedValue({
      answer: 'Mock Answer',
      score: 0.9
    })
  })
}))
```

## Troubleshooting

### Common Issues

1. **Model Download Failures**
   - Check network connectivity to huggingface.co
   - Verify disk space for model cache
   - Consider using offline model files

2. **Low Confidence Scores**
   - Review question phrasing for your document types
   - Consider fine-tuning models on your data
   - Adjust confidence thresholds

3. **Memory Issues**
   - Monitor available RAM during extraction
   - Use smaller models for resource-constrained environments
   - Implement model unloading for batch processing

### Performance Monitoring

```typescript
// Log extraction metrics
console.log('Extraction completed:', {
  processingTime: endTime - startTime,
  confidenceScore: result.confidence,
  extractedFields: Object.keys(result.data).length
})
```

## Future Enhancements

- Custom model training on farm-specific documents
- Multi-language extraction support
- Specialized models for different document types
- GPU acceleration for faster processing

## Related Documentation

- [Document Classification](./document-classification.md)
- [Human Review Process](./human-review.md)
- [Training Pipeline](./training-pipeline.md)