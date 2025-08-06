-- =========================================
-- CRITICAL SECURITY FIXES: RLS POLICIES, TRIGGERS, INDEXES
-- Address security linter issues and complete infrastructure
-- =========================================

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES FOR REVIEW_ASSIGNMENTS
CREATE POLICY "Authenticated users can view their own assignments" 
ON public.review_assignments 
FOR SELECT 
USING (
    assigned_to = auth.uid() OR 
    assigned_by = auth.uid() OR 
    auth.role() = 'service_role'
);

CREATE POLICY "Reviewers can update their assignments" 
ON public.review_assignments 
FOR UPDATE 
USING (assigned_to = auth.uid() OR auth.role() = 'service_role')
WITH CHECK (assigned_to = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage all assignments" 
ON public.review_assignments 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 7. CREATE RLS POLICIES FOR REVIEW_DECISIONS
CREATE POLICY "Reviewers can view their decisions" 
ON public.review_decisions 
FOR SELECT 
USING (
    reviewer_id = auth.uid() OR 
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.review_assignments ra 
        WHERE ra.id = review_decisions.assignment_id 
        AND (ra.assigned_to = auth.uid() OR ra.assigned_by = auth.uid())
    )
);

CREATE POLICY "Reviewers can insert their decisions" 
ON public.review_decisions 
FOR INSERT 
WITH CHECK (reviewer_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage all decisions" 
ON public.review_decisions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 8. CREATE UPDATED_AT TRIGGERS
CREATE TRIGGER update_review_assignments_updated_at
    BEFORE UPDATE ON public.review_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_decisions_updated_at
    BEFORE UPDATE ON public.review_decisions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. CREATE AUTO-ASSIGNMENT TRIGGERS
CREATE TRIGGER auto_assign_extraction_review
    AFTER INSERT OR UPDATE ON public.document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_for_review();

CREATE TRIGGER auto_assign_qa_review
    AFTER INSERT OR UPDATE ON public.extraction_qa_results
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_for_review();

-- 10. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_review_assignments_status ON public.review_assignments(status);
CREATE INDEX IF NOT EXISTS idx_review_assignments_assigned_to ON public.review_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_review_assignments_priority ON public.review_assignments(priority);
CREATE INDEX IF NOT EXISTS idx_review_assignments_resource ON public.review_assignments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_created_at ON public.review_assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_review_assignments_due_date ON public.review_assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_review_decisions_assignment_id ON public.review_decisions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_reviewer_id ON public.review_decisions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_decision ON public.review_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_review_decisions_created_at ON public.review_decisions(created_at);