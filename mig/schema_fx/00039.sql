CREATE OR REPLACE FUNCTION public.build_calls_odoo_insert(p_row calls)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'res_id', (
      select public.odoo_ref_id(lead.external_lead_id)
      from public.odoo_crm_leads lead
      join public.customers customer on customer.external_customer_id = lead.partner_id
      where customer.id = p_row.customer_id
        and lead.active = true
      order by lead.odoo_updated_at desc nulls last, lead.last_sync_at desc nulls last
      limit 1
    ),
    'activity_type_id', coalesce(
      (
        select dispatch.activity_type_id
        from public.odoo_crm_activity_dispatches dispatch
        where dispatch.requester_id = p_row.user_id
        order by dispatch.created_at desc
        limit 1
      ),
      (
        select public.odoo_ref_id(type_record.external_id)
        from public.odoo_crm_model_records type_record
        where type_record.odoo_model = 'mail.activity.type'
        order by (type_record.display_name ilike '%call%') desc,
          (type_record.external_id = '2') desc,
          type_record.odoo_updated_at desc nulls last,
          type_record.updated_at desc
        limit 1
      ),
      2
    ),
    'user_id', (
      select profile.user_uid
      from public.profiles profile
      where profile.id = p_row.user_id
      limit 1
    ),
    'summary', coalesce(
      nullif(btrim(coalesce(p_row.raw_form_payload->'call_reason_details'->>'label', '')), ''),
      nullif(btrim(coalesce(p_row.call_reason, '')), ''),
      nullif(btrim(coalesce(p_row.customer_disposition, '')), ''),
      nullif(btrim(coalesce(p_row.customer_response, '')), ''),
      nullif(btrim(coalesce(p_row.call_outcome, '')), '')
    ),
    'note', nullif(btrim(coalesce(p_row.call_notes, '')), ''),
    'date_deadline', to_char(
      coalesce(p_row.callback_at, p_row.completed_at, p_row.started_at, p_row.created_at)
        at time zone 'UTC',
      'YYYY-MM-DD'
    )
  ));
$function$;
