# Structural Extraction Prompt - Lossless AgriTool Standard

## Core Mission
You must extract and preserve the full hierarchical structure (all headings, subheadings, bullet points, numbered lists, tables, and all annexes/documents with names, types, sizes, download links) as they appear on the source FranceAgriMer page.

## CRITICAL REQUIREMENTS

### 1. Structure Preservation
- **Every list and sublist must remain an array.** No bullets or tables may be flattened into text blobs.
- Preserve exact nesting levels, indentation, and hierarchical relationships
- Tables must be extracted as arrays of objects (one per row)
- Numbered lists must maintain sequence and sub-numbering

### 2. Content Extraction Rules
- For any field or section that exists on the page, you must extract its content
- If you cannot parse it, note the error and include the raw HTML chunk as `unparsed_html` for admin review
- **NEVER output "Not specified"** unless the field is truly absent on the source
- If a section is ambiguous, include it with a warning rather than omit it

### 3. Document & Annex Handling
For every annex/document, provide (if present):
- `name`: Exact document name as shown
- `type`: File extension (pdf, doc, xls, other)
- `size`: File size if available
- `url`: Complete download link
- `parse_status`: "success" or "failed"
- `parse_error`: Description if parsing failed

### 4. Dynamic Content Detection
- If you encounter dynamic or JavaScript-loaded content, flag it for admin with a warning
- Note any content that appears to be loaded asynchronously
- Flag suspected missing content due to JS rendering

### 5. Error Handling & Warnings
- If any field is missed or ambiguous, include an explicit warning in `extraction_warnings`
- Include evidence (HTML snippets) for any parsing failures
- Flag potential data loss or structural collapse

## Required Output Format

```json
{
  "title": "Exact page title",
  "sections": [
    {
      "heading": "Section heading",
      "type": "list|numbered_list|table|text",
      "content": [...], // Array for list/table, string for text
      "unparsed_html": "..." // Only if failed to extract
    }
  ],
  "documents": [
    {
      "name": "Document name",
      "type": "pdf|doc|xls|other",
      "size": "File size",
      "url": "Full document URL",
      "parse_status": "success|failed",
      "parse_error": "... (if failed)"
    }
  ],
  "eligibility": [...], // Structured array of eligibility criteria
  "application_steps": [...], // Structured array of application steps
  "evaluation_criteria": [...], // Structured array of evaluation criteria
  "deadlines": [...], // Structured array of dates and deadlines
  "amounts": [...], // Structured array of funding amounts
  "extraction_warnings": [
    "List any issues or ambiguities encountered"
  ],
  "original_html_snippet": "Key HTML sections for admin traceability",
  "completeness": {
    "sections_extracted": 0,
    "lists_preserved": 0,
    "documents_found": 0,
    "warnings_count": 0,
    "confidence_score": 0-100
  }
}
```

## Validation Requirements

The extraction will be validated against these criteria:
1. **Zero flattening**: No lists collapsed into paragraphs
2. **Complete document capture**: All annexes/forms present with metadata
3. **Structural integrity**: Hierarchy and nesting preserved exactly
4. **Content completeness**: No "Not specified" where source has content
5. **Admin traceability**: Clear warnings and HTML evidence for any issues

## Failure Conditions

The following will result in QA failure:
- Any list or table flattened into text
- Missing documents that exist in source
- "Not specified" used where source contains content
- Structural hierarchy lost or simplified
- Missing extraction warnings for ambiguous content

## Success Definition

A successful extraction must:
- Preserve 100% of visible structure and hierarchy
- Capture all documents with complete metadata
- Flag all ambiguities rather than make assumptions
- Provide admin review data for any uncertain content
- Score 95%+ on structural integrity validation

This is the standard for "lossless extraction" - anything less compromises the platform's credibility and blocks future AI-powered features.