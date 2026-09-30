CREATE OR REPLACE FUNCTION public.set_odoo_action_status(p_action_key text, p_is_active boolean)
 RETURNS TABLE(id uuid, action_key text, is_active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can change Odoo action status.' using errcode = '42501';
  end if;

  return query
  update public.odoo_actions
  set is_active = p_is_active
  where odoo_actions.action_key = btrim(p_action_key)
  returning odoo_actions.id, odoo_actions.action_key, odoo_actions.is_active, odoo_actions.updated_at;

  if not found then
    raise exception 'Unknown Odoo action key.' using errcode = '22023';
  end if;
end;
$function$;
