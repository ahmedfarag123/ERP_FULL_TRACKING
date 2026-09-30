CREATE OR REPLACE FUNCTION public.complete_forced_password_change()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set requires_password_change = false,
      temporary_password_set_at = null,
      password_changed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;
end;
$function$;
