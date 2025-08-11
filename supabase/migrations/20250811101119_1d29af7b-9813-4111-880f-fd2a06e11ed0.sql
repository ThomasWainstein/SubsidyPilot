-- Create indexes for Phase D analytics and performance
-- Index for querying Phase D extractions
CREATE INDEX IF NOT EXISTS idx_docextract_phaseD 
ON document_extractions ((table_data->'metadata'->>'extractionMethod'))
WHERE table_data->'metadata'->>'extractionMethod' = 'phase-d-advanced';

-- Index for tables_extracted boolean queries
CREATE INDEX IF NOT EXISTS idx_docextract_tables_extracted 
ON document_extractions (tables_extracted);

-- Composite index for table data queries
CREATE INDEX IF NOT EXISTS idx_docextract_table_fields 
ON document_extractions (tables_extracted, table_count, table_quality);

-- GIN index for complex JSON queries on table_data
CREATE INDEX IF NOT EXISTS idx_docextract_tabledata_gin 
ON document_extractions USING gin (table_data jsonb_path_ops);

-- Index for created_at queries (most recent extractions)
CREATE INDEX IF NOT EXISTS idx_docextract_created_at 
ON document_extractions (created_at DESC);

COMMENT ON INDEX idx_docextract_phaseD IS 'Index for querying Phase D advanced table extractions';
COMMENT ON INDEX idx_docextract_tables_extracted IS 'Index for filtering documents with extracted tables';
COMMENT ON INDEX idx_docextract_table_fields IS 'Composite index for table-related fields';
COMMENT ON INDEX idx_docextract_tabledata_gin IS 'GIN index for complex JSON queries on table metadata';
COMMENT ON INDEX idx_docextract_created_at IS 'Index for temporal queries on extractions';