CREATE OR REPLACE FUNCTION public.driver_create_sos_alert(p_shipment_id uuid DEFAULT NULL::uuid, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_message text DEFAULT NULL::text)
 RETURNS logistics_driver_alerts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_alert public.logistics_driver_alerts%rowtype;
  v_notification_id uuid;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if p_shipment_id is not null then
    select *
    into v_shipment
    from public.logistics_shipments
    where id = p_shipment_id;

    if v_shipment.id is null then
      raise exception 'Shipment not found.';
    end if;

    if v_shipment.assigned_profile_id <> auth.uid() then
      raise exception 'You can only create SOS alerts for your assigned shipments.';
    end if;
  end if;

  insert into public.logistics_driver_alerts (
    driver_profile_id,
    shipment_id,
    plan_id,
    message,
    location_lat,
    location_lng,
    metadata
  )
  values (
    auth.uid(),
    p_shipment_id,
    v_shipment.plan_id,
    nullif(trim(coalesce(p_message, '')), ''),
    p_location_lat,
    p_location_lng,
    jsonb_build_object(
      'driver_name', v_profile.full_name,
      'driver_phone', v_profile.phone,
      'shipment_reference', v_shipment.shipment_reference,
      'customer_name', v_shipment.customer_name
    )
  )
  returning *
  into v_alert;

  insert into public.notifications (
    created_by,
    audience_type,
    audience_role,
    audience_user_id,
    channel,
    title,
    body,
    metadata
  )
  values (
    auth.uid(),
    'role',
    'admin',
    null,
    'in_app',
    'SOS Alert',
    concat(
      coalesce(v_profile.full_name, 'Driver'),
      ' fired an SOS alert',
      case when v_shipment.shipment_reference is not null then concat(' for ', v_shipment.shipment_reference) else '' end
    ),
    jsonb_build_object(
      'type', 'alert',
      'importance', 'High',
      'sender', coalesce(v_profile.full_name, 'driver'),
      'driver_alert_id', v_alert.id,
      'driver_profile_id', auth.uid(),
      'shipment_id', p_shipment_id,
      'plan_id', v_alert.plan_id,
      'location_lat', p_location_lat,
      'location_lng', p_location_lng
    )
  )
  returning id
  into v_notification_id;

  insert into public.notification_recipients (notification_id, user_id)
  select v_notification_id, p.id
  from public.profiles p
  where p.status = 'active'
    and p.role in ('admin', 'manager', 'supervisor')
  on conflict (notification_id, user_id) do nothing;

  return v_alert;
end;
$function$;
