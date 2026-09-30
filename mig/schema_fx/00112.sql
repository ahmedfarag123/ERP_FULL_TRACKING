CREATE OR REPLACE FUNCTION public.handle_new_logistics_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only create logistics_users if the new profile is a driver in the Logistics department
  IF NEW.role = 'driver' 
     AND NEW.department_id = '07b531a2-af74-4379-b739-e98b11720bef'
     AND NEW.status = 'active' THEN
    
    INSERT INTO logistics_users (
      employee_name,
      linked_profile_id,
      work_email,
      work_phone,
      mobile_phone,
      job_title,
      department_name,
      status,
      source,
      raw_payload,
      created_at,
      updated_at
    ) VALUES (
      NEW.full_name,
      NEW.id,
      NEW.email,
      NEW.phone,
      NEW.phone,
      NEW.job_title,
      'Logistics',
      'active',
      'profile_sync',
      jsonb_build_object(
        'profile_id', NEW.id,
        'role', NEW.role,
        'department_id', NEW.department_id
      ),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
