CREATE OR REPLACE FUNCTION public.get_all_kpi_actuals(p_date_from date, p_date_to date)
 RETURNS TABLE(kpi_code text, actual_value numeric, target_value numeric, department text, achieved boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_val numeric;
  v_tgt numeric;
  v_ach boolean;
  v_from timestamptz := p_date_from;
  v_to timestamptz := p_date_to + interval '1 day';
  v_prev_from timestamptz := p_date_from - (p_date_to - p_date_from);
  v_prev_to timestamptz := p_date_from;
  codes text[];
  tgts numeric[];
  depts text[];
  i int;
BEGIN

  -- SAL-01: Total Revenue
  v_tgt := 5000000;
  SELECT SUM(oli.total_amount) INTO v_val
  FROM kpi.order_line_items oli
  JOIN kpi.orders o ON o.id = oli.order_id
  WHERE o.created_at >= v_from AND o.created_at < v_to;
  IF v_val IS NULL THEN
    SELECT SUM(o.total_amount) INTO v_val FROM public.orders o
    WHERE o.created_at >= v_from AND o.created_at < v_to;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-01'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-02: Gross Profit Margin
  v_tgt := 25;
  SELECT CASE WHEN SUM(o.total_amount) > 0 THEN SUM(COALESCE(o.margin, 0)) / SUM(o.total_amount) * 100 ELSE NULL END
  INTO v_val FROM public.orders o WHERE o.created_at >= v_from AND o.created_at < v_to;
  IF v_val IS NULL THEN
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = 'SAL-02' AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-02'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-03: Sales Conversion Rate
  v_tgt := 30;
  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM public.orders WHERE created_at >= v_from AND created_at < v_to) AS order_cnt,
      GREATEST(
        (SELECT COUNT(*) FROM public.visits WHERE created_at >= v_from AND created_at < v_to) +
        (SELECT COUNT(*) FROM public.customer_interactions WHERE interaction_type = 'call' AND created_at >= v_from AND created_at < v_to),
        1
      ) AS interactions
  )
  SELECT CASE WHEN interactions > 0 THEN (order_cnt::numeric / interactions * 100) ELSE NULL END INTO v_val FROM stats;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-03'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-04: Average Order Value
  v_tgt := 5000;
  SELECT CASE WHEN COUNT(*) > 0 THEN SUM(total_amount) / COUNT(*) ELSE NULL END
  INTO v_val FROM public.orders WHERE created_at >= v_from AND created_at < v_to;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-04'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-05: Revenue Growth Rate
  v_tgt := 10;
  WITH curr AS (
    SELECT COALESCE(SUM(total_amount), 0) AS rev FROM public.orders WHERE created_at >= v_from AND created_at < v_to
  ), prev AS (
    SELECT COALESCE(SUM(total_amount), 0) AS rev FROM public.orders WHERE created_at >= v_prev_from AND created_at < v_prev_to
  )
  SELECT CASE WHEN prev.rev > 0 THEN ((curr.rev - prev.rev) / prev.rev * 100) ELSE NULL END INTO v_val FROM curr, prev;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-05'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-06: New Customer Acquisition
  v_tgt := 50;
  SELECT COUNT(*)::numeric INTO v_val FROM kpi.customers WHERE created_at >= v_from AND created_at < v_to;
  IF v_val IS NULL OR v_val = 0 THEN
    SELECT COUNT(DISTINCT customer_id)::numeric INTO v_val FROM public.orders
    WHERE created_at >= v_from AND created_at < v_to AND customer_id IS NOT NULL;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-06'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-07: Customer Retention Rate
  v_tgt := 70;
  WITH prev_cust AS (
    SELECT DISTINCT customer_id FROM public.orders WHERE created_at >= v_prev_from AND created_at < v_prev_to AND customer_id IS NOT NULL
  ), returned AS (
    SELECT DISTINCT customer_id FROM public.orders WHERE created_at >= v_from AND created_at < v_to AND customer_id IS NOT NULL
  )
  SELECT CASE WHEN (SELECT COUNT(*) FROM prev_cust) > 0
    THEN ((SELECT COUNT(*) FROM returned WHERE customer_id IN (SELECT customer_id FROM prev_cust))::numeric
          / (SELECT COUNT(*) FROM prev_cust) * 100) ELSE NULL END INTO v_val;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-07'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-08: Sales Target Achievement
  v_tgt := 100;
  v_val := NULL;
  SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
  WHERE ov.kpi_code = 'SAL-08' AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
  ORDER BY ov.computed_at DESC LIMIT 1;
  IF v_val IS NULL THEN
    SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
    WHERE kt.kpi_code = 'SAL-08' AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-08'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-09: Customer Satisfaction Score
  v_tgt := 4.5;
  v_val := NULL;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-09'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  v_tgt := 500000;
  WITH rep_sales AS (
    SELECT COALESCE(o.assigned_user_id, p.id) AS user_id, SUM(o.total_amount) AS total
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE o.created_at >= v_from AND o.created_at < v_to
      AND COALESCE(o.assigned_user_id, p.id) IS NOT NULL
    GROUP BY 1
  )
  SELECT CASE WHEN COUNT(*) > 0 THEN SUM(total) / COUNT(*) ELSE NULL END INTO v_val FROM rep_sales;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-10'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- ===== NON-LIVE KPIs: use parallel arrays =====
  codes := ARRAY['PRO-01','PRO-02','PRO-03','PRO-04','PRO-05','PRO-06','PRO-07','PRO-08','PRO-09'];
  tgts  := ARRAY[8,7,2,90,5,95,100,80,2];
  depts := ARRAY['Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['FIN-01','FIN-02','FIN-03','FIN-04','FIN-05','FIN-06','FIN-07','FIN-08','FIN-09','FIN-10'];
  tgts  := ARRAY[5,30,98,5,90,100,100,14,3,100];
  depts := ARRAY['Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['WAR-01','WAR-02','WAR-03','WAR-04','WAR-05','WAR-06','WAR-07','WAR-08','WAR-09','WAR-10'];
  tgts  := ARRAY[98,99,8,1,2,4,85,50,3,0];
  depts := ARRAY['Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['FLT-01','FLT-02','FLT-03','FLT-04','FLT-05','FLT-06','FLT-07','FLT-08'];
  tgts  := ARRAY[90,95,20,5,0.12,100,5,90];
  depts := ARRAY['Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['DEL-01','DEL-02','DEL-03','DEL-04','DEL-05','DEL-06','DEL-07'];
  tgts  := ARRAY[95,90,4,4.5,25,3,100];
  depts := ARRAY['Delivery','Delivery','Delivery','Delivery','Delivery','Delivery','Delivery'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['QCS-01','QCS-02','QCS-03','QCS-04','QCS-05','QCS-06','QCS-07','QCS-08'];
  tgts  := ARRAY[4.5,50,24,70,95,90,90,100];
  depts := ARRAY['Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['BOD-01','BOD-02','BOD-03','BOD-04','BOD-05','BOD-06','BOD-07','BOD-08','BOD-09'];
  tgts  := ARRAY[70,500000,50,95,5,1000000,100,100,80];
  depts := ARRAY['Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['HR-01','HR-02','HR-03','HR-04','HR-05','HR-06','HR-07','HR-08','HR-09'];
  tgts  := ARRAY[5,21,90,95,100,100,100,4,4];
  depts := ARRAY['HR','HR','HR','HR','HR','HR','HR','HR','HR'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['ITD-01','ITD-02','ITD-03','ITD-04','ITD-05','ITD-06'];
  tgts  := ARRAY[99.5,8,99,20,95,4];
  depts := ARRAY['IT & Data','IT & Data','IT & Data','IT & Data','IT & Data','IT & Data'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['MKT-01','MKT-02','MKT-03','MKT-04','MKT-05'];
  tgts  := ARRAY[200,50,5,90,150];
  depts := ARRAY['Marketing','Marketing','Marketing','Marketing','Marketing'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

END;
$function$;
