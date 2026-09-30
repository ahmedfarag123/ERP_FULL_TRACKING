-- Debug Odoo cron -> pg_net -> Edge Function delivery.
-- Run this in the Supabase SQL Editor for the new project.

select jobid, jobname, schedule, active
from cron.job
where jobname like 'sync-odoo-%'
order by jobname;

select entity_type, last_sync_at, last_sync_row_count, last_sync_duration_ms, last_error, updated_at
from public.logistics_sync_watermarks
order by updated_at desc;

select public.invoke_scheduled_edge_function(
  'logistics-warehouse-odoo',
  jsonb_build_object(
    'trigger', 'manual-debug',
    'job', 'debug-logistics-warehouse-odoo',
    'requested_at', now()
  )
) as request_id;

-- Wait 5-15 seconds after running the SELECT above, then run this block.
-- Replace 0 with the request_id returned above if you want one exact response.
select id, status_code, timed_out, error_msg, content_type, left(content, 2000) as content, created
from net._http_response
where id >= 0
order by id desc
limit 20;
