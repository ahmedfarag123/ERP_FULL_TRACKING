CREATE OR REPLACE FUNCTION public.normalize_display_type()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if NEW.display_type in ('false','False','FALSE') then
    NEW.display_type := null;
  end if;
  return NEW;
end;
$function$;
