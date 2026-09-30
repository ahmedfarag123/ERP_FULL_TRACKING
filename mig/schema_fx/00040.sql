CREATE OR REPLACE FUNCTION public.build_orders_odoo_insert(p_row orders)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', nullif(btrim(coalesce(p_row.odoo_order_name, '')), ''),
    'partner_id', public.odoo_ref_id(coalesce(
      p_row.partner_id,
      p_row.raw_payload->'partner_id'->>0,
      p_row.raw_payload->>'partner_id'
    )),
    'shipping_partner_id', public.odoo_ref_id(coalesce(
      p_row.shipping_partner_id,
      p_row.raw_payload->'partner_shipping_id'->>0,
      p_row.raw_payload->>'partner_shipping_id'
    )),
    'date_order', to_char(
      coalesce(
        p_row.order_date,
        public.odoo_datetime(p_row.raw_payload->>'date_order')
      ) at time zone 'UTC',
      'YYYY-MM-DD HH24:MI:SS'
    ),
    'commitment_date', to_char(
      coalesce(
        p_row.commitment_date,
        public.odoo_datetime(p_row.raw_payload->>'commitment_date')
      ) at time zone 'UTC',
      'YYYY-MM-DD HH24:MI:SS'
    ),
    'pricelist_id', public.odoo_ref_id(coalesce(
      p_row.pricelist_id,
      p_row.raw_payload->'pricelist_id'->>0,
      p_row.raw_payload->>'pricelist_id'
    )),
    'payment_term_id', public.odoo_ref_id(coalesce(
      p_row.payment_term_id,
      p_row.raw_payload->'payment_term_id'->>0,
      p_row.raw_payload->>'payment_term_id'
    )),
    'fiscal_position_id', public.odoo_ref_id(coalesce(
      p_row.fiscal_position_id,
      p_row.raw_payload->'fiscal_position_id'->>0,
      p_row.raw_payload->>'fiscal_position_id'
    )),
    'warehouse_id', public.odoo_ref_id(coalesce(
      p_row.warehouse_id,
      p_row.raw_payload->'warehouse_id'->>0,
      p_row.raw_payload->>'warehouse_id'
    )),
    'team_id', public.odoo_ref_id(coalesce(
      p_row.team_id,
      p_row.raw_payload->'team_id'->>0,
      p_row.raw_payload->>'team_id'
    )),
    'order_line', (
      select coalesce(jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'product_id', public.odoo_ref_id(li.external_product_id),
          'name', case
            when li.external_product_id is null
              then nullif(btrim(coalesce(li.product_name, '')), '')
          end,
          'product_uom_qty', li.ordered_quantity,
          'price_unit', li.unit_price,
          'discount', li.discount_percent
        )) order by li.sort_order asc, li.created_at asc
      ), '[]'::jsonb)
      from public.order_line_items li
      where li.order_id = p_row.id
    )
  ));
$function$;
