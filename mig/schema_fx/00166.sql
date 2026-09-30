CREATE OR REPLACE FUNCTION public.self_update_profile(p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null then coalesce(nullif(trim(p_full_name), ''), full_name)
      else full_name
    end,
    phone = case
      when p_phone is not null then nullif(trim(p_phone), '')
      else phone
    end,
    avatar_url = case
      when p_avatar_url is not null then nullif(trim(p_avatar_url), '')
      else avatar_url
    end
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  return v_profile;
end;
$function$;
