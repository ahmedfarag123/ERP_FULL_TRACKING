CREATE OR REPLACE VIEW "public"."shipment_reconciliation" AS
 SELECT ls.id AS shipment_id,
    ls.shipment_reference,
    ls.delivery_phase,
    ls.shipment_status,
    o.id AS order_id,
    o.external_order_id,
    o.status AS order_status,
    o.delivery_status AS order_delivery_status,
    o.total_amount AS order_amount,
    ls.completed_at AS shipment_completed_at,
    o.delivered_at AS order_delivered_at,
        CASE
            WHEN ls.delivery_phase = 'delivered'::text AND o.status <> 'delivered'::order_status THEN 'MISMATCH_DELIVERED_NOT_ORDER'::text
            WHEN (ls.delivery_phase = ANY (ARRAY['cancelled'::text, 'failed'::text])) AND o.status = 'delivered'::order_status THEN 'MISMATCH_CANCELLED_BUT_DELIVERED'::text
            WHEN ls.delivery_phase = 'delivered'::text AND o.status = 'delivered'::order_status THEN 'MATCH'::text
            ELSE 'IN_PROGRESS'::text
        END AS reconciliation_status
   FROM logistics_shipments ls
     LEFT JOIN orders o ON o.id = ls.linked_order_id;
