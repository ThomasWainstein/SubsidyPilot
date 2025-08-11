-- Add table extraction columns to document_extractions
ALTER TABLE document_extractions 
ADD COLUMN table_count INTEGER DEFAULT 0,
ADD COLUMN table_data JSONB DEFAULT NULL;

-- Add indexes for efficient queries
CREATE INDEX idx_document_extractions_table_count ON document_extractions(table_count);
CREATE INDEX idx_document_extractions_table_data ON document_extractions USING GIN(table_data);

-- Update metadata to include table information
COMMENT ON COLUMN document_extractions.table_count IS 'Number of tables extracted from the document';
COMMENT ON COLUMN document_extractions.table_data IS 'Full table data with structure preserved (page numbers, headers, rows, metadata)';