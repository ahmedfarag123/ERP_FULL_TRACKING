CREATE OR REPLACE FUNCTION public.admin_confirm_shipment_collection(p_shipment_id uuid)
 RETURNS logistics_shipment_collections
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collection public.logistics_shipment_collections%rowtype;
  v_amount numeric(14, 2);
begin
  if not public.is_management_role() then
    raise exception 'Only management users can confirm shipment collections.';
  end if;

  select *
  into v_collection
  from public.logistics_shipment_collections
  where shipment_id = p_shipment_id
  for update;

  if v_collection.id is null then
    raise exception 'Shipment collection was not found.';
  end if;

  v_amount := greatest(
    coalesce(v_collection.collected_from_customer, 0),
    coalesce(v_collection.pending_delivery_amount, 0),
    coalesce(v_collection.collected_successfully_amount, 0)
  );

  update public.logistics_shipment_collections
  set
    pending_delivery_amount = 0,
    collected_from_customer = 0,
    collected_successfully_amount = v_amount,
    collection_status = 'collected_successfully',
    admin_confirmed_by_profile_id = auth.uid(),
    admin_confirmed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where shipment_id = p_shipment_id
  returning *
  into v_collection;

  update public.logistics_shipments
  set
    shipment_status = 'SETTLED',
    delivery_phase = 'settled',
    updated_at = timezone('utc', now())
  where id = p_shipment_id;

  return v_collection;
end;
$function$;
