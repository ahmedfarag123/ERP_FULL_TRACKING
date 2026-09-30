CREATE OR REPLACE FUNCTION public.visits_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null then
    new.user_uid := null;
  else
    select p.user_uid into new.user_uid
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$function$;
