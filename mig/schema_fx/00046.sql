CREATE OR REPLACE FUNCTION public.claim_odoo_crm_activity_dispatch(p_request_id uuid, p_requester_id uuid, p_mapped_odoo_user_id bigint, p_lead_external_id text, p_activity_type_id bigint, p_payload jsonb, p_mode text)
 RETURNS TABLE(dispatch_id uuid, dispatch_status text, should_dispatch boolean, remote_activity_id bigint, error_code text, error_message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_inserted public.odoo_crm_activity_dispatches%rowtype;
  v_existing public.odoo_crm_activity_dispatches%rowtype;
  v_initial_status text := case when p_mode = 'disabled' then 'blocked' else 'pending' end;
begin
  if p_mode not in ('disabled', 'test', 'live') then
    raise exception 'Unsupported Odoo CRM activity mode.' using errcode = '22023';
  end if;

  if p_requester_id is null or p_mapped_odoo_user_id <= 0 or p_activity_type_id <= 0
    or coalesce(btrim(p_lead_external_id), '') = '' or p_payload is null then
    raise exception 'Invalid Odoo CRM activity dispatch claim.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_requester_id::text));

  if (
    select count(*)
    from public.odoo_crm_activity_dispatches
    where requester_id = p_requester_id
      and request_id <> p_request_id
      and created_at >= timezone('utc', now()) - interval '1 minute'
  ) >= 10 then
    raise exception 'CRM activity dispatch rate limit exceeded.' using errcode = 'P0001';
  end if;

  insert into public.odoo_crm_activity_dispatches (
    request_id,
    requester_id,
    mapped_odoo_user_id,
    lead_external_id,
    activity_type_id,
    payload,
    mode,
    status
  )
  values (
    p_request_id,
    p_requester_id,
    p_mapped_odoo_user_id,
    p_lead_external_id,
    p_activity_type_id,
    p_payload,
    p_mode,
    v_initial_status
  )
  on conflict (request_id) do nothing
  returning * into v_inserted;

  if found then
    return query select v_inserted.id, v_inserted.status, v_inserted.status = 'pending', v_inserted.remote_activity_id, v_inserted.error_code, v_inserted.error_message;
    return;
  end if;

  select * into v_existing
  from public.odoo_crm_activity_dispatches
  where request_id = p_request_id;

  if v_existing.requester_id <> p_requester_id then
    raise exception 'CRM activity request id belongs to another user.' using errcode = '23505';
  end if;

  if v_existing.status = 'sent' then
    return query select v_existing.id, v_existing.status, false, v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
    return;
  end if;

  if v_existing.status = 'pending'
    and v_existing.updated_at >= timezone('utc', now()) - interval '10 minutes' then
    return query select v_existing.id, v_existing.status, false, v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
    return;
  end if;

  update public.odoo_crm_activity_dispatches
  set
    mapped_odoo_user_id = p_mapped_odoo_user_id,
    lead_external_id = p_lead_external_id,
    activity_type_id = p_activity_type_id,
    payload = p_payload,
    mode = p_mode,
    status = v_initial_status,
    attempt_count = attempt_count + 1,
    remote_activity_id = null,
    error_code = null,
    error_message = null,
    sent_at = null
  where id = v_existing.id
  returning * into v_existing;

  return query select v_existing.id, v_existing.status, v_existing.status = 'pending', v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
end;
$function$;
