-- 00201: backfill logistics_shipments.linked_order_id from odoo_order_name
--        (fix /logistics/shipments list column "القيمة" — data half)
-- ---------------------------------------------------------------------------
-- WHY: the list column "القيمة" rendered 0 for every row. Root cause chain:
--   cell reads logistics_shipments.total_gmv (LogisticsPages.tsx:1225
--   <- fetchAllShipments logistics-admin.ts:1801) -> total_gmv is NULL for
--   ALL 6904 normal shipments (00191 already documented: "populated on 3 of
--   6200 delivered shipments") -> asNumber(null)=0 (logistics-admin.ts:251).
-- The live money lives on orders (total_amount/amount_total) and the list can
-- only reach it through linked_order_id — only 4314/6904 shipments were
-- linked; this file links the rest by odoo_order_name.
--
-- MEASURED LIVE (Sep 30 2026, re-verified immediately before this run):
--   to_link (unlinked, normal, name matches exactly one order) : 2374
--     breakdown: DELIVERED 2148 | PENDING_ASSIGN 226
--   unlinked normal shipments (total)                          : 2590
--   orders.odoo_order_name duplicates                          : 0
--     -> the name match is unambiguous (one order per name)
--   shipments sharing a name with another unlinked shipment    : 253 groups
--     -> each still matches the same single order; multi-shipment-per-order
--        already exists in production (385 orders carry >1 linked shipment),
--        so this introduces no new pattern.
--   returns_with_gmv_gt0                                       : 96  (must stay 96)
--
-- SAFETY (each verified against live code before writing this file):
--   1. FK logistics_shipments_linked_order_id_fkey exists; o.id is valid by
--      construction (we join to orders.id).
--   2. Odoo sync (backend/volumes/functions/logistics-shipments-odoo/index.ts)
--      only upserts pickings with write_date > lastSyncDate plus an upcoming
--      scheduled window (lines ~144-151, ~186-197). Historical DELIVERED rows
--      are NOT re-synced. Any row the sync DOES touch re-links itself from the
--      picking origin (linked_order_id: order?.id ?? null, line 281), so sync
--      and this backfill agree.
--   3. Trigger logistics_hydrate_shipment_route_data (BEFORE UPDATE OF
--      linked_order_id): coalesce-fills nulls only; sole non-coalesce side
--      effect = customer lat/lng refresh from customers master + distance
--      recompute — identical to any normal link.
--   4. admin_assign_order_to_driver guard (lines 61-63) skips
--      DELIVERED/FINISHED/SETTLED -> historical links never block
--      re-assignment; active links (the 226) make the existing shipment be
--      REUSED instead of a duplicate being created (desired).
--
-- RUN (root docker psql, ON_ERROR_STOP so a mid-file failure aborts cleanly):
--   sudo docker exec -i supabase-db psql -U supabase_admin -d postgres \
--        -v ON_ERROR_STOP=1 -f - < 00201_link_shipments.sql
-- ROLLBACK: commented statement at the bottom of this file.
-- ---------------------------------------------------------------------------

BEGIN;

-- 0) pre-image backup (all unlinked normal shipments, before the change)
CREATE TABLE IF NOT EXISTS public.logistics_00201_linked_bak AS
SELECT s.id,
       s.linked_order_id,
       s.shipment_status,
       s.updated_at
FROM public.logistics_shipments s
WHERE s.linked_order_id IS NULL
  AND NOT s.is_return_shipment;

CREATE INDEX IF NOT EXISTS idx_00201_linked_bak_id
  ON public.logistics_00201_linked_bak (id);

-- 1) the backfill. orders.odoo_order_name has 0 duplicates (verified), so the
--    FROM join yields at most one row per target -> no "cannot affect row a
--    second time" hazard; 2374 rows expected (guard below asserts the count).
WITH to_link AS (
  SELECT s.id
  FROM public.logistics_shipments s
  WHERE s.linked_order_id IS NULL
    AND NOT s.is_return_shipment
    AND s.odoo_order_name IS NOT NULL
    AND btrim(s.odoo_order_name) <> ''
    AND EXISTS (SELECT 1
                FROM public.orders o
                WHERE o.odoo_order_name = s.odoo_order_name)
)
UPDATE public.logistics_shipments s
SET linked_order_id = o.id
FROM public.orders o
WHERE s.id IN (SELECT id FROM to_link)
  AND o.odoo_order_name = s.odoo_order_name;

-- 2) post-conditions (RAISE via DO block: any failure aborts the transaction)
DO $$
DECLARE
  v_linked   integer;
  v_unlinked integer;
  v_bak      integer;
  v_mismatch integer;
  v_ret_gmv  integer;
BEGIN
  SELECT count(*) INTO v_bak
  FROM public.logistics_00201_linked_bak;

  SELECT count(*)
    FILTER (WHERE linked_order_id IS NOT NULL)
  INTO v_linked
  FROM public.logistics_shipments
  WHERE id IN (SELECT id FROM public.logistics_00201_linked_bak);

  SELECT count(*)
    FILTER (WHERE linked_order_id IS NULL AND shipment_status IN ('DELIVERED','FINISHED','SETTLED'))
  INTO v_unlinked
  FROM public.logistics_shipments
  WHERE NOT is_return_shipment;

  -- every backup row that was in scope must now be linked
  IF v_linked < 2374 THEN
    RAISE EXCEPTION '00201 guard: linked % of expected 2374 (bak %)', v_linked, v_bak;
  END IF;

  -- no normal shipment outside the name-match scope got linked by mistake
  SELECT count(*) INTO v_mismatch
  FROM public.logistics_shipments s
  WHERE s.linked_order_id IS NOT NULL
    AND NOT s.is_return_shipment
    AND NOT EXISTS (SELECT 1 FROM public.logistics_00201_linked_bak b WHERE b.id = s.id)
    AND s.odoo_order_name IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.odoo_order_name = s.odoo_order_name);

  IF v_mismatch > 0 THEN
    RAISE EXCEPTION '00201 guard: % rows linked without a matching order', v_mismatch;
  END IF;

  -- returns GMV untouched by this migration
  SELECT count(*) INTO v_ret_gmv
  FROM public.logistics_shipments
  WHERE is_return_shipment AND total_gmv > 0;

  IF v_ret_gmv <> 96 THEN
    RAISE EXCEPTION '00201 guard: returns with gmv>0 = % (expected 96)', v_ret_gmv;
  END IF;

  RAISE NOTICE '00201 OK: bak=%, linked_now=%, delivered_unlinked_residual=%, returns_gmv=%',
    v_bak, v_linked, v_unlinked, v_ret_gmv;
END $$;

COMMIT;

-- ===========================================================================
-- ROLLBACK (run manually if ever needed; hydrate-filled fields are additive
-- coalesce fills and are intentionally NOT reverted):
--
-- BEGIN;
-- UPDATE public.logistics_shipments s
-- SET linked_order_id = b.linked_order_id
-- FROM public.logistics_00201_linked_bak b
-- WHERE s.id = b.id
--   AND s.linked_order_id IS DISTINCT FROM b.linked_order_id;
-- COMMIT;
-- ===========================================================================
