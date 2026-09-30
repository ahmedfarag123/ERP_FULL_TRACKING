CREATE OR REPLACE FUNCTION private.logistics_shipments_complete_plan_after_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform private.logistics_complete_plan_if_shipments_delivered(old.plan_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.plan_id is distinct from new.plan_id then
    perform private.logistics_complete_plan_if_shipments_delivered(old.plan_id);
  end if;

  perform private.logistics_complete_plan_if_shipments_delivered(new.plan_id);
  return new;
end;
$function$;
