-- 00203: classify the 26 hand-created tickets (raw_payload IS NULL) that were showing as
--         "غير مصنف" / category='other' in /tickets/analytics.
-- Method (self-learning, no guessing): every one of the 26 subjects is an exact match for an
-- existing problem_detail in the imported Excel rows, so the category is taken as the majority
-- vote of those Excel rows. Vote counts: stock_shortage 627, product_damage 146,
-- product_expired 68+27, wrong_shipment 38, wrong_order 45, loading_error 50.
-- cs_analytics maps an empty category to the literal 'other' bucket, so filling it removes the
-- "غير مصنف" card without touching any other column.
-- Safety: single transaction, backup table, assertions, no DELETE.

\set ON_ERROR_STOP on

BEGIN;

-- 1) backup of exactly the rows we touch ------------------------------------
CREATE TABLE public.order_tickets_bak_00203 AS
  SELECT id, category FROM public.order_tickets WHERE COALESCE(btrim(category),'') = '';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.order_tickets_bak_00203;
  IF n <> 26 THEN RAISE EXCEPTION 'ABORT: backup has % rows, expected 26', n; END IF;
END $$;

-- 2) majority-vote category from the Excel rows sharing the same subject -----
WITH learned AS (
  SELECT btrim(subject) AS subj,
         (SELECT x.category
            FROM order_tickets x
           WHERE x.raw_payload->>'source' = 'excel_backfill'
             AND btrim(x.raw_payload->>'problem_detail') = btrim(t.subject)
           GROUP BY x.category
           ORDER BY count(*) DESC, x.category
           LIMIT 1) AS cat
    FROM public.order_tickets t
   WHERE COALESCE(btrim(t.category),'') = ''
)
UPDATE public.order_tickets t
   SET category = l.cat,
       updated_at = now()
  FROM learned l
 WHERE COALESCE(btrim(t.category),'') = ''
   AND btrim(t.subject) = l.subj
   AND l.cat IS NOT NULL;

-- 3) assertions ---------------------------------------------------------------
DO $$
DECLARE n_left int; n_filled int; n_gone int; n_bad int;
BEGIN
  SELECT count(*) INTO n_left  FROM public.order_tickets WHERE COALESCE(btrim(category),'') = '';
  SELECT count(*) INTO n_filled FROM public.order_tickets_bak_00203 b
    JOIN public.order_tickets t USING (id) WHERE COALESCE(btrim(t.category),'') <> '';
  SELECT count(*) INTO n_gone  FROM public.order_tickets_bak_00203 b
    WHERE NOT EXISTS (SELECT 1 FROM public.order_tickets t WHERE t.id = b.id);
  -- a filled category must be one the app already knows (a real slug, never 'other')
  SELECT count(*) INTO n_bad FROM public.order_tickets
   WHERE raw_payload->>'source' = 'excel_backfill'
     AND COALESCE(btrim(category),'') IN ('other','');
  RAISE NOTICE 'filled=% still_empty=% vanished=% bad_excel=%', n_filled, n_left, n_gone, n_bad;
  IF n_left  <> 0 THEN RAISE EXCEPTION 'ABORT: % rows still unclassified', n_left; END IF;
  IF n_filled <> 26 THEN RAISE EXCEPTION 'ABORT: filled % rows, expected 26', n_filled; END IF;
  IF n_gone  <> 0 THEN RAISE EXCEPTION 'ABORT: % rows vanished', n_gone; END IF;
  IF n_bad   <> 0 THEN RAISE EXCEPTION 'ABORT: % excel rows carrying other/empty category', n_bad; END IF;
END $$;

-- 4) proof: the "غير مصنف" bucket is gone from the page's data source ------
SELECT (public.cs_analytics('2026-01-01'::timestamptz,'2026-09-30 23:59:59'::timestamptz)->'byCategory') ? 'other' AS other_bucket_still_present,
       (public.cs_analytics('2026-01-01'::timestamptz,'2026-09-30 23:59:59'::timestamptz)->>'total')::int AS total;

COMMIT;
