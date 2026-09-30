CREATE OR REPLACE VIEW "public"."active_drivers_view" AS
 WITH latest_location AS (
         SELECT DISTINCT ON (lt.user_id) lt.user_id,
            lt.lat AS latitude,
            lt.lng AS longitude,
            lt.accuracy_meters AS accuracy,
            lt.captured_at AS updated_at
           FROM location_tracking lt
          ORDER BY lt.user_id, lt.captured_at DESC
        ), active_shipment_counts AS (
         SELECT ls.assigned_profile_id,
            count(*)::integer AS active_shipments
           FROM logistics_shipments ls
          WHERE ls.shipment_status <> ALL (ARRAY['DELIVERED'::text, 'FINISHED'::text, 'SETTLED'::text, 'CANCELLED'::text])
          GROUP BY ls.assigned_profile_id
        )
 SELECT p.id,
    p.full_name,
    ll.latitude,
    ll.longitude,
    ll.accuracy,
    COALESCE(asc2.active_shipments, 0) AS active_shipments,
    ll.updated_at
   FROM profiles p
     JOIN latest_location ll ON ll.user_id = p.id
     LEFT JOIN active_shipment_counts asc2 ON asc2.assigned_profile_id = p.id;
