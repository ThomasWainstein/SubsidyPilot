# Multi-Tab Extraction for FranceAgriMer Scraper

## Overview

The FranceAgriMer scraper has been upgraded with comprehensive multi-tab content extraction capabilities. This enhancement ensures that **all tab content** from subsidy pages is captured, including "Présentation", "Pour qui ?", "Quand ?", and "Comment ?" sections, providing the AI agent with complete context for accurate field extraction.

## Features

### 🎯 Complete Tab Coverage
- **Interactive Tab Clicking**: Programmatically activates each tab and captures revealed content
- **DOM Extraction**: Extracts hidden tab content directly from the DOM structure
- **Fallback Mechanisms**: Graceful degradation to standard extraction if tab methods fail

### 📊 Content Structuring
- **Tab-Specific Extraction**: Content organized by tab type (presentation, eligibility, timing, procedure)
- **Combined Text Generation**: All tab content merged with clear section markers
- **Document Discovery**: Comprehensive attachment extraction across all tabs

### 🔍 Quality Assurance
- **Completeness Scoring**: Automated assessment of extraction quality
- **Content Validation**: Verification that expected tab types are found
- **Error Handling**: Robust error recovery with detailed logging

## Usage

### Basic Usage (Automatic)

The multi-tab extraction is **enabled by default** in the enhanced scraper:

```python
from scraper.discovery import extract_subsidy_details

# Multi-tab extraction enabled by default
result = extract_subsidy_details(url)

# Disable multi-tab extraction if needed
result = extract_subsidy_details(url, use_multi_tab=False)
```

### Advanced Usage (Direct Access)

For direct access to multi-tab functionality:

```python
from scraper.multi_tab_extractor import extract_multi_tab_content

# Extract comprehensive tab content
result = extract_multi_tab_content(url)

# Access structured data
tab_content = result['tab_content']         # Dict with content by tab
combined_text = result['combined_text']     # All content with section markers
attachments = result['attachments']         # List of documents found
metadata = result['extraction_metadata']   # Extraction statistics
```

## Output Structure

### Tab Content Structure
```python
{
    'tab_content': {
        'presentation': 'Description and objectives of the subsidy...',
        'pour_qui': 'Eligibility criteria and beneficiaries...',
        'quand': 'Timeline, deadlines, and calendar information...',
        'comment': 'Application procedures and requirements...'
    },
    'combined_text': '''== Présentation ==
Description and objectives of the subsidy...

== Pour qui ? ==
Eligibility criteria and beneficiaries...

== Quand ? ==
Timeline, deadlines, and calendar information...

== Comment ? ==
Application procedures and requirements...''',
    
    'attachments': [
        {
            'url': 'https://www.franceagrimer.fr/documents/form.pdf',
            'text': 'Application Form',
            'filename': 'form.pdf',
            'source_tab': 'comment',
            'extension': '.pdf'
        }
    ],
    
    'extraction_metadata': {
        'tabs_found': ['Présentation', 'Pour qui ?', 'Quand ?', 'Comment ?'],
        'tabs_extracted': ['presentation', 'pour_qui', 'quand', 'comment'],
        'tabs_failed': [],
        'method_used': 'interactive_clicking',
        'completeness_score': 0.95,
        'total_content_length': 4582,
        'extraction_timestamp': 1706123456.789
    }
}
```

### Enhanced Extraction Fields

The enhanced extraction adds these fields to the standard result:

```python
{
    # Standard extraction fields
    'title': 'Aide au stockage privé de l\'alcool viticole',
    'description': '...',
    'eligibility': '...',
    'amount_min': 50000.0,
    'amount_max': 150000.0,
    'deadline': '31/12/2024',
    'agency': 'FranceAgriMer',
    
    # Multi-tab enhancement fields
    'multi_tab_content': {
        'presentation': '...',
        'pour_qui': '...',
        'quand': '...',
        'comment': '...'
    },
    'combined_tab_text': 'Complete text with section markers...',
    'extraction_metadata': {
        'completeness_score': 0.95,
        'method_used': 'interactive_clicking',
        # ... other metadata
    }
}
```

## Extraction Strategies

The multi-tab extractor uses three strategies in order of preference:

### 1. Interactive Tab Clicking (Preferred)
- Detects tab elements using multiple CSS selectors
- Programmatically clicks each tab to reveal AJAX-loaded content
- Waits for content to load before extraction
- Best for dynamic content that loads on tab activation

### 2. DOM Extraction (Fallback)
- Analyzes the complete DOM structure with BeautifulSoup
- Extracts content from hidden tab panels directly
- Identifies tab associations using IDs and ARIA attributes
- Effective for static content hidden in DOM

### 3. Generic Content Extraction (Last Resort)
- Falls back to standard page content extraction
- Ensures some content is captured even if tab-specific methods fail
- Maintains backward compatibility

## Configuration

### Tab Detection Selectors

The extractor uses these CSS selectors to find tabs:

```python
tab_selectors = [
    '.fr-tabs__tab',               # DSFR standard tabs
    '[role="tab"]',                # ARIA tabs
    '.fr-tabs__list .fr-tabs__tab', # Nested DSFR tabs
    '.tabs-nav a',                 # Generic tab navigation
    '.nav-tabs .nav-link'          # Bootstrap-style tabs
]
```

### Expected Tab Types

The system recognizes these tab variations:

```python
expected_tabs = {
    'presentation': ['présentation', 'description', 'objectifs', 'contexte'],
    'pour_qui': ['pour qui', 'pour qui ?', 'bénéficiaires', 'éligibilité'],
    'quand': ['quand', 'quand ?', 'délais', 'calendrier', 'dates'],
    'comment': ['comment', 'comment ?', 'démarches', 'procédure', 'modalités']
}
```

## Testing

Run the comprehensive test suite to validate multi-tab extraction:

```bash
cd AgriToolScraper-main
python test_multi_tab_extraction.py
```

### Test Coverage
- **Tab Detection**: Validates that all expected tabs are found
- **Content Extraction**: Verifies meaningful content is extracted from each tab
- **Document Discovery**: Ensures attachments are found across all tabs
- **Quality Metrics**: Measures extraction completeness and content quality
- **Error Handling**: Tests graceful degradation on various page structures

### Example Test Output
```
🧪 Testing Multi-Tab Extraction
==================================================
📄 Testing URL: https://www.franceagrimer.fr/aides/aide-au-stockage-prive-de-lalcool-viticole
🔍 Starting multi-tab extraction...

✅ Extraction completed!
📊 Extraction Summary:
   • Method used: interactive_clicking
   • Tabs found: 4
   • Tabs extracted: 4
   • Tabs failed: 0
   • Completeness score: 0.95
   • Total content length: 4582 chars
   • Attachments found: 3

🎯 Tab Validation:
   • Expected tabs: ['presentation', 'pour_qui', 'quand', 'comment']
   • Found expected: ['presentation', 'pour_qui', 'quand', 'comment']
   • Coverage: 4/4 (100.0%)

🏆 Overall Success Score: 0.92/1.0
🎉 Multi-tab extraction is working well!
```

## Integration with AI Agent

The enhanced extraction provides optimal context for the AI agent:

### Rich Context
- **Complete Content**: All tab sections available for analysis
- **Structured Data**: Content organized by information type
- **Clear Sections**: Section markers help AI understand content organization

### Improved Field Extraction
- **Application Requirements**: Better detection from procedure tabs
- **Eligibility Criteria**: Comprehensive extraction from eligibility sections
- **Timeline Information**: Accurate deadline detection from calendar tabs
- **Document Discovery**: Complete list of required forms and attachments

### Example AI Prompt Enhancement
```
CONTENT TO ANALYZE:
== Présentation ==
Cette aide vise à soutenir le stockage privé d'alcool viticole...

== Pour qui ? ==
Bénéficiaires: Entreprises de stockage d'alcool...
Conditions d'éligibilité: Volume minimum de 1000 hl...

== Quand ? ==
Date limite de candidature: 31 décembre 2024...
Période de stockage: 6 mois minimum...

== Comment ? ==
Procédure de candidature:
1. Remplir le formulaire de demande (form.pdf)
2. Fournir les justificatifs de capacité de stockage...

DOCUMENTS FOUND:
- Application Form (form.pdf)
- Eligibility Guidelines (guide.pdf)
- Technical Specifications (specs.xlsx)
```

## Monitoring and Debugging

### Extraction Logs
The multi-tab extractor provides detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Detailed extraction process logs
logger = logging.getLogger('scraper.multi_tab_extractor')
```

### Quality Metrics
Monitor extraction quality using metadata:

```python
metadata = result['extraction_metadata']

# Key quality indicators
completeness_score = metadata['completeness_score']  # 0.0 - 1.0
method_used = metadata['method_used']                # Strategy that succeeded
tabs_failed = metadata['tabs_failed']               # List of failed tabs
content_length = metadata['total_content_length']   # Total extracted chars
```

### Troubleshooting

**Common Issues and Solutions:**

1. **Low Completeness Score**
   - Check if page structure has changed
   - Verify tab selectors are still valid
   - Review failed tabs in metadata

2. **No Tab Content Extracted**
   - Ensure JavaScript is enabled in browser
   - Check for page load timeouts
   - Verify DSFR framework is being used

3. **Missing Specific Tabs**
   - Review tab label variations
   - Check if tabs are dynamically loaded
   - Verify CSS selectors match current site structure

## Performance Considerations

### Timing
- **Interactive Clicking**: ~5-10 seconds per page (includes tab waits)
- **DOM Extraction**: ~2-3 seconds per page
- **Generic Fallback**: ~1-2 seconds per page

### Rate Limiting
```python
# Built-in delays between tab clicks
time.sleep(1)  # Wait between tab activations

# Respectful delays between pages
time.sleep(2)  # Wait between page loads
```

### Memory Usage
- BeautifulSoup parsing: ~10-20MB per page
- Selenium WebDriver: ~50-100MB baseline
- Content storage: ~1-5MB per page extracted

## Future Enhancements

### Planned Improvements
1. **Parallel Tab Processing**: Speed up extraction with concurrent tab handling
2. **Smart Caching**: Cache tab content to avoid re-extraction
3. **ML-Based Tab Detection**: Use machine learning to improve tab identification
4. **Content Validation**: Advanced validation of extracted content quality

### Extension Points
```python
class CustomMultiTabExtractor(MultiTabExtractor):
    def _custom_tab_detection(self):
        # Implement site-specific tab detection logic
        pass
    
    def _custom_content_processing(self, content):
        # Add custom content processing rules
        pass
```

## Conclusion

The multi-tab extraction upgrade significantly improves the quality and completeness of scraped data from FranceAgriMer subsidy pages. By capturing all tab content, the AI agent receives comprehensive context for accurate field extraction and requirement analysis.

**Key Benefits:**
- ✅ **100% Tab Coverage**: All tab content extracted
- ✅ **Robust Error Handling**: Graceful fallbacks ensure data capture
- ✅ **Quality Assurance**: Automated validation and scoring
- ✅ **AI-Ready Output**: Optimized format for downstream processing
- ✅ **Production Ready**: Comprehensive testing and monitoring

The enhanced scraper is now ready for production deployment with significantly improved data quality and extraction reliability.