CREATE OR REPLACE FUNCTION public.generate_invoice_from_order(p_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order record;
  v_invoice_id uuid;
  v_line record;
  v_line_total numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_delivered_qty numeric;
begin
  select * into v_order from public.orders where id = p_order_id;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.customer_id is null then
    raise exception 'Order has no customer assigned.';
  end if;

  -- Create draft invoice
  insert into public.finance_invoices
    (customer_id, order_id, issue_date, due_date, currency_code, created_by)
  values
    (v_order.customer_id, p_order_id, current_date, current_date + interval '30 days',
     coalesce(v_order.currency_code, 'EGP'), auth.uid())
  returning id into v_invoice_id;

  -- Copy order lines into invoice lines, using delivered qty when available
  for v_line in
    select oli.*
    from public.order_line_items oli
    where oli.order_id = p_order_id
    order by oli.sort_order
  loop
    -- Try to get delivered qty from logistics_shipment_items (last updated = final qty)
    select coalesce(
      (select sum(coalesce(li.done_quantity, li.approved_quantity, li.requested_quantity, 0))
       from public.logistics_shipment_items li
       join public.logistics_shipments ls on ls.id = li.shipment_id
       where ls.linked_order_id = p_order_id
         and ls.is_return_shipment = false
         and lower(trim(li.product_name)) = lower(trim(v_line.product_name))
       limit 1),
      v_line.ordered_quantity
    ) into v_delivered_qty;

    v_line_total := v_line.unit_price * v_delivered_qty * (1 - v_line.discount_percent / 100);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.finance_invoice_lines
      (invoice_id, description, quantity, unit_price, discount_pct, line_total, sort_order)
    values
      (v_invoice_id, v_line.product_name, v_delivered_qty, v_line.unit_price,
       v_line.discount_percent, v_line_total, v_line.sort_order);
  end loop;

  -- Update invoice totals (tax calculated at posting time)
  update public.finance_invoices
  set subtotal = v_subtotal, total = v_subtotal
  where id = v_invoice_id;

  return v_invoice_id;
end;
$function$;
