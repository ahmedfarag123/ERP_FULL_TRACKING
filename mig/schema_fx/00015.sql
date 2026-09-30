CREATE OR REPLACE FUNCTION public.admin_complete_plan_close_shipments(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.logistics_delivery_plans%ROWTYPE;
  v_shipment RECORD;
  v_closed_count integer := 0;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can complete plans.';
  END IF;

  SELECT * INTO v_plan FROM public.logistics_delivery_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found.'; END IF;
  IF v_plan.plan_status = 'completed' THEN
    RAISE EXCEPTION 'Plan is already completed.';
  END IF;

  -- Close all non-terminal shipments in the plan
  FOR v_shipment IN
    SELECT s.id, s.delivery_phase, s.shipment_status, s.linked_order_id
    FROM public.logistics_shipments s
    WHERE s.plan_id = p_plan_id
      AND public.logistics_canonical_driver_phase(s.delivery_phase, s.shipment_status)
          NOT IN ('delivered', 'finished', 'settled', 'cancelled', 'failed', 'attempted')
  LOOP
    -- Mark shipment as delivered
    UPDATE public.logistics_shipments
    SET
      delivery_phase = 'delivered',
      shipment_status = 'DELIVERED',
      shipment_state = 'done',
      completed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = v_shipment.id;

    -- Log event
    INSERT INTO public.logistics_shipment_events (
      shipment_id, actor_profile_id, previous_phase, next_phase, note
    ) VALUES (
      v_shipment.id, auth.uid(), v_shipment.delivery_phase, 'delivered', 'Plan completed by management'
    );

    -- Update linked order
    IF v_shipment.linked_order_id IS NOT NULL THEN
      UPDATE public.orders
      SET
        delivery_status = 'full',
        status = 'delivered',
        delivered_at = coalesce(delivered_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
      WHERE id = v_shipment.linked_order_id;
    END IF;

    v_closed_count := v_closed_count + 1;
  END LOOP;

  -- Mark plan as completed
  UPDATE public.logistics_delivery_plans
  SET
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  WHERE id = p_plan_id;

  PERFORM public.log_audit_event(
    'admin_complete_plan',
    'logistics_delivery_plan',
    p_plan_id,
    'Plan completed with ' || v_closed_count || ' shipments closed',
    jsonb_build_object('closed_shipments', v_closed_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'closed_shipments', v_closed_count
  );
END;
$function$;
