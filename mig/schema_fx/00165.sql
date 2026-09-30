CREATE OR REPLACE FUNCTION public.run_driver_settlement(p_driver_id uuid, p_period_start date, p_period_end date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement_id uuid;
  v_plan_total numeric(14,2) := 0;
  v_overlapping_settlement record;
BEGIN
  IF p_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver is required.';
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Settlement period is required.';
  END IF;

  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Settlement period start must be before or equal to end.';
  END IF;

  SELECT id, period_start, period_end, status
  INTO v_overlapping_settlement
  FROM public.finance_driver_settlements
  WHERE driver_id = p_driver_id
    AND period_start <= p_period_end
    AND period_end >= p_period_start
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'يوجد بالفعل تسوية لهذا السائق تتداخل مع الفترة المختارة: % إلى %.',
      v_overlapping_settlement.period_start,
      v_overlapping_settlement.period_end;
  END IF;

  SELECT COALESCE(SUM(plan_shipments.shipment_value), 0)::numeric(14,2)
  INTO v_plan_total
  FROM (
    SELECT
      ls.id,
      COALESCE(
        MAX(lsc.pending_delivery_amount),
        MAX(o.amount_total),
        MAX(o.total_amount),
        MAX(ls.total_gmv),
        0
      )::numeric(14,2) AS shipment_value
    FROM public.logistics_delivery_plans ldp
    JOIN public.logistics_shipments ls ON ls.plan_id = ldp.id
    LEFT JOIN public.logistics_shipment_collections lsc ON lsc.shipment_id = ls.id
    LEFT JOIN public.orders o ON o.id = ls.linked_order_id
    WHERE ldp.logistics_user_id = p_driver_id
      AND ldp.planned_date BETWEEN p_period_start AND p_period_end
      AND ldp.plan_status <> 'cancelled'
      AND COALESCE(ls.shipment_status, '') NOT IN ('CANCELLED', 'FAILED')
    GROUP BY ls.id
  ) AS plan_shipments;

  INSERT INTO public.finance_driver_settlements
    (driver_id, period_start, period_end, commission_amount, fuel_allowance, cash_collected, created_by)
  VALUES
    (p_driver_id, p_period_start, p_period_end, 0, 0, v_plan_total, auth.uid())
  RETURNING id INTO v_settlement_id;

  RETURN v_settlement_id;
END;
$function$;
