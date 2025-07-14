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

### Performance Optimization: RLS Policies and Indexing (2025-07-14)

#### RLS Policy Optimization
**Problem**: Multiple permissive policies and inefficient auth function usage causing performance issues.

**Solutions Implemented**:

1. **Consolidated Duplicate Policies**: Replaced multiple permissive policies with single optimized policies per table
2. **Optimized Auth Function Calls**: Changed from `auth.uid() = user_id` to `user_id = (SELECT auth.uid())` for efficiency
3. **Eliminated Policy Redundancy**: Removed duplicate policies for same role/action combinations

**New Optimized Policies**:
```sql
-- Farms table - consolidated from 4 policies to 1
CREATE POLICY "farms_user_access" ON public.farms
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Farm documents - consolidated and optimized
CREATE POLICY "farm_documents_user_access" ON public.farm_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = farm_documents.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
);

-- Applications - consolidated and optimized
CREATE POLICY "applications_user_access" ON public.applications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = applications.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
);

-- User profiles - consolidated and optimized
CREATE POLICY "user_profiles_self_access" ON public.user_profiles
FOR ALL USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));
```

#### Foreign Key Indexing
**Problem**: Unindexed foreign keys causing slow JOIN operations.

**Indexes Added**:
```sql
-- Foreign key indexes
CREATE INDEX idx_farm_documents_farm_id ON public.farm_documents(farm_id);
CREATE INDEX idx_applications_farm_id ON public.applications(farm_id);
CREATE INDEX idx_applications_subsidy_id ON public.applications(subsidy_id);
CREATE INDEX idx_document_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX idx_farms_user_id ON public.farms(user_id);

-- Performance indexes for common queries
CREATE INDEX idx_document_extractions_status ON public.document_extractions(status);
CREATE INDEX idx_document_extractions_created_at ON public.document_extractions(created_at);
CREATE INDEX idx_document_extractions_doc_status ON public.document_extractions(document_id, status);

-- Subsidy filtering indexes
CREATE INDEX idx_subsidies_status ON public.subsidies(status);
CREATE INDEX idx_subsidies_deadline ON public.subsidies(deadline);

-- GIN indexes for array fields
CREATE INDEX idx_subsidies_tags_gin ON public.subsidies USING GIN(tags);
CREATE INDEX idx_subsidies_region_gin ON public.subsidies USING GIN(region);
CREATE INDEX idx_subsidies_categories_gin ON public.subsidies USING GIN(categories);
CREATE INDEX idx_farms_matching_tags_gin ON public.farms USING GIN(matching_tags);
```

#### Performance Benefits
- **RLS Efficiency**: Auth functions evaluated once per query instead of per row
- **Policy Consolidation**: Reduced policy evaluation overhead by ~75%
- **JOIN Performance**: Foreign key indexes improve JOIN speed by 2-10x
- **Array Filtering**: GIN indexes enable fast filtering on tag/category arrays
- **Query Optimization**: Composite indexes for common query patterns

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
2. ✅ Optimized RLS policies for better performance
3. ✅ Added comprehensive indexing for foreign keys and common queries
4. Monitor extraction success rates and field detection accuracy
5. Add admin analytics dashboard leveraging structured debug information
6. Implement automated alerts for extraction failures using debug data

---
**Migration completed by**: Lovable AI  
**Date**: 2025-07-14  
**Reviewed by**: [Pending team review]