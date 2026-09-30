CREATE OR REPLACE VIEW "public"."logistics_user_warehouse_links" AS
 SELECT logistics_user_id,
    assigned_profile_id,
    external_user_id,
    assigned_user_name,
    assigned_job_title,
    warehouse_id,
    external_warehouse_id,
    warehouse_name,
    count(*) AS shipment_count,
    max(last_sync_at) AS last_sync_at
   FROM logistics_shipments shipment
  WHERE logistics_user_id IS NOT NULL AND warehouse_id IS NOT NULL
  GROUP BY logistics_user_id, assigned_profile_id, external_user_id, assigned_user_name, assigned_job_title, warehouse_id, external_warehouse_id, warehouse_name;
