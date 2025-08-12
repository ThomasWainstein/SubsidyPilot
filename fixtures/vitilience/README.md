# VITILIENCE Subsidy - End-to-End Test Case

## Overview
This fixture represents a complete end-to-end test case for the VITILIENCE subsidy, demonstrating the verbatim-first, structure-preserving pipeline from raw scrape to AI-processed subsidy card.

## Files Structure

```
fixtures/vitilience/
├── README.md                    # This file
├── 01_raw_page.html            # Original webpage HTML
├── 02_clean.md                 # Clean markdown conversion
├── 03_blocks.json              # Structured blocks with verbatim content
├── 04_documents.json           # Associated documents with extraction
├── 05_subsidy_card.json        # Final AI-processed subsidy card
└── validation_results.json     # Schema validation results
```

## Test Data Source

**URL**: `https://www.franceagrimer.fr/aides/projets-territoriaux-viticulture`  
**Scraped**: 2024-08-12T10:30:00Z  
**Language**: French (fr)  
**Source Site**: FranceAgriMer

## Expected Behaviors

### 1. Content Preservation
- ✅ All headings, paragraphs, lists, and tables preserved as structured blocks
- ✅ Each block has `verbatim: true` flag
- ✅ Original HTML markup maintained alongside clean versions
- ✅ Source references point to specific webpage sections

### 2. Table Extraction
- ✅ Funding rate tables extracted as structured data (not flattened text)
- ✅ Column headers preserved: ["Catégorie", "PME (%)", "GE (%)", "Plafond (€)"]
- ✅ Table relationships maintained (funding rates by entity type)

### 3. Document Integration
- ✅ Decision documents linked and downloaded
- ✅ PDF text extraction performed
- ✅ Document tables integrated into main content
- ✅ Source badges show document provenance

### 4. AI Processing
- ✅ Must-show fields populated with confidence scores
- ✅ Document content promoted to webpage fields where missing
- ✅ Conflicts detected (if any) between webpage and document data
- ✅ Source provenance maintained for each field

## Validation Criteria

### Schema Compliance
- `03_blocks.json` validates against `scrape_bundle.schema.json`
- `05_subsidy_card.json` validates against `subsidy_card.schema.json`

### Quality Metrics
- **Block coverage**: 100% of webpage content in structured blocks
- **Table preservation**: Tables remain structured (not flattened)
- **Confidence scores**: Must-show fields ≥ 0.7 confidence
- **Source attribution**: All fields have valid source references

### Content Integrity
- **Verbatim content**: No paraphrasing or rewriting
- **Format preservation**: HTML formatting maintained
- **Link handling**: All relative links converted to absolute
- **Document integration**: PDF content properly extracted and attributed

## Known Issues/Limitations

1. **Image Content**: Alt text captured but images not processed
2. **JavaScript Content**: Dynamic content not captured in static scrape
3. **Form Elements**: Application forms noted but not structurally parsed

## Usage in Testing

This fixture serves as ground truth for:
- **Scraper validation**: Ensure all content types properly extracted
- **AI pipeline testing**: Verify field mapping and confidence scoring
- **UI component testing**: Test rendering of verbatim content and tables
- **Schema compliance**: Validate adherence to defined schemas

## Regeneration

To regenerate this fixture:
```bash
# Run full pipeline on VITILIENCE URL
npm run pipeline:test -- --url "https://www.franceagrimer.fr/aides/projets-territoriaux-viticulture" --output fixtures/vitilience/
```

Last updated: 2024-08-12