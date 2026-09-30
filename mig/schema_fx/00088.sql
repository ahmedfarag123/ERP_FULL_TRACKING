CREATE OR REPLACE FUNCTION public.driver_update_shipment_items(p_shipment_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_done_quantity numeric;
begin
  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null
    or (
      not public.is_management_role()
      and v_shipment.assigned_profile_id <> auth.uid()
    )
  then
    raise exception 'Shipment not found or not authorized.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Shipment items payload must be an array.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_item_id := nullif(v_item->>'item_id', '')::uuid;
    v_done_quantity := nullif(v_item->>'done_quantity', '')::numeric;

    if v_item_id is null then
      raise exception 'Shipment item id is required.';
    end if;

    if v_done_quantity is null or v_done_quantity < 0 then
      raise exception 'Done quantity must be zero or greater.';
    end if;

    update public.logistics_shipment_items
    set
      done_quantity = v_done_quantity,
      updated_at = timezone('utc', now())
    where id = v_item_id
      and shipment_id = p_shipment_id;

    if not found then
      raise exception 'Shipment item % was not found for shipment %.', v_item_id, p_shipment_id;
    end if;
  end loop;
end;
$function$;
