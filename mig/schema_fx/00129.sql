CREATE OR REPLACE FUNCTION public.logistics_record_shipment_status_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' and old.shipment_status is distinct from new.shipment_status then
    insert into public.logistics_shipment_status_history (
      shipment_id,
      old_status,
      new_status,
      changed_by_profile_id,
      changed_by_role
    )
    values (
      new.id,
      old.shipment_status,
      new.shipment_status,
      auth.uid(),
      case when public.is_management_role() then 'admin' else 'driver' end
    );
  end if;

  return new;
end;
$function$;
