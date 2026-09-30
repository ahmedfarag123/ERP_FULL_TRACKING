CREATE OR REPLACE FUNCTION public.logistics_prevent_itemless_active_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.plan_status = 'in_progress'
    and (tg_op = 'INSERT' or old.plan_status is distinct from new.plan_status)
  then
    perform public.logistics_assert_plan_shipments_have_items(new.id);
  end if;

  return new;
end;
$function$;
