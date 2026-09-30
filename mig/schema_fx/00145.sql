CREATE OR REPLACE FUNCTION public.orders_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null or btrim(new.user_id) = '' then
    new.user_uid := null;
  else
    new.user_uid := nullif(btrim(split_part(new.user_id, '|', 1)), '')::integer;
  end if;
  return new;
end;
$function$;
