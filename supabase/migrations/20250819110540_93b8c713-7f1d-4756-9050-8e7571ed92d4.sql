-- Fix database constraints for subsidy sync functions
ALTER TABLE subsidy_locations 
ADD CONSTRAINT subsidy_locations_subsidy_id_unique UNIQUE (subsidy_id);

ALTER TABLE subsidy_categories 
ADD CONSTRAINT subsidy_categories_subsidy_category_unique UNIQUE (subsidy_id, category);