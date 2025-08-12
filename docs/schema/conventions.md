# AgriTool Schema Conventions

## Content Hashing

### SHA256 Implementation
All content hashing uses SHA256 for consistent deduplication:

```typescript
function generateContentHash(content: string): string {
  const canonical = content
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim()
    .toLowerCase();
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
```

### Hash Scope
- **Document hashes**: Full document content (after text extraction)
- **Block hashes**: Individual content block (HTML + text)
- **Page hashes**: Combined hash of all blocks on a page

## Last Modified Tracking

### Source Detection
1. **Webpages**: Use `Last-Modified` header or meta tags
2. **Documents**: File modification time from download headers
3. **Fallback**: Scrape timestamp as ISO string

### Update Logic
```sql
-- Only re-process if content hash differs OR last_modified is newer
UPDATE content SET processed = false 
WHERE hash != :new_hash OR last_modified < :source_last_modified
```

## Deduplication Strategy

### Multi-Level Dedup
1. **URL Level**: Prevent re-scraping same URL within time window
2. **Content Level**: Skip processing if content hash unchanged
3. **Block Level**: Merge identical blocks from different sources

### Dedup Windows
- **Webpage content**: 24 hours
- **Document content**: 7 days (documents change less frequently)
- **Emergency override**: Force re-scrape with `?force=true` parameter

## Language Tagging

### Detection Priority
1. **HTML lang attribute**: `<html lang="fr">`
2. **Meta content-language**: `<meta http-equiv="content-language" content="fr">`
3. **AI detection**: Analyze text content for language
4. **URL pattern**: `.fr` → French, `.ro` → Romanian
5. **Default fallback**: Based on scraper region

### Storage Format
```json
{
  "lang": "fr",           // Primary language (ISO 639-1)
  "lang_confidence": 0.95, // AI detection confidence
  "multilingual": false   // True if multiple languages detected
}
```

### Multilingual Content
For pages with multiple languages:
```json
{
  "lang": "fr",           // Primary language
  "multilingual": true,
  "languages": [
    { "code": "fr", "coverage": 0.7 },
    { "code": "en", "coverage": 0.3 }
  ]
}
```

## Table Encoding

### Structured Table Format
```json
{
  "type": "table",
  "verbatim": true,
  "table": {
    "columns": ["Critère", "PME (%)", "GE (%)", "Plafond (€)"],
    "rows": [
      ["Immatériel", "60", "50", "500,000"],
      ["Matériel", "40", "25", "5,000,000"]
    ],
    "caption": "Taux de financement par catégorie",
    "spans": [
      { "row": 0, "col": 1, "colspan": 2, "content": "Taux maximum" }
    ]
  },
  "source_ref": {
    "kind": "document",
    "filename": "decision-2024-048.pdf", 
    "page_number": 6
  }
}
```

### Table Cell Types
Tables preserve rich content types:
```json
{
  "columns": ["Field", "Value", "Source"],
  "rows": [
    [
      "Deadline",
      { "type": "date", "value": "2024-12-31", "formatted": "31 décembre 2024" },
      { "type": "link", "url": "doc.pdf", "text": "Decision p.3" }
    ]
  ]
}
```

### Merged Cells
Colspan/rowspan preserved for complex tables:
```json
{
  "spans": [
    { "row": 1, "col": 2, "colspan": 3, "rowspan": 2, "content": "Combined cell" }
  ]
}
```

## Block ID Generation

### Consistent Block IDs
Generate deterministic IDs for content blocks:
```typescript
function generateBlockId(content: string, type: string, position: number): string {
  const contentHash = generateContentHash(content).substring(0, 8);
  return `${type}_${position}_${contentHash}`;
}
```

### Examples
- `heading_1_a4b2c8d9` - First heading with content hash
- `table_3_x7y9z1a2` - Third table with content hash
- `paragraph_15_m5n7p8q4` - 15th paragraph with content hash

## Source Reference Format

### Webpage Sources
```json
{
  "kind": "webpage",
  "url": "https://www.franceagrimer.fr/aide-123",
  "selector": "article.main-content > section:nth-child(3)",
  "captured_at": "2024-08-12T10:30:00Z"
}
```

### Document Sources  
```json
{
  "kind": "document", 
  "filename": "decision-intv-siif-2024-048.pdf",
  "page_number": 6,
  "section": "Article 3.2",
  "text_region": "paragraphs 2-4"
}
```

## Verbatim Content Rules

### Preservation Requirements
1. **Original formatting**: HTML markup preserved in `html` field
2. **Clean version**: Markdown version in `markdown` field  
3. **Plain text**: Stripped version in `text` field
4. **Verbatim flag**: Always `true` for content blocks

### Forbidden Transformations
- ❌ Paraphrasing or summarizing
- ❌ Translating to other languages
- ❌ Correcting typos or grammar
- ❌ Converting formatting (bold → italic)
- ❌ Reordering sentences or bullets

### Allowed Transformations
- ✅ HTML → Markdown conversion (structural only)
- ✅ Whitespace normalization
- ✅ Character encoding fixes (encoding issues)
- ✅ Link absolutization (relative → absolute URLs)

## Error Handling

### Extraction Failures
When content extraction fails, preserve context:
```json
{
  "id": "failed_block_001",
  "type": "error",
  "verbatim": true,
  "error": {
    "type": "extraction_failed",
    "message": "Unable to parse table structure", 
    "raw_html": "<table>...corrupted HTML...</table>",
    "fallback_text": "Table content as plain text"
  },
  "source_ref": { ... }
}
```

### Partial Extractions
For partially successful extractions:
```json
{
  "confidence": 0.6,
  "quality_flags": ["incomplete", "unclear"],
  "extraction_notes": "Some table cells could not be parsed"
}
```