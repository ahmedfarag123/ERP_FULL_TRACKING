CREATE OR REPLACE FUNCTION public.customer_interactions_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.actor_user_id is null then
    new.user_uid := null;
  else
    select p.user_uid into new.user_uid
    from public.profiles p
    where p.id = new.actor_user_id;
  end if;
  return new;
end;
$function$;
