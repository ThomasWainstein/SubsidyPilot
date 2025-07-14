# Schema Changelog

## 2025-07-14: Document Extractions Debug Info Column

### Summary
Added `debug_info` column to `document_extractions` table to properly store structured debug information from AI document extraction processes.

### Changes Made

#### Database Schema
- **Table**: `document_extractions`
- **Column Added**: `debug_info` (JSONB, nullable)
- **Purpose**: Store comprehensive debug information including:
  - Extraction method used (Mammoth.js, XML fallback, etc.)
  - Processing timestamps and performance metrics
  - OpenAI usage statistics (tokens, costs)
  - Text extraction quality metrics
  - Warnings and errors during processing
  - OCR confidence scores
  - Language detection results

#### Migration SQL
```sql
ALTER TABLE public.document_extractions 
ADD COLUMN IF NOT EXISTS debug_info JSONB;
```

#### Row Level Security (RLS)
- **Service Role**: Full access maintained for edge function operations
- **User Access**: Limited to viewing debug info for their own documents through existing RLS policies
- **No additional policies required**: Existing policies automatically cover the new column

### Code Changes

#### Edge Function Updates
- **File**: `supabase/functions/extract-document-data/databaseService.ts`
- **Changes**: Now properly stores debug information in both `extracted_data.debugInfo` (legacy) and `debug_info` (new column)
- **Benefits**: 
  - Structured debug data accessible for admin analytics
  - Improved error tracking and performance monitoring
  - Separate storage prevents debug data from cluttering extraction results

#### Frontend Updates
- **File**: `src/components/farm/ExtractionDebugModal.tsx`
- **Changes**: Updated to read from new `debug_info` column with fallback to legacy location
- **Benefits**: 
  - Backward compatibility maintained
  - Cleaner debug information display
  - Enhanced admin debugging capabilities

### Data Structure

#### Debug Info Schema
```typescript
interface DebugInfo {
  extractionTimestamp: string;
  detectedLanguage?: string;
  extractionMethod: 'mammoth' | 'xml_fallback' | 'pdf_parse';
  libraryUsed: string;
  extractionTime: number; // milliseconds
  textLength: number;
  ocrConfidence?: number;
  
  // OpenAI usage tracking
  openaiTokens: number;
  openaiPromptTokens: number;
  openaiCompletionTokens: number;
  
  // Quality and error tracking
  warnings: string[];
  errors: string[];
  extractedFieldCount: number;
}
```

### Testing Completed
✅ Schema migration executed successfully  
✅ RLS policies verified working with service role  
✅ Edge function updated to use new column  
✅ Frontend debug modal updated with fallback support  
✅ Existing extractions continue to work with legacy debug data  

### Rollback Plan
If issues arise, the column can be safely removed:
```sql
ALTER TABLE public.document_extractions DROP COLUMN IF EXISTS debug_info;
```

The system will automatically fall back to reading debug information from `extracted_data.debugInfo`.

### Latest Enhancement: Aggressive Extraction Prompt (2025-07-14)

#### OpenAI Prompt Improvements
- **Enhanced Field Detection**: Updated prompts to search for field variations like "Farm Name:", "FarmName:", "Name:", etc.
- **Aggressive Pattern Matching**: Instructs AI to extract data even with unclear labels using context clues
- **Increased Text Analysis**: Extended document analysis from 8000 to 10000 characters
- **Better Debug Logging**: Raw text samples now stored in debug_info for troubleshooting
- **Optimized Parameters**: Reduced temperature to 0.1 for more consistent extraction

#### Extraction Strategy Changes
- Scan for ANY label variation patterns
- Extract from tables, forms, headers, lists, paragraphs  
- Find numbers near farming keywords (hectares, area, land)
- Accept partial matches and formatting variations
- Look for patterns like "Name: [value]", "[Label]: [Value]", "[Label] [Value]"

### Next Steps
1. ✅ Enhanced OpenAI prompts for better field extraction
2. Monitor extraction success rates and field detection accuracy
3. Consider migrating legacy debug data to new column structure
4. Add admin analytics dashboard leveraging structured debug information
5. Implement automated alerts for extraction failures using debug data

---
**Migration completed by**: Lovable AI  
**Date**: 2025-07-14  
**Reviewed by**: [Pending team review]