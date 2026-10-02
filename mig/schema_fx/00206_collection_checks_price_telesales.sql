-- 00206: admin_get_collection_checks returns the shipment price + the telesales name.
-- Owner's request: the فحص التحصيل table on /finance/driver-settlements must show two new
-- columns — السعر الخاص بالشحنة and اسم التيلي سيلز.
-- Data facts (probed before writing):
--   * logistics_shipments.total_gmv is NULL for all 172 shipment-linked checks, so the price
--     comes from the linked order exactly like logistics_shipment_detail's pricing:
--     COALESCE(orders.total_amount, orders.amount_total, shipments.total_gmv) -> 171/171 filled.
--   * "Telesales" has no dedicated column anywhere in the DB (0 profiles with role='telesales'),
--     the person on the order IS the telesales: the canonical 00190 salesperson chain resolves
--     171/171 (user_id '15 | Haddil Haron' style -> name, fallback salespersons_odoo / assigned).
-- Changes: RETURNS TABLE gains shipment_price numeric + telesales_name text; body gains
--   LEFT JOIN orders o ON o.id = s.linked_order_id and the two expressions. Existing 15 columns
--   and the p_status filter are byte-for-byte unchanged.
-- Expected: rows returned = 176 (table count), price 171, telesales 171, driver_name 176.
-- Rollback: SELECT prosrc FROM public.admin_get_collection_checks_bak_00206;
-- Safety: one transaction, ON_ERROR_STOP, hard assertions before COMMIT.

\set ON_ERROR_STOP on

BEGIN;

-- 1) backup of the previous definition -------------------------------------------
CREATE TABLE public.admin_get_collection_checks_bak_00206 AS
  SELECT proname, prosrc FROM pg_proc WHERE proname = 'admin_get_collection_checks';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.admin_get_collection_checks_bak_00206;
  IF n <> 1 THEN RAISE EXCEPTION 'ABORT: backup has % rows', n; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_get_collection_checks_bak_00206 WHERE prosrc LIKE '%shipment_price%')
    THEN RAISE EXCEPTION 'ABORT: backup already contains the new column?'; END IF;
END $$;

-- 2) new definition ---------------------------------------------------------------
-- PostgreSQL refuses to change the return type of an existing function, so DROP first
-- (same transaction: any failure after this point restores the old definition on abort,
--  and other sessions keep seeing the old function until COMMIT).
DROP FUNCTION public.admin_get_collection_checks(text);
CREATE OR REPLACE FUNCTION public.admin_get_collection_checks(p_status text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  shipment_id text,
  odoo_order_name text,
  customer_name text,
  plan_id text,
  driver_profile_id uuid,
  driver_name text,
  check_status text,
  payment_method text,
  reason text,
  driver_notes text,
  review_status text,
  admin_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone,
  shipment_price numeric,
  telesales_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  select
    c.id,
    c.shipment_id,
    s.odoo_order_name,
    s.customer_name,
    c.plan_id::text,
    c.driver_profile_id,
    coalesce(p.full_name, p.email::text, c.driver_profile_id::text) as driver_name,
    c.check_status,
    c.payment_method,
    c.reason,
    c.driver_notes,
    c.review_status,
    c.admin_notes,
    c.reviewed_at,
    c.created_at,
    coalesce(o.total_amount, o.amount_total, s.total_gmv) as shipment_price,
    case when nullif(btrim(replace(coalesce(o.user_id, ''), '|', ' ')), '') is null
              then nullif(btrim(coalesce(o.assigned_user_id_full_name, '')), '')
         when btrim(replace(o.user_id, '|', ' ')) ~ '^\d+\s+\S'
              then nullif(btrim(regexp_replace(btrim(replace(o.user_id, '|', ' ')), '^\d+\s+', '')), '')
         when btrim(o.user_id) ~ '^\d+$' then (
              select max(spo.salesperson_name)
                from public.salespersons_odoo spo
               where spo.user_id::text = btrim(o.user_id))
         else nullif(btrim(o.assigned_user_id_full_name), '')
    end as telesales_name
  from public.driver_plan_collection_checks c
  left join public.profiles p on p.id = c.driver_profile_id
  left join public.logistics_shipments s on s.id::text = c.shipment_id
  left join public.orders o on o.id = s.linked_order_id
  where (p_status is null or c.review_status = p_status)
  order by c.created_at desc;
$fn$;

-- same explicit grants the old definition had (anon/authenticated/service_role execute)
GRANT EXECUTE ON FUNCTION public.admin_get_collection_checks(text) TO postgres, anon, authenticated, service_role;

-- 3) assertions --------------------------------------------------------------------
DO $$
DECLARE
  n_tbl int; n_rows int; n_price int; n_tel int; n_driver int;
  n_neg_price int; n_blank_tel int; n_names int;
  role_name text;
BEGIN
  SELECT count(*) INTO n_tbl FROM public.driver_plan_collection_checks;
  SELECT count(*),
         count(shipment_price),
         count(telesales_name),
         count(driver_name),
         count(*) FILTER (WHERE shipment_price < 0),
         count(*) FILTER (WHERE telesales_name IS NOT NULL AND btrim(telesales_name) = ''),
         count(DISTINCT telesales_name)
    INTO n_rows, n_price, n_tel, n_driver, n_neg_price, n_blank_tel, n_names
    FROM public.admin_get_collection_checks(NULL);

  IF n_rows <> n_tbl THEN RAISE EXCEPTION 'ABORT: RPC rows % <> table rows %', n_rows, n_tbl; END IF;
  IF n_driver <> n_tbl THEN RAISE EXCEPTION 'ABORT: driver_name missing on % of % rows', n_tbl - n_driver, n_tbl; END IF;
  IF n_price < 171 THEN RAISE EXCEPTION 'ABORT: only % prices filled, expected >= 171', n_price; END IF;
  IF n_tel < 171 THEN RAISE EXCEPTION 'ABORT: only % telesales names filled, expected >= 171', n_tel; END IF;
  IF n_rows - n_price > 5 THEN RAISE EXCEPTION 'ABORT: % rows without price (orphans bound is 5)', n_rows - n_price; END IF;
  IF n_neg_price <> 0 THEN RAISE EXCEPTION 'ABORT: % negative prices', n_neg_price; END IF;
  IF n_blank_tel <> 0 THEN RAISE EXCEPTION 'ABORT: % blank telesales names', n_blank_tel; END IF;
  IF n_names < 5 THEN RAISE EXCEPTION 'ABORT: only % distinct telesales names', n_names; END IF;

  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF NOT has_function_privilege(role_name, 'public.admin_get_collection_checks(text)', 'EXECUTE') THEN
      RAISE EXCEPTION 'ABORT: role % lost EXECUTE privilege', role_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'rows=% price=% telesales=% driver=% distinct_names=%',
               n_rows, n_price, n_tel, n_driver, n_names;
END $$;

-- 4) proof: real rows with the two new values -------------------------------------
SELECT odoo_order_name, shipment_price, telesales_name, driver_name
  FROM public.admin_get_collection_checks(NULL)
 LIMIT 5;

-- 5) make PostgREST pick up the new return type -----------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
