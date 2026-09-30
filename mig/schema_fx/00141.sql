CREATE OR REPLACE FUNCTION public.notify_logistics_shipment_business_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reference text;
  v_customer text;
  v_old_driver uuid;
  v_new_driver uuid;
  v_terminal_failed boolean;
begin
  v_reference := coalesce(new.odoo_order_name, new.shipment_reference, new.external_order_id, left(new.id::text, 8));
  v_customer := coalesce(new.customer_name, 'customer');

  if tg_op = 'INSERT' then
    v_old_driver := null;
  else
    v_old_driver := old.assigned_profile_id;
  end if;
  v_new_driver := new.assigned_profile_id;

  if v_new_driver is not null and (tg_op = 'INSERT' or v_new_driver is distinct from v_old_driver) then
    perform public.create_system_notification_for_users(
      array[v_new_driver],
      'Shipment assigned',
      'Shipment ' || v_reference || ' for ' || v_customer || ' is assigned to you.',
      jsonb_build_object(
        'type', 'shipment_assigned',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'old_driver_profile_id', v_old_driver,
        'new_driver_profile_id', v_new_driver
      )
    );
  end if;

  if tg_op = 'UPDATE' and v_old_driver is not null and v_old_driver is distinct from v_new_driver then
    perform public.create_system_notification_for_users(
      array[v_old_driver],
      'Shipment reassigned',
      'Shipment ' || v_reference || ' for ' || v_customer || ' was reassigned.',
      jsonb_build_object(
        'type', 'shipment_reassigned',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'old_driver_profile_id', v_old_driver,
        'new_driver_profile_id', v_new_driver
      )
    );
  end if;

  v_terminal_failed :=
    lower(coalesce(new.delivery_phase, '')) in ('failed', 'attempted', 'cancelled')
    or upper(coalesce(new.shipment_status, '')) in ('CANCELLED', 'FAILED', 'ATTEMPTED');

  if v_terminal_failed and (
    tg_op = 'INSERT'
    or lower(coalesce(old.delivery_phase, '')) is distinct from lower(coalesce(new.delivery_phase, ''))
    or upper(coalesce(old.shipment_status, '')) is distinct from upper(coalesce(new.shipment_status, ''))
  ) then
    perform public.create_system_notification_for_roles(
      array['admin'::public.app_role, 'manager'::public.app_role, 'supervisor'::public.app_role, 'dispatcher'::public.app_role],
      'Delivery needs attention',
      'Shipment ' || v_reference || ' for ' || v_customer || ' is marked ' || coalesce(new.delivery_phase, new.shipment_status, 'failed') || '.',
      jsonb_build_object(
        'type', 'delivery_failed',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'assigned_profile_id', new.assigned_profile_id,
        'delivery_phase', new.delivery_phase,
        'shipment_status', new.shipment_status
      )
    );
  end if;

  return new;
end;
$function$;
