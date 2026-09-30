CREATE OR REPLACE FUNCTION public.record_visit_checkin(p_customer_id uuid, p_visit_result text, p_visit_mode visit_mode, p_note text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_customer_distance_meters numeric DEFAULT NULL::numeric, p_within_geofence boolean DEFAULT NULL::boolean, p_captured_photo_path text DEFAULT NULL::text, p_linked_order_id uuid DEFAULT NULL::uuid, p_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_dynamic_answers jsonb DEFAULT '[]'::jsonb, p_fraud_score numeric DEFAULT 0, p_fraud_status fraud_status DEFAULT 'normal'::fraud_status, p_fraud_signals jsonb DEFAULT '{}'::jsonb)
 RETURNS visits
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_visit public.visits%rowtype;
  v_customer public.customers%rowtype;
  v_answer jsonb;
  v_field_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_customer
  from public.customers
  where id = p_customer_id;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  if not public.is_management_role()
     and coalesce(v_customer.assigned_user_id, auth.uid()) <> auth.uid()
     and coalesce(v_customer.created_by, auth.uid()) <> auth.uid() then
    raise exception 'You do not have access to check in for this customer';
  end if;

  insert into public.visits (
    customer_id,
    user_id,
    linked_order_id,
    visit_result,
    visit_mode,
    note,
    override_reason,
    captured_photo_path,
    started_at,
    completed_at,
    lat,
    lng,
    customer_distance_meters,
    within_geofence,
    fraud_score,
    fraud_status,
    fraud_signals
  )
  values (
    p_customer_id,
    auth.uid(),
    p_linked_order_id,
    p_visit_result,
    p_visit_mode,
    p_note,
    p_override_reason,
    p_captured_photo_path,
    p_started_at,
    p_completed_at,
    p_lat,
    p_lng,
    p_customer_distance_meters,
    p_within_geofence,
    coalesce(p_fraud_score, 0),
    coalesce(p_fraud_status, 'normal'),
    coalesce(p_fraud_signals, '{}'::jsonb)
  )
  returning * into v_visit;

  update public.customers
  set
    last_visit_at = v_visit.checked_in_at,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_customer_id;

  if jsonb_typeof(coalesce(p_dynamic_answers, '[]'::jsonb)) = 'array' then
    for v_answer in
      select value from jsonb_array_elements(coalesce(p_dynamic_answers, '[]'::jsonb))
    loop
      v_field_id := nullif(v_answer ->> 'field_id', '')::uuid;

      if v_field_id is not null then
        insert into public.visit_dynamic_answers (
          visit_id,
          field_id,
          answer_text,
          answer_json
        )
        values (
          v_visit.id,
          v_field_id,
          v_answer ->> 'answer_text',
          coalesce(v_answer -> 'answer_json', v_answer)
        );
      end if;
    end loop;
  end if;

  insert into public.customer_interactions (
    customer_id,
    interaction_type,
    title,
    description,
    visit_id,
    order_id,
    actor_user_id,
    metadata
  )
  values (
    p_customer_id,
    'visit',
    'Visit check-in',
    p_visit_result,
    v_visit.id,
    p_linked_order_id,
    auth.uid(),
    jsonb_build_object(
      'visit_mode', p_visit_mode,
      'within_geofence', p_within_geofence,
      'fraud_status', p_fraud_status
    )
  );

  perform public.log_audit_event(
    'record_visit_checkin',
    'visit',
    v_visit.id,
    'Visit check-in recorded',
    jsonb_build_object(
      'customer_id', p_customer_id,
      'linked_order_id', p_linked_order_id,
      'visit_result', p_visit_result,
      'visit_mode', p_visit_mode
    )
  );

  return v_visit;
end;
$function$;
