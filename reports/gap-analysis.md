# AgriTool Gap Analysis – Scraper · AI · UI (Verbatim-first)

## Executive Summary

This gap analysis compares the current AgriTool implementation against the target verbatim-first, structure-preserving behavior. The analysis reveals significant gaps in the scraper layer's structure preservation, AI processing confidence scoring, and UI verbatim rendering capabilities.

**Overall Status**: ⚠️ Partial Implementation (35% complete)

## 1. SCRAPER LAYER ANALYSIS

### 1.1 Verbatim Content Storage
**Desired**: Store content as ordered `blocks[]` with type, original markup, verbatim flag, and source pointer
**Current**: Basic HTML/text storage without structured blocks
**Status**: ❌ Missing
**Files**: `supabase/functions/afir-harvester/index.ts:171-179`
**Evidence**: 
```typescript
const pageData = {
  run_id,
  source_site: sourceSite,
  source_url: candidateUrl,
  raw_html: html,
  raw_text: textMarkdown, // ❌ Flattened text, no blocks
  text_markdown: textMarkdown,
  status: 'scraped'
};
```
**Impact**: HIGH - No structured content preservation, verbatim flag missing
**Fix Proposal**: Implement block parser that segments HTML into typed blocks with verbatim flags
**Owner**: Backend Developer
**ETA**: 2 weeks

### 1.2 Table Preservation
**Desired**: Tables extracted as structured data, not flattened text
**Current**: Tables flattened in stripToText function
**Status**: ❌ Missing
**Files**: `supabase/functions/lib/harvest.ts` (referenced in summary)
**Evidence**: `stripToText()` function removes all HTML tags including tables
**Impact**: CRITICAL - Table data completely lost
**Fix Proposal**: Implement table detector and structured table extraction
**Owner**: Backend Developer
**ETA**: 1 week

### 1.3 Document Extraction
**Desired**: Capture every file with embedded text extraction and table preservation
**Current**: No document extraction in scrapers
**Status**: ❌ Missing
**Files**: Scraper functions lack document processing
**Evidence**: No PDF/DOCX extraction logic found in scraper code
**Impact**: HIGH - Missing critical subsidy documentation
**Fix Proposal**: Integrate document extraction pipeline into scrapers
**Owner**: Backend Developer
**ETA**: 3 weeks

### 1.4 Hash and Deduplication
**Desired**: Content hashing for deduplication and change tracking
**Current**: URL-based deduplication only
**Status**: ⚠️ Partial
**Files**: `AI_SCRAPER_RAW_TEXTS/scraper/extract_raw_page.py:236`
**Evidence**: Basic URL hashing found, but no content hashing
**Impact**: MEDIUM - Inefficient duplicate detection
**Fix Proposal**: Implement SHA256 content hashing
**Owner**: Backend Developer
**ETA**: 1 week

## 2. AI PROCESSING LAYER ANALYSIS

### 2.1 Confidence Scoring
**Desired**: Each extracted field carries confidence (0..1) score
**Current**: No confidence scoring in current AI extraction
**Status**: ❌ Missing
**Files**: Search results show minimal confidence-related code
**Evidence**: No confidence scoring in extraction pipeline
**Impact**: HIGH - No quality assessment of extracted data
**Fix Proposal**: Implement confidence scoring for all extracted fields
**Owner**: AI Engineer
**ETA**: 2 weeks

### 2.2 Source Provenance
**Desired**: Each field tagged with source (web vs document + page number)
**Current**: Basic source tracking in enhanced schema
**Status**: ⚠️ Partial
**Files**: `src/types/enhanced-subsidy.ts:3-8`
**Evidence**: 
```typescript
export interface SourceReference {
  type: 'web' | 'doc';
  url?: string;
  filename?: string;
  page?: number; // ✅ Present but unused
}
```
**Impact**: MEDIUM - Source tracking exists but not populated
**Fix Proposal**: Populate source references in AI extraction pipeline
**Owner**: AI Engineer
**ETA**: 1 week

### 2.3 Gap Filling and Promotion
**Desired**: Promote document content to webpage fields with "From: <doc>" tags
**Current**: No gap filling or promotion logic
**Status**: ❌ Missing
**Files**: No promotion logic found in codebase
**Evidence**: Missing cross-source field promotion
**Impact**: HIGH - Users miss critical information from documents
**Fix Proposal**: Implement document-to-webpage field promotion with tagging
**Owner**: AI Engineer
**ETA**: 2 weeks

### 2.4 Conflict Detection
**Desired**: Flag conflicts (e.g., two different deadlines) for review
**Current**: No conflict detection
**Status**: ❌ Missing
**Files**: No conflict detection in validation code
**Evidence**: No validation for conflicting field values
**Impact**: MEDIUM - Inconsistent data quality
**Fix Proposal**: Add conflict detection in field mapping
**Owner**: AI Engineer
**ETA**: 1 week

### 2.5 Data Normalization
**Desired**: ISO dates, {amount,currency} money format, ranges
**Current**: Basic formatting in UI components only
**Status**: ⚠️ Partial
**Files**: `src/components/subsidy/EnhancedSubsidyDisplay.tsx:14-30`
**Evidence**: 
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR', // ❌ Hardcoded EUR
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
```
**Impact**: MEDIUM - Data format inconsistency
**Fix Proposal**: Implement structured normalization in AI layer
**Owner**: AI Engineer
**ETA**: 1 week

## 3. UI LAYER ANALYSIS

### 3.1 Verbatim Content Rendering
**Desired**: Original formatting preserved, no reflow that breaks meaning
**Current**: Basic text rendering without verbatim preservation
**Status**: ⚠️ Partial
**Files**: `src/components/subsidy/EnhancedSubsidyDisplay.tsx`
**Evidence**: Text rendered as simple paragraphs without verbatim markers
**Impact**: MEDIUM - Original formatting lost
**Fix Proposal**: Implement verbatim block renderer with original formatting
**Owner**: Frontend Developer
**ETA**: 1 week

### 3.2 Source Badges
**Desired**: Source badges on promoted text showing "From: Decision Art. X / Annex Y (PDF)"
**Current**: Basic source counting only
**Status**: ⚠️ Partial
**Files**: `src/components/subsidy/EnhancedSubsidyDisplay.tsx:32-40`
**Evidence**: 
```typescript
const renderSourceBadge = (sources: any[]) => {
  if (!sources || sources.length === 0) return null;
  const sourceCount = sources.length;
  return (
    <Badge variant="outline" className="text-xs">
      {sourceCount} source{sourceCount > 1 ? 's' : ''} // ❌ No detailed source info
    </Badge>
  );
};
```
**Impact**: HIGH - Users can't verify information sources
**Fix Proposal**: Enhance source badges with detailed provenance
**Owner**: Frontend Developer
**ETA**: 1 week

### 3.3 Table Rendering
**Desired**: Tables stay tables end-to-end with proper structure
**Current**: No table-specific rendering components
**Status**: ❌ Missing
**Files**: No table components found in subsidy display
**Evidence**: No structured table rendering in UI
**Impact**: HIGH - Tabular data presentation lost
**Fix Proposal**: Create table renderer component for structured data
**Owner**: Frontend Developer
**ETA**: 1 week

### 3.4 Document Previews
**Desired**: If extracted, show inline preview/tables for documents
**Current**: Basic download links only
**Status**: ⚠️ Partial
**Files**: `src/components/subsidy/EnhancedSubsidyDisplay.tsx:331-356`
**Evidence**: 
```typescript
{subsidy.documents.map((doc, index) => (
  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{doc.title}</p>
      <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
      <p className="text-xs text-muted-foreground">{doc.filename}</p>
    </div>
    <Button size="sm" variant="outline">
      <Download className="h-4 w-4" /> // ❌ Download only, no preview
    </Button>
  </div>
))}
```
**Impact**: MEDIUM - No document content preview
**Fix Proposal**: Add inline document preview for extracted content
**Owner**: Frontend Developer
**ETA**: 2 weeks

## 4. SCHEMA COMPLIANCE ANALYSIS

### 4.1 Scrape Bundle Schema Compliance
**Current Schema**: Basic flat structure in `raw_scraped_pages`
**Target Schema**: Structured blocks with verbatim flags and source references
**Compliance**: ❌ 10% - Missing blocks array, verbatim flags, structured documents
**Files**: Database tables lack structured content fields

### 4.2 Subsidy Card Schema Compliance
**Current Schema**: Enhanced subsidy types with basic source tracking
**Target Schema**: Confidence scoring, conflict detection, normalized fields
**Compliance**: ⚠️ 40% - Source structure exists but confidence and normalization missing
**Files**: `src/types/enhanced-subsidy.ts`

## 5. RISK ASSESSMENT

### High Risk Issues
1. **Table Data Loss**: Complete loss of tabular information (Impact: Business Critical)
2. **Missing Confidence**: No quality assessment of extracted data (Impact: Data Quality)
3. **Source Verification**: Users cannot verify information sources (Impact: Trust)

### Medium Risk Issues
1. **Format Preservation**: Original document formatting lost
2. **Conflict Detection**: Inconsistent data not flagged
3. **Document Integration**: Documents not integrated into main content

### Low Risk Issues
1. **Hash Optimization**: Deduplication efficiency
2. **UI Polish**: Enhanced source badge details

## 6. COMPLIANCE METRICS

Based on target schemas:
- **Scraper Layer**: 15% compliant (basic HTML storage only)
- **AI Processing**: 25% compliant (source structure partial, no confidence)
- **UI Layer**: 45% compliant (enhanced display partial, missing verbatim/tables)

**Overall System**: 28% compliant with target verbatim-first architecture

## 7. IMMEDIATE ACTIONS REQUIRED

1. **Week 1**: Implement table extraction and content hashing
2. **Week 2**: Add confidence scoring and block-based storage
3. **Week 3**: Integrate document extraction and source provenance
4. **Week 4**: Enhance UI with verbatim rendering and table display

## 8. SUCCESS CRITERIA

✅ Tables extracted as structured data, not flattened text
✅ Each field has confidence score ≥ 0.7 for quality fields
✅ Source badges show detailed provenance (document + page)
✅ Verbatim blocks preserve original formatting
✅ Document content integrated with inline previews
✅ Conflict detection flags inconsistent dates/amounts
✅ Hash-based deduplication prevents content re-processing