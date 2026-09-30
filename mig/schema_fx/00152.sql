CREATE OR REPLACE FUNCTION public.profiles_propagate_user_uid_to_customer_interactions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_uid is distinct from old.user_uid then
    update public.customer_interactions ci
    set user_uid = new.user_uid
    where ci.actor_user_id = new.id
      and ci.user_uid is distinct from new.user_uid;
  end if;
  return new;
end;
$function$;
