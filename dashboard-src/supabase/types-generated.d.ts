export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      "app_download_links": {
        Row: {
      "id": string,
      "app_key": string,
      "label": string,
      "description": string | null,
      "download_url": string,
      "is_active": boolean,
      "sort_order": number,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string,
      "updated_at": string,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "app_key": string,
      "label": string,
      "description": string | null,
      "download_url": string,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "app_key": string | null,
      "label": string | null,
      "description": string | null,
      "download_url": string | null,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Relationships: []
      }
      "audit_logs": {
        Row: {
      "id": string,
      "actor_user_id": string | null,
      "actor_email": string | null,
      "actor_role": Database["public"]["Enums"]["app_role"] | null,
      "action_type": string,
      "entity_type": string,
      "entity_id": string | null,
      "description": string | null,
      "ip_address": string | null,
      "user_agent": string | null,
      "request_id": string | null,
      "metadata": Json,
      "created_at": string,
      "actor_user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "actor_user_id": string | null,
      "actor_email": string | null,
      "actor_role": Database["public"]["Enums"]["app_role"] | null,
      "action_type": string,
      "entity_type": string,
      "entity_id": string | null,
      "description": string | null,
      "ip_address": string | null,
      "user_agent": string | null,
      "request_id": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "actor_user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "actor_user_id": string | null,
      "actor_email": string | null,
      "actor_role": Database["public"]["Enums"]["app_role"] | null,
      "action_type": string | null,
      "entity_type": string | null,
      "entity_id": string | null,
      "description": string | null,
      "ip_address": string | null,
      "user_agent": string | null,
      "request_id": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "actor_user_id_full_name": string | null
      }
        Relationships: []
      }
      "calls": {
        Row: {
      "id": string,
      "customer_id": string | null,
      "user_id": string,
      "linked_order_id": string | null,
      "call_status": string | null,
      "call_reason": string | null,
      "customer_response": string | null,
      "call_outcome": string | null,
      "next_action": string | null,
      "call_notes": string | null,
      "requires_urgent_action": boolean,
      "started_at": string | null,
      "completed_at": string | null,
      "call_duration_seconds": number | null,
      "raw_form_payload": Json,
      "created_at": string,
      "updated_at": string,
      "source": string,
      "external_call_id": string | null,
      "customer_external_id": string | null,
      "user_email": string | null,
      "callback_at": string | null,
      "follow_up_sla_status": string | null,
      "raw_payload": Json,
      "contact_status": string | null,
      "contact_status_details": Json,
      "customer_disposition": string | null,
      "customer_objection": string | null,
      "objection_details": Json,
      "requested_actions": string[],
      "requested_action_details": Json,
      "service_issue_flagged": boolean,
      "service_issue_type": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "customer_id": string | null,
      "user_id": string,
      "linked_order_id": string | null,
      "call_status": string | null,
      "call_reason": string | null,
      "customer_response": string | null,
      "call_outcome": string | null,
      "next_action": string | null,
      "call_notes": string | null,
      "requires_urgent_action": boolean | null,
      "started_at": string | null,
      "completed_at": string | null,
      "call_duration_seconds": number | null,
      "raw_form_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "external_call_id": string | null,
      "customer_external_id": string | null,
      "user_email": string | null,
      "callback_at": string | null,
      "follow_up_sla_status": string | null,
      "raw_payload": Json | null,
      "contact_status": string | null,
      "contact_status_details": Json | null,
      "customer_disposition": string | null,
      "customer_objection": string | null,
      "objection_details": Json | null,
      "requested_actions": string[] | null,
      "requested_action_details": Json | null,
      "service_issue_flagged": boolean | null,
      "service_issue_type": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "customer_id": string | null,
      "user_id": string | null,
      "linked_order_id": string | null,
      "call_status": string | null,
      "call_reason": string | null,
      "customer_response": string | null,
      "call_outcome": string | null,
      "next_action": string | null,
      "call_notes": string | null,
      "requires_urgent_action": boolean | null,
      "started_at": string | null,
      "completed_at": string | null,
      "call_duration_seconds": number | null,
      "raw_form_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "external_call_id": string | null,
      "customer_external_id": string | null,
      "user_email": string | null,
      "callback_at": string | null,
      "follow_up_sla_status": string | null,
      "raw_payload": Json | null,
      "contact_status": string | null,
      "contact_status_details": Json | null,
      "customer_disposition": string | null,
      "customer_objection": string | null,
      "objection_details": Json | null,
      "requested_actions": string[] | null,
      "requested_action_details": Json | null,
      "service_issue_flagged": boolean | null,
      "service_issue_type": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "cart_items": {
        Row: {
      "id": string,
      "tenant_id": string,
      "product_id": string,
      "quantity": number,
      "customer_id": string | null,
      "session_id": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "tenant_id": string,
      "product_id": string,
      "quantity": number | null,
      "customer_id": string | null,
      "session_id": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "tenant_id": string | null,
      "product_id": string | null,
      "quantity": number | null,
      "customer_id": string | null,
      "session_id": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "categories": {
        Row: {
      "id": string,
      "name_en": string,
      "name_ar": string,
      "slug": string,
      "description_en": string | null,
      "description_ar": string | null,
      "image_url": string | null,
      "parent_id": string | null,
      "sort_order": number,
      "is_active": boolean,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "name_en": string,
      "name_ar": string,
      "slug": string,
      "description_en": string | null,
      "description_ar": string | null,
      "image_url": string | null,
      "parent_id": string | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "name_en": string | null,
      "name_ar": string | null,
      "slug": string | null,
      "description_en": string | null,
      "description_ar": string | null,
      "image_url": string | null,
      "parent_id": string | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "competitor_intel": {
        Row: {
      "id": string,
      "customer_id": string | null,
      "call_id": string | null,
      "competitor_name": string,
      "competitor_product": string | null,
      "competitor_price": number | null,
      "our_product_reference": string | null,
      "notes": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "customer_id": string | null,
      "call_id": string | null,
      "competitor_name": string,
      "competitor_product": string | null,
      "competitor_price": number | null,
      "our_product_reference": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "customer_id": string | null,
      "call_id": string | null,
      "competitor_name": string | null,
      "competitor_product": string | null,
      "competitor_price": number | null,
      "our_product_reference": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "customer_interactions": {
        Row: {
      "id": string,
      "customer_id": string,
      "interaction_type": string,
      "title": string | null,
      "description": string | null,
      "visit_id": string | null,
      "order_id": string | null,
      "quotation_id": string | null,
      "actor_user_id": string | null,
      "metadata": Json,
      "created_at": string,
      "user_uid": number | null,
      "actor_user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "customer_id": string,
      "interaction_type": string,
      "title": string | null,
      "description": string | null,
      "visit_id": string | null,
      "order_id": string | null,
      "quotation_id": string | null,
      "actor_user_id": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "user_uid": number | null,
      "actor_user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "customer_id": string | null,
      "interaction_type": string | null,
      "title": string | null,
      "description": string | null,
      "visit_id": string | null,
      "order_id": string | null,
      "quotation_id": string | null,
      "actor_user_id": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "user_uid": number | null,
      "actor_user_id_full_name": string | null
      }
        Relationships: []
      }
      "customers": {
        Row: {
      "id": string,
      "external_customer_id": string | null,
      "customer_name": string,
      "phone_number": string | null,
      "customer_email": string | null,
      "whatsapp_number": string | null,
      "governorate": string | null,
      "district": string | null,
      "place": string | null,
      "address_line": string | null,
      "customer_type": string | null,
      "status": Database["public"]["Enums"]["record_status"],
      "priority": Database["public"]["Enums"]["customer_priority"],
      "size": Database["public"]["Enums"]["customer_size"] | null,
      "product_interests": Json,
      "notes": string | null,
      "lat": number | null,
      "lng": number | null,
      "geofence_radius_meters": number,
      "assigned_user_id": string | null,
      "created_by": string | null,
      "updated_by": string | null,
      "last_visit_at": string | null,
      "created_at": string,
      "updated_at": string,
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "customer_location": string | null,
      "google_maps_url": string | null,
      "has_product_classification": boolean,
      "assigned_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "external_customer_id": string | null,
      "customer_name": string,
      "phone_number": string | null,
      "customer_email": string | null,
      "whatsapp_number": string | null,
      "governorate": string | null,
      "district": string | null,
      "place": string | null,
      "address_line": string | null,
      "customer_type": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "priority": Database["public"]["Enums"]["customer_priority"] | null,
      "size": Database["public"]["Enums"]["customer_size"] | null,
      "product_interests": Json | null,
      "notes": string | null,
      "lat": number | null,
      "lng": number | null,
      "geofence_radius_meters": number | null,
      "assigned_user_id": string | null,
      "created_by": string | null,
      "updated_by": string | null,
      "last_visit_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "customer_location": string | null,
      "google_maps_url": string | null,
      "has_product_classification": boolean | null,
      "assigned_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "external_customer_id": string | null,
      "customer_name": string | null,
      "phone_number": string | null,
      "customer_email": string | null,
      "whatsapp_number": string | null,
      "governorate": string | null,
      "district": string | null,
      "place": string | null,
      "address_line": string | null,
      "customer_type": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "priority": Database["public"]["Enums"]["customer_priority"] | null,
      "size": Database["public"]["Enums"]["customer_size"] | null,
      "product_interests": Json | null,
      "notes": string | null,
      "lat": number | null,
      "lng": number | null,
      "geofence_radius_meters": number | null,
      "assigned_user_id": string | null,
      "created_by": string | null,
      "updated_by": string | null,
      "last_visit_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "customer_location": string | null,
      "google_maps_url": string | null,
      "has_product_classification": boolean | null,
      "assigned_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Relationships: []
      }
      "department_role_assignments": {
        Row: {
      "department_id": string,
      "role": Database["public"]["Enums"]["app_role"],
      "created_by": string | null,
      "created_at": string,
      "created_by_full_name": string | null
      }
        Insert: {
      "department_id": string,
      "role": Database["public"]["Enums"]["app_role"],
      "created_by": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null
      }
        Update: {
      "department_id": string | null,
      "role": Database["public"]["Enums"]["app_role"] | null,
      "created_by": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null
      }
        Relationships: []
      }
      "departments": {
        Row: {
      "id": string,
      "slug": string,
      "name": string,
      "description": string | null,
      "cost_center": string | null,
      "manager_user_id": string | null,
      "is_active": boolean,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string,
      "updated_at": string,
      "manager_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "slug": string,
      "name": string,
      "description": string | null,
      "cost_center": string | null,
      "manager_user_id": string | null,
      "is_active": boolean | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "manager_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "slug": string | null,
      "name": string | null,
      "description": string | null,
      "cost_center": string | null,
      "manager_user_id": string | null,
      "is_active": boolean | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "manager_user_id_full_name": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Relationships: []
      }
      "dispatcher_activity_log": {
        Row: {
      "id": string,
      "action": string,
      "actor_profile_id": string | null,
      "entity_type": string,
      "entity_id": string,
      "entity_number": string | null,
      "product_name": string | null,
      "details": Json | null,
      "created_at": string,
      "actor_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "action": string,
      "actor_profile_id": string | null,
      "entity_type": string | null,
      "entity_id": string,
      "entity_number": string | null,
      "product_name": string | null,
      "details": Json | null,
      "created_at": string | null,
      "actor_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "action": string | null,
      "actor_profile_id": string | null,
      "entity_type": string | null,
      "entity_id": string | null,
      "entity_number": string | null,
      "product_name": string | null,
      "details": Json | null,
      "created_at": string | null,
      "actor_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "dispatcher_order_item_preparations": {
        Row: {
      "id": string,
      "preparation_id": string,
      "order_id": string,
      "order_line_item_id": string,
      "product_id": string | null,
      "dataset_id": string | null,
      "requested_quantity": number,
      "approved_quantity": number,
      "status": string,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string,
      "updated_at": string,
      "confirmed_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "preparation_id": string,
      "order_id": string,
      "order_line_item_id": string,
      "product_id": string | null,
      "dataset_id": string | null,
      "requested_quantity": number | null,
      "approved_quantity": number | null,
      "status": string | null,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "confirmed_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "preparation_id": string | null,
      "order_id": string | null,
      "order_line_item_id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "requested_quantity": number | null,
      "approved_quantity": number | null,
      "status": string | null,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "confirmed_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "dispatcher_order_preparations": {
        Row: {
      "id": string,
      "order_id": string,
      "status": string,
      "started_at": string,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "photos": Json,
      "created_at": string,
      "updated_at": string,
      "dispatcher_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "photos": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "dispatcher_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "photos": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "dispatcher_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "dispatcher_plan_item_preparations": {
        Row: {
      "id": string,
      "plan_preparation_id": string,
      "plan_id": string,
      "product_name": string,
      "product_ref": string | null,
      "product_code": string | null,
      "external_product_id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "total_requested_quantity": number,
      "approved_quantity": number,
      "status": string,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string,
      "updated_at": string,
      "confirmed_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "plan_preparation_id": string,
      "plan_id": string,
      "product_name": string,
      "product_ref": string | null,
      "product_code": string | null,
      "external_product_id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "total_requested_quantity": number | null,
      "approved_quantity": number | null,
      "status": string | null,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "confirmed_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "plan_preparation_id": string | null,
      "plan_id": string | null,
      "product_name": string | null,
      "product_ref": string | null,
      "product_code": string | null,
      "external_product_id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "total_requested_quantity": number | null,
      "approved_quantity": number | null,
      "status": string | null,
      "shortage_reason": string | null,
      "note": string | null,
      "barcode": string | null,
      "barcode_validated_at": string | null,
      "confirmed_at": string | null,
      "confirmed_by_profile_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "confirmed_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "dispatcher_plan_preparations": {
        Row: {
      "id": string,
      "plan_id": string,
      "status": string,
      "started_at": string,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "created_at": string,
      "updated_at": string,
      "dispatcher_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "plan_id": string,
      "status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "dispatcher_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "plan_id": string | null,
      "status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "duration_seconds": number | null,
      "dispatcher_profile_id": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "dispatcher_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "driver_cash_balance": {
        Row: {
      "id": string,
      "driver_id": string,
      "route_plan_id": string,
      "cash_amount": number,
      "currency_code": string,
      "status": string,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "settled_by": string | null,
      "settled_at": string | null,
      "created_at": string,
      "updated_at": string,
      "driver_id_full_name": string | null,
      "settled_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "driver_id": string,
      "route_plan_id": string,
      "cash_amount": number | null,
      "currency_code": string | null,
      "status": string | null,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "settled_by": string | null,
      "settled_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_id_full_name": string | null,
      "settled_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "driver_id": string | null,
      "route_plan_id": string | null,
      "cash_amount": number | null,
      "currency_code": string | null,
      "status": string | null,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "settled_by": string | null,
      "settled_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_id_full_name": string | null,
      "settled_by_full_name": string | null
      }
        Relationships: []
      }
      "driver_plan_collection_checks": {
        Row: {
      "id": string,
      "shipment_id": string,
      "driver_profile_id": string,
      "plan_id": string,
      "check_status": string,
      "payment_method": string | null,
      "reason": string | null,
      "driver_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "review_status": string,
      "admin_notes": string | null,
      "reviewed_at": string | null,
      "created_at": string,
      "updated_at": string,
      "proof_photo_url": string | null,
      "sales_rep_id": string | null,
      "sales_rep_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "driver_profile_id": string,
      "plan_id": string,
      "check_status": string,
      "payment_method": string | null,
      "reason": string | null,
      "driver_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "review_status": string | null,
      "admin_notes": string | null,
      "reviewed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "proof_photo_url": string | null,
      "sales_rep_id": string | null,
      "sales_rep_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "driver_profile_id": string | null,
      "plan_id": string | null,
      "check_status": string | null,
      "payment_method": string | null,
      "reason": string | null,
      "driver_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "review_status": string | null,
      "admin_notes": string | null,
      "reviewed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "proof_photo_url": string | null,
      "sales_rep_id": string | null,
      "sales_rep_id_full_name": string | null
      }
        Relationships: []
      }
      "driver_plan_settlement_requests": {
        Row: {
      "id": string,
      "driver_profile_id": string,
      "plan_id": string,
      "total_debt_amount": number,
      "currency_code": string,
      "proof_photo_url": string | null,
      "status": string,
      "driver_notes": string | null,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "paid_at": string | null,
      "created_at": string,
      "updated_at": string,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "driver_profile_id": string,
      "plan_id": string,
      "total_debt_amount": number | null,
      "currency_code": string | null,
      "proof_photo_url": string | null,
      "status": string | null,
      "driver_notes": string | null,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "paid_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "driver_profile_id": string | null,
      "plan_id": string | null,
      "total_debt_amount": number | null,
      "currency_code": string | null,
      "proof_photo_url": string | null,
      "status": string | null,
      "driver_notes": string | null,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "paid_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "dynamic_form_field_options": {
        Row: {
      "id": string,
      "field_id": string,
      "value_key": string,
      "label_en": string,
      "label_ar": string,
      "display_order": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "field_id": string,
      "value_key": string,
      "label_en": string,
      "label_ar": string,
      "display_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "field_id": string | null,
      "value_key": string | null,
      "label_en": string | null,
      "label_ar": string | null,
      "display_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "dynamic_form_fields": {
        Row: {
      "id": string,
      "form_context": string,
      "field_key": string,
      "label_en": string,
      "label_ar": string,
      "field_type": Database["public"]["Enums"]["dynamic_field_type"],
      "placeholder_en": string | null,
      "placeholder_ar": string | null,
      "help_text_en": string | null,
      "help_text_ar": string | null,
      "is_required": boolean,
      "is_active": boolean,
      "display_order": number,
      "validation_rules": Json,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string,
      "updated_at": string,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "form_context": string,
      "field_key": string,
      "label_en": string,
      "label_ar": string,
      "field_type": Database["public"]["Enums"]["dynamic_field_type"],
      "placeholder_en": string | null,
      "placeholder_ar": string | null,
      "help_text_en": string | null,
      "help_text_ar": string | null,
      "is_required": boolean | null,
      "is_active": boolean | null,
      "display_order": number | null,
      "validation_rules": Json | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "form_context": string | null,
      "field_key": string | null,
      "label_en": string | null,
      "label_ar": string | null,
      "field_type": Database["public"]["Enums"]["dynamic_field_type"] | null,
      "placeholder_en": string | null,
      "placeholder_ar": string | null,
      "help_text_en": string | null,
      "help_text_ar": string | null,
      "is_required": boolean | null,
      "is_active": boolean | null,
      "display_order": number | null,
      "validation_rules": Json | null,
      "created_by": string | null,
      "updated_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "updated_by_full_name": string | null
      }
        Relationships: []
      }
      "finance_accounts": {
        Row: {
      "id": string,
      "code": string,
      "name": string,
      "name_ar": string | null,
      "type": string,
      "parent_id": string | null,
      "is_active": boolean,
      "allow_posting": boolean,
      "sort_order": number,
      "created_at": string,
      "created_by": string | null
      }
        Insert: {
      "id": string | null,
      "code": string,
      "name": string,
      "name_ar": string | null,
      "type": string,
      "parent_id": string | null,
      "is_active": boolean | null,
      "allow_posting": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "created_by": string | null
      }
        Update: {
      "id": string | null,
      "code": string | null,
      "name": string | null,
      "name_ar": string | null,
      "type": string | null,
      "parent_id": string | null,
      "is_active": boolean | null,
      "allow_posting": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "created_by": string | null
      }
        Relationships: []
      }
      "finance_cost_centers": {
        Row: {
      "id": string,
      "code": string,
      "name": string,
      "name_ar": string | null,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "code": string,
      "name": string,
      "name_ar": string | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "code": string | null,
      "name": string | null,
      "name_ar": string | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_credit_note_lines": {
        Row: {
      "id": string,
      "credit_note_id": string,
      "product_id": string | null,
      "description": string,
      "quantity": number,
      "unit_price": number,
      "discount_percent": number,
      "tax_rate_id": string | null,
      "tax_amount": number,
      "line_total": number,
      "sort_order": number,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "credit_note_id": string,
      "product_id": string | null,
      "description": string,
      "quantity": number | null,
      "unit_price": number | null,
      "discount_percent": number | null,
      "tax_rate_id": string | null,
      "tax_amount": number | null,
      "line_total": number | null,
      "sort_order": number | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "credit_note_id": string | null,
      "product_id": string | null,
      "description": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "discount_percent": number | null,
      "tax_rate_id": string | null,
      "tax_amount": number | null,
      "line_total": number | null,
      "sort_order": number | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_credit_notes": {
        Row: {
      "id": string,
      "credit_note_number": string,
      "customer_id": string,
      "original_invoice_id": string | null,
      "credit_note_date": string,
      "due_date": string | null,
      "journal_id": string,
      "currency_code": string,
      "subtotal": number,
      "discount_total": number,
      "tax_total": number,
      "total": number,
      "status": string,
      "posted_at": string | null,
      "voided_at": string | null,
      "posted_by": string | null,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "credit_note_number": string,
      "customer_id": string,
      "original_invoice_id": string | null,
      "credit_note_date": string | null,
      "due_date": string | null,
      "journal_id": string,
      "currency_code": string | null,
      "subtotal": number | null,
      "discount_total": number | null,
      "tax_total": number | null,
      "total": number | null,
      "status": string | null,
      "posted_at": string | null,
      "voided_at": string | null,
      "posted_by": string | null,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "credit_note_number": string | null,
      "customer_id": string | null,
      "original_invoice_id": string | null,
      "credit_note_date": string | null,
      "due_date": string | null,
      "journal_id": string | null,
      "currency_code": string | null,
      "subtotal": number | null,
      "discount_total": number | null,
      "tax_total": number | null,
      "total": number | null,
      "status": string | null,
      "posted_at": string | null,
      "voided_at": string | null,
      "posted_by": string | null,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "finance_document_sequences": {
        Row: {
      "document_type": string,
      "prefix": string,
      "current_number": number,
      "year_reset": boolean
      }
        Insert: {
      "document_type": string,
      "prefix": string,
      "current_number": number | null,
      "year_reset": boolean | null
      }
        Update: {
      "document_type": string | null,
      "prefix": string | null,
      "current_number": number | null,
      "year_reset": boolean | null
      }
        Relationships: []
      }
      "finance_driver_settlements": {
        Row: {
      "id": string,
      "driver_id": string,
      "period_start": string,
      "period_end": string,
      "commission_amount": number,
      "fuel_allowance": number,
      "bonuses": number,
      "penalties": number,
      "cash_collected": number,
      "cash_remitted": number,
      "status": string,
      "journal_entry_id": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "notes": string | null,
      "created_by": string | null,
      "created_at": string,
      "updated_at": string,
      "net_payable": number | null
      }
        Insert: {
      "id": string | null,
      "driver_id": string,
      "period_start": string,
      "period_end": string,
      "commission_amount": number | null,
      "fuel_allowance": number | null,
      "bonuses": number | null,
      "penalties": number | null,
      "cash_collected": number | null,
      "cash_remitted": number | null,
      "status": string | null,
      "journal_entry_id": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "notes": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "net_payable": number | null
      }
        Update: {
      "id": string | null,
      "driver_id": string | null,
      "period_start": string | null,
      "period_end": string | null,
      "commission_amount": number | null,
      "fuel_allowance": number | null,
      "bonuses": number | null,
      "penalties": number | null,
      "cash_collected": number | null,
      "cash_remitted": number | null,
      "status": string | null,
      "journal_entry_id": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "notes": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "net_payable": number | null
      }
        Relationships: []
      }
      "finance_fiscal_periods": {
        Row: {
      "id": string,
      "name": string,
      "start_date": string,
      "end_date": string,
      "status": string,
      "closed_at": string | null,
      "closed_by": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "start_date": string,
      "end_date": string,
      "status": string | null,
      "closed_at": string | null,
      "closed_by": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "status": string | null,
      "closed_at": string | null,
      "closed_by": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_invoice_lines": {
        Row: {
      "id": string,
      "invoice_id": string,
      "product_id": string | null,
      "description": string,
      "quantity": number,
      "unit_price": number,
      "discount_pct": number,
      "tax_rate_id": string | null,
      "line_total": number,
      "sort_order": number,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "invoice_id": string,
      "product_id": string | null,
      "description": string,
      "quantity": number | null,
      "unit_price": number | null,
      "discount_pct": number | null,
      "tax_rate_id": string | null,
      "line_total": number | null,
      "sort_order": number | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "invoice_id": string | null,
      "product_id": string | null,
      "description": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "discount_pct": number | null,
      "tax_rate_id": string | null,
      "line_total": number | null,
      "sort_order": number | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_invoices": {
        Row: {
      "id": string,
      "invoice_number": string | null,
      "customer_id": string,
      "order_id": string | null,
      "status": string,
      "issue_date": string,
      "due_date": string | null,
      "currency_code": string,
      "subtotal": number,
      "tax_total": number,
      "discount_total": number,
      "total": number,
      "notes": string | null,
      "journal_entry_id": string | null,
      "created_by": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "invoice_number": string | null,
      "customer_id": string,
      "order_id": string | null,
      "status": string | null,
      "issue_date": string | null,
      "due_date": string | null,
      "currency_code": string | null,
      "subtotal": number | null,
      "tax_total": number | null,
      "discount_total": number | null,
      "total": number | null,
      "notes": string | null,
      "journal_entry_id": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "invoice_number": string | null,
      "customer_id": string | null,
      "order_id": string | null,
      "status": string | null,
      "issue_date": string | null,
      "due_date": string | null,
      "currency_code": string | null,
      "subtotal": number | null,
      "tax_total": number | null,
      "discount_total": number | null,
      "total": number | null,
      "notes": string | null,
      "journal_entry_id": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "finance_journal_entries": {
        Row: {
      "id": string,
      "entry_number": string,
      "fiscal_period_id": string,
      "entry_date": string,
      "source_type": string,
      "source_id": string | null,
      "description": string | null,
      "status": string,
      "reversed_by_entry_id": string | null,
      "posted_at": string,
      "posted_by": string,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "entry_number": string,
      "fiscal_period_id": string,
      "entry_date": string,
      "source_type": string,
      "source_id": string | null,
      "description": string | null,
      "status": string | null,
      "reversed_by_entry_id": string | null,
      "posted_at": string | null,
      "posted_by": string,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "entry_number": string | null,
      "fiscal_period_id": string | null,
      "entry_date": string | null,
      "source_type": string | null,
      "source_id": string | null,
      "description": string | null,
      "status": string | null,
      "reversed_by_entry_id": string | null,
      "posted_at": string | null,
      "posted_by": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_journal_lines": {
        Row: {
      "id": string,
      "journal_entry_id": string,
      "account_id": string,
      "cost_center_id": string | null,
      "customer_id": string | null,
      "debit": number,
      "credit": number,
      "currency_code": string,
      "description": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "journal_entry_id": string,
      "account_id": string,
      "cost_center_id": string | null,
      "customer_id": string | null,
      "debit": number | null,
      "credit": number | null,
      "currency_code": string | null,
      "description": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "journal_entry_id": string | null,
      "account_id": string | null,
      "cost_center_id": string | null,
      "customer_id": string | null,
      "debit": number | null,
      "credit": number | null,
      "currency_code": string | null,
      "description": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_journals": {
        Row: {
      "id": string,
      "name": string,
      "code": string,
      "type": string,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "code": string,
      "type": string | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "code": string | null,
      "type": string | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "finance_page_visibility": {
        Row: {
      "page_key": string,
      "enabled": boolean,
      "updated_at": string,
      "updated_by": string | null
      }
        Insert: {
      "page_key": string,
      "enabled": boolean | null,
      "updated_at": string | null,
      "updated_by": string | null
      }
        Update: {
      "page_key": string | null,
      "enabled": boolean | null,
      "updated_at": string | null,
      "updated_by": string | null
      }
        Relationships: []
      }
      "finance_payments": {
        Row: {
      "id": string,
      "payment_number": string,
      "customer_id": string | null,
      "invoice_id": string | null,
      "order_id": string | null,
      "payment_method": string,
      "payment_date": string,
      "amount": number,
      "currency_code": string,
      "reference_number": string | null,
      "bank_name": string | null,
      "cheque_number": string | null,
      "notes": string | null,
      "status": string,
      "journal_entry_id": string | null,
      "confirmed_by": string | null,
      "confirmed_at": string | null,
      "reconciled_by": string | null,
      "reconciled_at": string | null,
      "created_by": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "payment_number": string,
      "customer_id": string | null,
      "invoice_id": string | null,
      "order_id": string | null,
      "payment_method": string,
      "payment_date": string | null,
      "amount": number,
      "currency_code": string | null,
      "reference_number": string | null,
      "bank_name": string | null,
      "cheque_number": string | null,
      "notes": string | null,
      "status": string | null,
      "journal_entry_id": string | null,
      "confirmed_by": string | null,
      "confirmed_at": string | null,
      "reconciled_by": string | null,
      "reconciled_at": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "payment_number": string | null,
      "customer_id": string | null,
      "invoice_id": string | null,
      "order_id": string | null,
      "payment_method": string | null,
      "payment_date": string | null,
      "amount": number | null,
      "currency_code": string | null,
      "reference_number": string | null,
      "bank_name": string | null,
      "cheque_number": string | null,
      "notes": string | null,
      "status": string | null,
      "journal_entry_id": string | null,
      "confirmed_by": string | null,
      "confirmed_at": string | null,
      "reconciled_by": string | null,
      "reconciled_at": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "finance_tax_rates": {
        Row: {
      "id": string,
      "name": string,
      "rate": number,
      "account_id": string,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "rate": number | null,
      "account_id": string,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "rate": number | null,
      "account_id": string | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "kpi_manual_upload_batches": {
        Row: {
      "id": string,
      "department_slug": string,
      "period_start": string,
      "period_end": string,
      "file_name": string | null,
      "row_count": number,
      "status": string,
      "error_summary": string | null,
      "uploaded_by": string | null,
      "uploaded_at": string,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "department_slug": string,
      "period_start": string,
      "period_end": string,
      "file_name": string | null,
      "row_count": number | null,
      "status": string | null,
      "error_summary": string | null,
      "uploaded_by": string | null,
      "uploaded_at": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "department_slug": string | null,
      "period_start": string | null,
      "period_end": string | null,
      "file_name": string | null,
      "row_count": number | null,
      "status": string | null,
      "error_summary": string | null,
      "uploaded_by": string | null,
      "uploaded_at": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "kpi_manual_values": {
        Row: {
      "id": string,
      "batch_id": string,
      "department_slug": string,
      "kpi_code": string,
      "period_start": string,
      "period_end": string,
      "actual_value": number,
      "target_value": number | null,
      "notes": string | null,
      "source_label": string,
      "uploaded_by": string | null,
      "uploaded_at": string,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "batch_id": string,
      "department_slug": string,
      "kpi_code": string,
      "period_start": string,
      "period_end": string,
      "actual_value": number,
      "target_value": number | null,
      "notes": string | null,
      "source_label": string | null,
      "uploaded_by": string | null,
      "uploaded_at": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "batch_id": string | null,
      "department_slug": string | null,
      "kpi_code": string | null,
      "period_start": string | null,
      "period_end": string | null,
      "actual_value": number | null,
      "target_value": number | null,
      "notes": string | null,
      "source_label": string | null,
      "uploaded_by": string | null,
      "uploaded_at": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "last_rows_report": {
        Row: {
      "table_name": string,
      "last_row": Json | null,
      "last_created_at": string | null
      }
        Insert: {
      "table_name": string,
      "last_row": Json | null,
      "last_created_at": string | null
      }
        Update: {
      "table_name": string | null,
      "last_row": Json | null,
      "last_created_at": string | null
      }
        Relationships: []
      }
      "location_tracking": {
        Row: {
      "id": string,
      "user_id": string,
      "captured_at": string,
      "lat": number,
      "lng": number,
      "accuracy_meters": number | null,
      "altitude_meters": number | null,
      "heading_degrees": number | null,
      "speed_mps": number | null,
      "battery_level": number | null,
      "is_mocked": boolean,
      "metadata": Json,
      "created_at": string,
      "plan_id": string | null,
      "shipment_id": string | null,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "user_id": string,
      "captured_at": string | null,
      "lat": number,
      "lng": number,
      "accuracy_meters": number | null,
      "altitude_meters": number | null,
      "heading_degrees": number | null,
      "speed_mps": number | null,
      "battery_level": number | null,
      "is_mocked": boolean | null,
      "metadata": Json | null,
      "created_at": string | null,
      "plan_id": string | null,
      "shipment_id": string | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "user_id": string | null,
      "captured_at": string | null,
      "lat": number | null,
      "lng": number | null,
      "accuracy_meters": number | null,
      "altitude_meters": number | null,
      "heading_degrees": number | null,
      "speed_mps": number | null,
      "battery_level": number | null,
      "is_mocked": boolean | null,
      "metadata": Json | null,
      "created_at": string | null,
      "plan_id": string | null,
      "shipment_id": string | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_collection_handovers": {
        Row: {
      "id": string,
      "driver_profile_id": string,
      "plan_id": string | null,
      "handed_to_manager": boolean,
      "reason": string | null,
      "total_amount": number,
      "currency_code": string,
      "metadata": Json,
      "created_at": string,
      "driver_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "driver_profile_id": string,
      "plan_id": string | null,
      "handed_to_manager": boolean,
      "reason": string | null,
      "total_amount": number | null,
      "currency_code": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "driver_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "driver_profile_id": string | null,
      "plan_id": string | null,
      "handed_to_manager": boolean | null,
      "reason": string | null,
      "total_amount": number | null,
      "currency_code": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "driver_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_collection_requests": {
        Row: {
      "id": string,
      "driver_profile_id": string,
      "plan_id": string | null,
      "collected_amount": number,
      "currency_code": string,
      "proof_photo_url": string | null,
      "driver_notes": string | null,
      "status": string,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "created_at": string,
      "updated_at": string,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "driver_profile_id": string,
      "plan_id": string | null,
      "collected_amount": number | null,
      "currency_code": string | null,
      "proof_photo_url": string | null,
      "driver_notes": string | null,
      "status": string | null,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "driver_profile_id": string | null,
      "plan_id": string | null,
      "collected_amount": number | null,
      "currency_code": string | null,
      "proof_photo_url": string | null,
      "driver_notes": string | null,
      "status": string | null,
      "admin_notes": string | null,
      "reviewed_by_profile_id": string | null,
      "reviewed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_profile_id_full_name": string | null,
      "reviewed_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_delivery_plans": {
        Row: {
      "id": string,
      "plan_reference": string,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "planned_date": string,
      "plan_status": string,
      "created_by_profile_id": string | null,
      "created_at": string,
      "started_at": string | null,
      "finished_at": string | null,
      "updated_at": string,
      "notes": string | null,
      "dispatched_at": string | null,
      "cancelled_at": string | null,
      "route_optimized_at": string | null,
      "route_total_distance_km": number | null,
      "route_metadata": Json,
      "district": string | null,
      "return_of_plan_id": string | null,
      "assigned_profile_id_full_name": string | null,
      "created_by_profile_id_full_name": string | null,
      "not_executed_reason": string | null
      }
        Insert: {
      "id": string | null,
      "plan_reference": string | null,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "planned_date": string,
      "plan_status": string | null,
      "created_by_profile_id": string | null,
      "created_at": string | null,
      "started_at": string | null,
      "finished_at": string | null,
      "updated_at": string | null,
      "notes": string | null,
      "dispatched_at": string | null,
      "cancelled_at": string | null,
      "route_optimized_at": string | null,
      "route_total_distance_km": number | null,
      "route_metadata": Json | null,
      "district": string | null,
      "return_of_plan_id": string | null,
      "assigned_profile_id_full_name": string | null,
      "created_by_profile_id_full_name": string | null,
      "not_executed_reason": string | null
      }
        Update: {
      "id": string | null,
      "plan_reference": string | null,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "planned_date": string | null,
      "plan_status": string | null,
      "created_by_profile_id": string | null,
      "created_at": string | null,
      "started_at": string | null,
      "finished_at": string | null,
      "updated_at": string | null,
      "notes": string | null,
      "dispatched_at": string | null,
      "cancelled_at": string | null,
      "route_optimized_at": string | null,
      "route_total_distance_km": number | null,
      "route_metadata": Json | null,
      "district": string | null,
      "return_of_plan_id": string | null,
      "assigned_profile_id_full_name": string | null,
      "created_by_profile_id_full_name": string | null,
      "not_executed_reason": string | null
      }
        Relationships: []
      }
      "logistics_departments": {
        Row: {
      "id": string,
      "external_department_id": string | null,
      "department_name": string,
      "complete_name": string | null,
      "parent_department_ref": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "company_name": string | null,
      "status": Database["public"]["Enums"]["record_status"],
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "external_department_id": string | null,
      "department_name": string,
      "complete_name": string | null,
      "parent_department_ref": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "company_name": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "external_department_id": string | null,
      "department_name": string | null,
      "complete_name": string | null,
      "parent_department_ref": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "company_name": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "logistics_driver_alerts": {
        Row: {
      "id": string,
      "driver_profile_id": string,
      "shipment_id": string | null,
      "plan_id": string | null,
      "alert_type": string,
      "message": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "status": string,
      "acknowledged_by_profile_id": string | null,
      "acknowledged_at": string | null,
      "resolved_by_profile_id": string | null,
      "resolved_at": string | null,
      "metadata": Json,
      "created_at": string,
      "updated_at": string,
      "acknowledged_by_profile_id_full_name": string | null,
      "resolved_by_profile_id_full_name": string | null,
      "driver_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "driver_profile_id": string,
      "shipment_id": string | null,
      "plan_id": string | null,
      "alert_type": string | null,
      "message": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "status": string | null,
      "acknowledged_by_profile_id": string | null,
      "acknowledged_at": string | null,
      "resolved_by_profile_id": string | null,
      "resolved_at": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "acknowledged_by_profile_id_full_name": string | null,
      "resolved_by_profile_id_full_name": string | null,
      "driver_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "driver_profile_id": string | null,
      "shipment_id": string | null,
      "plan_id": string | null,
      "alert_type": string | null,
      "message": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "status": string | null,
      "acknowledged_by_profile_id": string | null,
      "acknowledged_at": string | null,
      "resolved_by_profile_id": string | null,
      "resolved_at": string | null,
      "metadata": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "acknowledged_by_profile_id_full_name": string | null,
      "resolved_by_profile_id_full_name": string | null,
      "driver_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_order_collections": {
        Row: {
      "id": string,
      "shipment_id": string,
      "order_id": string,
      "order_number": string | null,
      "order_total": number,
      "payment_method": string,
      "collected_amount": number,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "collection_status": string,
      "driver_notes": string | null,
      "collected_at": string | null,
      "confirmed_by_profile_id": string | null,
      "confirmed_at": string | null,
      "created_at": string,
      "updated_at": string,
      "sales_rep_id": string | null,
      "driver_debt_amount": number,
      "accounting_status": string,
      "sales_rep_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "order_id": string,
      "order_number": string | null,
      "order_total": number | null,
      "payment_method": string | null,
      "collected_amount": number | null,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "collection_status": string | null,
      "driver_notes": string | null,
      "collected_at": string | null,
      "confirmed_by_profile_id": string | null,
      "confirmed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "sales_rep_id": string | null,
      "driver_debt_amount": number | null,
      "accounting_status": string | null,
      "sales_rep_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "order_id": string | null,
      "order_number": string | null,
      "order_total": number | null,
      "payment_method": string | null,
      "collected_amount": number | null,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "collection_status": string | null,
      "driver_notes": string | null,
      "collected_at": string | null,
      "confirmed_by_profile_id": string | null,
      "confirmed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "sales_rep_id": string | null,
      "driver_debt_amount": number | null,
      "accounting_status": string | null,
      "sales_rep_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_return_shipment_items": {
        Row: {
      "id": string,
      "return_shipment_id": string,
      "parent_shipment_id": string,
      "parent_item_id": string,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_ref": string | null,
      "product_name": string | null,
      "requested_quantity": number | null,
      "approved_quantity": number | null,
      "delivered_quantity": number | null,
      "returned_quantity": number,
      "received_quantity": number,
      "return_reason": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Insert: {
      "id": string | null,
      "return_shipment_id": string,
      "parent_shipment_id": string,
      "parent_item_id": string,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_ref": string | null,
      "product_name": string | null,
      "requested_quantity": number | null,
      "approved_quantity": number | null,
      "delivered_quantity": number | null,
      "returned_quantity": number,
      "received_quantity": number | null,
      "return_reason": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "return_shipment_id": string | null,
      "parent_shipment_id": string | null,
      "parent_item_id": string | null,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_ref": string | null,
      "product_name": string | null,
      "requested_quantity": number | null,
      "approved_quantity": number | null,
      "delivered_quantity": number | null,
      "returned_quantity": number | null,
      "received_quantity": number | null,
      "return_reason": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "logistics_route_settlements": {
        Row: {
      "id": string,
      "plan_id": string,
      "driver_id": string,
      "settlement_method": string,
      "total_cash_amount": number,
      "currency_code": string,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "status": string,
      "approved_by": string | null,
      "approved_at": string | null,
      "created_at": string,
      "updated_at": string,
      "driver_id_full_name": string | null,
      "approved_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "plan_id": string,
      "driver_id": string,
      "settlement_method": string,
      "total_cash_amount": number | null,
      "currency_code": string | null,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "status": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_id_full_name": string | null,
      "approved_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "plan_id": string | null,
      "driver_id": string | null,
      "settlement_method": string | null,
      "total_cash_amount": number | null,
      "currency_code": string | null,
      "receipt_image_url": string | null,
      "driver_notes": string | null,
      "finance_notes": string | null,
      "status": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "driver_id_full_name": string | null,
      "approved_by_full_name": string | null
      }
        Relationships: []
      }
      "logistics_route_tracking": {
        Row: {
      "id": string,
      "plan_id": string,
      "driver_profile_id": string,
      "planned_route": Json,
      "actual_route": Json,
      "planned_distance_km": number | null,
      "actual_distance_km": number | null,
      "planned_duration_minutes": number | null,
      "actual_duration_minutes": number | null,
      "planned_stop_count": number | null,
      "actual_stop_count": number | null,
      "vehicle_type": string | null,
      "avg_speed_kmh": number | null,
      "tracking_status": string,
      "started_at": string,
      "completed_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "plan_id": string,
      "driver_profile_id": string,
      "planned_route": Json | null,
      "actual_route": Json | null,
      "planned_distance_km": number | null,
      "actual_distance_km": number | null,
      "planned_duration_minutes": number | null,
      "actual_duration_minutes": number | null,
      "planned_stop_count": number | null,
      "actual_stop_count": number | null,
      "vehicle_type": string | null,
      "avg_speed_kmh": number | null,
      "tracking_status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "plan_id": string | null,
      "driver_profile_id": string | null,
      "planned_route": Json | null,
      "actual_route": Json | null,
      "planned_distance_km": number | null,
      "actual_distance_km": number | null,
      "planned_duration_minutes": number | null,
      "actual_duration_minutes": number | null,
      "planned_stop_count": number | null,
      "actual_stop_count": number | null,
      "vehicle_type": string | null,
      "avg_speed_kmh": number | null,
      "tracking_status": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "logistics_shipment_collections": {
        Row: {
      "id": string,
      "shipment_id": string,
      "pending_delivery_amount": number,
      "collected_from_customer": number,
      "collected_successfully_amount": number,
      "currency_code": string,
      "collection_status": string,
      "collected_by_logistics_user_id": string | null,
      "collected_by_profile_id": string | null,
      "admin_confirmed_by_profile_id": string | null,
      "collected_from_customer_at": string | null,
      "admin_confirmed_at": string | null,
      "updated_at": string,
      "payment_method": string | null,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "driver_notes": string | null,
      "payment_collected_at": string | null,
      "sales_rep_id": string | null,
      "driver_debt_amount": number,
      "accounting_status": string,
      "collected_by_profile_id_full_name": string | null,
      "admin_confirmed_by_profile_id_full_name": string | null,
      "sales_rep_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "pending_delivery_amount": number | null,
      "collected_from_customer": number | null,
      "collected_successfully_amount": number | null,
      "currency_code": string | null,
      "collection_status": string | null,
      "collected_by_logistics_user_id": string | null,
      "collected_by_profile_id": string | null,
      "admin_confirmed_by_profile_id": string | null,
      "collected_from_customer_at": string | null,
      "admin_confirmed_at": string | null,
      "updated_at": string | null,
      "payment_method": string | null,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "driver_notes": string | null,
      "payment_collected_at": string | null,
      "sales_rep_id": string | null,
      "driver_debt_amount": number | null,
      "accounting_status": string | null,
      "collected_by_profile_id_full_name": string | null,
      "admin_confirmed_by_profile_id_full_name": string | null,
      "sales_rep_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "pending_delivery_amount": number | null,
      "collected_from_customer": number | null,
      "collected_successfully_amount": number | null,
      "currency_code": string | null,
      "collection_status": string | null,
      "collected_by_logistics_user_id": string | null,
      "collected_by_profile_id": string | null,
      "admin_confirmed_by_profile_id": string | null,
      "collected_from_customer_at": string | null,
      "admin_confirmed_at": string | null,
      "updated_at": string | null,
      "payment_method": string | null,
      "transfer_responsible_name": string | null,
      "cheque_reference": string | null,
      "installment_count": number | null,
      "driver_notes": string | null,
      "payment_collected_at": string | null,
      "sales_rep_id": string | null,
      "driver_debt_amount": number | null,
      "accounting_status": string | null,
      "collected_by_profile_id_full_name": string | null,
      "admin_confirmed_by_profile_id_full_name": string | null,
      "sales_rep_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_shipment_events": {
        Row: {
      "id": string,
      "shipment_id": string,
      "actor_profile_id": string,
      "previous_phase": string | null,
      "next_phase": string,
      "note": string | null,
      "proof_photo_path": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "payload": Json,
      "created_at": string,
      "actor_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "actor_profile_id": string,
      "previous_phase": string | null,
      "next_phase": string,
      "note": string | null,
      "proof_photo_path": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "payload": Json | null,
      "created_at": string | null,
      "actor_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "actor_profile_id": string | null,
      "previous_phase": string | null,
      "next_phase": string | null,
      "note": string | null,
      "proof_photo_path": string | null,
      "location_lat": number | null,
      "location_lng": number | null,
      "payload": Json | null,
      "created_at": string | null,
      "actor_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_shipment_items": {
        Row: {
      "id": string,
      "shipment_id": string,
      "external_move_id": string | null,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_name": string,
      "product_ref": string | null,
      "requested_quantity": number,
      "done_quantity": number,
      "reserved_quantity": number,
      "forecast_quantity": number,
      "move_state": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string,
      "approved_quantity": number | null,
      "returned_quantity": number
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "external_move_id": string | null,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_name": string,
      "product_ref": string | null,
      "requested_quantity": number | null,
      "done_quantity": number | null,
      "reserved_quantity": number | null,
      "forecast_quantity": number | null,
      "move_state": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "approved_quantity": number | null,
      "returned_quantity": number | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "external_move_id": string | null,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_name": string | null,
      "product_ref": string | null,
      "requested_quantity": number | null,
      "done_quantity": number | null,
      "reserved_quantity": number | null,
      "forecast_quantity": number | null,
      "move_state": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "approved_quantity": number | null,
      "returned_quantity": number | null
      }
        Relationships: []
      }
      "logistics_shipment_status_history": {
        Row: {
      "id": string,
      "shipment_id": string,
      "old_status": string | null,
      "new_status": string,
      "changed_by_profile_id": string | null,
      "changed_by_role": string | null,
      "changed_at": string,
      "note": string | null,
      "changed_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "shipment_id": string,
      "old_status": string | null,
      "new_status": string,
      "changed_by_profile_id": string | null,
      "changed_by_role": string | null,
      "changed_at": string | null,
      "note": string | null,
      "changed_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "shipment_id": string | null,
      "old_status": string | null,
      "new_status": string | null,
      "changed_by_profile_id": string | null,
      "changed_by_role": string | null,
      "changed_at": string | null,
      "note": string | null,
      "changed_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_shipments": {
        Row: {
      "id": string,
      "external_shipment_id": string | null,
      "shipment_reference": string | null,
      "origin_ref": string | null,
      "external_order_id": string | null,
      "odoo_order_name": string | null,
      "linked_order_id": string | null,
      "customer_id": string | null,
      "external_customer_id": string | null,
      "customer_name": string | null,
      "warehouse_id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string | null,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "external_user_id": string | null,
      "assigned_user_name": string | null,
      "assigned_job_title": string | null,
      "operation_type_name": string | null,
      "operation_type_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "shipment_state": string,
      "delivery_phase": string,
      "priority": string | null,
      "move_type": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "total_weight": number | null,
      "notes": string | null,
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string,
      "plan_id": string | null,
      "shipment_status": string,
      "customer_latitude": number | null,
      "customer_longitude": number | null,
      "warehouse_latitude": number | null,
      "warehouse_longitude": number | null,
      "estimated_road_distance_km": number | null,
      "total_gmv": number | null,
      "picked_up_gmv": number | null,
      "total_cbm": number | null,
      "cbm_confidence": number | null,
      "cancelled_at": string | null,
      "route_sequence": number | null,
      "route_locked": boolean,
      "customer_phone": string | null,
      "pod_signature_path": string | null,
      "pod_recipient_name": string | null,
      "pod_recipient_phone": string | null,
      "pod_signed_at": string | null,
      "arrived_at_customer_at": string | null,
      "parent_shipment_id": string | null,
      "is_return_shipment": boolean,
      "return_reference": string | null,
      "payment_method": string | null,
      "pod_image_url": string | null,
      "assigned_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "external_shipment_id": string | null,
      "shipment_reference": string | null,
      "origin_ref": string | null,
      "external_order_id": string | null,
      "odoo_order_name": string | null,
      "linked_order_id": string | null,
      "customer_id": string | null,
      "external_customer_id": string | null,
      "customer_name": string | null,
      "warehouse_id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string | null,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "external_user_id": string | null,
      "assigned_user_name": string | null,
      "assigned_job_title": string | null,
      "operation_type_name": string | null,
      "operation_type_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "shipment_state": string | null,
      "delivery_phase": string | null,
      "priority": string | null,
      "move_type": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "total_weight": number | null,
      "notes": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "plan_id": string | null,
      "shipment_status": string | null,
      "customer_latitude": number | null,
      "customer_longitude": number | null,
      "warehouse_latitude": number | null,
      "warehouse_longitude": number | null,
      "estimated_road_distance_km": number | null,
      "total_gmv": number | null,
      "picked_up_gmv": number | null,
      "total_cbm": number | null,
      "cbm_confidence": number | null,
      "cancelled_at": string | null,
      "route_sequence": number | null,
      "route_locked": boolean | null,
      "customer_phone": string | null,
      "pod_signature_path": string | null,
      "pod_recipient_name": string | null,
      "pod_recipient_phone": string | null,
      "pod_signed_at": string | null,
      "arrived_at_customer_at": string | null,
      "parent_shipment_id": string | null,
      "is_return_shipment": boolean | null,
      "return_reference": string | null,
      "payment_method": string | null,
      "pod_image_url": string | null,
      "assigned_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "external_shipment_id": string | null,
      "shipment_reference": string | null,
      "origin_ref": string | null,
      "external_order_id": string | null,
      "odoo_order_name": string | null,
      "linked_order_id": string | null,
      "customer_id": string | null,
      "external_customer_id": string | null,
      "customer_name": string | null,
      "warehouse_id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string | null,
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "external_user_id": string | null,
      "assigned_user_name": string | null,
      "assigned_job_title": string | null,
      "operation_type_name": string | null,
      "operation_type_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "shipment_state": string | null,
      "delivery_phase": string | null,
      "priority": string | null,
      "move_type": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "total_weight": number | null,
      "notes": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "plan_id": string | null,
      "shipment_status": string | null,
      "customer_latitude": number | null,
      "customer_longitude": number | null,
      "warehouse_latitude": number | null,
      "warehouse_longitude": number | null,
      "estimated_road_distance_km": number | null,
      "total_gmv": number | null,
      "picked_up_gmv": number | null,
      "total_cbm": number | null,
      "cbm_confidence": number | null,
      "cancelled_at": string | null,
      "route_sequence": number | null,
      "route_locked": boolean | null,
      "customer_phone": string | null,
      "pod_signature_path": string | null,
      "pod_recipient_name": string | null,
      "pod_recipient_phone": string | null,
      "pod_signed_at": string | null,
      "arrived_at_customer_at": string | null,
      "parent_shipment_id": string | null,
      "is_return_shipment": boolean | null,
      "return_reference": string | null,
      "payment_method": string | null,
      "pod_image_url": string | null,
      "assigned_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_sync_watermarks": {
        Row: {
      "id": string,
      "entity_type": string,
      "last_sync_at": string | null,
      "last_sync_row_count": number | null,
      "last_sync_duration_ms": number | null,
      "last_error": string | null,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "entity_type": string,
      "last_sync_at": string | null,
      "last_sync_row_count": number | null,
      "last_sync_duration_ms": number | null,
      "last_error": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "entity_type": string | null,
      "last_sync_at": string | null,
      "last_sync_row_count": number | null,
      "last_sync_duration_ms": number | null,
      "last_error": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "logistics_users": {
        Row: {
      "id": string,
      "external_employee_id": string | null,
      "external_user_id": string | null,
      "linked_profile_id": string | null,
      "employee_name": string,
      "job_title": string | null,
      "work_email": string | null,
      "work_phone": string | null,
      "mobile_phone": string | null,
      "employee_code": string | null,
      "department_name": string | null,
      "company_name": string | null,
      "work_location": string | null,
      "status": Database["public"]["Enums"]["record_status"],
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string,
      "department_external_id": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "first_contract_date": string | null,
      "activity_state": string | null,
      "activity_type_name": string | null,
      "next_activity_deadline": string | null,
      "linked_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "external_employee_id": string | null,
      "external_user_id": string | null,
      "linked_profile_id": string | null,
      "employee_name": string,
      "job_title": string | null,
      "work_email": string | null,
      "work_phone": string | null,
      "mobile_phone": string | null,
      "employee_code": string | null,
      "department_name": string | null,
      "company_name": string | null,
      "work_location": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "department_external_id": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "first_contract_date": string | null,
      "activity_state": string | null,
      "activity_type_name": string | null,
      "next_activity_deadline": string | null,
      "linked_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "external_employee_id": string | null,
      "external_user_id": string | null,
      "linked_profile_id": string | null,
      "employee_name": string | null,
      "job_title": string | null,
      "work_email": string | null,
      "work_phone": string | null,
      "mobile_phone": string | null,
      "employee_code": string | null,
      "department_name": string | null,
      "company_name": string | null,
      "work_location": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "department_external_id": string | null,
      "manager_external_employee_id": string | null,
      "manager_name": string | null,
      "first_contract_date": string | null,
      "activity_state": string | null,
      "activity_type_name": string | null,
      "next_activity_deadline": string | null,
      "linked_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "logistics_vehicle_profiles": {
        Row: {
      "id": string,
      "vehicle_type": string,
      "avg_speed_kmh": number,
      "max_speed_kmh": number | null,
      "description": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "vehicle_type": string,
      "avg_speed_kmh": number,
      "max_speed_kmh": number | null,
      "description": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "vehicle_type": string | null,
      "avg_speed_kmh": number | null,
      "max_speed_kmh": number | null,
      "description": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "logistics_warehouses": {
        Row: {
      "id": string,
      "external_warehouse_id": string | null,
      "warehouse_name": string,
      "warehouse_code": string | null,
      "company_name": string | null,
      "partner_ref": string | null,
      "view_location_ref": string | null,
      "stock_location_ref": string | null,
      "out_type_ref": string | null,
      "in_type_ref": string | null,
      "pick_type_ref": string | null,
      "pack_type_ref": string | null,
      "int_type_ref": string | null,
      "status": Database["public"]["Enums"]["record_status"],
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string,
      "warehouse_code": string | null,
      "company_name": string | null,
      "partner_ref": string | null,
      "view_location_ref": string | null,
      "stock_location_ref": string | null,
      "out_type_ref": string | null,
      "in_type_ref": string | null,
      "pick_type_ref": string | null,
      "pack_type_ref": string | null,
      "int_type_ref": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string | null,
      "warehouse_code": string | null,
      "company_name": string | null,
      "partner_ref": string | null,
      "view_location_ref": string | null,
      "stock_location_ref": string | null,
      "out_type_ref": string | null,
      "in_type_ref": string | null,
      "pick_type_ref": string | null,
      "pack_type_ref": string | null,
      "int_type_ref": string | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "notification_recipients": {
        Row: {
      "id": string,
      "notification_id": string,
      "user_id": string,
      "read_at": string | null,
      "delivered_at": string | null,
      "created_at": string,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "notification_id": string,
      "user_id": string,
      "read_at": string | null,
      "delivered_at": string | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "notification_id": string | null,
      "user_id": string | null,
      "read_at": string | null,
      "delivered_at": string | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "notifications": {
        Row: {
      "id": string,
      "created_by": string | null,
      "audience_type": Database["public"]["Enums"]["notification_audience_type"],
      "audience_role": Database["public"]["Enums"]["app_role"] | null,
      "audience_user_id": string | null,
      "channel": Database["public"]["Enums"]["notification_channel"],
      "title": string,
      "body": string,
      "metadata": Json,
      "sent_at": string,
      "created_at": string,
      "created_by_full_name": string | null,
      "audience_user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "created_by": string | null,
      "audience_type": Database["public"]["Enums"]["notification_audience_type"],
      "audience_role": Database["public"]["Enums"]["app_role"] | null,
      "audience_user_id": string | null,
      "channel": Database["public"]["Enums"]["notification_channel"] | null,
      "title": string,
      "body": string,
      "metadata": Json | null,
      "sent_at": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null,
      "audience_user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "created_by": string | null,
      "audience_type": Database["public"]["Enums"]["notification_audience_type"] | null,
      "audience_role": Database["public"]["Enums"]["app_role"] | null,
      "audience_user_id": string | null,
      "channel": Database["public"]["Enums"]["notification_channel"] | null,
      "title": string | null,
      "body": string | null,
      "metadata": Json | null,
      "sent_at": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null,
      "audience_user_id_full_name": string | null
      }
        Relationships: []
      }
      "odoo_actions": {
        Row: {
      "id": string,
      "action_key": string,
      "label": string,
      "description": string,
      "endpoint_path": string,
      "http_method": string,
      "odoo_model": string | null,
      "odoo_method": string | null,
      "is_active": boolean,
      "allowed_roles": Database["public"]["Enums"]["app_role"][],
      "sort_order": number,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "action_key": string,
      "label": string,
      "description": string | null,
      "endpoint_path": string,
      "http_method": string | null,
      "odoo_model": string | null,
      "odoo_method": string | null,
      "is_active": boolean | null,
      "allowed_roles": Database["public"]["Enums"]["app_role"][] | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "action_key": string | null,
      "label": string | null,
      "description": string | null,
      "endpoint_path": string | null,
      "http_method": string | null,
      "odoo_model": string | null,
      "odoo_method": string | null,
      "is_active": boolean | null,
      "allowed_roles": Database["public"]["Enums"]["app_role"][] | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "odoo_crm_activity_dispatches": {
        Row: {
      "id": string,
      "request_id": string,
      "requester_id": string,
      "mapped_odoo_user_id": number,
      "lead_external_id": string,
      "activity_type_id": number,
      "payload": Json,
      "mode": string,
      "status": string,
      "attempt_count": number,
      "remote_activity_id": number | null,
      "error_code": string | null,
      "error_message": string | null,
      "created_at": string,
      "updated_at": string,
      "sent_at": string | null,
      "requester_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "request_id": string,
      "requester_id": string,
      "mapped_odoo_user_id": number,
      "lead_external_id": string,
      "activity_type_id": number,
      "payload": Json,
      "mode": string,
      "status": string,
      "attempt_count": number | null,
      "remote_activity_id": number | null,
      "error_code": string | null,
      "error_message": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "sent_at": string | null,
      "requester_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "request_id": string | null,
      "requester_id": string | null,
      "mapped_odoo_user_id": number | null,
      "lead_external_id": string | null,
      "activity_type_id": number | null,
      "payload": Json | null,
      "mode": string | null,
      "status": string | null,
      "attempt_count": number | null,
      "remote_activity_id": number | null,
      "error_code": string | null,
      "error_message": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "sent_at": string | null,
      "requester_id_full_name": string | null
      }
        Relationships: []
      }
      "odoo_crm_activity_reports": {
        Row: {
      "id": string,
      "external_activity_id": string,
      "lead_id": string | null,
      "lead_external_id": string | null,
      "lead_type": string | null,
      "partner_id": string | null,
      "partner_name": string | null,
      "user_id": string | null,
      "user_name": string | null,
      "team_id": string | null,
      "team_name": string | null,
      "activity_type_id": string | null,
      "activity_type_name": string | null,
      "summary": string | null,
      "notes": string | null,
      "date_deadline": string | null,
      "date_completed": string | null,
      "state": string | null,
      "mail_activity_id": string | null,
      "active": boolean | null,
      "source": string,
      "raw_payload": Json,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "external_activity_id": string,
      "lead_id": string | null,
      "lead_external_id": string | null,
      "lead_type": string | null,
      "partner_id": string | null,
      "partner_name": string | null,
      "user_id": string | null,
      "user_name": string | null,
      "team_id": string | null,
      "team_name": string | null,
      "activity_type_id": string | null,
      "activity_type_name": string | null,
      "summary": string | null,
      "notes": string | null,
      "date_deadline": string | null,
      "date_completed": string | null,
      "state": string | null,
      "mail_activity_id": string | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "external_activity_id": string | null,
      "lead_id": string | null,
      "lead_external_id": string | null,
      "lead_type": string | null,
      "partner_id": string | null,
      "partner_name": string | null,
      "user_id": string | null,
      "user_name": string | null,
      "team_id": string | null,
      "team_name": string | null,
      "activity_type_id": string | null,
      "activity_type_name": string | null,
      "summary": string | null,
      "notes": string | null,
      "date_deadline": string | null,
      "date_completed": string | null,
      "state": string | null,
      "mail_activity_id": string | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "odoo_crm_lead_actions": {
        Row: {
      "id": string,
      "lead_id": string | null,
      "external_lead_id": string,
      "action_type": string,
      "action_label": string,
      "note": string | null,
      "metadata": Json,
      "created_by": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "lead_id": string | null,
      "external_lead_id": string,
      "action_type": string,
      "action_label": string,
      "note": string | null,
      "metadata": Json | null,
      "created_by": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "lead_id": string | null,
      "external_lead_id": string | null,
      "action_type": string | null,
      "action_label": string | null,
      "note": string | null,
      "metadata": Json | null,
      "created_by": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "odoo_crm_leads": {
        Row: {
      "id": string,
      "external_lead_id": string,
      "opportunity_name": string,
      "lead_type": string | null,
      "partner_id": string | null,
      "customer_name": string | null,
      "contact_name": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "street": string | null,
      "city": string | null,
      "state_name": string | null,
      "country_name": string | null,
      "salesperson_id": string | null,
      "salesperson_name": string | null,
      "sales_team_id": string | null,
      "sales_team_name": string | null,
      "priority": string | null,
      "activity_ids": string[],
      "activity_by_id": string | null,
      "activity_by_name": string | null,
      "my_deadline": string | null,
      "campaign_id": string | null,
      "campaign_name": string | null,
      "medium_id": string | null,
      "medium_name": string | null,
      "source_id": string | null,
      "source_name": string | null,
      "expected_revenue": number,
      "expected_closing": string | null,
      "stage_id": string | null,
      "stage_name": string | null,
      "notes": string | null,
      "probability": number | null,
      "lost_reason_id": string | null,
      "lost_reason_name": string | null,
      "tag_ids": string[],
      "tag_names": string[],
      "active": boolean,
      "source": string,
      "raw_payload": Json,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string,
      "phone_number": string | null
      }
        Insert: {
      "id": string | null,
      "external_lead_id": string,
      "opportunity_name": string,
      "lead_type": string | null,
      "partner_id": string | null,
      "customer_name": string | null,
      "contact_name": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "street": string | null,
      "city": string | null,
      "state_name": string | null,
      "country_name": string | null,
      "salesperson_id": string | null,
      "salesperson_name": string | null,
      "sales_team_id": string | null,
      "sales_team_name": string | null,
      "priority": string | null,
      "activity_ids": string[] | null,
      "activity_by_id": string | null,
      "activity_by_name": string | null,
      "my_deadline": string | null,
      "campaign_id": string | null,
      "campaign_name": string | null,
      "medium_id": string | null,
      "medium_name": string | null,
      "source_id": string | null,
      "source_name": string | null,
      "expected_revenue": number | null,
      "expected_closing": string | null,
      "stage_id": string | null,
      "stage_name": string | null,
      "notes": string | null,
      "probability": number | null,
      "lost_reason_id": string | null,
      "lost_reason_name": string | null,
      "tag_ids": string[] | null,
      "tag_names": string[] | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "phone_number": string | null
      }
        Update: {
      "id": string | null,
      "external_lead_id": string | null,
      "opportunity_name": string | null,
      "lead_type": string | null,
      "partner_id": string | null,
      "customer_name": string | null,
      "contact_name": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "street": string | null,
      "city": string | null,
      "state_name": string | null,
      "country_name": string | null,
      "salesperson_id": string | null,
      "salesperson_name": string | null,
      "sales_team_id": string | null,
      "sales_team_name": string | null,
      "priority": string | null,
      "activity_ids": string[] | null,
      "activity_by_id": string | null,
      "activity_by_name": string | null,
      "my_deadline": string | null,
      "campaign_id": string | null,
      "campaign_name": string | null,
      "medium_id": string | null,
      "medium_name": string | null,
      "source_id": string | null,
      "source_name": string | null,
      "expected_revenue": number | null,
      "expected_closing": string | null,
      "stage_id": string | null,
      "stage_name": string | null,
      "notes": string | null,
      "probability": number | null,
      "lost_reason_id": string | null,
      "lost_reason_name": string | null,
      "tag_ids": string[] | null,
      "tag_names": string[] | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "phone_number": string | null
      }
        Relationships: []
      }
      "odoo_crm_model_records": {
        Row: {
      "id": string,
      "odoo_model": string,
      "external_id": string,
      "display_name": string | null,
      "active": boolean | null,
      "source": string,
      "raw_payload": Json,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "odoo_model": string,
      "external_id": string,
      "display_name": string | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "odoo_model": string | null,
      "external_id": string | null,
      "display_name": string | null,
      "active": boolean | null,
      "source": string | null,
      "raw_payload": Json | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "odoo_pending_action_audit_log": {
        Row: {
      "id": string,
      "action_id": string,
      "status": Database["public"]["Enums"]["odoo_action_status"],
      "user_id": string | null,
      "details": Json | null,
      "created_at": string,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "action_id": string,
      "status": Database["public"]["Enums"]["odoo_action_status"],
      "user_id": string | null,
      "details": Json | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "action_id": string | null,
      "status": Database["public"]["Enums"]["odoo_action_status"] | null,
      "user_id": string | null,
      "details": Json | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "odoo_pending_actions": {
        Row: {
      "id": string,
      "entity_type": string,
      "action_type": string,
      "odoo_model": string,
      "odoo_method": string,
      "entity_id": string | null,
      "payload_json": Json,
      "validation_result": Json | null,
      "status": Database["public"]["Enums"]["odoo_action_status"],
      "created_by": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "rejected_by": string | null,
      "rejected_at": string | null,
      "rejection_reason": string | null,
      "retry_count": number,
      "odoo_record_id": number | null,
      "odoo_reference": string | null,
      "odoo_response": Json | null,
      "error_message": string | null,
      "created_at": string,
      "updated_at": string,
      "created_by_full_name": string | null,
      "approved_by_full_name": string | null,
      "rejected_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "entity_type": string,
      "action_type": string,
      "odoo_model": string,
      "odoo_method": string | null,
      "entity_id": string | null,
      "payload_json": Json | null,
      "validation_result": Json | null,
      "status": Database["public"]["Enums"]["odoo_action_status"] | null,
      "created_by": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "rejected_by": string | null,
      "rejected_at": string | null,
      "rejection_reason": string | null,
      "retry_count": number | null,
      "odoo_record_id": number | null,
      "odoo_reference": string | null,
      "odoo_response": Json | null,
      "error_message": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "approved_by_full_name": string | null,
      "rejected_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "entity_type": string | null,
      "action_type": string | null,
      "odoo_model": string | null,
      "odoo_method": string | null,
      "entity_id": string | null,
      "payload_json": Json | null,
      "validation_result": Json | null,
      "status": Database["public"]["Enums"]["odoo_action_status"] | null,
      "created_by": string | null,
      "approved_by": string | null,
      "approved_at": string | null,
      "rejected_by": string | null,
      "rejected_at": string | null,
      "rejection_reason": string | null,
      "retry_count": number | null,
      "odoo_record_id": number | null,
      "odoo_reference": string | null,
      "odoo_response": Json | null,
      "error_message": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null,
      "approved_by_full_name": string | null,
      "rejected_by_full_name": string | null
      }
        Relationships: []
      }
      "odoo_sync_rules": {
        Row: {
      "id": string,
      "entity_type": string,
      "odoo_model": string,
      "direction": string,
      "governance": string,
      "description": string,
      "description_ar": string,
      "dashboard_table": string,
      "operations": string[],
      "is_active": boolean,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "entity_type": string,
      "odoo_model": string,
      "direction": string,
      "governance": string,
      "description": string,
      "description_ar": string | null,
      "dashboard_table": string,
      "operations": string[] | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "entity_type": string | null,
      "odoo_model": string | null,
      "direction": string | null,
      "governance": string | null,
      "description": string | null,
      "description_ar": string | null,
      "dashboard_table": string | null,
      "operations": string[] | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "onboarding_progress": {
        Row: {
      "id": string,
      "user_id": string,
      "tenant_id": string,
      "current_step": number,
      "industry": string | null,
      "business_name": string | null,
      "logo_url": string | null,
      "phone": string | null,
      "contact_email": string | null,
      "address": string | null,
      "social_instagram": string | null,
      "social_twitter": string | null,
      "social_tiktok": string | null,
      "completed": boolean,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "user_id": string,
      "tenant_id": string,
      "current_step": number | null,
      "industry": string | null,
      "business_name": string | null,
      "logo_url": string | null,
      "phone": string | null,
      "contact_email": string | null,
      "address": string | null,
      "social_instagram": string | null,
      "social_twitter": string | null,
      "social_tiktok": string | null,
      "completed": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "user_id": string | null,
      "tenant_id": string | null,
      "current_step": number | null,
      "industry": string | null,
      "business_name": string | null,
      "logo_url": string | null,
      "phone": string | null,
      "contact_email": string | null,
      "address": string | null,
      "social_instagram": string | null,
      "social_twitter": string | null,
      "social_tiktok": string | null,
      "completed": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "order_cancellations": {
        Row: {
      "id": string,
      "order_id": string,
      "reason": string,
      "cancelled_by": string,
      "cancelled_at": string,
      "inventory_reversed": boolean,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "reason": string,
      "cancelled_by": string,
      "cancelled_at": string | null,
      "inventory_reversed": boolean | null,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "reason": string | null,
      "cancelled_by": string | null,
      "cancelled_at": string | null,
      "inventory_reversed": boolean | null,
      "journal_entry_id": string | null,
      "notes": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "order_delivery_documents": {
        Row: {
      "id": string,
      "order_id": string,
      "external_picking_id": string,
      "external_order_id": string | null,
      "picking_name": string,
      "origin_ref": string | null,
      "picking_state": string | null,
      "picking_type_ref": string | null,
      "partner_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "external_picking_id": string,
      "external_order_id": string | null,
      "picking_name": string,
      "origin_ref": string | null,
      "picking_state": string | null,
      "picking_type_ref": string | null,
      "partner_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "external_picking_id": string | null,
      "external_order_id": string | null,
      "picking_name": string | null,
      "origin_ref": string | null,
      "picking_state": string | null,
      "picking_type_ref": string | null,
      "partner_ref": string | null,
      "source_location_ref": string | null,
      "destination_location_ref": string | null,
      "scheduled_at": string | null,
      "completed_at": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "order_intents": {
        Row: {
      "id": string,
      "visit_id": string | null,
      "customer_id": string,
      "sales_profile_id": string,
      "status": string,
      "priority": string,
      "summary": string,
      "estimated_value": number | null,
      "requested_delivery_date": string | null,
      "decision_maker_status": string | null,
      "interest_level": string | null,
      "next_action": string,
      "selected_customer_profiles": Json,
      "source_payload": Json,
      "admin_notes": string | null,
      "assigned_admin_profile_id": string | null,
      "converted_order_id": string | null,
      "created_at": string,
      "updated_at": string,
      "resolved_at": string | null,
      "sales_profile_id_full_name": string | null,
      "assigned_admin_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "visit_id": string | null,
      "customer_id": string,
      "sales_profile_id": string,
      "status": string | null,
      "priority": string | null,
      "summary": string,
      "estimated_value": number | null,
      "requested_delivery_date": string | null,
      "decision_maker_status": string | null,
      "interest_level": string | null,
      "next_action": string | null,
      "selected_customer_profiles": Json | null,
      "source_payload": Json | null,
      "admin_notes": string | null,
      "assigned_admin_profile_id": string | null,
      "converted_order_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "resolved_at": string | null,
      "sales_profile_id_full_name": string | null,
      "assigned_admin_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "visit_id": string | null,
      "customer_id": string | null,
      "sales_profile_id": string | null,
      "status": string | null,
      "priority": string | null,
      "summary": string | null,
      "estimated_value": number | null,
      "requested_delivery_date": string | null,
      "decision_maker_status": string | null,
      "interest_level": string | null,
      "next_action": string | null,
      "selected_customer_profiles": Json | null,
      "source_payload": Json | null,
      "admin_notes": string | null,
      "assigned_admin_profile_id": string | null,
      "converted_order_id": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "resolved_at": string | null,
      "sales_profile_id_full_name": string | null,
      "assigned_admin_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "order_invoice_documents": {
        Row: {
      "id": string,
      "order_id": string,
      "external_invoice_id": string,
      "external_order_id": string | null,
      "invoice_name": string,
      "move_type": string | null,
      "invoice_state": string | null,
      "payment_state": string | null,
      "partner_ref": string | null,
      "invoice_date": string | null,
      "amount_total": number,
      "currency_code": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "external_invoice_id": string,
      "external_order_id": string | null,
      "invoice_name": string,
      "move_type": string | null,
      "invoice_state": string | null,
      "payment_state": string | null,
      "partner_ref": string | null,
      "invoice_date": string | null,
      "amount_total": number | null,
      "currency_code": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "external_invoice_id": string | null,
      "external_order_id": string | null,
      "invoice_name": string | null,
      "move_type": string | null,
      "invoice_state": string | null,
      "payment_state": string | null,
      "partner_ref": string | null,
      "invoice_date": string | null,
      "amount_total": number | null,
      "currency_code": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "order_line_items": {
        Row: {
      "id": string,
      "order_id": string,
      "external_line_id": string,
      "external_order_id": string | null,
      "external_product_id": string | null,
      "product_name": string,
      "product_ref": string | null,
      "product_code": string | null,
      "product_uom": string | null,
      "ordered_quantity": number,
      "delivered_quantity": number,
      "invoiced_quantity": number,
      "unit_price": number,
      "discount_percent": number,
      "subtotal_amount": number,
      "total_amount": number,
      "sort_order": number,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string,
      "display_type": string | null
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "external_line_id": string,
      "external_order_id": string | null,
      "external_product_id": string | null,
      "product_name": string,
      "product_ref": string | null,
      "product_code": string | null,
      "product_uom": string | null,
      "ordered_quantity": number | null,
      "delivered_quantity": number | null,
      "invoiced_quantity": number | null,
      "unit_price": number | null,
      "discount_percent": number | null,
      "subtotal_amount": number | null,
      "total_amount": number | null,
      "sort_order": number | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "display_type": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "external_line_id": string | null,
      "external_order_id": string | null,
      "external_product_id": string | null,
      "product_name": string | null,
      "product_ref": string | null,
      "product_code": string | null,
      "product_uom": string | null,
      "ordered_quantity": number | null,
      "delivered_quantity": number | null,
      "invoiced_quantity": number | null,
      "unit_price": number | null,
      "discount_percent": number | null,
      "subtotal_amount": number | null,
      "total_amount": number | null,
      "sort_order": number | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "display_type": string | null
      }
        Relationships: []
      }
      "order_status_history": {
        Row: {
      "id": string,
      "order_id": string,
      "status": string,
      "note": string | null,
      "actor_id": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "order_id": string,
      "status": string,
      "note": string | null,
      "actor_id": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "status": string | null,
      "note": string | null,
      "actor_id": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "order_ticket_comments": {
        Row: {
      "id": string,
      "ticket_id": string,
      "author_id": string,
      "body": string,
      "is_internal": boolean,
      "created_at": string,
      "author_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "ticket_id": string,
      "author_id": string,
      "body": string,
      "is_internal": boolean | null,
      "created_at": string | null,
      "author_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "ticket_id": string | null,
      "author_id": string | null,
      "body": string | null,
      "is_internal": boolean | null,
      "created_at": string | null,
      "author_id_full_name": string | null
      }
        Relationships: []
      }
      "order_tickets": {
        Row: {
      "id": string,
      "order_id": string | null,
      "customer_id": string | null,
      "subject": string,
      "description": string | null,
      "status": Database["public"]["Enums"]["ticket_status"],
      "priority": Database["public"]["Enums"]["ticket_priority"],
      "category": string | null,
      "assigned_to": string | null,
      "created_by": string | null,
      "resolved_at": string | null,
      "closed_at": string | null,
      "raw_payload": Json | null,
      "created_at": string,
      "updated_at": string,
      "assigned_to_full_name": string | null,
      "created_by_full_name": string | null,
      "scope": string,
      "assigned_departments": string[],
      "assigned_user_ids": string[]
      }
        Insert: {
      "id": string | null,
      "order_id": string | null,
      "customer_id": string | null,
      "subject": string,
      "description": string | null,
      "status": Database["public"]["Enums"]["ticket_status"] | null,
      "priority": Database["public"]["Enums"]["ticket_priority"] | null,
      "category": string | null,
      "assigned_to": string | null,
      "created_by": string | null,
      "resolved_at": string | null,
      "closed_at": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "assigned_to_full_name": string | null,
      "created_by_full_name": string | null,
      "scope": string | null,
      "assigned_departments": string[] | null,
      "assigned_user_ids": string[] | null
      }
        Update: {
      "id": string | null,
      "order_id": string | null,
      "customer_id": string | null,
      "subject": string | null,
      "description": string | null,
      "status": Database["public"]["Enums"]["ticket_status"] | null,
      "priority": Database["public"]["Enums"]["ticket_priority"] | null,
      "category": string | null,
      "assigned_to": string | null,
      "created_by": string | null,
      "resolved_at": string | null,
      "closed_at": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "assigned_to_full_name": string | null,
      "created_by_full_name": string | null,
      "scope": string | null,
      "assigned_departments": string[] | null,
      "assigned_user_ids": string[] | null
      }
        Relationships: []
      }
      "orders": {
        Row: {
      "id": string,
      "external_order_id": string | null,
      "customer_id": string | null,
      "customer_name": string | null,
      "status": Database["public"]["Enums"]["order_status"],
      "source": string,
      "order_date": string | null,
      "delivered_at": string | null,
      "total_amount": number,
      "currency_code": string,
      "assigned_user_id": string | null,
      "raw_payload": Json,
      "created_at": string,
      "updated_at": string,
      "last_sync_at": string | null,
      "create_date": string | null,
      "commitment_date": string | null,
      "delivery_status": string | null,
      "user_id": string | null,
      "amount_to_invoice": number | null,
      "amount_total": number | null,
      "amount_undiscounted": number | null,
      "amount_untaxed": number | null,
      "partner_id": string | null,
      "payment_term_id": string | null,
      "access_url": string | null,
      "company_id": string | null,
      "create_uid": string | null,
      "fiscal_position_id": string | null,
      "invoice_status": string | null,
      "margin": number | null,
      "margin_percent": string | null,
      "planning_initial_date": string | null,
      "pricelist_id": string | null,
      "shipping_weight": number | null,
      "state": string | null,
      "team_id": string | null,
      "type_name": string | null,
      "warehouse_id": string | null,
      "odoo_order_name": string | null,
      "shipping_partner_id": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "assigned_user_id_full_name": string | null,
      "tenant_id": string | null,
      "order_number": string | null,
      "full_name": string | null,
      "phone": string | null,
      "email": string | null,
      "shipping_address": Json | null,
      "payment_method": string | null,
      "shipping_cost": number | null,
      "notes": string | null
      }
        Insert: {
      "id": string | null,
      "external_order_id": string | null,
      "customer_id": string | null,
      "customer_name": string | null,
      "status": Database["public"]["Enums"]["order_status"] | null,
      "source": string | null,
      "order_date": string | null,
      "delivered_at": string | null,
      "total_amount": number | null,
      "currency_code": string | null,
      "assigned_user_id": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "last_sync_at": string | null,
      "create_date": string | null,
      "commitment_date": string | null,
      "delivery_status": string | null,
      "user_id": string | null,
      "amount_to_invoice": number | null,
      "amount_total": number | null,
      "amount_undiscounted": number | null,
      "amount_untaxed": number | null,
      "partner_id": string | null,
      "payment_term_id": string | null,
      "access_url": string | null,
      "company_id": string | null,
      "create_uid": string | null,
      "fiscal_position_id": string | null,
      "invoice_status": string | null,
      "margin": number | null,
      "margin_percent": string | null,
      "planning_initial_date": string | null,
      "pricelist_id": string | null,
      "shipping_weight": number | null,
      "state": string | null,
      "team_id": string | null,
      "type_name": string | null,
      "warehouse_id": string | null,
      "odoo_order_name": string | null,
      "shipping_partner_id": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "assigned_user_id_full_name": string | null,
      "tenant_id": string | null,
      "order_number": string | null,
      "full_name": string | null,
      "phone": string | null,
      "email": string | null,
      "shipping_address": Json | null,
      "payment_method": string | null,
      "shipping_cost": number | null,
      "notes": string | null
      }
        Update: {
      "id": string | null,
      "external_order_id": string | null,
      "customer_id": string | null,
      "customer_name": string | null,
      "status": Database["public"]["Enums"]["order_status"] | null,
      "source": string | null,
      "order_date": string | null,
      "delivered_at": string | null,
      "total_amount": number | null,
      "currency_code": string | null,
      "assigned_user_id": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "last_sync_at": string | null,
      "create_date": string | null,
      "commitment_date": string | null,
      "delivery_status": string | null,
      "user_id": string | null,
      "amount_to_invoice": number | null,
      "amount_total": number | null,
      "amount_undiscounted": number | null,
      "amount_untaxed": number | null,
      "partner_id": string | null,
      "payment_term_id": string | null,
      "access_url": string | null,
      "company_id": string | null,
      "create_uid": string | null,
      "fiscal_position_id": string | null,
      "invoice_status": string | null,
      "margin": number | null,
      "margin_percent": string | null,
      "planning_initial_date": string | null,
      "pricelist_id": string | null,
      "shipping_weight": number | null,
      "state": string | null,
      "team_id": string | null,
      "type_name": string | null,
      "warehouse_id": string | null,
      "odoo_order_name": string | null,
      "shipping_partner_id": string | null,
      "user_uid": number | null,
      "odoo_insert_payload": Json | null,
      "assigned_user_id_full_name": string | null,
      "tenant_id": string | null,
      "order_number": string | null,
      "full_name": string | null,
      "phone": string | null,
      "email": string | null,
      "shipping_address": Json | null,
      "payment_method": string | null,
      "shipping_cost": number | null,
      "notes": string | null
      }
        Relationships: []
      }
      "permission_catalog": {
        Row: {
      "permission_key": string,
      "module_key": string,
      "module_label": string,
      "label": string,
      "description": string,
      "route_path": string | null,
      "risk_level": string,
      "is_navigation": boolean,
      "is_active": boolean,
      "sort_order": number,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "permission_key": string,
      "module_key": string,
      "module_label": string,
      "label": string,
      "description": string,
      "route_path": string | null,
      "risk_level": string | null,
      "is_navigation": boolean | null,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "permission_key": string | null,
      "module_key": string | null,
      "module_label": string | null,
      "label": string | null,
      "description": string | null,
      "route_path": string | null,
      "risk_level": string | null,
      "is_navigation": boolean | null,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "product_barcodes": {
        Row: {
      "id": string,
      "product_id": string | null,
      "dataset_id": string | null,
      "barcode": string,
      "registered_by_profile_id": string | null,
      "registration_source": string,
      "created_at": string,
      "updated_at": string,
      "registered_by_profile_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "barcode": string,
      "registered_by_profile_id": string | null,
      "registration_source": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "registered_by_profile_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "product_id": string | null,
      "dataset_id": string | null,
      "barcode": string | null,
      "registered_by_profile_id": string | null,
      "registration_source": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "registered_by_profile_id_full_name": string | null
      }
        Relationships: []
      }
      "product_catalog": {
        Row: {
      "id": string,
      "name_en": string,
      "name_ar": string,
      "slug": string,
      "description_en": string | null,
      "description_ar": string | null,
      "price": number,
      "compare_at_price": number | null,
      "currency": string,
      "sku": string | null,
      "stock_quantity": number,
      "low_stock_threshold": number,
      "track_inventory": boolean,
      "category_id": string | null,
      "image_url": string | null,
      "gallery_urls": string[] | null,
      "status": string,
      "is_featured": boolean,
      "seo_title_en": string | null,
      "seo_title_ar": string | null,
      "seo_description_en": string | null,
      "seo_description_ar": string | null,
      "meta": Json,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "name_en": string,
      "name_ar": string,
      "slug": string,
      "description_en": string | null,
      "description_ar": string | null,
      "price": number | null,
      "compare_at_price": number | null,
      "currency": string | null,
      "sku": string | null,
      "stock_quantity": number | null,
      "low_stock_threshold": number | null,
      "track_inventory": boolean | null,
      "category_id": string | null,
      "image_url": string | null,
      "gallery_urls": string[] | null,
      "status": string | null,
      "is_featured": boolean | null,
      "seo_title_en": string | null,
      "seo_title_ar": string | null,
      "seo_description_en": string | null,
      "seo_description_ar": string | null,
      "meta": Json | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "name_en": string | null,
      "name_ar": string | null,
      "slug": string | null,
      "description_en": string | null,
      "description_ar": string | null,
      "price": number | null,
      "compare_at_price": number | null,
      "currency": string | null,
      "sku": string | null,
      "stock_quantity": number | null,
      "low_stock_threshold": number | null,
      "track_inventory": boolean | null,
      "category_id": string | null,
      "image_url": string | null,
      "gallery_urls": string[] | null,
      "status": string | null,
      "is_featured": boolean | null,
      "seo_title_en": string | null,
      "seo_title_ar": string | null,
      "seo_description_en": string | null,
      "seo_description_ar": string | null,
      "meta": Json | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "product_variants": {
        Row: {
      "id": string,
      "product_id": string,
      "name_en": string,
      "name_ar": string,
      "sku": string | null,
      "price": number,
      "compare_at_price": number | null,
      "stock_quantity": number,
      "option_values": Json,
      "image_url": string | null,
      "is_active": boolean,
      "sort_order": number,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "product_id": string,
      "name_en": string,
      "name_ar": string,
      "sku": string | null,
      "price": number | null,
      "compare_at_price": number | null,
      "stock_quantity": number | null,
      "option_values": Json | null,
      "image_url": string | null,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "product_id": string | null,
      "name_en": string | null,
      "name_ar": string | null,
      "sku": string | null,
      "price": number | null,
      "compare_at_price": number | null,
      "stock_quantity": number | null,
      "option_values": Json | null,
      "image_url": string | null,
      "is_active": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "products": {
        Row: {
      "id": string,
      "external_product_id": string | null,
      "internal_reference": string | null,
      "product_name": string,
      "average_cost": number,
      "sales_price": number,
      "quantity_on_hand": number,
      "incoming_quantity": number,
      "outgoing_quantity": number,
      "unit_of_measure": string | null,
      "source": string,
      "raw_payload": Json,
      "created_at": string,
      "updated_at": string,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "barcode": string | null,
      "odoo_insert_payload": Json | null
      }
        Insert: {
      "id": string | null,
      "external_product_id": string | null,
      "internal_reference": string | null,
      "product_name": string,
      "average_cost": number | null,
      "sales_price": number | null,
      "quantity_on_hand": number | null,
      "incoming_quantity": number | null,
      "outgoing_quantity": number | null,
      "unit_of_measure": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "barcode": string | null,
      "odoo_insert_payload": Json | null
      }
        Update: {
      "id": string | null,
      "external_product_id": string | null,
      "internal_reference": string | null,
      "product_name": string | null,
      "average_cost": number | null,
      "sales_price": number | null,
      "quantity_on_hand": number | null,
      "incoming_quantity": number | null,
      "outgoing_quantity": number | null,
      "unit_of_measure": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "odoo_created_at": string | null,
      "odoo_updated_at": string | null,
      "last_sync_at": string | null,
      "barcode": string | null,
      "odoo_insert_payload": Json | null
      }
        Relationships: []
      }
      "products_dataset": {
        Row: {
      "id": string,
      "base_id": string,
      "name": string,
      "image_url": string | null,
      "barcode": string | null,
      "variants": string | null,
      "measurments": string | null,
      "measurment value": number | null,
      "search_keywords": Json,
      "product_id": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "base_id": string,
      "name": string,
      "image_url": string | null,
      "barcode": string | null,
      "variants": string | null,
      "measurments": string | null,
      "measurment value": number | null,
      "search_keywords": Json | null,
      "product_id": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "base_id": string | null,
      "name": string | null,
      "image_url": string | null,
      "barcode": string | null,
      "variants": string | null,
      "measurments": string | null,
      "measurment value": number | null,
      "search_keywords": Json | null,
      "product_id": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "profiles": {
        Row: {
      "id": string,
      "email": string,
      "full_name": string,
      "role": Database["public"]["Enums"]["app_role"],
      "status": Database["public"]["Enums"]["record_status"],
      "phone": string | null,
      "avatar_url": string | null,
      "prefer_otp": boolean,
      "password_enabled": boolean,
      "otp_enabled": boolean,
      "approved_at": string | null,
      "approved_by": string | null,
      "force_logout_at": string | null,
      "session_version": number,
      "last_login_at": string | null,
      "last_login_method": string | null,
      "created_at": string,
      "updated_at": string,
      "department_id": string | null,
      "job_title": string | null,
      "requires_password_change": boolean,
      "temporary_password_set_at": string | null,
      "password_changed_at": string | null,
      "odoo_user_id": string | null,
      "user_uid": number | null,
      "approved_by_full_name": string | null
      }
        Insert: {
      "id": string,
      "email": string,
      "full_name": string,
      "role": Database["public"]["Enums"]["app_role"] | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "phone": string | null,
      "avatar_url": string | null,
      "prefer_otp": boolean | null,
      "password_enabled": boolean | null,
      "otp_enabled": boolean | null,
      "approved_at": string | null,
      "approved_by": string | null,
      "force_logout_at": string | null,
      "session_version": number | null,
      "last_login_at": string | null,
      "last_login_method": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "department_id": string | null,
      "job_title": string | null,
      "requires_password_change": boolean | null,
      "temporary_password_set_at": string | null,
      "password_changed_at": string | null,
      "odoo_user_id": string | null,
      "user_uid": number | null,
      "approved_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "email": string | null,
      "full_name": string | null,
      "role": Database["public"]["Enums"]["app_role"] | null,
      "status": Database["public"]["Enums"]["record_status"] | null,
      "phone": string | null,
      "avatar_url": string | null,
      "prefer_otp": boolean | null,
      "password_enabled": boolean | null,
      "otp_enabled": boolean | null,
      "approved_at": string | null,
      "approved_by": string | null,
      "force_logout_at": string | null,
      "session_version": number | null,
      "last_login_at": string | null,
      "last_login_method": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "department_id": string | null,
      "job_title": string | null,
      "requires_password_change": boolean | null,
      "temporary_password_set_at": string | null,
      "password_changed_at": string | null,
      "odoo_user_id": string | null,
      "user_uid": number | null,
      "approved_by_full_name": string | null
      }
        Relationships: []
      }
      "quotation_items": {
        Row: {
      "id": string,
      "quotation_id": string,
      "company_name": string | null,
      "product_name": string,
      "product_code": string | null,
      "quantity": number,
      "unit_price": number,
      "discount_percent": number,
      "line_total": number,
      "metadata": Json,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "quotation_id": string,
      "company_name": string | null,
      "product_name": string,
      "product_code": string | null,
      "quantity": number,
      "unit_price": number | null,
      "discount_percent": number | null,
      "line_total": number | null,
      "metadata": Json | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "quotation_id": string | null,
      "company_name": string | null,
      "product_name": string | null,
      "product_code": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "discount_percent": number | null,
      "line_total": number | null,
      "metadata": Json | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "quotations": {
        Row: {
      "id": string,
      "created_by": string,
      "customer_id": string | null,
      "buyer_name": string,
      "buyer_phone": string | null,
      "seller_name": string | null,
      "seller_phone": string | null,
      "selected_company_ids": Json,
      "extra_discount_percent": number,
      "subtotal_amount": number,
      "discount_amount": number,
      "grand_total_amount": number,
      "currency_code": string,
      "show_grand_total": boolean,
      "status": Database["public"]["Enums"]["quotation_status"],
      "pdf_storage_path": string | null,
      "rendered_payload": Json,
      "generated_at": string,
      "created_at": string,
      "updated_at": string,
      "created_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "created_by": string,
      "customer_id": string | null,
      "buyer_name": string,
      "buyer_phone": string | null,
      "seller_name": string | null,
      "seller_phone": string | null,
      "selected_company_ids": Json | null,
      "extra_discount_percent": number | null,
      "subtotal_amount": number | null,
      "discount_amount": number | null,
      "grand_total_amount": number | null,
      "currency_code": string | null,
      "show_grand_total": boolean | null,
      "status": Database["public"]["Enums"]["quotation_status"] | null,
      "pdf_storage_path": string | null,
      "rendered_payload": Json | null,
      "generated_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "created_by": string | null,
      "customer_id": string | null,
      "buyer_name": string | null,
      "buyer_phone": string | null,
      "seller_name": string | null,
      "seller_phone": string | null,
      "selected_company_ids": Json | null,
      "extra_discount_percent": number | null,
      "subtotal_amount": number | null,
      "discount_amount": number | null,
      "grand_total_amount": number | null,
      "currency_code": string | null,
      "show_grand_total": boolean | null,
      "status": Database["public"]["Enums"]["quotation_status"] | null,
      "pdf_storage_path": string | null,
      "rendered_payload": Json | null,
      "generated_at": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "created_by_full_name": string | null
      }
        Relationships: []
      }
      "role_definitions": {
        Row: {
      "role": Database["public"]["Enums"]["app_role"],
      "label": string,
      "description": string,
      "default_home_path": string,
      "is_management": boolean,
      "is_assignable": boolean,
      "sort_order": number,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "role": Database["public"]["Enums"]["app_role"],
      "label": string,
      "description": string,
      "default_home_path": string | null,
      "is_management": boolean | null,
      "is_assignable": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "role": Database["public"]["Enums"]["app_role"] | null,
      "label": string | null,
      "description": string | null,
      "default_home_path": string | null,
      "is_management": boolean | null,
      "is_assignable": boolean | null,
      "sort_order": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "role_permission_assignments": {
        Row: {
      "role": Database["public"]["Enums"]["app_role"],
      "permission_key": string,
      "created_by": string | null,
      "created_at": string,
      "created_by_full_name": string | null
      }
        Insert: {
      "role": Database["public"]["Enums"]["app_role"],
      "permission_key": string,
      "created_by": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null
      }
        Update: {
      "role": Database["public"]["Enums"]["app_role"] | null,
      "permission_key": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "created_by_full_name": string | null
      }
        Relationships: []
      }
      "sales_brand_mappings": {
        Row: {
      "brand_key": string,
      "brand_name_ar": string,
      "brand_name_en": string | null,
      "example_products": string[],
      "sort_order": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "brand_key": string,
      "brand_name_ar": string,
      "brand_name_en": string | null,
      "example_products": string[] | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "brand_key": string | null,
      "brand_name_ar": string | null,
      "brand_name_en": string | null,
      "example_products": string[] | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "sales_customer_speciality_mappings": {
        Row: {
      "customer_type_key": string,
      "speciality_key": string,
      "speciality_name_ar": string,
      "sort_order": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "customer_type_key": string,
      "speciality_key": string,
      "speciality_name_ar": string,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "customer_type_key": string | null,
      "speciality_key": string | null,
      "speciality_name_ar": string | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "sales_customer_type_mappings": {
        Row: {
      "customer_type_key": string,
      "customer_type_name_ar": string,
      "description_ar": string,
      "sort_order": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "customer_type_key": string,
      "customer_type_name_ar": string,
      "description_ar": string,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "customer_type_key": string | null,
      "customer_type_name_ar": string | null,
      "description_ar": string | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "sales_product_category_mappings": {
        Row: {
      "category_key": string,
      "category_name_ar": string,
      "subcategory_key": string,
      "subcategory_name_ar": string,
      "sort_order": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "category_key": string,
      "category_name_ar": string,
      "subcategory_key": string,
      "subcategory_name_ar": string,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "category_key": string | null,
      "category_name_ar": string | null,
      "subcategory_key": string | null,
      "subcategory_name_ar": string | null,
      "sort_order": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "sales_product_customer_mappings": {
        Row: {
      "external_product_id": string,
      "product_name": string,
      "brand_key": string,
      "brand_name_ar": string,
      "category_key": string,
      "category_name_ar": string,
      "subcategory_key": string,
      "subcategory_name_ar": string,
      "customer_specialities": string[],
      "customer_types": string[],
      "is_active": boolean,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "external_product_id": string,
      "product_name": string,
      "brand_key": string,
      "brand_name_ar": string,
      "category_key": string,
      "category_name_ar": string,
      "subcategory_key": string,
      "subcategory_name_ar": string,
      "customer_specialities": string[] | null,
      "customer_types": string[] | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "external_product_id": string | null,
      "product_name": string | null,
      "brand_key": string | null,
      "brand_name_ar": string | null,
      "category_key": string | null,
      "category_name_ar": string | null,
      "subcategory_key": string | null,
      "subcategory_name_ar": string | null,
      "customer_specialities": string[] | null,
      "customer_types": string[] | null,
      "is_active": boolean | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "sales_targets": {
        Row: {
      "id": string,
      "user_id": string,
      "target_month": string,
      "target_visits": number,
      "target_calls": number,
      "target_reachability": number,
      "target_gmv": number,
      "target_quotations": number,
      "working_days": number,
      "assigned_by": string | null,
      "created_at": string,
      "updated_at": string,
      "user_id_full_name": string | null,
      "assigned_by_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "user_id": string,
      "target_month": string,
      "target_visits": number | null,
      "target_calls": number | null,
      "target_reachability": number | null,
      "target_gmv": number | null,
      "target_quotations": number | null,
      "working_days": number | null,
      "assigned_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "user_id_full_name": string | null,
      "assigned_by_full_name": string | null
      }
        Update: {
      "id": string | null,
      "user_id": string | null,
      "target_month": string | null,
      "target_visits": number | null,
      "target_calls": number | null,
      "target_reachability": number | null,
      "target_gmv": number | null,
      "target_quotations": number | null,
      "working_days": number | null,
      "assigned_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "user_id_full_name": string | null,
      "assigned_by_full_name": string | null
      }
        Relationships: []
      }
      "service_issues": {
        Row: {
      "id": string,
      "customer_id": string | null,
      "call_id": string | null,
      "issue_type": string,
      "details": string | null,
      "status": string,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "customer_id": string | null,
      "call_id": string | null,
      "issue_type": string,
      "details": string | null,
      "status": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "customer_id": string | null,
      "call_id": string | null,
      "issue_type": string | null,
      "details": string | null,
      "status": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "sla_breaches": {
        Row: {
      "id": string,
      "sla_definition_id": string,
      "entity_type": string,
      "entity_id": string,
      "breach_type": string,
      "breached_at": string,
      "resolved_at": string | null,
      "notified": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "sla_definition_id": string,
      "entity_type": string,
      "entity_id": string,
      "breach_type": string,
      "breached_at": string | null,
      "resolved_at": string | null,
      "notified": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "sla_definition_id": string | null,
      "entity_type": string | null,
      "entity_id": string | null,
      "breach_type": string | null,
      "breached_at": string | null,
      "resolved_at": string | null,
      "notified": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "sla_definitions": {
        Row: {
      "id": string,
      "name": string,
      "entity_type": string,
      "target_hours": number,
      "warning_hours": number,
      "is_active": boolean,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "entity_type": string,
      "target_hours": number,
      "warning_hours": number,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "entity_type": string | null,
      "target_hours": number | null,
      "warning_hours": number | null,
      "is_active": boolean | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "suplyd_products_history": {
        Row: {
      "id": string | null,
      "batch_id": string,
      "product_id": string,
      "ref_id": number | null,
      "name": string | null,
      "arabic_name": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_unit": string | null,
      "brand_name": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "sub_category_name": string | null,
      "image_url": string | null,
      "scraped_at": string
      }
        Insert: {
      "id": string | null,
      "batch_id": string,
      "product_id": string,
      "ref_id": number | null,
      "name": string | null,
      "arabic_name": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_unit": string | null,
      "brand_name": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "sub_category_name": string | null,
      "image_url": string | null,
      "scraped_at": string | null
      }
        Update: {
      "id": string | null,
      "batch_id": string | null,
      "product_id": string | null,
      "ref_id": number | null,
      "name": string | null,
      "arabic_name": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_unit": string | null,
      "brand_name": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "sub_category_name": string | null,
      "image_url": string | null,
      "scraped_at": string | null
      }
        Relationships: []
      }
      "suplyd_products_live": {
        Row: {
      "id": string,
      "ref_id": number | null,
      "name": string,
      "arabic_name": string | null,
      "slug": string | null,
      "description": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_quantity": number | null,
      "container_unit": string | null,
      "unit_weight": number | null,
      "min_order_quantity": number | null,
      "max_order_quantity": number | null,
      "allow_beyond_stock": boolean | null,
      "is_package_required": boolean | null,
      "is_a_bundle": boolean | null,
      "delivery_lead_time": number | null,
      "storage_type": string | null,
      "is_notification_set": boolean | null,
      "entity_max_use_count": number | null,
      "monthly_consumption": number | null,
      "restock_date": string | null,
      "coins_usage_deactivated": boolean | null,
      "coins_needed_for_pao": number | null,
      "coins_value_per_unit": number | null,
      "brand_id": string | null,
      "brand_name": string | null,
      "brand_arabic_name": string | null,
      "brand_slug": string | null,
      "brand_is_local": boolean | null,
      "sub_category_id": string | null,
      "sub_category_name": string | null,
      "sub_category_arabic_name": string | null,
      "sub_category_slug": string | null,
      "category_id": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "category_slug": string | null,
      "image_url": string | null,
      "package_id": string | null,
      "package_ref_id": number | null,
      "package_name": string | null,
      "package_arabic_name": string | null,
      "package_discount_amount": number | null,
      "package_conversion_units": string | null,
      "package_product_conversion_count": number | null,
      "promotion_ids": string[] | null,
      "promotion_names": string[] | null,
      "promotion_types": string[] | null,
      "promotion_discounts": number[] | null,
      "bundle_child_ids": string[] | null,
      "bundle_child_names": string[] | null,
      "last_scraped_at": string,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string,
      "ref_id": number | null,
      "name": string,
      "arabic_name": string | null,
      "slug": string | null,
      "description": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_quantity": number | null,
      "container_unit": string | null,
      "unit_weight": number | null,
      "min_order_quantity": number | null,
      "max_order_quantity": number | null,
      "allow_beyond_stock": boolean | null,
      "is_package_required": boolean | null,
      "is_a_bundle": boolean | null,
      "delivery_lead_time": number | null,
      "storage_type": string | null,
      "is_notification_set": boolean | null,
      "entity_max_use_count": number | null,
      "monthly_consumption": number | null,
      "restock_date": string | null,
      "coins_usage_deactivated": boolean | null,
      "coins_needed_for_pao": number | null,
      "coins_value_per_unit": number | null,
      "brand_id": string | null,
      "brand_name": string | null,
      "brand_arabic_name": string | null,
      "brand_slug": string | null,
      "brand_is_local": boolean | null,
      "sub_category_id": string | null,
      "sub_category_name": string | null,
      "sub_category_arabic_name": string | null,
      "sub_category_slug": string | null,
      "category_id": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "category_slug": string | null,
      "image_url": string | null,
      "package_id": string | null,
      "package_ref_id": number | null,
      "package_name": string | null,
      "package_arabic_name": string | null,
      "package_discount_amount": number | null,
      "package_conversion_units": string | null,
      "package_product_conversion_count": number | null,
      "promotion_ids": string[] | null,
      "promotion_names": string[] | null,
      "promotion_types": string[] | null,
      "promotion_discounts": number[] | null,
      "bundle_child_ids": string[] | null,
      "bundle_child_names": string[] | null,
      "last_scraped_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "ref_id": number | null,
      "name": string | null,
      "arabic_name": string | null,
      "slug": string | null,
      "description": string | null,
      "price": number | null,
      "cost_per_unit": number | null,
      "tax_percentage": number | null,
      "stock_level": number | null,
      "unit": string | null,
      "base_unit": string | null,
      "base_unit_quantity": number | null,
      "container_quantity": number | null,
      "container_unit": string | null,
      "unit_weight": number | null,
      "min_order_quantity": number | null,
      "max_order_quantity": number | null,
      "allow_beyond_stock": boolean | null,
      "is_package_required": boolean | null,
      "is_a_bundle": boolean | null,
      "delivery_lead_time": number | null,
      "storage_type": string | null,
      "is_notification_set": boolean | null,
      "entity_max_use_count": number | null,
      "monthly_consumption": number | null,
      "restock_date": string | null,
      "coins_usage_deactivated": boolean | null,
      "coins_needed_for_pao": number | null,
      "coins_value_per_unit": number | null,
      "brand_id": string | null,
      "brand_name": string | null,
      "brand_arabic_name": string | null,
      "brand_slug": string | null,
      "brand_is_local": boolean | null,
      "sub_category_id": string | null,
      "sub_category_name": string | null,
      "sub_category_arabic_name": string | null,
      "sub_category_slug": string | null,
      "category_id": string | null,
      "category_name": string | null,
      "category_arabic_name": string | null,
      "category_slug": string | null,
      "image_url": string | null,
      "package_id": string | null,
      "package_ref_id": number | null,
      "package_name": string | null,
      "package_arabic_name": string | null,
      "package_discount_amount": number | null,
      "package_conversion_units": string | null,
      "package_product_conversion_count": number | null,
      "promotion_ids": string[] | null,
      "promotion_names": string[] | null,
      "promotion_types": string[] | null,
      "promotion_discounts": number[] | null,
      "bundle_child_ids": string[] | null,
      "bundle_child_names": string[] | null,
      "last_scraped_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "suplyd_scrape_batches": {
        Row: {
      "id": string,
      "started_at": string,
      "completed_at": string | null,
      "status": string,
      "products_fetched": number | null,
      "products_upserted": number | null,
      "products_with_cost": number | null,
      "error_message": string | null,
      "metadata": Json | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "status": string | null,
      "products_fetched": number | null,
      "products_upserted": number | null,
      "products_with_cost": number | null,
      "error_message": string | null,
      "metadata": Json | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "started_at": string | null,
      "completed_at": string | null,
      "status": string | null,
      "products_fetched": number | null,
      "products_upserted": number | null,
      "products_with_cost": number | null,
      "error_message": string | null,
      "metadata": Json | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "tenants": {
        Row: {
      "id": string,
      "name": string,
      "slug": string,
      "logo_url": string | null,
      "status": string,
      "settings": Json,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "slug": string,
      "logo_url": string | null,
      "status": string | null,
      "settings": Json | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "slug": string | null,
      "logo_url": string | null,
      "status": string | null,
      "settings": Json | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "user_device_sessions": {
        Row: {
      "id": string,
      "user_id": string,
      "device_label": string | null,
      "device_id": string | null,
      "platform": string | null,
      "app_version": string | null,
      "push_token": string | null,
      "last_seen_at": string,
      "revoked_at": string | null,
      "created_at": string,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "user_id": string,
      "device_label": string | null,
      "device_id": string | null,
      "platform": string | null,
      "app_version": string | null,
      "push_token": string | null,
      "last_seen_at": string | null,
      "revoked_at": string | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "user_id": string | null,
      "device_label": string | null,
      "device_id": string | null,
      "platform": string | null,
      "app_version": string | null,
      "push_token": string | null,
      "last_seen_at": string | null,
      "revoked_at": string | null,
      "created_at": string | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "visit_dynamic_answers": {
        Row: {
      "id": string,
      "visit_id": string,
      "field_id": string,
      "answer_text": string | null,
      "answer_json": Json | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "visit_id": string,
      "field_id": string,
      "answer_text": string | null,
      "answer_json": Json | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "visit_id": string | null,
      "field_id": string | null,
      "answer_text": string | null,
      "answer_json": Json | null,
      "created_at": string | null
      }
        Relationships: []
      }
      "visit_note_translations": {
        Row: {
      "visit_id": string,
      "source_note": string,
      "translated_note": string,
      "updated_at": string
      }
        Insert: {
      "visit_id": string,
      "source_note": string,
      "translated_note": string,
      "updated_at": string | null
      }
        Update: {
      "visit_id": string | null,
      "source_note": string | null,
      "translated_note": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "visits": {
        Row: {
      "id": string,
      "customer_id": string,
      "user_id": string,
      "linked_order_id": string | null,
      "visit_result": string,
      "visit_mode": Database["public"]["Enums"]["visit_mode"],
      "note": string | null,
      "override_reason": string | null,
      "captured_photo_path": string | null,
      "started_at": string | null,
      "checked_in_at": string,
      "completed_at": string | null,
      "lat": number | null,
      "lng": number | null,
      "customer_distance_meters": number | null,
      "within_geofence": boolean | null,
      "fraud_score": number,
      "fraud_status": Database["public"]["Enums"]["fraud_status"],
      "fraud_signals": Json,
      "created_at": string,
      "updated_at": string,
      "source": string,
      "customer_external_id": string | null,
      "user_email": string | null,
      "raw_payload": Json,
      "raw_form_payload": Json,
      "user_uid": number | null,
      "user_name": string | null,
      "user_id_full_name": string | null
      }
        Insert: {
      "id": string | null,
      "customer_id": string,
      "user_id": string,
      "linked_order_id": string | null,
      "visit_result": string,
      "visit_mode": Database["public"]["Enums"]["visit_mode"] | null,
      "note": string | null,
      "override_reason": string | null,
      "captured_photo_path": string | null,
      "started_at": string | null,
      "checked_in_at": string | null,
      "completed_at": string | null,
      "lat": number | null,
      "lng": number | null,
      "customer_distance_meters": number | null,
      "within_geofence": boolean | null,
      "fraud_score": number | null,
      "fraud_status": Database["public"]["Enums"]["fraud_status"] | null,
      "fraud_signals": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "customer_external_id": string | null,
      "user_email": string | null,
      "raw_payload": Json | null,
      "raw_form_payload": Json | null,
      "user_uid": number | null,
      "user_name": string | null,
      "user_id_full_name": string | null
      }
        Update: {
      "id": string | null,
      "customer_id": string | null,
      "user_id": string | null,
      "linked_order_id": string | null,
      "visit_result": string | null,
      "visit_mode": Database["public"]["Enums"]["visit_mode"] | null,
      "note": string | null,
      "override_reason": string | null,
      "captured_photo_path": string | null,
      "started_at": string | null,
      "checked_in_at": string | null,
      "completed_at": string | null,
      "lat": number | null,
      "lng": number | null,
      "customer_distance_meters": number | null,
      "within_geofence": boolean | null,
      "fraud_score": number | null,
      "fraud_status": Database["public"]["Enums"]["fraud_status"] | null,
      "fraud_signals": Json | null,
      "created_at": string | null,
      "updated_at": string | null,
      "source": string | null,
      "customer_external_id": string | null,
      "user_email": string | null,
      "raw_payload": Json | null,
      "raw_form_payload": Json | null,
      "user_uid": number | null,
      "user_name": string | null,
      "user_id_full_name": string | null
      }
        Relationships: []
      }
      "warehouse_inventory": {
        Row: {
      "id": string,
      "warehouse_id": string,
      "product_id": string,
      "external_product_id": string | null,
      "product_name": string,
      "product_ref": string | null,
      "quantity_on_hand": number,
      "incoming_quantity": number,
      "outgoing_quantity": number,
      "reserved_quantity": number,
      "average_cost": number,
      "sales_price": number,
      "unit_of_measure": string | null,
      "source": string,
      "raw_payload": Json,
      "last_sync_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "warehouse_id": string,
      "product_id": string,
      "external_product_id": string | null,
      "product_name": string | null,
      "product_ref": string | null,
      "quantity_on_hand": number | null,
      "incoming_quantity": number | null,
      "outgoing_quantity": number | null,
      "reserved_quantity": number | null,
      "average_cost": number | null,
      "sales_price": number | null,
      "unit_of_measure": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "warehouse_id": string | null,
      "product_id": string | null,
      "external_product_id": string | null,
      "product_name": string | null,
      "product_ref": string | null,
      "quantity_on_hand": number | null,
      "incoming_quantity": number | null,
      "outgoing_quantity": number | null,
      "reserved_quantity": number | null,
      "average_cost": number | null,
      "sales_price": number | null,
      "unit_of_measure": string | null,
      "source": string | null,
      "raw_payload": Json | null,
      "last_sync_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "supabase_partners": {
        Row: {
      "id": number,
      "name": string | null,
      "ref": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "city": string | null,
      "region": string | null,
      "area": string | null,
      "street": string | null,
      "user_id": number | null,
      "company_id": number | null,
      "is_customer": boolean | null,
      "is_company": boolean | null,
      "active": boolean | null,
      "parent_id": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Insert: {
      "id": number,
      "name": string | null,
      "ref": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "city": string | null,
      "region": string | null,
      "area": string | null,
      "street": string | null,
      "user_id": number | null,
      "company_id": number | null,
      "is_customer": boolean | null,
      "is_company": boolean | null,
      "active": boolean | null,
      "parent_id": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": number | null,
      "name": string | null,
      "ref": string | null,
      "email": string | null,
      "phone": string | null,
      "mobile": string | null,
      "city": string | null,
      "region": string | null,
      "area": string | null,
      "street": string | null,
      "user_id": number | null,
      "company_id": number | null,
      "is_customer": boolean | null,
      "is_company": boolean | null,
      "active": boolean | null,
      "parent_id": number | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "odoo_users": {
        Row: {
      "id": number,
      "name": string | null,
      "login": string | null,
      "email": string | null,
      "company_id": number | null,
      "active": boolean | null
      }
        Insert: {
      "id": number,
      "name": string | null,
      "login": string | null,
      "email": string | null,
      "company_id": number | null,
      "active": boolean | null
      }
        Update: {
      "id": number | null,
      "name": string | null,
      "login": string | null,
      "email": string | null,
      "company_id": number | null,
      "active": boolean | null
      }
        Relationships: []
      }
      "procurement_intercompany_customer_exclusions": {
        Row: {
      "id": number,
      "company_id": number | null,
      "normalized_customer_name": string | null,
      "is_active": boolean | null
      }
        Insert: {
      "id": number | null,
      "company_id": number | null,
      "normalized_customer_name": string | null,
      "is_active": boolean | null
      }
        Update: {
      "id": number | null,
      "company_id": number | null,
      "normalized_customer_name": string | null,
      "is_active": boolean | null
      }
        Relationships: []
      }
      "customer_geography_odoo18": {
        Row: {
      "customer_id": number,
      "governorate_code": string | null,
      "area_code": string | null,
      "governorate_name": string | null,
      "area_name": string | null
      }
        Insert: {
      "customer_id": number,
      "governorate_code": string | null,
      "area_code": string | null,
      "governorate_name": string | null,
      "area_name": string | null
      }
        Update: {
      "customer_id": number | null,
      "governorate_code": string | null,
      "area_code": string | null,
      "governorate_name": string | null,
      "area_name": string | null
      }
        Relationships: []
      }
      "analytics_catalog": {
        Row: {
      "object_name": string,
      "object_type": string | null,
      "domain": string | null,
      "description": string | null,
      "status": string | null,
      "refresh_frequency": string | null,
      "primary_key": string | null,
      "date_field": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Insert: {
      "object_name": string,
      "object_type": string | null,
      "domain": string | null,
      "description": string | null,
      "status": string | null,
      "refresh_frequency": string | null,
      "primary_key": string | null,
      "date_field": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "object_name": string | null,
      "object_type": string | null,
      "domain": string | null,
      "description": string | null,
      "status": string | null,
      "refresh_frequency": string | null,
      "primary_key": string | null,
      "date_field": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "ticket_items": {
        Row: {
      "id": string,
      "ticket_id": string,
      "order_line_item_id": string | null,
      "product_name": string,
      "product_code": string | null,
      "category": string | null,
      "priority": Database["public"]["Enums"]["ticket_priority"],
      "description": string | null,
      "due_date": string | null,
      "assigned_departments": string[],
      "assigned_user_ids": string[],
      "status": Database["public"]["Enums"]["ticket_status"],
      "resolved_at": string | null,
      "created_at": string,
      "updated_at": string
      }
        Insert: {
      "id": string | null,
      "ticket_id": string,
      "order_line_item_id": string | null,
      "product_name": string,
      "product_code": string | null,
      "category": string | null,
      "priority": Database["public"]["Enums"]["ticket_priority"] | null,
      "description": string | null,
      "due_date": string | null,
      "assigned_departments": string[] | null,
      "assigned_user_ids": string[] | null,
      "status": Database["public"]["Enums"]["ticket_status"] | null,
      "resolved_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Update: {
      "id": string | null,
      "ticket_id": string | null,
      "order_line_item_id": string | null,
      "product_name": string | null,
      "product_code": string | null,
      "category": string | null,
      "priority": Database["public"]["Enums"]["ticket_priority"] | null,
      "description": string | null,
      "due_date": string | null,
      "assigned_departments": string[] | null,
      "assigned_user_ids": string[] | null,
      "status": Database["public"]["Enums"]["ticket_status"] | null,
      "resolved_at": string | null,
      "created_at": string | null,
      "updated_at": string | null
      }
        Relationships: []
      }
      "coding_tree": {
        Row: {
      "dept_digit": number,
      "sub_digits": number | null,
      "main_category": string,
      "sub_category": string | null,
      "sort_order": number,
      "created_at": string,
      "id": number
      }
        Insert: {
      "dept_digit": number,
      "sub_digits": number | null,
      "main_category": string,
      "sub_category": string | null,
      "sort_order": number | null,
      "created_at": string | null,
      "id": number | null
      }
        Update: {
      "dept_digit": number | null,
      "sub_digits": number | null,
      "main_category": string | null,
      "sub_category": string | null,
      "sort_order": number | null,
      "created_at": string | null,
      "id": number | null
      }
        Relationships: []
      }
      "product_coding": {
        Row: {
      "new_code": string,
      "old_code": string | null,
      "external_product_id": string | null,
      "original_name": string,
      "normalized_name": string,
      "english_name": string,
      "main_category": string,
      "sub_category": string,
      "sale_price": number,
      "cost": number,
      "is_active": boolean,
      "validation_status": string,
      "validation_notes": string,
      "source": string,
      "created_by": string | null,
      "created_at": string,
      "updated_at": string,
      "brand": string | null,
      "brand_normalized": string | null,
      "barcode": string | null,
      "hs_code": string | null,
      "product_type": string | null,
      "track_method": string | null,
      "is_storable": boolean | null,
      "sale_ok": boolean | null,
      "purchase_ok": boolean | null,
      "weight": number | null,
      "volume": number | null,
      "uom_sale": string | null,
      "uom_purchase": string | null,
      "country_of_origin": string | null,
      "use_expiration": boolean | null,
      "expiry_days": number | null,
      "best_before_days": number | null,
      "tags": string | null,
      "taxes_sale": string | null,
      "taxes_purchase": string | null,
      "note": string | null,
      "description_sale": string | null,
      "description_purchase": string | null,
      "sale_delay": number | null,
      "purchase_method": string | null,
      "invoice_policy": string | null,
      "alert_time": number | null,
      "removal_time": number | null,
      "reordering_min_qty": number | null,
      "reordering_max_qty": number | null,
      "warehouse": string | null,
      "location": string | null
      }
        Insert: {
      "new_code": string,
      "old_code": string | null,
      "external_product_id": string | null,
      "original_name": string,
      "normalized_name": string | null,
      "english_name": string | null,
      "main_category": string,
      "sub_category": string,
      "sale_price": number | null,
      "cost": number | null,
      "is_active": boolean | null,
      "validation_status": string | null,
      "validation_notes": string | null,
      "source": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "brand": string | null,
      "brand_normalized": string | null,
      "barcode": string | null,
      "hs_code": string | null,
      "product_type": string | null,
      "track_method": string | null,
      "is_storable": boolean | null,
      "sale_ok": boolean | null,
      "purchase_ok": boolean | null,
      "weight": number | null,
      "volume": number | null,
      "uom_sale": string | null,
      "uom_purchase": string | null,
      "country_of_origin": string | null,
      "use_expiration": boolean | null,
      "expiry_days": number | null,
      "best_before_days": number | null,
      "tags": string | null,
      "taxes_sale": string | null,
      "taxes_purchase": string | null,
      "note": string | null,
      "description_sale": string | null,
      "description_purchase": string | null,
      "sale_delay": number | null,
      "purchase_method": string | null,
      "invoice_policy": string | null,
      "alert_time": number | null,
      "removal_time": number | null,
      "reordering_min_qty": number | null,
      "reordering_max_qty": number | null,
      "warehouse": string | null,
      "location": string | null
      }
        Update: {
      "new_code": string | null,
      "old_code": string | null,
      "external_product_id": string | null,
      "original_name": string | null,
      "normalized_name": string | null,
      "english_name": string | null,
      "main_category": string | null,
      "sub_category": string | null,
      "sale_price": number | null,
      "cost": number | null,
      "is_active": boolean | null,
      "validation_status": string | null,
      "validation_notes": string | null,
      "source": string | null,
      "created_by": string | null,
      "created_at": string | null,
      "updated_at": string | null,
      "brand": string | null,
      "brand_normalized": string | null,
      "barcode": string | null,
      "hs_code": string | null,
      "product_type": string | null,
      "track_method": string | null,
      "is_storable": boolean | null,
      "sale_ok": boolean | null,
      "purchase_ok": boolean | null,
      "weight": number | null,
      "volume": number | null,
      "uom_sale": string | null,
      "uom_purchase": string | null,
      "country_of_origin": string | null,
      "use_expiration": boolean | null,
      "expiry_days": number | null,
      "best_before_days": number | null,
      "tags": string | null,
      "taxes_sale": string | null,
      "taxes_purchase": string | null,
      "note": string | null,
      "description_sale": string | null,
      "description_purchase": string | null,
      "sale_delay": number | null,
      "purchase_method": string | null,
      "invoice_policy": string | null,
      "alert_time": number | null,
      "removal_time": number | null,
      "reordering_min_qty": number | null,
      "reordering_max_qty": number | null,
      "warehouse": string | null,
      "location": string | null
      }
        Relationships: []
      }
      "product_brands": {
        Row: {
      "id": string,
      "name": string,
      "name_normalized": string,
      "name_en": string,
      "sort_order": number,
      "created_by": string | null,
      "created_at": string
      }
        Insert: {
      "id": string | null,
      "name": string,
      "name_normalized": string,
      "name_en": string | null,
      "sort_order": number | null,
      "created_by": string | null,
      "created_at": string | null
      }
        Update: {
      "id": string | null,
      "name": string | null,
      "name_normalized": string | null,
      "name_en": string | null,
      "sort_order": number | null,
      "created_by": string | null,
      "created_at": string | null
      }
        Relationships: []
      }
    }
    Views: {
      "v_balance_sheet": {
        Row: {
      "account_code": string | null,
      "account_name": string | null,
      "account_type": string | null,
      "total_debit": number | null,
      "total_credit": number | null,
      "balance": number | null,
      "bs_category": string | null
      }
      }
      "v_profit_and_loss": {
        Row: {
      "account_code": string | null,
      "account_name": string | null,
      "account_type": string | null,
      "total_debit": number | null,
      "total_credit": number | null,
      "balance": number | null,
      "pl_category": string | null
      }
      }
      "active_drivers_view": {
        Row: {
      "id": string | null,
      "full_name": string | null,
      "latitude": number | null,
      "longitude": number | null,
      "accuracy": number | null,
      "active_shipments": number | null,
      "updated_at": string | null
      }
      }
      "agent_performance_snapshot": {
        Row: {
      "user_id": string | null,
      "full_name": string | null,
      "email": string | null,
      "role": Database["public"]["Enums"]["app_role"] | null,
      "target_month": string | null,
      "target_visits": number | null,
      "target_calls": number | null,
      "target_reachability": number | null,
      "target_gmv": number | null,
      "target_quotations": number | null,
      "actual_visits": number | null,
      "actual_calls": number | null,
      "actual_reachability": number | null,
      "actual_quotations": number | null,
      "actual_orders": number | null,
      "actual_gmv": number | null,
      "unique_customers_visited": number | null,
      "suspicious_visits": number | null,
      "fraudulent_visits": number | null
      }
      }
      "shipment_reconciliation": {
        Row: {
      "shipment_id": string | null,
      "shipment_reference": string | null,
      "delivery_phase": string | null,
      "shipment_status": string | null,
      "order_id": string | null,
      "external_order_id": string | null,
      "order_status": Database["public"]["Enums"]["order_status"] | null,
      "order_delivery_status": string | null,
      "order_amount": number | null,
      "shipment_completed_at": string | null,
      "order_delivered_at": string | null,
      "reconciliation_status": string | null
      }
      }
      "v_ar_aging": {
        Row: {
      "customer_id": string | null,
      "invoice_id": string | null,
      "invoice_number": string | null,
      "issue_date": string | null,
      "due_date": string | null,
      "invoice_total": number | null,
      "aging_bucket": string | null,
      "days_overdue": number | null
      }
      }
      "v_general_ledger": {
        Row: {
      "entry_id": string | null,
      "entry_number": string | null,
      "entry_date": string | null,
      "source_type": string | null,
      "source_id": string | null,
      "entry_description": string | null,
      "status": string | null,
      "line_id": string | null,
      "account_code": string | null,
      "account_name": string | null,
      "debit": number | null,
      "credit": number | null,
      "line_description": string | null,
      "cost_center_id": string | null,
      "cost_center_name": string | null,
      "posted_by": string | null,
      "created_at": string | null
      }
      }
      "v_trial_balance": {
        Row: {
      "account_code": string | null,
      "account_name": string | null,
      "account_type": string | null,
      "debit_balance": number | null,
      "credit_balance": number | null
      }
      }
      "logistics_user_warehouse_links": {
        Row: {
      "logistics_user_id": string | null,
      "assigned_profile_id": string | null,
      "external_user_id": string | null,
      "assigned_user_name": string | null,
      "assigned_job_title": string | null,
      "warehouse_id": string | null,
      "external_warehouse_id": string | null,
      "warehouse_name": string | null,
      "shipment_count": number | null,
      "last_sync_at": string | null
      }
      }
      "salespersons_odoo": {
        Row: {
      "user_id": number | null,
      "salesperson_name": string | null,
      "company_id": number | null,
      "customer_count": number | null
      }
      }
      "sales_orders_odoo18_geo": {
        Row: {
      "order_id": number | null,
      "order_name": string | null,
      "order_date": string | null,
      "order_date_cairo": string | null,
      "order_month": string | null,
      "company_id": number | null,
      "company_name": string | null,
      "customer_id": number | null,
      "customer_name": string | null,
      "salesperson": string | null,
      "warehouse_id": number | null,
      "warehouse_name": string | null,
      "lines_count": number | null,
      "products_count": number | null,
      "total_qty": number | null,
      "order_value": number | null,
      "source_updated_at": string | null,
      "governorate_code": string | null,
      "governorate_name_ar": string | null,
      "area_code": string | null,
      "area_name_ar": string | null,
      "geography_source": string | null,
      "geography_confidence": number | null,
      "geography_needs_review": boolean | null
      }
      }
      "product_sales_from_june1": {
        Row: {
      "odoo_line_id": number | null,
      "order_id": number | null,
      "order_name": string | null,
      "order_date": string | null,
      "customer_id": number | null,
      "customer_name": string | null,
      "salesperson": string | null,
      "product_id": number | null,
      "product_name": string | null,
      "product_category": string | null,
      "company_id": number | null,
      "company_name": string | null,
      "warehouse_id": number | null,
      "warehouse_name": string | null,
      "qty_sold": number | null,
      "subtotal": number | null,
      "state": string | null,
      "updated_at": string | null
      }
      }
    }
    Functions: {
      "regexp_split_to_table": {
        Args: any
        Returns: any
      }
      "regexp_split_to_table": {
        Args: any
        Returns: any
      }
      "strpos": {
        Args: any
        Returns: any
      }
      "replace": {
        Args: any
        Returns: any
      }
      "split_part": {
        Args: any
        Returns: any
      }
      "translate": {
        Args: any
        Returns: any
      }
      "citext_pattern_lt": {
        Args: any
        Returns: any
      }
      "citext_pattern_le": {
        Args: any
        Returns: any
      }
      "citext_pattern_gt": {
        Args: any
        Returns: any
      }
      "citext_pattern_ge": {
        Args: any
        Returns: any
      }
      "citext_pattern_cmp": {
        Args: any
        Returns: any
      }
      "citext_hash_extended": {
        Args: any
        Returns: any
      }
      "set_limit": {
        Args: any
        Returns: any
      }
      "show_limit": {
        Args: any
        Returns: any
      }
      "show_trgm": {
        Args: any
        Returns: any
      }
      "similarity": {
        Args: any
        Returns: any
      }
      "similarity_op": {
        Args: any
        Returns: any
      }
      "word_similarity": {
        Args: any
        Returns: any
      }
      "word_similarity_dist_op": {
        Args: any
        Returns: any
      }
      "word_similarity_dist_commutator_op": {
        Args: any
        Returns: any
      }
      "gtrgm_in": {
        Args: any
        Returns: any
      }
      "gtrgm_out": {
        Args: any
        Returns: any
      }
      "word_similarity_op": {
        Args: any
        Returns: any
      }
      "word_similarity_commutator_op": {
        Args: any
        Returns: any
      }
      "similarity_dist": {
        Args: any
        Returns: any
      }
      "gtrgm_consistent": {
        Args: any
        Returns: any
      }
      "gtrgm_distance": {
        Args: any
        Returns: any
      }
      "gtrgm_compress": {
        Args: any
        Returns: any
      }
      "gtrgm_decompress": {
        Args: any
        Returns: any
      }
      "gtrgm_penalty": {
        Args: any
        Returns: any
      }
      "gtrgm_picksplit": {
        Args: any
        Returns: any
      }
      "gtrgm_union": {
        Args: any
        Returns: any
      }
      "gtrgm_same": {
        Args: any
        Returns: any
      }
      "gin_extract_value_trgm": {
        Args: any
        Returns: any
      }
      "gin_extract_query_trgm": {
        Args: any
        Returns: any
      }
      "gin_trgm_consistent": {
        Args: any
        Returns: any
      }
      "gin_trgm_triconsistent": {
        Args: any
        Returns: any
      }
      "strict_word_similarity": {
        Args: any
        Returns: any
      }
      "strict_word_similarity_op": {
        Args: any
        Returns: any
      }
      "strict_word_similarity_commutator_op": {
        Args: any
        Returns: any
      }
      "strict_word_similarity_dist_op": {
        Args: any
        Returns: any
      }
      "strict_word_similarity_dist_commutator_op": {
        Args: any
        Returns: any
      }
      "gtrgm_options": {
        Args: any
        Returns: any
      }
      "handle_new_auth_user": {
        Args: any
        Returns: any
      }
      "get_odoo_action_audit_log": {
        Args: any
        Returns: any
      }
      "admin_mark_settlement_paid": {
        Args: any
        Returns: any
      }
      "get_odoo_action_counts": {
        Args: any
        Returns: any
      }
      "texticlike": {
        Args: any
        Returns: any
      }
      "texticnlike": {
        Args: any
        Returns: any
      }
      "texticregexeq": {
        Args: any
        Returns: any
      }
      "texticregexne": {
        Args: any
        Returns: any
      }
      "texticlike": {
        Args: any
        Returns: any
      }
      "texticnlike": {
        Args: any
        Returns: any
      }
      "texticregexeq": {
        Args: any
        Returns: any
      }
      "texticregexne": {
        Args: any
        Returns: any
      }
      "regexp_match": {
        Args: any
        Returns: any
      }
      "regexp_match": {
        Args: any
        Returns: any
      }
      "regexp_matches": {
        Args: any
        Returns: any
      }
      "regexp_matches": {
        Args: any
        Returns: any
      }
      "regexp_replace": {
        Args: any
        Returns: any
      }
      "regexp_replace": {
        Args: any
        Returns: any
      }
      "regexp_split_to_array": {
        Args: any
        Returns: any
      }
      "regexp_split_to_array": {
        Args: any
        Returns: any
      }
      "citextin": {
        Args: any
        Returns: any
      }
      "citextout": {
        Args: any
        Returns: any
      }
      "citextrecv": {
        Args: any
        Returns: any
      }
      "citextsend": {
        Args: any
        Returns: any
      }
      "citext": {
        Args: any
        Returns: any
      }
      "citext": {
        Args: any
        Returns: any
      }
      "citext": {
        Args: any
        Returns: any
      }
      "citext_eq": {
        Args: any
        Returns: any
      }
      "citext_ne": {
        Args: any
        Returns: any
      }
      "citext_lt": {
        Args: any
        Returns: any
      }
      "citext_le": {
        Args: any
        Returns: any
      }
      "citext_gt": {
        Args: any
        Returns: any
      }
      "citext_ge": {
        Args: any
        Returns: any
      }
      "citext_cmp": {
        Args: any
        Returns: any
      }
      "citext_hash": {
        Args: any
        Returns: any
      }
      "citext_smaller": {
        Args: any
        Returns: any
      }
      "citext_larger": {
        Args: any
        Returns: any
      }
      "admin_assign_order_to_driver": {
        Args: any
        Returns: any
      }
      "admin_cancel_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_create_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_create_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_complete_plan_close_shipments": {
        Args: any
        Returns: any
      }
      "admin_confirm_shipment_collection": {
        Args: any
        Returns: any
      }
      "admin_get_collection_checks": {
        Args: any
        Returns: any
      }
      "admin_remove_shipment_from_plan_any_status": {
        Args: any
        Returns: any
      }
      "admin_review_settlement_request": {
        Args: any
        Returns: any
      }
      "admin_remove_shipment_from_plan": {
        Args: any
        Returns: any
      }
      "approve_driver_settlement": {
        Args: any
        Returns: any
      }
      "approve_odoo_pending_action": {
        Args: any
        Returns: any
      }
      "assign_customer": {
        Args: any
        Returns: any
      }
      "admin_update_profile_access": {
        Args: any
        Returns: any
      }
      "admin_update_shipment_status": {
        Args: any
        Returns: any
      }
      "calculate_haversine_meters": {
        Args: any
        Returns: any
      }
      "calls_set_user_uid": {
        Args: any
        Returns: any
      }
      "cancel_order": {
        Args: any
        Returns: any
      }
      "build_products_odoo_insert": {
        Args: any
        Returns: any
      }
      "close_fiscal_period": {
        Args: any
        Returns: any
      }
      "complete_forced_password_change": {
        Args: any
        Returns: any
      }
      "create_system_notification_for_users": {
        Args: any
        Returns: any
      }
      "current_app_role": {
        Args: any
        Returns: any
      }
      "debug_crm_sync": {
        Args: any
        Returns: any
      }
      "dispatcher_bulk_mark_all_ready": {
        Args: any
        Returns: any
      }
      "create_order_intent_from_visit": {
        Args: any
        Returns: any
      }
      "create_system_notification_for_roles": {
        Args: any
        Returns: any
      }
      "customer_interactions_set_user_uid": {
        Args: any
        Returns: any
      }
      "dispatcher_get_plan_items": {
        Args: any
        Returns: any
      }
      "driver_update_shipment_phase": {
        Args: any
        Returns: any
      }
      "driver_append_route_breadcrumb": {
        Args: any
        Returns: any
      }
      "driver_create_sos_alert": {
        Args: any
        Returns: any
      }
      "driver_finish_delivery_route": {
        Args: any
        Returns: any
      }
      "driver_get_plan_collection_checks": {
        Args: any
        Returns: any
      }
      "driver_get_settlement_requests": {
        Args: any
        Returns: any
      }
      "driver_update_shipment_phase": {
        Args: any
        Returns: any
      }
      "driver_start_delivery_route": {
        Args: any
        Returns: any
      }
      "driver_start_route_tracking": {
        Args: any
        Returns: any
      }
      "fail_odoo_action": {
        Args: any
        Returns: any
      }
      "driver_submit_collection_request": {
        Args: any
        Returns: any
      }
      "driver_submit_order_collections": {
        Args: any
        Returns: any
      }
      "driver_submit_collection_handover": {
        Args: any
        Returns: any
      }
      "driver_submit_collection_check": {
        Args: any
        Returns: any
      }
      "driver_update_shipment_items": {
        Args: any
        Returns: any
      }
      "driver_update_shipment_phase": {
        Args: any
        Returns: any
      }
      "driver_submit_route_settlement": {
        Args: any
        Returns: any
      }
      "driver_update_plan_status": {
        Args: any
        Returns: any
      }
      "logistics_record_shipment_status_history": {
        Args: any
        Returns: any
      }
      "force_logout_user": {
        Args: any
        Returns: any
      }
      "generate_invoice_from_order": {
        Args: any
        Returns: any
      }
      "get_all_kpi_actuals": {
        Args: any
        Returns: any
      }
      "get_leaderboard": {
        Args: any
        Returns: any
      }
      "get_individual_kpi_per_agent": {
        Args: any
        Returns: any
      }
      "get_rep_route_visits": {
        Args: any
        Returns: any
      }
      "get_unread_notification_count": {
        Args: any
        Returns: any
      }
      "get_rep_route_summary": {
        Args: any
        Returns: any
      }
      "has_role_permission": {
        Args: any
        Returns: any
      }
      "is_admin_role": {
        Args: any
        Returns: any
      }
      "is_management_role": {
        Args: any
        Returns: any
      }
      "is_reachable_call": {
        Args: any
        Returns: any
      }
      "logistics_admin_required": {
        Args: any
        Returns: any
      }
      "log_audit_event": {
        Args: any
        Returns: any
      }
      "logistics_prevent_multiple_working_plans": {
        Args: any
        Returns: any
      }
      "logistics_delivery_phase_from_status": {
        Args: any
        Returns: any
      }
      "logistics_distance_km": {
        Args: any
        Returns: any
      }
      "logistics_driver_phase_rank": {
        Args: any
        Returns: any
      }
      "logistics_hydrate_shipment_route_data": {
        Args: any
        Returns: any
      }
      "logistics_prevent_itemless_active_plan": {
        Args: any
        Returns: any
      }
      "next_payment_number": {
        Args: any
        Returns: any
      }
      "normalize_display_type": {
        Args: any
        Returns: any
      }
      "logistics_shipment_status_rank": {
        Args: any
        Returns: any
      }
      "map_delivery_phase_from_odoo_state": {
        Args: any
        Returns: any
      }
      "mark_notification_read": {
        Args: any
        Returns: any
      }
      "mark_odoo_action_sending": {
        Args: any
        Returns: any
      }
      "next_document_number": {
        Args: any
        Returns: any
      }
      "odoo_datetime": {
        Args: any
        Returns: any
      }
      "odoo_ref_id": {
        Args: any
        Returns: any
      }
      "orders_set_user_uid": {
        Args: any
        Returns: any
      }
      "post_credit_note": {
        Args: any
        Returns: any
      }
      "refresh_mv_account_balances": {
        Args: any
        Returns: any
      }
      "profiles_propagate_user_uid_to_calls": {
        Args: any
        Returns: any
      }
      "profiles_propagate_user_uid_to_customer_interactions": {
        Args: any
        Returns: any
      }
      "profiles_set_user_uid": {
        Args: any
        Returns: any
      }
      "raise_logistics_error": {
        Args: any
        Returns: any
      }
      "resolve_sla_breach": {
        Args: any
        Returns: any
      }
      "retry_odoo_action": {
        Args: any
        Returns: any
      }
      "reopen_fiscal_period": {
        Args: any
        Returns: any
      }
      "run_driver_settlement": {
        Args: any
        Returns: any
      }
      "self_update_profile": {
        Args: any
        Returns: any
      }
      "set_calls_odoo_insert_payload": {
        Args: any
        Returns: any
      }
      "rls_auto_enable": {
        Args: any
        Returns: any
      }
      "set_finance_payments_updated_at": {
        Args: any
        Returns: any
      }
      "set_odoo_action_status": {
        Args: any
        Returns: any
      }
      "set_odoo_pending_action_updated_at": {
        Args: any
        Returns: any
      }
      "set_order_tickets_updated_at": {
        Args: any
        Returns: any
      }
      "set_orders_odoo_insert_payload": {
        Args: any
        Returns: any
      }
      "set_products_odoo_insert_payload": {
        Args: any
        Returns: any
      }
      "set_updated_at": {
        Args: any
        Returns: any
      }
      "set_finance_driver_settlements_updated_at": {
        Args: any
        Returns: any
      }
      "set_finance_invoices_updated_at": {
        Args: any
        Returns: any
      }
      "build_orders_odoo_insert": {
        Args: any
        Returns: any
      }
      "sync_logistics_user_from_profile": {
        Args: any
        Returns: any
      }
      "update_driver_cash_balance_updated_at": {
        Args: any
        Returns: any
      }
      "update_logistics_route_settlements_updated_at": {
        Args: any
        Returns: any
      }
      "visits_set_user_uid": {
        Args: any
        Returns: any
      }
      "admin_approve_collection_request": {
        Args: any
        Returns: any
      }
      "admin_set_plan_stop_sequence": {
        Args: any
        Returns: any
      }
      "admin_create_manual_stop": {
        Args: any
        Returns: any
      }
      "admin_optimize_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_review_collection_check": {
        Args: any
        Returns: any
      }
      "admin_create_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_reject_collection_request": {
        Args: any
        Returns: any
      }
      "check_sla_breaches": {
        Args: any
        Returns: any
      }
      "assign_customers_by_district": {
        Args: any
        Returns: any
      }
      "complete_odoo_action": {
        Args: any
        Returns: any
      }
      "dispatcher_confirm_plan_item": {
        Args: any
        Returns: any
      }
      "dispatcher_receive_returned_item": {
        Args: any
        Returns: any
      }
      "dispatcher_start_plan_preparation": {
        Args: any
        Returns: any
      }
      "dispatcher_complete_plan_preparation": {
        Args: any
        Returns: any
      }
      "driver_get_route_settlements": {
        Args: any
        Returns: any
      }
      "driver_record_cash_payment": {
        Args: any
        Returns: any
      }
      "driver_start_route_tracking": {
        Args: any
        Returns: any
      }
      "driver_get_cash_balance": {
        Args: any
        Returns: any
      }
      "finance_review_settlement": {
        Args: any
        Returns: any
      }
      "get_ar_aging_report": {
        Args: any
        Returns: any
      }
      "driver_submit_plan_settlement_request": {
        Args: any
        Returns: any
      }
      "get_order_delivery_reconciliation": {
        Args: any
        Returns: any
      }
      "invoke_scheduled_edge_function": {
        Args: any
        Returns: any
      }
      "logistics_shipment_status_from_phase": {
        Args: any
        Returns: any
      }
      "mark_settlement_paid": {
        Args: any
        Returns: any
      }
      "notify_logistics_shipment_business_events": {
        Args: any
        Returns: any
      }
      "post_credit_note": {
        Args: any
        Returns: any
      }
      "logistics_refresh_customer_shipment_route_data": {
        Args: any
        Returns: any
      }
      "analytics_filter_companies": {
        Args: any
        Returns: any
      }
      "reverse_journal_entry": {
        Args: any
        Returns: any
      }
      "dblink_open": {
        Args: any
        Returns: any
      }
      "dblink_open": {
        Args: any
        Returns: any
      }
      "dblink_open": {
        Args: any
        Returns: any
      }
      "set_department_roles": {
        Args: any
        Returns: any
      }
      "sync_logistics_shipment_items_from_order": {
        Args: any
        Returns: any
      }
      "dblink_disconnect": {
        Args: any
        Returns: any
      }
      "dblink_open": {
        Args: any
        Returns: any
      }
      "dblink_fetch": {
        Args: any
        Returns: any
      }
      "dblink_fetch": {
        Args: any
        Returns: any
      }
      "dblink_fetch": {
        Args: any
        Returns: any
      }
      "dblink_fetch": {
        Args: any
        Returns: any
      }
      "dblink_close": {
        Args: any
        Returns: any
      }
      "dblink_close": {
        Args: any
        Returns: any
      }
      "dblink_close": {
        Args: any
        Returns: any
      }
      "dblink_close": {
        Args: any
        Returns: any
      }
      "dblink": {
        Args: any
        Returns: any
      }
      "dblink": {
        Args: any
        Returns: any
      }
      "dblink": {
        Args: any
        Returns: any
      }
      "admin_assign_shipment_to_plan": {
        Args: any
        Returns: any
      }
      "admin_close_delivery_plan": {
        Args: any
        Returns: any
      }
      "dblink": {
        Args: any
        Returns: any
      }
      "dblink_exec": {
        Args: any
        Returns: any
      }
      "dblink_exec": {
        Args: any
        Returns: any
      }
      "dblink_exec": {
        Args: any
        Returns: any
      }
      "dblink_exec": {
        Args: any
        Returns: any
      }
      "dblink_get_pkey": {
        Args: any
        Returns: any
      }
      "dblink_build_sql_insert": {
        Args: any
        Returns: any
      }
      "dblink_build_sql_delete": {
        Args: any
        Returns: any
      }
      "dblink_build_sql_update": {
        Args: any
        Returns: any
      }
      "dblink_current_query": {
        Args: any
        Returns: any
      }
      "dblink_send_query": {
        Args: any
        Returns: any
      }
      "dblink_is_busy": {
        Args: any
        Returns: any
      }
      "dblink_get_result": {
        Args: any
        Returns: any
      }
      "dblink_get_result": {
        Args: any
        Returns: any
      }
      "admin_update_plan_status": {
        Args: any
        Returns: any
      }
      "claim_odoo_crm_activity_dispatch": {
        Args: any
        Returns: any
      }
      "create_odoo_pending_action": {
        Args: any
        Returns: any
      }
      "dispatcher_get_plan_orders": {
        Args: any
        Returns: any
      }
      "dblink_get_connections": {
        Args: any
        Returns: any
      }
      "dblink_cancel_query": {
        Args: any
        Returns: any
      }
      "dblink_error_message": {
        Args: any
        Returns: any
      }
      "dblink_get_notify": {
        Args: any
        Returns: any
      }
      "dblink_get_notify": {
        Args: any
        Returns: any
      }
      "driver_complete_route_tracking": {
        Args: any
        Returns: any
      }
      "driver_get_shipment_orders": {
        Args: any
        Returns: any
      }
      "driver_reorder_plan_shipments": {
        Args: any
        Returns: any
      }
      "driver_submit_collection_check": {
        Args: any
        Returns: any
      }
      "dblink_fdw_validator": {
        Args: any
        Returns: any
      }
      "dblink_connect_u": {
        Args: any
        Returns: any
      }
      "get_dashboard_summary": {
        Args: any
        Returns: any
      }
      "handle_new_logistics_profile": {
        Args: any
        Returns: any
      }
      "logistics_canonical_driver_phase": {
        Args: any
        Returns: any
      }
      "post_driver_settlement": {
        Args: any
        Returns: any
      }
      "post_journal_entry": {
        Args: any
        Returns: any
      }
      "dblink_connect_u": {
        Args: any
        Returns: any
      }
      "reverse_journal_entry": {
        Args: any
        Returns: any
      }
      "set_role_permissions": {
        Args: any
        Returns: any
      }
      "admin_bulk_assign_shipments_to_plan": {
        Args: any
        Returns: any
      }
      "admin_dispatch_delivery_plan": {
        Args: any
        Returns: any
      }
      "admin_get_driver_debts": {
        Args: any
        Returns: any
      }
      "build_calls_odoo_insert": {
        Args: any
        Returns: any
      }
      "confirm_payment": {
        Args: any
        Returns: any
      }
      "dispatcher_resync_plan_items": {
        Args: any
        Returns: any
      }
      "fn_audit_table_changes": {
        Args: any
        Returns: any
      }
      "get_customer_timeline": {
        Args: any
        Returns: any
      }
      "get_fraud_overview": {
        Args: any
        Returns: any
      }
      "get_orders_with_details": {
        Args: any
        Returns: any
      }
      "logistics_assert_plan_shipments_have_items": {
        Args: any
        Returns: any
      }
      "notify_order_intent_created": {
        Args: any
        Returns: any
      }
      "post_invoice": {
        Args: any
        Returns: any
      }
      "record_visit_checkin": {
        Args: any
        Returns: any
      }
      "reject_odoo_pending_action": {
        Args: any
        Returns: any
      }
      "retry_delivery": {
        Args: any
        Returns: any
      }
      "send_notification": {
        Args: any
        Returns: any
      }
      "sync_profiles_to_logistics_users": {
        Args: any
        Returns: any
      }
      "upsert_odoo_kpi_values": {
        Args: any
        Returns: any
      }
      "dblink_connect": {
        Args: any
        Returns: any
      }
      "dblink_connect": {
        Args: any
        Returns: any
      }
      "analytics_customer_action_center_scoped_v2": {
        Args: any
        Returns: any
      }
      "dblink_disconnect": {
        Args: any
        Returns: any
      }
      "analytics_customer_orders_v2": {
        Args: any
        Returns: any
      }
      "analytics_customer_product_dropoff_v2": {
        Args: any
        Returns: any
      }
      "analytics_customer_favorite_products_v2": {
        Args: any
        Returns: any
      }
      "analytics_product_top_customers_v2": {
        Args: any
        Returns: any
      }
      "analytics_customer_retention_details_v2": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_trend": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_customers": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_retention_details": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_daily_summary": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_daily_kpis": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_action_summary": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_recovery_pipeline": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_customer_priorities": {
        Args: any
        Returns: any
      }
      "analytics_customer_action_center": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_daily_actions": {
        Args: any
        Returns: any
      }
      "analytics_customer_summary_v2": {
        Args: any
        Returns: any
      }
      "analytics_customer_retention_summary": {
        Args: any
        Returns: any
      }
      "analytics_sales_rep_summary": {
        Args: any
        Returns: any
      }
      "analytics_sales_executive_kpis_v2": {
        Args: any
        Returns: any
      }
      "analytics_sales_daily_summary_v2": {
        Args: any
        Returns: any
      }
      "analytics_product_summary_v2": {
        Args: any
        Returns: any
      }
      "analytics_filter_salespeople": {
        Args: any
        Returns: any
      }
      "analytics_filter_customers_v2": {
        Args: any
        Returns: any
      }
      "analytics_filter_products_v2": {
        Args: any
        Returns: any
      }
      "analytics_filter_customer_statuses": {
        Args: any
        Returns: any
      }
      "analytics_filter_governorates": {
        Args: any
        Returns: any
      }
      "analytics_filter_areas": {
        Args: any
        Returns: any
      }
      "analytics_top_customers_v2": {
        Args: any
        Returns: any
      }
      "analytics_procurement_kpis": {
        Args: any
        Returns: any
      }
      "analytics_procurement_suppliers": {
        Args: any
        Returns: any
      }
      "analytics_procurement_reorder_suggestions": {
        Args: any
        Returns: any
      }
      "analytics_procurement_stock_by_category": {
        Args: any
        Returns: any
      }
      "set_ticket_items_updated_at": {
        Args: any
        Returns: any
      }
      "search_tickets": {
        Args: any
        Returns: any
      }
      "admin_confirm_delivery": {
        Args: any
        Returns: any
      }
      "cleanup_location_tracking": {
        Args: any
        Returns: any
      }
      "count_plan_shipments": {
        Args: any
        Returns: any
      }
      "search_all_customers": {
        Args: any
        Returns: any
      }
      "coding_assert_owner": {
        Args: any
        Returns: any
      }
      "coding_next_code_for": {
        Args: any
        Returns: any
      }
      "coding_upsert_product": {
        Args: any
        Returns: any
      }
      "coding_delete_product": {
        Args: any
        Returns: any
      }
      "coding_apply_batch": {
        Args: any
        Returns: any
      }
      "add_main_category": {
        Args: any
        Returns: any
      }
      "coding_upsert_product": {
        Args: any
        Returns: any
      }
      "add_product_brand": {
        Args: any
        Returns: any
      }
      "add_sub_category": {
        Args: any
        Returns: any
      }
    }
    Enums: {
      "app_role": "admin" | "manager" | "supervisor" | "sales_agent" | "telesales" | "driver" | "dispatcher" | "spv"
      "customer_priority": "low" | "medium" | "high"
      "customer_size": "small" | "medium" | "large"
      "dynamic_field_type": "text" | "textarea" | "number" | "date" | "datetime" | "select" | "multiselect" | "boolean" | "photo" | "tel"
      "fraud_status": "normal" | "suspicious" | "fraudulent"
      "notification_audience_type": "all" | "role" | "user"
      "notification_channel": "in_app" | "push"
      "odoo_action_status": "draft" | "waiting_approval" | "approved" | "sending" | "completed" | "failed" | "rejected"
      "order_status": "pending" | "confirmed" | "processing" | "delivered" | "cancelled"
      "quotation_status": "draft" | "generated" | "sent" | "accepted" | "rejected" | "expired"
      "record_status": "active" | "inactive" | "archived"
      "ticket_priority": "low" | "medium" | "high" | "urgent"
      "ticket_status": "open" | "pending" | "in_progress" | "resolved" | "closed"
      "visit_mode": "gps" | "manual"
    }
    CompositeTypes: {
      "dblink_pkey_results": {
      "position": string
      "colname": string
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, string>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName]
  : (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions]

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Insert"]
  : PublicSchema["Tables"][PublicTableNameOrOptions]["Insert"]

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Update"]
  : PublicSchema["Tables"][PublicTableNameOrOptions]["Update"]

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicSchema["Enums"][PublicEnumNameOrOptions]

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
