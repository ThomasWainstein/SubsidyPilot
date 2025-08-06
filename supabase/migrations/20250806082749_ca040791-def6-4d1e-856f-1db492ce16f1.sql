-- =========================================
-- PHASE 2: MANUAL REVIEW & QA WORKFLOW INFRASTRUCTURE
-- Complete implementation with tables, views, triggers, policies, and indexes
-- =========================================

-- 1. CREATE REVIEW ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.review_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('extraction', 'form', 'document', 'subsidy')),
    resource_id UUID NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'escalated', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    assignment_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. CREATE REVIEW DECISIONS TABLE
CREATE TABLE IF NOT EXISTS public.review_decisions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.review_assignments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'request_changes', 'escalate')),
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    review_notes TEXT,
    changes_requested JSONB DEFAULT '{}',
    time_spent_minutes INTEGER DEFAULT 0,
    decision_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. CREATE REVIEW QUEUE STATS MATERIALIZED VIEW
CREATE MATERIALIZED VIEW IF NOT EXISTS public.review_queue_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count,
    COUNT(*) FILTER (WHERE priority >= 8) as urgent_count,
    COUNT(*) FILTER (WHERE priority >= 6 AND priority < 8) as high_priority_count,
    COUNT(DISTINCT assigned_to) FILTER (WHERE status IN ('pending', 'in_progress')) as active_reviewers,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - claimed_at))/60)::numeric, 2) as avg_review_time_minutes,
    COUNT(*) FILTER (WHERE due_date < now() AND status NOT IN ('completed', 'cancelled')) as overdue_count,
    resource_type,
    DATE_TRUNC('day', created_at) as date_created
FROM public.review_assignments 
GROUP BY resource_type, DATE_TRUNC('day', created_at);

-- 4. CREATE AUTO-ASSIGNMENT FUNCTION
CREATE OR REPLACE FUNCTION public.auto_assign_for_review()
RETURNS TRIGGER AS $$
DECLARE
    needs_review BOOLEAN := false;
    review_priority INTEGER := 5;
    available_reviewer UUID;
BEGIN
    -- Determine if review is needed based on extraction quality
    IF TG_TABLE_NAME = 'document_extractions' THEN
        needs_review := (
            NEW.confidence_score < 0.7 OR 
            NEW.status = 'failed' OR
            (NEW.extracted_data->>'admin_required')::boolean = true
        );
        
        -- Set priority based on confidence and status
        IF NEW.confidence_score < 0.5 OR NEW.status = 'failed' THEN
            review_priority := 9; -- High priority for very low confidence/failed
        ELSIF NEW.confidence_score < 0.7 THEN
            review_priority := 7; -- Medium-high priority for low confidence
        END IF;
        
    ELSIF TG_TABLE_NAME = 'extraction_qa_results' THEN
        needs_review := (
            NEW.admin_required = true OR 
            NEW.qa_pass = false OR
            NEW.completeness_score < 70 OR
            NEW.structural_integrity_score < 70
        );
        
        -- Set priority based on QA results
        IF NEW.qa_pass = false THEN
            review_priority := 8; -- High priority for QA failures
        ELSIF NEW.admin_required = true THEN
            review_priority := 6; -- Medium priority for admin required
        END IF;
    END IF;
    
    -- Create review assignment if needed and not already assigned
    IF needs_review THEN
        -- Check if already assigned
        IF NOT EXISTS (
            SELECT 1 FROM public.review_assignments 
            WHERE resource_type = 'extraction' 
            AND resource_id = NEW.id 
            AND status IN ('pending', 'in_progress')
        ) THEN
            -- Find available reviewer (simplified - could be more sophisticated)
            SELECT u.id INTO available_reviewer
            FROM auth.users u
            WHERE u.raw_user_meta_data->>'user_type' IN ('admin', 'qa_reviewer')
            ORDER BY RANDOM()
            LIMIT 1;
            
            -- Insert review assignment
            INSERT INTO public.review_assignments (
                resource_type,
                resource_id,
                assigned_to,
                assigned_by,
                priority,
                status,
                due_date,
                assignment_data
            ) VALUES (
                'extraction',
                NEW.id,
                available_reviewer,
                NULL, -- System assigned
                review_priority,
                'pending',
                now() + INTERVAL '24 hours', -- Default 24h due date
                jsonb_build_object(
                    'confidence_score', COALESCE(NEW.confidence_score, 0),
                    'auto_assigned', true,
                    'reason', CASE 
                        WHEN TG_TABLE_NAME = 'document_extractions' THEN 'Low confidence extraction'
                        WHEN TG_TABLE_NAME = 'extraction_qa_results' THEN 'QA validation required'
                        ELSE 'System review required'
                    END
                )
            );
            
            -- Log the auto-assignment
            INSERT INTO public.user_actions (
                user_id,
                session_id,
                action_type,
                resource_type,
                resource_id,
                action_data,
                triggered_by
            ) VALUES (
                available_reviewer,
                'system-auto-assign-' || extract(epoch from now())::text,
                'review_assigned',
                'extraction',
                NEW.id::text,
                jsonb_build_object(
                    'priority', review_priority,
                    'auto_assigned', true,
                    'reason', 'Quality check required'
                ),
                'system'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;