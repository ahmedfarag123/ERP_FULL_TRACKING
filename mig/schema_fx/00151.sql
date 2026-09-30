CREATE OR REPLACE FUNCTION public.profiles_propagate_user_uid_to_calls()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_uid is distinct from old.user_uid then
    update public.calls c
    set user_uid = new.user_uid
    where c.user_id = new.id
      and c.user_uid is distinct from new.user_uid;
  end if;
  return new;
end;
$function$;
