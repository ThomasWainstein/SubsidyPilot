-- Add missing status column to ai_content_runs table
ALTER TABLE ai_content_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'running';

-- Add missing reason column for error tracking  
ALTER TABLE ai_content_runs ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add missing notes column for additional context
ALTER TABLE ai_content_runs ADD COLUMN IF NOT EXISTS notes TEXT;