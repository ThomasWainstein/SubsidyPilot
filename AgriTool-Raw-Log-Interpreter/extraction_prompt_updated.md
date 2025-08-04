# Hierarchical Structure Preservation Prompt - AgriTool Lossless Standard

## Core Mission
Extract and preserve COMPLETE hierarchical structure using structured markdown format. Every heading, subheading, bullet point, numbered list, table, and indentation level must be maintained exactly as it appears in the source.

## CRITICAL REQUIREMENTS

### 1. Hierarchical Structure as Markdown
- **Convert ALL content to structured markdown with preserved hierarchy**
- Use proper markdown syntax: `#` for headings, `-` for bullets, `1.` for numbered lists
- Preserve exact nesting with proper indentation (2 spaces per level)
- Tables must use markdown table format `| Column | Column |`
- Code blocks for technical content using ```

### 2. Structure Types to Preserve
- **Headings**: `#`, `##`, `###` etc. for h1, h2, h3
- **Lists**: `-` for bullets with proper indentation
- **Numbered**: `1.`, `2.` etc. with sub-numbering `1.1`, `1.2`
- **Tables**: Markdown table format with proper alignment
- **Definitions**: Use `:` for definition lists when appropriate

### 3. Content Extraction Rules
- Extract content AS MARKDOWN preserving all visual hierarchy
- If you cannot parse structure, include raw HTML in code blocks
- **NEVER flatten lists or remove indentation**
- Preserve bold, italic, and other formatting using markdown syntax
- Include original spacing and line breaks

### 4. Document & Annex Handling
For every document, create markdown links:
```markdown
## Documents Required
- [Document Name](full-url) (PDF, 2MB) - Description
- [Application Form](url) (DOC, 500KB) - Required submission form
```

### 5. Error Handling & Warnings
- Flag extraction issues in a dedicated markdown section
- Include code blocks with problematic HTML when needed
- Preserve partial structure rather than omit sections

## Required Output Format

```json
{
  "title": "Exact page title",
  "content_markdown": "# Complete structured markdown content with preserved hierarchy\n\n## Section 1\n- Bullet point 1\n  - Sub-bullet 1\n  - Sub-bullet 2\n- Bullet point 2\n\n### Subsection\n1. Numbered item 1\n   1. Sub-numbered item\n2. Numbered item 2\n\n| Table Col 1 | Table Col 2 |\n|-------------|-------------|\n| Data 1      | Data 2      |",
  "structured_sections": {
    "eligibility": "## Eligibility Criteria\n\n- French farmers with valid SIRET\n  - Individual farmers\n  - Agricultural cooperatives\n  - Producer groups\n- Project location requirements\n  - Must be in rural designated areas\n  - Environmental compliance required",
    "application_steps": "## Application Process\n\n1. **Preparation Phase**\n   1. Gather required documents\n   2. Complete eligibility self-assessment\n2. **Submission Phase**\n   1. Online application portal\n   2. Document upload\n3. **Review Phase**\n   - Administrative review (30 days)\n   - Technical evaluation",
    "evaluation_criteria": "## Evaluation Criteria\n\n### Technical Merit (40 points)\n- Innovation level\n- Technical feasibility\n\n### Economic Impact (35 points)\n- Job creation potential\n- Revenue projections\n\n### Environmental Impact (25 points)\n- Sustainability measures\n- Carbon footprint reduction",
    "deadlines": "## Important Dates\n\n- **Application Opens**: January 15, 2024\n- **Application Deadline**: March 31, 2024\n- **Decision Notification**: June 15, 2024\n- **Project Start**: September 1, 2024",
    "amounts": "## Funding Details\n\n### Grant Amounts\n- **Minimum**: €10,000\n- **Maximum**: €500,000\n- **Co-financing Rate**: 40-60% depending on:\n  - Applicant type\n  - Project location\n  - Innovation level\n\n### Payment Schedule\n- 30% upon contract signature\n- 40% at mid-project milestone\n- 30% upon completion"
  },
  "documents": [
    {
      "name": "Application Guide",
      "type": "pdf", 
      "size": "2.5MB",
      "url": "https://full-url/guide.pdf",
      "markdown_link": "[Application Guide](https://full-url/guide.pdf) (PDF, 2.5MB)"
    }
  ],
  "extraction_warnings": [
    "List any hierarchical preservation issues"
  ],
  "completeness": {
    "sections_extracted": 0,
    "hierarchy_preserved": 0,
    "markdown_quality_score": 0-100,
    "structure_integrity": 0-100
  }
}
```

## Validation Requirements

1. **Perfect Markdown Structure**: All content rendered as valid markdown with preserved hierarchy
2. **No Flattening**: Every list, table, and heading maintains exact nesting levels  
3. **Visual Fidelity**: Markdown output when rendered must match source visual structure
4. **Complete Capture**: All documents referenced with proper markdown links
5. **Readability**: Markdown is clean, properly formatted, and human-readable

## Markdown Quality Standards

- Consistent heading hierarchy (`#`, `##`, `###`)
- Proper list indentation (2 spaces per level)
- Valid table syntax with alignment
- Proper code blocks for technical content
- Clean line breaks and spacing
- Bold/italic formatting where appropriate

## Success Definition

Perfect hierarchical extraction means:
- **100% visual structure preserved** in markdown format
- **All lists maintain exact nesting** with proper indentation
- **Tables rendered correctly** in markdown format
- **Documents linked properly** with metadata
- **Markdown renders identically** to source visual hierarchy
- **95%+ structure integrity score**

This ensures users see the exact same hierarchy and organization as the original document, enabling perfect comprehension and usability.