CREATE OR REPLACE FUNCTION public.fn_audit_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_entity_id uuid;
begin
  -- Avoid inserting noisy audit rows for system-only operations
  if v_actor is null then
    if tg_op = 'DELETE' then
      return old;
    else
      return new;
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_entity_id := new.id;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_entity_id := old.id;
  else
    v_action := tg_op;
    v_entity_id := null;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_actor,
    v_action,
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'operation', tg_op,
      'changed_at', now()
    )
  );

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$function$;
