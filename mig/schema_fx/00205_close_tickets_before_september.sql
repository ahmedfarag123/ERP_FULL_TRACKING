-- 00205: close every ticket created before 2026-09-01 (January-August sweep).
-- Owner's instruction: "any open ticket from the beginning through month 8 -> close them all,
-- leave everything from September until today exactly as it is".
-- Reality check done before writing: NO ticket anywhere has status='closed' yet, and the
-- window Jan 1 - Aug 31 holds 8997 'resolved' + 23 'pending' = 9020 not-closed tickets
-- (zero literal 'open'). Owner confirmed the scope = all not-closed (resolved + pending).
-- What it does (mirrors the app: updateTicketStatus('closed') sets status + closed_at=now):
--   UPDATE order_tickets SET status='closed', closed_at=now()
--   WHERE created_at < '2026-09-01' AND status <> 'closed'
-- Nothing else is touched: resolved_at stays, September..today is bit-for-bit untouched,
-- no row is inserted (except the backup table) or deleted.
-- Expected after commit:
--   Jan-Aug : closed 9020, non-closed 0
--   Sep 1+  : resolved 1227, pending 26, open 1, closed 0  (unchanged fingerprint)
--   total   : 10274 (unchanged), backup order_tickets_bak_00205 = 9020
-- Rollback: UPDATE order_tickets t SET status=b.status, closed_at=b.closed_at,
--           updated_at=b.updated_at FROM order_tickets_bak_00205 b WHERE t.id = b.id;
-- Safety: one transaction, ON_ERROR_STOP, hard assertions before COMMIT.

\set ON_ERROR_STOP on

BEGIN;

-- 1) backup of every affected row (id + the columns this migration may change) ----
CREATE TABLE public.order_tickets_bak_00205 AS
  SELECT id, status, closed_at, resolved_at, updated_at
    FROM public.order_tickets
   WHERE created_at < DATE '2026-09-01' AND status <> 'closed';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.order_tickets_bak_00205;
  IF n <> 9020 THEN RAISE EXCEPTION 'ABORT: backup has % rows, expected 9020', n; END IF;
END $$;

-- 2) close + assert everything in one block ---------------------------------------
DO $$
DECLARE
  n_total_pre   int; n_win_res_at_pre int; n_updated int;
  n_win_nonclosed int; n_win_closed int; n_win_no_closed_at int; n_win_res_at_post int;
  n_sep_resolved int; n_sep_pending int; n_sep_open int; n_sep_closed int;
  n_total_post  int;
BEGIN
  -- pre-state fingerprints
  SELECT count(*) INTO n_total_pre FROM public.order_tickets;
  IF n_total_pre <> 10274 THEN RAISE EXCEPTION 'ABORT: total before = %, expected 10274', n_total_pre; END IF;
  SELECT count(*) INTO n_win_res_at_pre
    FROM public.order_tickets
   WHERE created_at < DATE '2026-09-01' AND resolved_at IS NOT NULL;

  -- the sweep
  UPDATE public.order_tickets
     SET status = 'closed',
         closed_at = now()
   WHERE created_at < DATE '2026-09-01'
     AND status <> 'closed';
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  IF n_updated <> 9020 THEN RAISE EXCEPTION 'ABORT: updated % rows, expected 9020', n_updated; END IF;

  -- window must now be 100% closed, with closed_at set, resolved_at preserved
  SELECT count(*) INTO n_win_nonclosed
    FROM public.order_tickets WHERE created_at < DATE '2026-09-01' AND status <> 'closed';
  SELECT count(*) INTO n_win_closed
    FROM public.order_tickets WHERE created_at < DATE '2026-09-01' AND status = 'closed';
  SELECT count(*) INTO n_win_no_closed_at
    FROM public.order_tickets WHERE created_at < DATE '2026-09-01' AND status = 'closed' AND closed_at IS NULL;
  SELECT count(*) INTO n_win_res_at_post
    FROM public.order_tickets WHERE created_at < DATE '2026-09-01' AND resolved_at IS NOT NULL;

  -- September..today fingerprint must be untouched (resolved 1227, pending 26, open 1, closed 0)
  SELECT count(*) FILTER (WHERE status = 'resolved') INTO n_sep_resolved
    FROM public.order_tickets WHERE created_at >= DATE '2026-09-01';
  SELECT count(*) FILTER (WHERE status = 'pending')  INTO n_sep_pending
    FROM public.order_tickets WHERE created_at >= DATE '2026-09-01';
  SELECT count(*) FILTER (WHERE status = 'open')     INTO n_sep_open
    FROM public.order_tickets WHERE created_at >= DATE '2026-09-01';
  SELECT count(*) FILTER (WHERE status = 'closed')   INTO n_sep_closed
    FROM public.order_tickets WHERE created_at >= DATE '2026-09-01';

  SELECT count(*) INTO n_total_post FROM public.order_tickets;

  IF n_win_nonclosed <> 0 THEN RAISE EXCEPTION 'ABORT: % non-closed left in Jan-Aug', n_win_nonclosed; END IF;
  IF n_win_closed <> 9020 THEN RAISE EXCEPTION 'ABORT: Jan-Aug closed = %, expected 9020', n_win_closed; END IF;
  IF n_win_no_closed_at <> 0 THEN RAISE EXCEPTION 'ABORT: % closed rows without closed_at', n_win_no_closed_at; END IF;
  IF n_win_res_at_post <> n_win_res_at_pre THEN RAISE EXCEPTION 'ABORT: resolved_at changed (% -> %)', n_win_res_at_pre, n_win_res_at_post; END IF;
  IF n_sep_resolved <> 1227 OR n_sep_pending <> 26 OR n_sep_open <> 1 OR n_sep_closed <> 0
     THEN RAISE EXCEPTION 'ABORT: Sep fingerprint changed (res %, pend %, open %, closed %)',
                          n_sep_resolved, n_sep_pending, n_sep_open, n_sep_closed; END IF;
  IF n_total_post <> n_total_pre THEN RAISE EXCEPTION 'ABORT: total changed (% -> %)', n_total_pre, n_total_post; END IF;

  RAISE NOTICE 'updated=% jan_aug_closed=% sep(res=%,pend=%,open=%,closed=%) total=% resolved_at_preserved=%',
               n_updated, n_win_closed, n_sep_resolved, n_sep_pending, n_sep_open, n_sep_closed,
               n_total_post, n_win_res_at_post;
END $$;

-- 3) proof ------------------------------------------------------------------------
SELECT 'jan_aug' AS win, status, count(*) FROM public.order_tickets
 WHERE created_at < DATE '2026-09-01' GROUP BY status
UNION ALL
SELECT 'sep_today', status, count(*) FROM public.order_tickets
 WHERE created_at >= DATE '2026-09-01' GROUP BY status
 ORDER BY 1, 2;

COMMIT;
