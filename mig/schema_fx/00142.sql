CREATE OR REPLACE FUNCTION public.notify_order_intent_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer_name text;
  v_sales_name text;
begin
  select customer_name into v_customer_name
  from public.customers
  where id = new.customer_id;

  select coalesce(full_name, email) into v_sales_name
  from public.profiles
  where id = new.sales_profile_id;

  perform public.create_system_notification_for_roles(
    array['admin'::public.app_role, 'manager'::public.app_role, 'supervisor'::public.app_role],
    'New order intent',
    coalesce(v_sales_name, 'A sales rep') || ' requested an order for ' || coalesce(v_customer_name, 'a customer') || '.',
    jsonb_build_object(
      'type', 'order_intent',
      'order_intent_id', new.id,
      'visit_id', new.visit_id,
      'customer_id', new.customer_id,
      'sales_profile_id', new.sales_profile_id,
      'priority', new.priority
    )
  );

  return new;
end;
$function$;
