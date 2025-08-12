# AgriTool Gap Remediation Roadmap

## Overview
This roadmap provides a sequenced plan to address the critical gaps identified in the verbatim-first implementation analysis. All fixes are grouped by layer (Scraper/AI/UI) with clear acceptance tests.

## Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish core verbatim content preservation and table extraction

### PR 1: `gap-fix/scraper-foundation`
**Files to modify**: 
- `supabase/functions/afir-harvester/index.ts`
- `supabase/functions/lib/harvest.ts`
- Database schema for `raw_scraped_pages`

**Changes**:
1. **Block-based Content Storage**
   ```typescript
   // Replace flat text storage with structured blocks
   const contentBlocks = parseHTMLToBlocks(html);
   const pageData = {
     run_id,
     source_site: sourceSite,
     source_url: candidateUrl,
     content_blocks: contentBlocks, // NEW: structured blocks
     content_hash: generateContentHash(html), // NEW: content hashing
     last_modified: extractLastModified(response.headers),
     raw_html: html, // Keep for debugging
     status: 'scraped'
   };
   ```

2. **Table Extraction Engine**
   ```typescript
   function parseHTMLToBlocks(html: string): ContentBlock[] {
     const blocks: ContentBlock[] = [];
     const doc = parseHTML(html);
     
     // Extract tables as structured data
     doc.querySelectorAll('table').forEach((table, index) => {
       blocks.push({
         id: `table_${index}_${generateHash(table.outerHTML)}`,
         type: 'table',
         verbatim: true,
         html: table.outerHTML,
         table: extractTableData(table), // NEW: structured table data
         source_ref: { kind: 'webpage', url: currentUrl }
       });
     });
     
     // Extract other content types...
     return blocks;
   }
   ```

**Acceptance Tests**:
- ✅ Tables stored as structured data (columns + rows), not flattened text
- ✅ All content blocks have `verbatim: true` flag
- ✅ Content hash prevents duplicate processing
- ✅ Block IDs are deterministic and consistent

### PR 2: `gap-fix/document-integration`
**Files to modify**:
- `supabase/functions/lib/documentExtractor.ts` (new)
- Scraper harvesters to include document processing

**Changes**:
1. **Document Discovery and Download**
   ```typescript
   // Find and download associated documents
   const documents = await discoverDocuments(html, baseUrl);
   for (const doc of documents) {
     const extractedContent = await extractDocumentContent(doc);
     doc.extracted_text = extractedContent.text;
     doc.tables = extractedContent.tables;
     doc.hash = generateContentHash(extractedContent.text);
   }
   ```

2. **PDF/DOCX Table Extraction**
   ```typescript
   async function extractDocumentContent(doc: Document) {
     if (doc.type === 'pdf') {
       return await extractFromPDF(doc.url);
     } else if (doc.type === 'docx') {
       return await extractFromDOCX(doc.url);
     }
     // Handle other formats...
   }
   ```

**Acceptance Tests**:
- ✅ PDF documents downloaded and text extracted
- ✅ Tables in documents preserved as structured data
- ✅ Document hash prevents re-processing unchanged files
- ✅ Document metadata (pages, size, mime type) captured

## Phase 2: AI Processing Enhancement (Weeks 3-4)
**Goal**: Implement confidence scoring, source provenance, and gap filling

### PR 3: `gap-fix/ai-confidence`
**Files to modify**:
- `supabase/functions/extract-canonical-subsidy/` (enhancement)
- AI prompt templates

**Changes**:
1. **Confidence Scoring System**
   ```typescript
   interface FieldExtraction {
     value: string;
     confidence: number; // 0.0 - 1.0
     source: SourceReference;
     extraction_method: 'direct_text' | 'promoted_from_doc' | 'inferred';
   }
   
   function calculateConfidence(
     field: string, 
     source: SourceReference, 
     extractionQuality: number
   ): number {
     let baseConfidence = extractionQuality;
     
     // Boost confidence for official documents
     if (source.kind === 'document' && source.filename?.includes('decision')) {
       baseConfidence *= 1.2;
     }
     
     // Reduce confidence for unclear text
     if (field.includes('...') || field.length < 10) {
       baseConfidence *= 0.7;
     }
     
     return Math.min(baseConfidence, 1.0);
   }
   ```

2. **Source Provenance Tracking**
   ```typescript
   function generateSourceLabel(source: SourceReference): string {
     if (source.kind === 'document') {
       return `From: ${source.filename} / Page ${source.page_number} (PDF)`;
     } else {
       return `From: Webpage`;
     }
   }
   ```

**Acceptance Tests**:
- ✅ Every extracted field has confidence score 0.0-1.0
- ✅ Official documents get higher confidence than webpage text
- ✅ Source labels properly formatted for UI display
- ✅ Confidence correlates with extraction quality

### PR 4: `gap-fix/ai-gap-filling`
**Files to modify**:
- AI extraction pipeline
- Field mapping logic

**Changes**:
1. **Cross-Source Gap Filling**
   ```typescript
   function fillGapsFromDocuments(
     webpageFields: FieldSet, 
     documentFields: FieldSet[]
   ): FieldSet {
     const merged = { ...webpageFields };
     
     // For each missing/low-confidence webpage field
     for (const [fieldName, webField] of Object.entries(merged)) {
       if (!webField.value || webField.confidence < 0.5) {
         // Look for better info in documents
         const bestDocField = findBestDocumentField(fieldName, documentFields);
         if (bestDocField && bestDocField.confidence > webField.confidence) {
           merged[fieldName] = {
             ...bestDocField,
             source: {
               ...bestDocField.source,
               label: generateSourceLabel(bestDocField.source),
               extraction_method: 'promoted_from_doc'
             }
           };
         }
       }
     }
     
     return merged;
   }
   ```

2. **Conflict Detection**
   ```typescript
   function detectConflicts(fields: FieldSet): string[] {
     const conflicts: string[] = [];
     
     // Check for conflicting dates
     const dates = extractDates(fields);
     if (dates.deadline && dates.applicationEnd && dates.deadline < dates.applicationEnd) {
       conflicts.push('Application deadline before application end date');
     }
     
     // Check for conflicting amounts
     const amounts = extractAmounts(fields);
     if (amounts.minimum && amounts.maximum && amounts.minimum > amounts.maximum) {
       conflicts.push('Minimum amount greater than maximum amount');
     }
     
     return conflicts;
   }
   ```

**Acceptance Tests**:
- ✅ Missing webpage fields filled from document content
- ✅ Promoted fields show "From: Document X" source labels
- ✅ Conflicts detected for inconsistent dates/amounts
- ✅ Higher-confidence sources override lower-confidence ones

## Phase 3: UI Enhancement (Weeks 5-6)
**Goal**: Implement verbatim rendering, source badges, and table display

### PR 5: `gap-fix/ui-verbatim`
**Files to modify**:
- `src/components/subsidy/VerbatimContentRenderer.tsx` (new)
- `src/components/subsidy/EnhancedSubsidyDisplay.tsx`

**Changes**:
1. **Verbatim Block Renderer**
   ```typescript
   interface VerbatimContentRendererProps {
     blocks: ContentBlock[];
     preserveFormatting: boolean;
   }
   
   export function VerbatimContentRenderer({ blocks, preserveFormatting }: Props) {
     return (
       <div className="verbatim-content">
         {blocks.map(block => (
           <VerbatimBlock 
             key={block.id}
             block={block}
             preserveFormatting={preserveFormatting}
           />
         ))}
       </div>
     );
   }
   
   function VerbatimBlock({ block, preserveFormatting }: BlockProps) {
     switch (block.type) {
       case 'table':
         return <VerbatimTable table={block.table} source={block.source_ref} />;
       case 'heading':
         return <VerbatimHeading heading={block.heading} html={block.html} />;
       case 'paragraph':
         return preserveFormatting ? 
           <div dangerouslySetInnerHTML={{ __html: block.html }} /> :
           <p>{block.text}</p>;
       default:
         return <div>{block.text}</div>;
     }
   }
   ```

2. **Enhanced Source Badges**
   ```typescript
   interface SourceBadgeProps {
     source: SourceReference;
     confidence?: number;
   }
   
   export function SourceBadge({ source, confidence }: SourceBadgeProps) {
     const getVariant = (conf: number) => {
       if (conf >= 0.8) return 'default';
       if (conf >= 0.6) return 'secondary';
       return 'outline';
     };
     
     return (
       <div className="flex items-center gap-2">
         <Badge variant={getVariant(confidence || 0)}>
           {source.kind === 'document' ? (
             <FileText className="h-3 w-3 mr-1" />
           ) : (
             <Globe className="h-3 w-3 mr-1" />
           )}
           {source.label || `${source.kind} source`}
         </Badge>
         {confidence && (
           <span className="text-xs text-muted-foreground">
             {Math.round(confidence * 100)}%
           </span>
         )}
       </div>
     );
   }
   ```

**Acceptance Tests**:
- ✅ Original HTML formatting preserved when requested
- ✅ Tables render with proper structure (not as text)
- ✅ Source badges show document name, page, and confidence
- ✅ Users can toggle between formatted and plain text views

### PR 6: `gap-fix/ui-tables-documents`
**Files to modify**:
- `src/components/subsidy/VerbatimTable.tsx` (new)
- `src/components/subsidy/DocumentPreview.tsx` (new)

**Changes**:
1. **Table Display Component**
   ```typescript
   interface VerbatimTableProps {
     table: TableData;
     source: SourceReference;
     confidence?: number;
   }
   
   export function VerbatimTable({ table, source, confidence }: Props) {
     return (
       <div className="verbatim-table">
         <div className="flex items-center justify-between mb-2">
           {table.caption && <h4>{table.caption}</h4>}
           <SourceBadge source={source} confidence={confidence} />
         </div>
         <Table>
           <TableHeader>
             <TableRow>
               {table.columns.map((col, i) => (
                 <TableHead key={i}>{col}</TableHead>
               ))}
             </TableRow>
           </TableHeader>
           <TableBody>
             {table.rows.map((row, i) => (
               <TableRow key={i}>
                 {row.map((cell, j) => (
                   <TableCell key={j}>{cell}</TableCell>
                 ))}
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     );
   }
   ```

2. **Document Preview with Inline Content**
   ```typescript
   interface DocumentPreviewProps {
     document: SubsidyDocument;
     showInlineContent?: boolean;
   }
   
   export function DocumentPreview({ document, showInlineContent }: Props) {
     const [isExpanded, setIsExpanded] = useState(false);
     
     return (
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <h4>{document.title}</h4>
             <p className="text-sm text-muted-foreground">
               {document.filename} • {document.type.toUpperCase()}
             </p>
           </div>
           <div className="flex gap-2">
             {document.extracted_text && (
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={() => setIsExpanded(!isExpanded)}
               >
                 {isExpanded ? 'Hide' : 'Preview'}
               </Button>
             )}
             <Button size="sm" asChild>
               <a href={document.url} target="_blank">
                 <Download className="h-4 w-4" />
               </a>
             </Button>
           </div>
         </CardHeader>
         {isExpanded && document.extracted_text && (
           <CardContent>
             <div className="max-h-96 overflow-y-auto text-sm">
               {document.tables?.map((table, i) => (
                 <VerbatimTable key={i} table={table} source={document.source[0]} />
               ))}
               <pre className="whitespace-pre-wrap font-mono">
                 {document.extracted_text.substring(0, 2000)}
                 {document.extracted_text.length > 2000 && '...'}
               </pre>
             </div>
           </CardContent>
         )}
       </Card>
     );
   }
   ```

**Acceptance Tests**:
- ✅ Tables from documents display with proper formatting
- ✅ Document previews show extracted text inline
- ✅ Table source attribution clearly visible
- ✅ Long document content properly truncated with expand option

## Phase 4: Integration & Testing (Week 7)
**Goal**: End-to-end testing and schema validation

### PR 7: `gap-fix/integration-testing`
**Files to modify**:
- Test fixtures for VITILIENCE and Légumineuses
- Schema validation pipeline
- E2E test suite

**Changes**:
1. **Schema Validation Pipeline**
   ```typescript
   async function validateFixtures() {
     const fixtures = ['vitilience', 'legumineuses'];
     
     for (const fixture of fixtures) {
       const blocksData = await loadFixture(`${fixture}/03_blocks.json`);
       const cardData = await loadFixture(`${fixture}/05_subsidy_card.json`);
       
       // Validate against schemas
       const blocksValid = validateAgainstSchema(blocksData, 'scrape_bundle.schema.json');
       const cardValid = validateAgainstSchema(cardData, 'subsidy_card.schema.json');
       
       if (!blocksValid.valid || !cardValid.valid) {
         throw new Error(`Fixture ${fixture} failed schema validation`);
       }
     }
   }
   ```

2. **E2E Acceptance Tests**
   ```typescript
   describe('Verbatim-first Pipeline', () => {
     test('VITILIENCE: tables preserved end-to-end', async () => {
       const result = await runPipeline('https://franceagrimer.fr/vitilience');
       
       // Check table preservation
       const fundingTable = result.blocks.find(b => b.type === 'table' && 
         b.table.columns.includes('PME (%)'));
       expect(fundingTable).toBeDefined();
       expect(fundingTable.verbatim).toBe(true);
       expect(fundingTable.table.rows.length).toBeGreaterThan(0);
     });
     
     test('Légumineuses: document promotion works', async () => {
       const result = await runPipeline('https://franceagrimer.fr/legumineuses');
       
       // Check gap filling
       const eligibility = result.fields.eligibility;
       expect(eligibility.source.kind).toBe('document');
       expect(eligibility.source.label).toContain('From: Decision');
       expect(eligibility.confidence).toBeGreaterThan(0.7);
     });
   });
   ```

**Acceptance Tests**:
- ✅ Both fixture cases validate against target schemas
- ✅ Tables extracted end-to-end (scrape → AI → UI)
- ✅ Document content properly promoted with source labels
- ✅ Confidence scores reflect extraction quality
- ✅ All verbatim content preserved without rewriting

## Success Metrics

### Quantitative Goals
- **Table Preservation**: 100% of tables extracted as structured data
- **Field Confidence**: ≥80% of must-show fields with confidence ≥0.7
- **Source Attribution**: 100% of fields have valid source references
- **Schema Compliance**: 100% validation success for both schemas

### Qualitative Goals
- **User Trust**: Source badges enable verification of information
- **Content Integrity**: Original formatting preserved for legal accuracy
- **Information Completeness**: Document content fills webpage gaps
- **System Reliability**: Consistent extraction across different subsidy types

## Risk Mitigation

### High-Risk Items
1. **Table Extraction Complexity**: Start with simple tables, iterate to complex
2. **Performance Impact**: Implement caching and incremental processing
3. **Source Conflicts**: Implement clear precedence rules (official docs > webpage)

### Rollback Plan
Each PR includes feature flags for safe rollback:
```typescript
const ENABLE_VERBATIM_BLOCKS = process.env.ENABLE_VERBATIM_BLOCKS === 'true';
const ENABLE_CONFIDENCE_SCORING = process.env.ENABLE_CONFIDENCE_SCORING === 'true';
```

### Testing Strategy
- Unit tests for each component
- Integration tests for data flow
- E2E tests with real subsidy pages
- Performance benchmarks for large documents

## Timeline Summary

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1-2 | Scraper Foundation | Block storage, table extraction, document integration |
| 3-4 | AI Enhancement | Confidence scoring, gap filling, conflict detection |
| 5-6 | UI Enhancement | Verbatim rendering, source badges, table display |
| 7 | Integration | E2E testing, schema validation, documentation |

**Total Duration**: 7 weeks  
**Risk Buffer**: 2 weeks for complex integrations  
**Go-Live Target**: Week 9