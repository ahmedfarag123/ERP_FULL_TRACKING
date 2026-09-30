CREATE OR REPLACE FUNCTION public.create_order_intent_from_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payload jsonb;
  v_order_intent jsonb;
  v_summary text;
  v_estimated_value numeric(14, 2);
  v_requested_date date;
  v_estimated_raw text;
  v_requested_raw text;
begin
  v_payload := coalesce(new.raw_form_payload, new.raw_payload, '{}'::jsonb);

  if coalesce(v_payload->>'next_action', '') <> 'CREATE_ORDER_NOW' then
    return new;
  end if;

  v_order_intent := coalesce(v_payload->'order_intent', '{}'::jsonb);
  v_summary := nullif(trim(coalesce(v_order_intent->>'summary', new.note, '')), '');

  if v_summary is null then
    v_summary := 'Order requested during sales visit';
  end if;

  v_estimated_raw := nullif(regexp_replace(coalesce(v_order_intent->>'estimatedValue', ''), '[^0-9\.\-]', '', 'g'), '');
  if v_estimated_raw is not null then
    v_estimated_value := v_estimated_raw::numeric(14, 2);
  end if;

  v_requested_raw := nullif(trim(coalesce(v_order_intent->>'requestedDeliveryDate', '')), '');
  if v_requested_raw ~ '^\d{4}-\d{2}-\d{2}$' then
    v_requested_date := v_requested_raw::date;
  end if;

  insert into public.order_intents (
    visit_id,
    customer_id,
    sales_profile_id,
    status,
    priority,
    summary,
    estimated_value,
    requested_delivery_date,
    decision_maker_status,
    interest_level,
    next_action,
    selected_customer_profiles,
    source_payload
  )
  values (
    new.id,
    new.customer_id,
    new.user_id,
    'pending',
    'high',
    v_summary,
    v_estimated_value,
    v_requested_date,
    v_payload->>'decision_maker_status',
    v_payload->>'interest_level',
    'CREATE_ORDER_NOW',
    coalesce(v_payload->'selected_customer_profiles', '[]'::jsonb),
    v_payload
  )
  on conflict (visit_id) where visit_id is not null do nothing;

  return new;
end;
$function$;
