CREATE OR REPLACE FUNCTION public.invoke_scheduled_edge_function(function_name text, payload jsonb DEFAULT NULL::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  project_url text;
  bearer_key text;
  sync_secret text;
  headers jsonb;
  request_id bigint;
begin
  if function_name not in (
    'customers-odoo',
    'orders-odoo',
    'products-odoo',
    'crm-odoo',
    'logistics-shipments-odoo',
    'logistics-users-odoo',
    'logistics-warehouse-odoo',
    'logistics-warehouses-odoo',
    'scrape-suplyd-shop',
    'kpi-odoo-query'
  ) then
    raise exception 'Unsupported scheduled Edge Function: %', function_name;
  end if;

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'sales_sync_project_url';

  select decrypted_secret
  into bearer_key
  from vault.decrypted_secrets
  where name = 'sales_sync_service_role_key';

  if bearer_key is null then
    select decrypted_secret
    into bearer_key
    from vault.decrypted_secrets
    where name = 'sales_sync_anon_key';
  end if;

  select decrypted_secret
  into sync_secret
  from vault.decrypted_secrets
  where name = 'sales_sync_edge_secret';

  if project_url is null then
    raise exception 'Missing vault secret sales_sync_project_url';
  end if;

  if bearer_key is null then
    raise exception 'Missing vault secret sales_sync_service_role_key or sales_sync_anon_key';
  end if;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || bearer_key
  );

  if sync_secret is not null then
    headers := headers || jsonb_build_object('x-sync-secret', sync_secret);
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_name,
    headers := headers,
    body := coalesce(payload, '{}'::jsonb)
  )
  into request_id;

  return request_id;
end;
$function$;
