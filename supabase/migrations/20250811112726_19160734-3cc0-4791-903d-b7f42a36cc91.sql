-- Grant full admin rights to thomaswainstein@gmail.com
-- First check if user exists and get their UUID, then assign admin role

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'thomaswainstein@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email thomaswainstein@gmail.com not found in auth.users';
  ELSE
    -- Insert admin role for the user (using ON CONFLICT to avoid duplicates)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also ensure they have a user profile if it doesn't exist
    INSERT INTO public.user_profiles (id, email, full_name, user_type)
    VALUES (
      target_user_id, 
      'thomaswainstein@gmail.com', 
      'Thomas Wainstein', 
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      user_type = 'admin',
      updated_at = now();
    
    -- Log the admin assignment
    INSERT INTO public.user_actions (
      user_id, action_type, resource_type, resource_id, action_data, triggered_by
    ) VALUES (
      target_user_id, 
      'role_assigned', 
      'user', 
      target_user_id,
      jsonb_build_object(
        'role', 'admin', 
        'assigned_by', 'system',
        'email', 'thomaswainstein@gmail.com'
      ),
      'system_admin_grant'
    );
    
    RAISE NOTICE 'Admin rights granted successfully to thomaswainstein@gmail.com (ID: %)', target_user_id;
  END IF;
END $$;