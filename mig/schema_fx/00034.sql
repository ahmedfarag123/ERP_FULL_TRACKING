CREATE OR REPLACE FUNCTION public.admin_update_shipment_status(p_shipment_id uuid, p_new_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment_id uuid;
begin
  perform public.logistics_admin_required();

  if not exists (select 1 from public.logistics_shipments where id = p_shipment_id) then
    perform public.raise_logistics_error('SHIPMENT_NOT_FOUND', 'Shipment not found.');
  end if;

  update public.logistics_shipments
  set shipment_status = p_new_status,
      updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning id into v_shipment_id;

  return (select to_jsonb(s.*) from public.logistics_shipments s where s.id = v_shipment_id);
end;
$function$;
