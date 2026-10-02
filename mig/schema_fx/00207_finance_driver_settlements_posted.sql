-- ============================================================
-- 00207: finance_driver_settlements — add posted_by / posted_at
-- ============================================================
-- Why:      public.post_driver_settlement UPDATE sets
--             posted_by = auth.uid(), posted_at = timezone('utc', now())
--           but NEITHER column exists on the table (verified:
--           information_schema posted_by=0, posted_at=0) → every
--           "ترحيل" attempt fails with `column "posted_by" does not
--           exist` and the settlement never reaches status='posted'.
-- Changes:  ALTER TABLE public.finance_driver_settlements
--             ADD COLUMN IF NOT EXISTS posted_by uuid,
--             ADD COLUMN IF NOT EXISTS posted_at timestamptz;
--           both NULLable, no default, no backfill (table has 0 rows).
--           + structure backup finance_driver_settlements_bak_00207.
-- Expected: column count 19 → 21; row count stays 0; RPC source
--           untouched; the RPC's exact UPDATE assignment now plans
--           without a missing-column error (asserted in DO block).
-- Rollback: ALTER TABLE public.finance_driver_settlements
--             DROP COLUMN posted_by, DROP COLUMN posted_at;
--           DROP TABLE public.finance_driver_settlements_bak_00207;
-- Safety:   additive-only, single transaction, ON_ERROR_STOP, strict
--           ASSERTs before COMMIT (any failure → full rollback);
--           no RLS policy / grant / other table touched.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.finance_driver_settlements_bak_00207
  AS TABLE public.finance_driver_settlements;

ALTER TABLE public.finance_driver_settlements
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.finance_driver_settlements;
  ASSERT v_count = (SELECT count(*) FROM public.finance_driver_settlements_bak_00207),
    'row count changed';

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_name = 'finance_driver_settlements'
     AND column_name = 'posted_by'
     AND data_type = 'uuid'
     AND is_nullable = 'YES';
  ASSERT v_count = 1, 'posted_by uuid NULLable missing';

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_name = 'finance_driver_settlements'
     AND column_name = 'posted_at'
     AND data_type = 'timestamp with time zone'
     AND is_nullable = 'YES';
  ASSERT v_count = 1, 'posted_at timestamptz NULLable missing';

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_name = 'finance_driver_settlements';
  ASSERT v_count = 21, 'expected 21 columns (19+2), got ' || v_count;

  SELECT count(*) INTO v_count FROM pg_proc
   WHERE proname = 'post_driver_settlement'
     AND prosrc LIKE '%posted_by%'
     AND prosrc LIKE '%posted_at%';
  ASSERT v_count = 1, 'post_driver_settlement no longer references posted_by/posted_at';

  -- the exact assignment the RPC performs must now resolve;
  -- synthetic uuid matches nothing → 0 rows, zero data mutation
  UPDATE public.finance_driver_settlements
     SET posted_by = auth.uid(),
         posted_at = timezone('utc', now()),
         updated_at = timezone('utc', now())
   WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
  ASSERT NOT FOUND, 'synthetic uuid unexpectedly matched a real row';
END $$;

COMMIT;
