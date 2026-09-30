-- Configure and enable Odoo sync cron jobs on the new Supabase project.
--
-- This version is safe to paste into the Supabase Dashboard SQL Editor.
-- Replace the placeholder values in the first DO block before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

do $$
declare
  v_project_url text := 'https://euyvfaokdzwjnhjvjavp.supabase.co';
  v_service_role_key text := '<NEW_SERVICE_ROLE_KEY>';
  v_edge_sync_secret text := '<ODOO_SYNC_SECRET>';
  v_anon_key text := '';
  v_secret_id uuid;
begin
  if v_service_role_key = '<NEW_SERVICE_ROLE_KEY>' then
    raise exception 'Replace <NEW_SERVICE_ROLE_KEY> before running this script.';
  end if;

  if v_edge_sync_secret = '<ODOO_SYNC_SECRET>' then
    raise exception 'Replace <ODOO_SYNC_SECRET> before running this script.';
  end if;

  select id
  into v_secret_id
  from vault.decrypted_secrets
  where name = 'sales_sync_project_url';

  if v_secret_id is null then
    perform vault.create_secret(v_project_url, 'sales_sync_project_url');
  else
    perform vault.update_secret(v_secret_id, v_project_url, 'sales_sync_project_url');
  end if;

  select id
  into v_secret_id
  from vault.decrypted_secrets
  where name = 'sales_sync_service_role_key';

  if v_secret_id is null then
    perform vault.create_secret(v_service_role_key, 'sales_sync_service_role_key');
  else
    perform vault.update_secret(v_secret_id, v_service_role_key, 'sales_sync_service_role_key');
  end if;

  select id
  into v_secret_id
  from vault.decrypted_secrets
  where name = 'sales_sync_edge_secret';

  if v_secret_id is null then
    perform vault.create_secret(v_edge_sync_secret, 'sales_sync_edge_secret');
  else
    perform vault.update_secret(v_secret_id, v_edge_sync_secret, 'sales_sync_edge_secret');
  end if;

  if nullif(v_anon_key, '') is not null then
    select id
    into v_secret_id
    from vault.decrypted_secrets
    where name = 'sales_sync_anon_key';

    if v_secret_id is null then
      perform vault.create_secret(v_anon_key, 'sales_sync_anon_key');
    else
      perform vault.update_secret(v_secret_id, v_anon_key, 'sales_sync_anon_key');
    end if;
  end if;
end $$;

do $$
declare
  job_name text;
begin
  foreach job_name in array array[
    'sync-odoo-orders',
    'sync-odoo-logistics-shipments',
    'sync-odoo-customers',
    'sync-odoo-products',
    'sync-odoo-logistics-warehouse',
    'sync-odoo-logistics-warehouses',
    'sync-odoo-logistics-users',
    'sync-odoo-crm'
  ]
  loop
    if exists (select 1 from cron.job where jobname = job_name) then
      perform cron.unschedule(job_name);
    end if;
  end loop;
end $$;

select cron.schedule(
  'sync-odoo-orders',
  '* * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'orders-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-orders', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-logistics-shipments',
  '* * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'logistics-shipments-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-logistics-shipments', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-customers',
  '*/2 * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'customers-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-customers', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-products',
  '*/5 * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'products-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-products', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-logistics-warehouse',
  '*/30 * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'logistics-warehouse-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-logistics-warehouse', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-logistics-users',
  '0 2 * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'logistics-users-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-logistics-users', 'requested_at', now())
  );
  $$
);

select cron.schedule(
  'sync-odoo-crm',
  '*/10 * * * *',
  $$
  select public.invoke_scheduled_edge_function(
    'crm-odoo',
    jsonb_build_object('trigger', 'cron', 'job', 'sync-odoo-crm', 'requested_at', now())
  );
  $$
);

select jobid, jobname, schedule, active
from cron.job
where jobname like 'sync-odoo-%'
order by jobname;
