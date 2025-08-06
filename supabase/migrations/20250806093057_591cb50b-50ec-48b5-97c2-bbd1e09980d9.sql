-- Fix the auto_assign_for_review trigger to pass UUID instead of text to resource_id
CREATE OR REPLACE FUNCTION public.auto_assign_for_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
            
            -- Log the auto-assignment (FIXED: Pass UUID instead of text to resource_id)
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
                NEW.id,  -- FIXED: Remove ::text conversion - keep as UUID
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
$function$;