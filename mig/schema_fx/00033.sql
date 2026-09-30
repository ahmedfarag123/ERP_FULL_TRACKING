CREATE OR REPLACE FUNCTION public.admin_update_profile_access(p_target_user_id uuid, p_full_name text DEFAULT NULL::text, p_role app_role DEFAULT NULL::app_role, p_status record_status DEFAULT NULL::record_status, p_department_id uuid DEFAULT NULL::uuid, p_clear_department boolean DEFAULT false, p_job_title text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_password_enabled boolean DEFAULT NULL::boolean, p_otp_enabled boolean DEFAULT NULL::boolean, p_prefer_otp boolean DEFAULT NULL::boolean, p_approved boolean DEFAULT NULL::boolean, p_force_unlock boolean DEFAULT false)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update user access';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    role = coalesce(p_role, role),
    status = coalesce(p_status, status),
    department_id = case
      when p_clear_department then null
      when p_department_id is not null then p_department_id
      else department_id
    end,
    job_title = case
      when p_job_title is not null then nullif(trim(p_job_title), '')
      else job_title
    end,
    phone = case
      when p_phone is not null then nullif(trim(p_phone), '')
      else phone
    end,
    password_enabled = coalesce(p_password_enabled, password_enabled),
    otp_enabled = coalesce(p_otp_enabled, otp_enabled),
    prefer_otp = coalesce(p_prefer_otp, prefer_otp),
    force_logout_at = case
      when p_force_unlock then null
      else force_logout_at
    end,
    approved_at = case
      when p_approved is true then coalesce(approved_at, timezone('utc', now()))
      when p_approved is false then null
      else approved_at
    end,
    approved_by = case
      when p_approved is true then coalesce(approved_by, auth.uid())
      when p_approved is false then null
      else approved_by
    end
  where id = p_target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Target profile not found';
  end if;

  perform public.log_audit_event(
    'update_profile_access',
    'profile',
    v_profile.id,
    'Updated profile access controls',
    jsonb_build_object(
      'role', v_profile.role,
      'status', v_profile.status,
      'department_id', v_profile.department_id,
      'job_title', v_profile.job_title,
      'password_enabled', v_profile.password_enabled,
      'otp_enabled', v_profile.otp_enabled,
      'prefer_otp', v_profile.prefer_otp,
      'approved_at', v_profile.approved_at,
      'force_unlock', p_force_unlock
    )
  );

  return v_profile;
end;
$function$;
