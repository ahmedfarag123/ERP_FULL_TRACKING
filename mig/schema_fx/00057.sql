CREATE OR REPLACE FUNCTION public.debug_crm_sync()
 RETURNS TABLE(status_code integer, response_body text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  secret_val text;
  response record;
BEGIN
  SELECT decrypted_secret INTO secret_val FROM vault.decrypted_secrets WHERE name = 'sales_sync_edge_secret';
  
  SELECT * INTO response FROM http(
    'POST',
    current_setting('app.settings.supabase_url') || '/functions/v1/crm-odoo',
    ARRAY[http_header('Content-Type', 'application/json'), http_header('x-sync-secret', secret_val)],
    '{"maxRows": 10}'::json
  );
  
  RETURN QUERY SELECT response.status, response.content::text;
END;
$function$;
