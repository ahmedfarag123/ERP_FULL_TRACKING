CREATE OR REPLACE FUNCTION public.retry_delivery(p_shipment_id uuid, p_new_scheduled_date date, p_reason text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_shipment public.logistics_shipments%ROWTYPE;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can retry deliveries.';
  END IF;

  SELECT * INTO v_shipment FROM public.logistics_shipments WHERE id = p_shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found.'; END IF;
  IF v_shipment.delivery_phase NOT IN ('failed', 'attempted', 'cancelled') THEN
    RAISE EXCEPTION 'Only failed/attempted/cancelled shipments can be retried.';
  END IF;

  UPDATE public.logistics_shipments
  SET delivery_phase = 'pending',
      shipment_status = 'PENDING',
      shipment_state = 'draft',
      scheduled_at = p_new_scheduled_date::timestamptz,
      completed_at = NULL,
      cancelled_at = NULL,
      notes = coalesce(nullif(trim(p_reason), ''), notes),
      updated_at = timezone('utc', now())
  WHERE id = p_shipment_id
  RETURNING * INTO v_shipment;

  INSERT INTO public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note
  ) VALUES (
    p_shipment_id, auth.uid(), 'failed', 'pending', coalesce(p_reason, 'Delivery retried')
  );

  PERFORM public.log_audit_event(
    'retry_delivery',
    'logistics_shipment',
    p_shipment_id,
    p_reason,
    jsonb_build_object('new_scheduled_date', p_new_scheduled_date)
  );

  RETURN v_shipment;
END;
$function$;
