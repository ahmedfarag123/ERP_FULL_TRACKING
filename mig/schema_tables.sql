CREATE TABLE "kpi"."kpi_tracking" (
    "id" uuid NOT NULL,
    "kpi_code" text NOT NULL,
    "department" text NOT NULL,
    "tracking_month" date NOT NULL,
    "target_value" numeric(18,4),
    "actual_value" numeric(18,4),
    "achieved" boolean,
    "notes" text,
    "source" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "kpi"."manual_upload_batches" (
    "id" uuid NOT NULL,
    "department_slug" text NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "file_name" text,
    "row_count" integer NOT NULL,
    "status" text NOT NULL,
    "uploaded_by" uuid,
    "uploaded_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "kpi"."manual_values" (
    "id" uuid NOT NULL,
    "batch_id" uuid NOT NULL,
    "department_slug" text NOT NULL,
    "kpi_code" text NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "actual_value" numeric(18,4) NOT NULL,
    "target_value" numeric(18,4),
    "notes" text,
    "uploaded_by" uuid,
    "uploaded_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "kpi"."odoo_values" (
    "id" uuid NOT NULL,
    "kpi_code" text NOT NULL,
    "actual_value" numeric(18,4),
    "note" text,
    "computed_at" timestamp with time zone NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL
);

CREATE TABLE "public"."app_download_links" (
    "id" uuid NOT NULL,
    "app_key" text NOT NULL,
    "label" text NOT NULL,
    "description" text,
    "download_url" text NOT NULL,
    "is_active" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text,
    "updated_by_full_name" text
);

CREATE TABLE "public"."audit_logs" (
    "id" uuid NOT NULL,
    "actor_user_id" uuid,
    "actor_email" citext,
    "actor_role" app_role,
    "action_type" text NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" uuid,
    "description" text,
    "ip_address" inet,
    "user_agent" text,
    "request_id" text,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "actor_user_id_full_name" text
);

CREATE TABLE "public"."calls" (
    "id" uuid NOT NULL,
    "customer_id" uuid,
    "user_id" uuid NOT NULL,
    "linked_order_id" uuid,
    "call_status" text,
    "call_reason" text,
    "customer_response" text,
    "call_outcome" text,
    "next_action" text,
    "call_notes" text,
    "requires_urgent_action" boolean NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "call_duration_seconds" integer,
    "raw_form_payload" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "source" text NOT NULL,
    "external_call_id" text,
    "customer_external_id" text,
    "user_email" citext,
    "callback_at" timestamp with time zone,
    "follow_up_sla_status" text,
    "raw_payload" jsonb NOT NULL,
    "contact_status" text,
    "contact_status_details" jsonb NOT NULL,
    "customer_disposition" text,
    "customer_objection" text,
    "objection_details" jsonb NOT NULL,
    "requested_actions" text[] NOT NULL,
    "requested_action_details" jsonb NOT NULL,
    "service_issue_flagged" boolean NOT NULL,
    "service_issue_type" text,
    "user_uid" integer,
    "odoo_insert_payload" jsonb,
    "user_id_full_name" text
);

CREATE TABLE "public"."cart_items" (
    "id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "quantity" integer NOT NULL,
    "customer_id" uuid,
    "session_id" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."categories" (
    "id" uuid NOT NULL,
    "name_en" text NOT NULL,
    "name_ar" text NOT NULL,
    "slug" text NOT NULL,
    "description_en" text,
    "description_ar" text,
    "image_url" text,
    "parent_id" uuid,
    "sort_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."competitor_intel" (
    "id" uuid NOT NULL,
    "customer_id" uuid,
    "call_id" uuid,
    "competitor_name" text NOT NULL,
    "competitor_product" text,
    "competitor_price" numeric(14,2),
    "our_product_reference" text,
    "notes" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."customer_interactions" (
    "id" uuid NOT NULL,
    "customer_id" uuid NOT NULL,
    "interaction_type" text NOT NULL,
    "title" text,
    "description" text,
    "visit_id" uuid,
    "order_id" uuid,
    "quotation_id" uuid,
    "actor_user_id" uuid,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "user_uid" integer,
    "actor_user_id_full_name" text
);

CREATE TABLE "public"."customers" (
    "id" uuid NOT NULL,
    "external_customer_id" text,
    "customer_name" text NOT NULL,
    "phone_number" text,
    "customer_email" citext,
    "whatsapp_number" text,
    "governorate" text,
    "district" text,
    "place" text,
    "address_line" text,
    "customer_type" text,
    "status" record_status NOT NULL,
    "priority" customer_priority NOT NULL,
    "size" customer_size,
    "product_interests" jsonb NOT NULL,
    "notes" text,
    "lat" double precision,
    "lng" double precision,
    "geofence_radius_meters" integer NOT NULL,
    "assigned_user_id" uuid,
    "created_by" uuid,
    "updated_by" uuid,
    "last_visit_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "customer_location" text,
    "google_maps_url" text,
    "has_product_classification" boolean NOT NULL,
    "assigned_user_id_full_name" text,
    "created_by_full_name" text,
    "updated_by_full_name" text
);

CREATE TABLE "public"."department_role_assignments" (
    "department_id" uuid NOT NULL,
    "role" app_role NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text
);

CREATE TABLE "public"."departments" (
    "id" uuid NOT NULL,
    "slug" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "cost_center" text,
    "manager_user_id" uuid,
    "is_active" boolean NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "manager_user_id_full_name" text,
    "created_by_full_name" text,
    "updated_by_full_name" text
);

CREATE TABLE "public"."dispatcher_activity_log" (
    "id" uuid NOT NULL,
    "action" text NOT NULL,
    "actor_profile_id" uuid,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "entity_number" text,
    "product_name" text,
    "details" jsonb,
    "created_at" timestamp with time zone NOT NULL,
    "actor_profile_id_full_name" text
);

CREATE TABLE "public"."dispatcher_order_item_preparations" (
    "id" uuid NOT NULL,
    "preparation_id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "order_line_item_id" uuid NOT NULL,
    "product_id" uuid,
    "dataset_id" uuid,
    "requested_quantity" numeric NOT NULL,
    "approved_quantity" numeric NOT NULL,
    "status" text NOT NULL,
    "shortage_reason" text,
    "note" text,
    "barcode" text,
    "barcode_validated_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "confirmed_by_profile_id" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "confirmed_by_profile_id_full_name" text
);

CREATE TABLE "public"."dispatcher_order_preparations" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "status" text NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_seconds" integer,
    "dispatcher_profile_id" uuid,
    "notes" text,
    "photos" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "dispatcher_profile_id_full_name" text
);

CREATE TABLE "public"."dispatcher_plan_item_preparations" (
    "id" uuid NOT NULL,
    "plan_preparation_id" uuid NOT NULL,
    "plan_id" uuid NOT NULL,
    "product_name" text NOT NULL,
    "product_ref" text,
    "product_code" text,
    "external_product_id" text,
    "product_id" uuid,
    "dataset_id" uuid,
    "total_requested_quantity" numeric NOT NULL,
    "approved_quantity" numeric NOT NULL,
    "status" text NOT NULL,
    "shortage_reason" text,
    "note" text,
    "barcode" text,
    "barcode_validated_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "confirmed_by_profile_id" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "confirmed_by_profile_id_full_name" text
);

CREATE TABLE "public"."dispatcher_plan_preparations" (
    "id" uuid NOT NULL,
    "plan_id" uuid NOT NULL,
    "status" text NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_seconds" integer,
    "dispatcher_profile_id" uuid,
    "notes" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "dispatcher_profile_id_full_name" text
);

CREATE TABLE "public"."driver_cash_balance" (
    "id" uuid NOT NULL,
    "driver_id" uuid NOT NULL,
    "route_plan_id" uuid NOT NULL,
    "cash_amount" numeric(12,2) NOT NULL,
    "currency_code" text NOT NULL,
    "status" text NOT NULL,
    "receipt_image_url" text,
    "driver_notes" text,
    "finance_notes" text,
    "settled_by" uuid,
    "settled_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "driver_id_full_name" text,
    "settled_by_full_name" text
);

CREATE TABLE "public"."driver_plan_collection_checks" (
    "id" uuid NOT NULL,
    "shipment_id" text NOT NULL,
    "driver_profile_id" uuid NOT NULL,
    "plan_id" uuid NOT NULL,
    "check_status" text NOT NULL,
    "payment_method" text,
    "reason" text,
    "driver_notes" text,
    "reviewed_by_profile_id" uuid,
    "review_status" text NOT NULL,
    "admin_notes" text,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "proof_photo_url" text,
    "sales_rep_id" uuid,
    "sales_rep_id_full_name" text
);

CREATE TABLE "public"."driver_plan_settlement_requests" (
    "id" uuid NOT NULL,
    "driver_profile_id" uuid NOT NULL,
    "plan_id" uuid NOT NULL,
    "total_debt_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "proof_photo_url" text,
    "status" text NOT NULL,
    "driver_notes" text,
    "admin_notes" text,
    "reviewed_by_profile_id" uuid,
    "reviewed_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "driver_profile_id_full_name" text,
    "reviewed_by_profile_id_full_name" text
);

CREATE TABLE "public"."dynamic_form_field_options" (
    "id" uuid NOT NULL,
    "field_id" uuid NOT NULL,
    "value_key" text NOT NULL,
    "label_en" text NOT NULL,
    "label_ar" text NOT NULL,
    "display_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."dynamic_form_fields" (
    "id" uuid NOT NULL,
    "form_context" text NOT NULL,
    "field_key" text NOT NULL,
    "label_en" text NOT NULL,
    "label_ar" text NOT NULL,
    "field_type" dynamic_field_type NOT NULL,
    "placeholder_en" text,
    "placeholder_ar" text,
    "help_text_en" text,
    "help_text_ar" text,
    "is_required" boolean NOT NULL,
    "is_active" boolean NOT NULL,
    "display_order" integer NOT NULL,
    "validation_rules" jsonb NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text,
    "updated_by_full_name" text
);

CREATE TABLE "public"."finance_accounts" (
    "id" uuid NOT NULL,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "name_ar" text,
    "type" text NOT NULL,
    "parent_id" uuid,
    "is_active" boolean NOT NULL,
    "allow_posting" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "created_by" uuid
);

CREATE TABLE "public"."finance_cost_centers" (
    "id" uuid NOT NULL,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "name_ar" text,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_credit_note_lines" (
    "id" uuid NOT NULL,
    "credit_note_id" uuid NOT NULL,
    "product_id" uuid,
    "description" text NOT NULL,
    "quantity" numeric(15,3) NOT NULL,
    "unit_price" numeric(15,2) NOT NULL,
    "discount_percent" numeric(5,2) NOT NULL,
    "tax_rate_id" uuid,
    "tax_amount" numeric(15,2) NOT NULL,
    "line_total" numeric(15,2) NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_credit_notes" (
    "id" uuid NOT NULL,
    "credit_note_number" text NOT NULL,
    "customer_id" uuid NOT NULL,
    "original_invoice_id" uuid,
    "credit_note_date" date NOT NULL,
    "due_date" date,
    "journal_id" uuid NOT NULL,
    "currency_code" text NOT NULL,
    "subtotal" numeric(15,2) NOT NULL,
    "discount_total" numeric(15,2) NOT NULL,
    "tax_total" numeric(15,2) NOT NULL,
    "total" numeric(15,2) NOT NULL,
    "status" text NOT NULL,
    "posted_at" timestamp with time zone,
    "voided_at" timestamp with time zone,
    "posted_by" uuid,
    "journal_entry_id" uuid,
    "notes" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_document_sequences" (
    "document_type" text NOT NULL,
    "prefix" text NOT NULL,
    "current_number" integer NOT NULL,
    "year_reset" boolean NOT NULL
);

CREATE TABLE "public"."finance_driver_settlements" (
    "id" uuid NOT NULL,
    "driver_id" uuid NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "commission_amount" numeric(14,2) NOT NULL,
    "fuel_allowance" numeric(14,2) NOT NULL,
    "bonuses" numeric(14,2) NOT NULL,
    "penalties" numeric(14,2) NOT NULL,
    "cash_collected" numeric(14,2) NOT NULL,
    "cash_remitted" numeric(14,2) NOT NULL,
    "status" text NOT NULL,
    "journal_entry_id" uuid,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "net_payable" numeric(14,2) GENERATED ALWAYS AS (cash_collected) STORED
);

CREATE TABLE "public"."finance_fiscal_periods" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "status" text NOT NULL,
    "closed_at" timestamp with time zone,
    "closed_by" uuid,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_invoice_lines" (
    "id" uuid NOT NULL,
    "invoice_id" uuid NOT NULL,
    "product_id" uuid,
    "description" text NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "discount_pct" numeric(5,2) NOT NULL,
    "tax_rate_id" uuid,
    "line_total" numeric(14,2) NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_invoices" (
    "id" uuid NOT NULL,
    "invoice_number" text,
    "customer_id" uuid NOT NULL,
    "order_id" uuid,
    "status" text NOT NULL,
    "issue_date" date NOT NULL,
    "due_date" date,
    "currency_code" text NOT NULL,
    "subtotal" numeric(14,2) NOT NULL,
    "tax_total" numeric(14,2) NOT NULL,
    "discount_total" numeric(14,2) NOT NULL,
    "total" numeric(14,2) NOT NULL,
    "notes" text,
    "journal_entry_id" uuid,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_journal_entries" (
    "id" uuid NOT NULL,
    "entry_number" text NOT NULL,
    "fiscal_period_id" uuid NOT NULL,
    "entry_date" date NOT NULL,
    "source_type" text NOT NULL,
    "source_id" uuid,
    "description" text,
    "status" text NOT NULL,
    "reversed_by_entry_id" uuid,
    "posted_at" timestamp with time zone NOT NULL,
    "posted_by" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_journal_lines" (
    "id" uuid NOT NULL,
    "journal_entry_id" uuid NOT NULL,
    "account_id" uuid NOT NULL,
    "cost_center_id" uuid,
    "customer_id" uuid,
    "debit" numeric(14,2) NOT NULL,
    "credit" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_journals" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "code" text NOT NULL,
    "type" text NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_page_visibility" (
    "page_key" text NOT NULL,
    "enabled" boolean NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "updated_by" uuid
);

CREATE TABLE "public"."finance_payments" (
    "id" uuid NOT NULL,
    "payment_number" text NOT NULL,
    "customer_id" uuid,
    "invoice_id" uuid,
    "order_id" uuid,
    "payment_method" text NOT NULL,
    "payment_date" date NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "reference_number" text,
    "bank_name" text,
    "cheque_number" text,
    "notes" text,
    "status" text NOT NULL,
    "journal_entry_id" uuid,
    "confirmed_by" uuid,
    "confirmed_at" timestamp with time zone,
    "reconciled_by" uuid,
    "reconciled_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."finance_tax_rates" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "rate" numeric(5,2) NOT NULL,
    "account_id" uuid NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."kpi_manual_upload_batches" (
    "id" uuid NOT NULL,
    "department_slug" text NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "file_name" text,
    "row_count" integer NOT NULL,
    "status" text NOT NULL,
    "error_summary" text,
    "uploaded_by" uuid,
    "uploaded_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."kpi_manual_values" (
    "id" uuid NOT NULL,
    "batch_id" uuid NOT NULL,
    "department_slug" text NOT NULL,
    "kpi_code" text NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "actual_value" numeric(18,4) NOT NULL,
    "target_value" numeric(18,4),
    "notes" text,
    "source_label" text NOT NULL,
    "uploaded_by" uuid,
    "uploaded_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."last_rows_report" (
    "table_name" text NOT NULL,
    "last_row" jsonb,
    "last_created_at" timestamp with time zone
);

CREATE TABLE "public"."location_tracking" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "captured_at" timestamp with time zone NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "accuracy_meters" numeric(10,2),
    "altitude_meters" numeric(10,2),
    "heading_degrees" numeric(10,2),
    "speed_mps" numeric(10,2),
    "battery_level" numeric(5,2),
    "is_mocked" boolean NOT NULL,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "plan_id" text,
    "shipment_id" text,
    "user_id_full_name" text
);

CREATE TABLE "public"."logistics_collection_handovers" (
    "id" uuid NOT NULL,
    "driver_profile_id" uuid NOT NULL,
    "plan_id" uuid,
    "handed_to_manager" boolean NOT NULL,
    "reason" text,
    "total_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "driver_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_collection_requests" (
    "id" uuid NOT NULL,
    "driver_profile_id" uuid NOT NULL,
    "plan_id" uuid,
    "collected_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "proof_photo_url" text,
    "driver_notes" text,
    "status" text NOT NULL,
    "admin_notes" text,
    "reviewed_by_profile_id" uuid,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "driver_profile_id_full_name" text,
    "reviewed_by_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_delivery_plans" (
    "id" uuid NOT NULL,
    "plan_reference" text NOT NULL,
    "logistics_user_id" uuid,
    "assigned_profile_id" uuid,
    "planned_date" date NOT NULL,
    "plan_status" text NOT NULL,
    "created_by_profile_id" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "updated_at" timestamp with time zone NOT NULL,
    "notes" text,
    "dispatched_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "route_optimized_at" timestamp with time zone,
    "route_total_distance_km" double precision,
    "route_metadata" jsonb NOT NULL,
    "district" text,
    "return_of_plan_id" uuid,
    "assigned_profile_id_full_name" text,
    "created_by_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_departments" (
    "id" uuid NOT NULL,
    "external_department_id" text,
    "department_name" text NOT NULL,
    "complete_name" text,
    "parent_department_ref" text,
    "manager_external_employee_id" text,
    "manager_name" text,
    "company_name" text,
    "status" record_status NOT NULL,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."logistics_driver_alerts" (
    "id" uuid NOT NULL,
    "driver_profile_id" uuid NOT NULL,
    "shipment_id" uuid,
    "plan_id" uuid,
    "alert_type" text NOT NULL,
    "message" text,
    "location_lat" numeric,
    "location_lng" numeric,
    "status" text NOT NULL,
    "acknowledged_by_profile_id" uuid,
    "acknowledged_at" timestamp with time zone,
    "resolved_by_profile_id" uuid,
    "resolved_at" timestamp with time zone,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "acknowledged_by_profile_id_full_name" text,
    "resolved_by_profile_id_full_name" text,
    "driver_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_order_collections" (
    "id" uuid NOT NULL,
    "shipment_id" text NOT NULL,
    "order_id" text NOT NULL,
    "order_number" text,
    "order_total" numeric(14,2) NOT NULL,
    "payment_method" text NOT NULL,
    "collected_amount" numeric(14,2) NOT NULL,
    "transfer_responsible_name" text,
    "cheque_reference" text,
    "installment_count" integer,
    "collection_status" text NOT NULL,
    "driver_notes" text,
    "collected_at" timestamp with time zone,
    "confirmed_by_profile_id" text,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "sales_rep_id" uuid,
    "driver_debt_amount" numeric(14,2) NOT NULL,
    "accounting_status" text NOT NULL,
    "sales_rep_id_full_name" text
);

CREATE TABLE "public"."logistics_return_shipment_items" (
    "id" uuid NOT NULL,
    "return_shipment_id" uuid NOT NULL,
    "parent_shipment_id" uuid NOT NULL,
    "parent_item_id" uuid NOT NULL,
    "product_id" text,
    "external_product_id" text,
    "product_ref" text,
    "product_name" text,
    "requested_quantity" numeric,
    "approved_quantity" numeric,
    "delivered_quantity" numeric,
    "returned_quantity" numeric NOT NULL,
    "received_quantity" numeric NOT NULL,
    "return_reason" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);

CREATE TABLE "public"."logistics_route_settlements" (
    "id" uuid NOT NULL,
    "plan_id" uuid NOT NULL,
    "driver_id" uuid NOT NULL,
    "settlement_method" text NOT NULL,
    "total_cash_amount" numeric(12,2) NOT NULL,
    "currency_code" text NOT NULL,
    "receipt_image_url" text,
    "driver_notes" text,
    "finance_notes" text,
    "status" text NOT NULL,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "driver_id_full_name" text,
    "approved_by_full_name" text
);

CREATE TABLE "public"."logistics_route_tracking" (
    "id" uuid NOT NULL,
    "plan_id" text NOT NULL,
    "driver_profile_id" text NOT NULL,
    "planned_route" jsonb NOT NULL,
    "actual_route" jsonb NOT NULL,
    "planned_distance_km" double precision,
    "actual_distance_km" double precision,
    "planned_duration_minutes" integer,
    "actual_duration_minutes" integer,
    "planned_stop_count" integer,
    "actual_stop_count" integer,
    "vehicle_type" text,
    "avg_speed_kmh" double precision,
    "tracking_status" text NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."logistics_shipment_collections" (
    "id" uuid NOT NULL,
    "shipment_id" uuid NOT NULL,
    "pending_delivery_amount" numeric(14,2) NOT NULL,
    "collected_from_customer" numeric(14,2) NOT NULL,
    "collected_successfully_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "collection_status" text NOT NULL,
    "collected_by_logistics_user_id" uuid,
    "collected_by_profile_id" uuid,
    "admin_confirmed_by_profile_id" uuid,
    "collected_from_customer_at" timestamp with time zone,
    "admin_confirmed_at" timestamp with time zone,
    "updated_at" timestamp with time zone NOT NULL,
    "payment_method" text,
    "transfer_responsible_name" text,
    "cheque_reference" text,
    "installment_count" integer,
    "driver_notes" text,
    "payment_collected_at" timestamp with time zone,
    "sales_rep_id" uuid,
    "driver_debt_amount" numeric(14,2) NOT NULL,
    "accounting_status" text NOT NULL,
    "collected_by_profile_id_full_name" text,
    "admin_confirmed_by_profile_id_full_name" text,
    "sales_rep_id_full_name" text
);

CREATE TABLE "public"."logistics_shipment_events" (
    "id" uuid NOT NULL,
    "shipment_id" uuid NOT NULL,
    "actor_profile_id" uuid NOT NULL,
    "previous_phase" text,
    "next_phase" text NOT NULL,
    "note" text,
    "proof_photo_path" text,
    "location_lat" numeric(10,7),
    "location_lng" numeric(10,7),
    "payload" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "actor_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_shipment_items" (
    "id" uuid NOT NULL,
    "shipment_id" uuid NOT NULL,
    "external_move_id" text,
    "product_id" uuid,
    "external_product_id" text,
    "product_name" text NOT NULL,
    "product_ref" text,
    "requested_quantity" numeric(14,3) NOT NULL,
    "done_quantity" numeric(14,3) NOT NULL,
    "reserved_quantity" numeric(14,3) NOT NULL,
    "forecast_quantity" numeric(14,3) NOT NULL,
    "move_state" text,
    "source_location_ref" text,
    "destination_location_ref" text,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "approved_quantity" numeric,
    "returned_quantity" numeric NOT NULL
);

CREATE TABLE "public"."logistics_shipment_status_history" (
    "id" uuid NOT NULL,
    "shipment_id" uuid NOT NULL,
    "old_status" text,
    "new_status" text NOT NULL,
    "changed_by_profile_id" uuid,
    "changed_by_role" text,
    "changed_at" timestamp with time zone NOT NULL,
    "note" text,
    "changed_by_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_shipments" (
    "id" uuid NOT NULL,
    "external_shipment_id" text,
    "shipment_reference" text,
    "origin_ref" text,
    "external_order_id" text,
    "odoo_order_name" text,
    "linked_order_id" uuid,
    "customer_id" uuid,
    "external_customer_id" text,
    "customer_name" text,
    "warehouse_id" uuid,
    "external_warehouse_id" text,
    "warehouse_name" text,
    "logistics_user_id" uuid,
    "assigned_profile_id" uuid,
    "external_user_id" text,
    "assigned_user_name" text,
    "assigned_job_title" text,
    "operation_type_name" text,
    "operation_type_ref" text,
    "source_location_ref" text,
    "destination_location_ref" text,
    "shipment_state" text NOT NULL,
    "delivery_phase" text NOT NULL,
    "priority" text,
    "move_type" text,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "odoo_created_at" timestamp with time zone,
    "odoo_updated_at" timestamp with time zone,
    "total_weight" numeric(14,3),
    "notes" text,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "plan_id" uuid,
    "shipment_status" text NOT NULL,
    "customer_latitude" double precision,
    "customer_longitude" double precision,
    "warehouse_latitude" double precision,
    "warehouse_longitude" double precision,
    "estimated_road_distance_km" double precision,
    "total_gmv" numeric(14,2),
    "picked_up_gmv" numeric(14,2),
    "total_cbm" double precision,
    "cbm_confidence" double precision,
    "cancelled_at" timestamp with time zone,
    "route_sequence" integer,
    "route_locked" boolean NOT NULL,
    "customer_phone" text,
    "pod_signature_path" text,
    "pod_recipient_name" text,
    "pod_recipient_phone" text,
    "pod_signed_at" timestamp with time zone,
    "arrived_at_customer_at" timestamp with time zone,
    "parent_shipment_id" uuid,
    "is_return_shipment" boolean NOT NULL,
    "return_reference" text,
    "payment_method" text,
    "pod_image_url" text,
    "assigned_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_sync_watermarks" (
    "id" uuid NOT NULL,
    "entity_type" text NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_sync_row_count" integer,
    "last_sync_duration_ms" integer,
    "last_error" text,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."logistics_users" (
    "id" uuid NOT NULL,
    "external_employee_id" text,
    "external_user_id" text,
    "linked_profile_id" uuid,
    "employee_name" text NOT NULL,
    "job_title" text,
    "work_email" citext,
    "work_phone" text,
    "mobile_phone" text,
    "employee_code" text,
    "department_name" text,
    "company_name" text,
    "work_location" text,
    "status" record_status NOT NULL,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "department_external_id" text,
    "manager_external_employee_id" text,
    "manager_name" text,
    "first_contract_date" date,
    "activity_state" text,
    "activity_type_name" text,
    "next_activity_deadline" date,
    "linked_profile_id_full_name" text
);

CREATE TABLE "public"."logistics_vehicle_profiles" (
    "id" uuid NOT NULL,
    "vehicle_type" text NOT NULL,
    "avg_speed_kmh" double precision NOT NULL,
    "max_speed_kmh" double precision,
    "description" text,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."logistics_warehouses" (
    "id" uuid NOT NULL,
    "external_warehouse_id" text,
    "warehouse_name" text NOT NULL,
    "warehouse_code" text,
    "company_name" text,
    "partner_ref" text,
    "view_location_ref" text,
    "stock_location_ref" text,
    "out_type_ref" text,
    "in_type_ref" text,
    "pick_type_ref" text,
    "pack_type_ref" text,
    "int_type_ref" text,
    "status" record_status NOT NULL,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."notification_recipients" (
    "id" uuid NOT NULL,
    "notification_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "read_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "user_id_full_name" text
);

CREATE TABLE "public"."notifications" (
    "id" uuid NOT NULL,
    "created_by" uuid,
    "audience_type" notification_audience_type NOT NULL,
    "audience_role" app_role,
    "audience_user_id" uuid,
    "channel" notification_channel NOT NULL,
    "title" text NOT NULL,
    "body" text NOT NULL,
    "metadata" jsonb NOT NULL,
    "sent_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text,
    "audience_user_id_full_name" text
);

CREATE TABLE "public"."odoo_actions" (
    "id" uuid NOT NULL,
    "action_key" text NOT NULL,
    "label" text NOT NULL,
    "description" text NOT NULL,
    "endpoint_path" text NOT NULL,
    "http_method" text NOT NULL,
    "odoo_model" text,
    "odoo_method" text,
    "is_active" boolean NOT NULL,
    "allowed_roles" app_role[] NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."odoo_crm_activity_dispatches" (
    "id" uuid NOT NULL,
    "request_id" uuid NOT NULL,
    "requester_id" uuid NOT NULL,
    "mapped_odoo_user_id" bigint NOT NULL,
    "lead_external_id" text NOT NULL,
    "activity_type_id" bigint NOT NULL,
    "payload" jsonb NOT NULL,
    "mode" text NOT NULL,
    "status" text NOT NULL,
    "attempt_count" integer NOT NULL,
    "remote_activity_id" bigint,
    "error_code" text,
    "error_message" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone,
    "requester_id_full_name" text
);

CREATE TABLE "public"."odoo_crm_activity_reports" (
    "id" uuid NOT NULL,
    "external_activity_id" text NOT NULL,
    "lead_id" text,
    "lead_external_id" text,
    "lead_type" text,
    "partner_id" text,
    "partner_name" text,
    "user_id" text,
    "user_name" text,
    "team_id" text,
    "team_name" text,
    "activity_type_id" text,
    "activity_type_name" text,
    "summary" text,
    "notes" text,
    "date_deadline" text,
    "date_completed" timestamp with time zone,
    "state" text,
    "mail_activity_id" text,
    "active" boolean,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "odoo_created_at" timestamp with time zone,
    "odoo_updated_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."odoo_crm_lead_actions" (
    "id" uuid NOT NULL,
    "lead_id" uuid,
    "external_lead_id" text NOT NULL,
    "action_type" text NOT NULL,
    "action_label" text NOT NULL,
    "note" text,
    "metadata" jsonb NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."odoo_crm_leads" (
    "id" uuid NOT NULL,
    "external_lead_id" text NOT NULL,
    "opportunity_name" text NOT NULL,
    "lead_type" text,
    "partner_id" text,
    "customer_name" text,
    "contact_name" text,
    "email" text,
    "phone" text,
    "mobile" text,
    "street" text,
    "city" text,
    "state_name" text,
    "country_name" text,
    "salesperson_id" text,
    "salesperson_name" text,
    "sales_team_id" text,
    "sales_team_name" text,
    "priority" text,
    "activity_ids" text[] NOT NULL,
    "activity_by_id" text,
    "activity_by_name" text,
    "my_deadline" date,
    "campaign_id" text,
    "campaign_name" text,
    "medium_id" text,
    "medium_name" text,
    "source_id" text,
    "source_name" text,
    "expected_revenue" numeric(14,2) NOT NULL,
    "expected_closing" date,
    "stage_id" text,
    "stage_name" text,
    "notes" text,
    "probability" numeric(5,2),
    "lost_reason_id" text,
    "lost_reason_name" text,
    "tag_ids" text[] NOT NULL,
    "tag_names" text[] NOT NULL,
    "active" boolean NOT NULL,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "odoo_created_at" timestamp with time zone,
    "odoo_updated_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "phone_number" text
);

CREATE TABLE "public"."odoo_crm_model_records" (
    "id" uuid NOT NULL,
    "odoo_model" text NOT NULL,
    "external_id" text NOT NULL,
    "display_name" text,
    "active" boolean,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "odoo_created_at" timestamp with time zone,
    "odoo_updated_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."odoo_pending_action_audit_log" (
    "id" uuid NOT NULL,
    "action_id" uuid NOT NULL,
    "status" odoo_action_status NOT NULL,
    "user_id" uuid,
    "details" jsonb,
    "created_at" timestamp with time zone NOT NULL,
    "user_id_full_name" text
);

CREATE TABLE "public"."odoo_pending_actions" (
    "id" uuid NOT NULL,
    "entity_type" text NOT NULL,
    "action_type" text NOT NULL,
    "odoo_model" text NOT NULL,
    "odoo_method" text NOT NULL,
    "entity_id" text,
    "payload_json" jsonb NOT NULL,
    "validation_result" jsonb,
    "status" odoo_action_status NOT NULL,
    "created_by" uuid,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "rejected_by" uuid,
    "rejected_at" timestamp with time zone,
    "rejection_reason" text,
    "retry_count" integer NOT NULL,
    "odoo_record_id" integer,
    "odoo_reference" text,
    "odoo_response" jsonb,
    "error_message" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text,
    "approved_by_full_name" text,
    "rejected_by_full_name" text
);

CREATE TABLE "public"."odoo_sync_rules" (
    "id" uuid NOT NULL,
    "entity_type" text NOT NULL,
    "odoo_model" text NOT NULL,
    "direction" text NOT NULL,
    "governance" text NOT NULL,
    "description" text NOT NULL,
    "description_ar" text NOT NULL,
    "dashboard_table" text NOT NULL,
    "operations" text[] NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."onboarding_progress" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "current_step" integer NOT NULL,
    "industry" text,
    "business_name" text,
    "logo_url" text,
    "phone" text,
    "contact_email" text,
    "address" text,
    "social_instagram" text,
    "social_twitter" text,
    "social_tiktok" text,
    "completed" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."order_cancellations" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "cancelled_by" uuid NOT NULL,
    "cancelled_at" timestamp with time zone NOT NULL,
    "inventory_reversed" boolean NOT NULL,
    "journal_entry_id" uuid,
    "notes" text,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."order_delivery_documents" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "external_picking_id" text NOT NULL,
    "external_order_id" text,
    "picking_name" text NOT NULL,
    "origin_ref" text,
    "picking_state" text,
    "picking_type_ref" text,
    "partner_ref" text,
    "source_location_ref" text,
    "destination_location_ref" text,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."order_intents" (
    "id" uuid NOT NULL,
    "visit_id" uuid,
    "customer_id" uuid NOT NULL,
    "sales_profile_id" uuid NOT NULL,
    "status" text NOT NULL,
    "priority" text NOT NULL,
    "summary" text NOT NULL,
    "estimated_value" numeric(14,2),
    "requested_delivery_date" date,
    "decision_maker_status" text,
    "interest_level" text,
    "next_action" text NOT NULL,
    "selected_customer_profiles" jsonb NOT NULL,
    "source_payload" jsonb NOT NULL,
    "admin_notes" text,
    "assigned_admin_profile_id" uuid,
    "converted_order_id" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "resolved_at" timestamp with time zone,
    "sales_profile_id_full_name" text,
    "assigned_admin_profile_id_full_name" text
);

CREATE TABLE "public"."order_invoice_documents" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "external_invoice_id" text NOT NULL,
    "external_order_id" text,
    "invoice_name" text NOT NULL,
    "move_type" text,
    "invoice_state" text,
    "payment_state" text,
    "partner_ref" text,
    "invoice_date" date,
    "amount_total" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."order_line_items" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "external_line_id" text NOT NULL,
    "external_order_id" text,
    "external_product_id" text,
    "product_name" text NOT NULL,
    "product_ref" text,
    "product_code" text,
    "product_uom" text,
    "ordered_quantity" numeric(14,3) NOT NULL,
    "delivered_quantity" numeric(14,3) NOT NULL,
    "invoiced_quantity" numeric(14,3) NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "discount_percent" numeric(8,2) NOT NULL,
    "subtotal_amount" numeric(14,2) NOT NULL,
    "total_amount" numeric(14,2) NOT NULL,
    "sort_order" integer NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "display_type" text
);

CREATE TABLE "public"."order_status_history" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "status" text NOT NULL,
    "note" text,
    "actor_id" uuid,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."order_ticket_comments" (
    "id" uuid NOT NULL,
    "ticket_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "body" text NOT NULL,
    "is_internal" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "author_id_full_name" text
);

CREATE TABLE "public"."order_tickets" (
    "id" uuid NOT NULL,
    "order_id" uuid NOT NULL,
    "customer_id" uuid,
    "subject" text NOT NULL,
    "description" text,
    "status" ticket_status NOT NULL,
    "priority" ticket_priority NOT NULL,
    "category" text,
    "assigned_to" uuid,
    "created_by" uuid NOT NULL,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "raw_payload" jsonb,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "assigned_to_full_name" text,
    "created_by_full_name" text
);

CREATE TABLE "public"."orders" (
    "id" uuid NOT NULL,
    "external_order_id" text,
    "customer_id" uuid,
    "customer_name" text,
    "status" order_status NOT NULL,
    "source" text NOT NULL,
    "order_date" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "total_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "assigned_user_id" uuid,
    "raw_payload" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "last_sync_at" timestamp with time zone,
    "create_date" timestamp with time zone,
    "commitment_date" timestamp with time zone,
    "delivery_status" text,
    "user_id" text,
    "amount_to_invoice" numeric(14,2),
    "amount_total" numeric(14,2),
    "amount_undiscounted" numeric(14,2),
    "amount_untaxed" numeric(14,2),
    "partner_id" text,
    "payment_term_id" text,
    "access_url" text,
    "company_id" text,
    "create_uid" text,
    "fiscal_position_id" text,
    "invoice_status" text,
    "margin" numeric(14,2),
    "margin_percent" text,
    "planning_initial_date" date,
    "pricelist_id" text,
    "shipping_weight" numeric(14,3),
    "state" text,
    "team_id" text,
    "type_name" text,
    "warehouse_id" text,
    "odoo_order_name" text,
    "shipping_partner_id" text,
    "user_uid" integer,
    "odoo_insert_payload" jsonb,
    "assigned_user_id_full_name" text,
    "tenant_id" uuid,
    "order_number" text,
    "full_name" text,
    "phone" text,
    "email" text,
    "shipping_address" jsonb,
    "payment_method" text,
    "shipping_cost" numeric(10,2),
    "notes" text
);

CREATE TABLE "public"."permission_catalog" (
    "permission_key" text NOT NULL,
    "module_key" text NOT NULL,
    "module_label" text NOT NULL,
    "label" text NOT NULL,
    "description" text NOT NULL,
    "route_path" text,
    "risk_level" text NOT NULL,
    "is_navigation" boolean NOT NULL,
    "is_active" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."product_barcodes" (
    "id" uuid NOT NULL,
    "product_id" uuid,
    "dataset_id" uuid,
    "barcode" text NOT NULL,
    "registered_by_profile_id" uuid,
    "registration_source" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "registered_by_profile_id_full_name" text
);

CREATE TABLE "public"."product_catalog" (
    "id" uuid NOT NULL,
    "name_en" text NOT NULL,
    "name_ar" text NOT NULL,
    "slug" text NOT NULL,
    "description_en" text,
    "description_ar" text,
    "price" numeric NOT NULL,
    "compare_at_price" numeric,
    "currency" text NOT NULL,
    "sku" text,
    "stock_quantity" integer NOT NULL,
    "low_stock_threshold" integer NOT NULL,
    "track_inventory" boolean NOT NULL,
    "category_id" uuid,
    "image_url" text,
    "gallery_urls" text[],
    "status" text NOT NULL,
    "is_featured" boolean NOT NULL,
    "seo_title_en" text,
    "seo_title_ar" text,
    "seo_description_en" text,
    "seo_description_ar" text,
    "meta" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."product_variants" (
    "id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "name_en" text NOT NULL,
    "name_ar" text NOT NULL,
    "sku" text,
    "price" numeric NOT NULL,
    "compare_at_price" numeric,
    "stock_quantity" integer NOT NULL,
    "option_values" jsonb NOT NULL,
    "image_url" text,
    "is_active" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."products" (
    "id" uuid NOT NULL,
    "external_product_id" text,
    "internal_reference" text,
    "product_name" text NOT NULL,
    "average_cost" numeric(14,2) NOT NULL,
    "sales_price" numeric(14,2) NOT NULL,
    "quantity_on_hand" numeric(14,2) NOT NULL,
    "incoming_quantity" numeric(14,2) NOT NULL,
    "outgoing_quantity" numeric(14,2) NOT NULL,
    "unit_of_measure" text,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "odoo_created_at" timestamp with time zone,
    "odoo_updated_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "barcode" text,
    "odoo_insert_payload" jsonb
);

CREATE TABLE "public"."products_dataset" (
    "id" uuid NOT NULL,
    "base_id" text NOT NULL,
    "name" text NOT NULL,
    "image_url" text,
    "barcode" text,
    "variants" text,
    "measurments" text,
    "measurment value" numeric,
    "search_keywords" jsonb NOT NULL,
    "product_id" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "email" citext NOT NULL,
    "full_name" text NOT NULL,
    "role" app_role NOT NULL,
    "status" record_status NOT NULL,
    "phone" text,
    "avatar_url" text,
    "prefer_otp" boolean NOT NULL,
    "password_enabled" boolean NOT NULL,
    "otp_enabled" boolean NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" uuid,
    "force_logout_at" timestamp with time zone,
    "session_version" integer NOT NULL,
    "last_login_at" timestamp with time zone,
    "last_login_method" text,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "department_id" uuid,
    "job_title" text,
    "requires_password_change" boolean NOT NULL,
    "temporary_password_set_at" timestamp with time zone,
    "password_changed_at" timestamp with time zone,
    "odoo_user_id" text,
    "user_uid" integer,
    "approved_by_full_name" text
);

CREATE TABLE "public"."quotation_items" (
    "id" uuid NOT NULL,
    "quotation_id" uuid NOT NULL,
    "company_name" text,
    "product_name" text NOT NULL,
    "product_code" text,
    "quantity" integer NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "discount_percent" numeric(6,2) NOT NULL,
    "line_total" numeric(14,2) NOT NULL,
    "metadata" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."quotations" (
    "id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "customer_id" uuid,
    "buyer_name" text NOT NULL,
    "buyer_phone" text,
    "seller_name" text,
    "seller_phone" text,
    "selected_company_ids" jsonb NOT NULL,
    "extra_discount_percent" numeric(6,2) NOT NULL,
    "subtotal_amount" numeric(14,2) NOT NULL,
    "discount_amount" numeric(14,2) NOT NULL,
    "grand_total_amount" numeric(14,2) NOT NULL,
    "currency_code" text NOT NULL,
    "show_grand_total" boolean NOT NULL,
    "status" quotation_status NOT NULL,
    "pdf_storage_path" text,
    "rendered_payload" jsonb NOT NULL,
    "generated_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text
);

CREATE TABLE "public"."role_definitions" (
    "role" app_role NOT NULL,
    "label" text NOT NULL,
    "description" text NOT NULL,
    "default_home_path" text NOT NULL,
    "is_management" boolean NOT NULL,
    "is_assignable" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."role_permission_assignments" (
    "role" app_role NOT NULL,
    "permission_key" text NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "created_by_full_name" text
);

CREATE TABLE "public"."sales_brand_mappings" (
    "brand_key" text NOT NULL,
    "brand_name_ar" text NOT NULL,
    "brand_name_en" text,
    "example_products" text[] NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sales_customer_speciality_mappings" (
    "customer_type_key" text NOT NULL,
    "speciality_key" text NOT NULL,
    "speciality_name_ar" text NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sales_customer_type_mappings" (
    "customer_type_key" text NOT NULL,
    "customer_type_name_ar" text NOT NULL,
    "description_ar" text NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sales_product_category_mappings" (
    "category_key" text NOT NULL,
    "category_name_ar" text NOT NULL,
    "subcategory_key" text NOT NULL,
    "subcategory_name_ar" text NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sales_product_customer_mappings" (
    "external_product_id" text NOT NULL,
    "product_name" text NOT NULL,
    "brand_key" text NOT NULL,
    "brand_name_ar" text NOT NULL,
    "category_key" text NOT NULL,
    "category_name_ar" text NOT NULL,
    "subcategory_key" text NOT NULL,
    "subcategory_name_ar" text NOT NULL,
    "customer_specialities" text[] NOT NULL,
    "customer_types" text[] NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sales_targets" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "target_month" date NOT NULL,
    "target_visits" integer NOT NULL,
    "target_calls" integer NOT NULL,
    "target_reachability" numeric(8,2) NOT NULL,
    "target_gmv" numeric(14,2) NOT NULL,
    "target_quotations" integer NOT NULL,
    "working_days" integer NOT NULL,
    "assigned_by" uuid,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "user_id_full_name" text,
    "assigned_by_full_name" text
);

CREATE TABLE "public"."service_issues" (
    "id" uuid NOT NULL,
    "customer_id" uuid,
    "call_id" uuid,
    "issue_type" text NOT NULL,
    "details" text,
    "status" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sla_breaches" (
    "id" uuid NOT NULL,
    "sla_definition_id" uuid NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" uuid NOT NULL,
    "breach_type" text NOT NULL,
    "breached_at" timestamp with time zone NOT NULL,
    "resolved_at" timestamp with time zone,
    "notified" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."sla_definitions" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "entity_type" text NOT NULL,
    "target_hours" numeric(8,2) NOT NULL,
    "warning_hours" numeric(8,2) NOT NULL,
    "is_active" boolean NOT NULL,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."suplyd_products_history" (
    "id" uuid,
    "batch_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "ref_id" bigint,
    "name" text,
    "arabic_name" text,
    "price" numeric,
    "cost_per_unit" numeric,
    "tax_percentage" numeric,
    "stock_level" numeric,
    "unit" text,
    "base_unit" text,
    "base_unit_quantity" numeric,
    "container_unit" text,
    "brand_name" text,
    "category_name" text,
    "category_arabic_name" text,
    "sub_category_name" text,
    "image_url" text,
    "scraped_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."suplyd_products_live" (
    "id" uuid NOT NULL,
    "ref_id" bigint,
    "name" text NOT NULL,
    "arabic_name" text,
    "slug" text,
    "description" text,
    "price" numeric,
    "cost_per_unit" numeric,
    "tax_percentage" numeric,
    "stock_level" numeric,
    "unit" text,
    "base_unit" text,
    "base_unit_quantity" numeric,
    "container_quantity" numeric,
    "container_unit" text,
    "unit_weight" numeric,
    "min_order_quantity" numeric,
    "max_order_quantity" numeric,
    "allow_beyond_stock" boolean,
    "is_package_required" boolean,
    "is_a_bundle" boolean,
    "delivery_lead_time" numeric,
    "storage_type" text,
    "is_notification_set" boolean,
    "entity_max_use_count" numeric,
    "monthly_consumption" numeric,
    "restock_date" text,
    "coins_usage_deactivated" boolean,
    "coins_needed_for_pao" numeric,
    "coins_value_per_unit" numeric,
    "brand_id" uuid,
    "brand_name" text,
    "brand_arabic_name" text,
    "brand_slug" text,
    "brand_is_local" boolean,
    "sub_category_id" uuid,
    "sub_category_name" text,
    "sub_category_arabic_name" text,
    "sub_category_slug" text,
    "category_id" uuid,
    "category_name" text,
    "category_arabic_name" text,
    "category_slug" text,
    "image_url" text,
    "package_id" uuid,
    "package_ref_id" bigint,
    "package_name" text,
    "package_arabic_name" text,
    "package_discount_amount" numeric,
    "package_conversion_units" text,
    "package_product_conversion_count" numeric,
    "promotion_ids" text[],
    "promotion_names" text[],
    "promotion_types" text[],
    "promotion_discounts" numeric[],
    "bundle_child_ids" uuid[],
    "bundle_child_names" text[],
    "last_scraped_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."suplyd_scrape_batches" (
    "id" uuid NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "status" text NOT NULL,
    "products_fetched" integer,
    "products_upserted" integer,
    "products_with_cost" integer,
    "error_message" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."tenants" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "logo_url" text,
    "status" text NOT NULL,
    "settings" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."user_device_sessions" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "device_label" text,
    "device_id" text,
    "platform" text,
    "app_version" text,
    "push_token" text,
    "last_seen_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "user_id_full_name" text
);

CREATE TABLE "public"."visit_dynamic_answers" (
    "id" uuid NOT NULL,
    "visit_id" uuid NOT NULL,
    "field_id" uuid NOT NULL,
    "answer_text" text,
    "answer_json" jsonb,
    "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."visit_note_translations" (
    "visit_id" uuid NOT NULL,
    "source_note" text NOT NULL,
    "translated_note" text NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."visits" (
    "id" uuid NOT NULL,
    "customer_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "linked_order_id" uuid,
    "visit_result" text NOT NULL,
    "visit_mode" visit_mode NOT NULL,
    "note" text,
    "override_reason" text,
    "captured_photo_path" text,
    "started_at" timestamp with time zone,
    "checked_in_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "lat" double precision,
    "lng" double precision,
    "customer_distance_meters" numeric(10,2),
    "within_geofence" boolean,
    "fraud_score" numeric(6,2) NOT NULL,
    "fraud_status" fraud_status NOT NULL,
    "fraud_signals" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "source" text NOT NULL,
    "customer_external_id" text,
    "user_email" citext,
    "raw_payload" jsonb NOT NULL,
    "raw_form_payload" jsonb NOT NULL,
    "user_uid" integer,
    "user_name" text,
    "user_id_full_name" text
);

CREATE TABLE "public"."warehouse_inventory" (
    "id" uuid NOT NULL,
    "warehouse_id" text NOT NULL,
    "product_id" uuid NOT NULL,
    "external_product_id" text,
    "product_name" text NOT NULL,
    "product_ref" text,
    "quantity_on_hand" numeric(14,2) NOT NULL,
    "incoming_quantity" numeric(14,2) NOT NULL,
    "outgoing_quantity" numeric(14,2) NOT NULL,
    "reserved_quantity" numeric(14,2) NOT NULL,
    "average_cost" numeric(14,4) NOT NULL,
    "sales_price" numeric(14,2) NOT NULL,
    "unit_of_measure" text,
    "source" text NOT NULL,
    "raw_payload" jsonb NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

ALTER TABLE ONLY "public"."app_download_links" ADD CONSTRAINT "app_download_links_app_key_check" CHECK ((app_key = ANY (ARRAY['sales_app'::text, 'driver_app'::text])));

ALTER TABLE ONLY "public"."app_download_links" ADD CONSTRAINT "app_download_links_app_key_key" UNIQUE (app_key);

ALTER TABLE ONLY "public"."app_download_links" ADD CONSTRAINT "app_download_links_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."calls" ADD CONSTRAINT "calls_external_call_id_key" UNIQUE (external_call_id);

ALTER TABLE ONLY "public"."calls" ADD CONSTRAINT "calls_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."cart_items" ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_slug_key" UNIQUE (slug);

ALTER TABLE ONLY "public"."competitor_intel" ADD CONSTRAINT "competitor_intel_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."customers" ADD CONSTRAINT "customers_external_customer_id_key" UNIQUE (external_customer_id);

ALTER TABLE ONLY "public"."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."department_role_assignments" ADD CONSTRAINT "department_role_assignments_pkey" PRIMARY KEY (department_id, role);

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_name_key" UNIQUE (name);

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_slug_key" UNIQUE (slug);

ALTER TABLE ONLY "public"."dispatcher_activity_log" ADD CONSTRAINT "dispatcher_activity_log_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_line_key" UNIQUE (preparation_id, order_line_item_id);

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_shortage_reason_check" CHECK (((shortage_reason IS NULL) OR (shortage_reason = ANY (ARRAY['out_of_stock'::text, 'damaged'::text, 'expired'::text, 'customer_removal'::text, 'warehouse_issue'::text, 'other'::text]))));

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'partial'::text, 'unavailable'::text])));

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_order_id_key" UNIQUE (order_id);

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_photos_array" CHECK ((jsonb_typeof(photos) = 'array'::text));

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_status_check" CHECK ((status = ANY (ARRAY['preparing'::text, 'ready'::text, 'waiting_pickup'::text, 'handed_over'::text, 'cancelled'::text])));

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_shortage_reason_check" CHECK (((shortage_reason IS NULL) OR (shortage_reason = ANY (ARRAY['out_of_stock'::text, 'damaged'::text, 'expired'::text, 'customer_removal'::text, 'warehouse_issue'::text, 'wrong_product'::text, 'other'::text]))));

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'partial'::text, 'unavailable'::text])));

ALTER TABLE ONLY "public"."dispatcher_plan_preparations" ADD CONSTRAINT "dispatcher_plan_preparations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dispatcher_plan_preparations" ADD CONSTRAINT "dispatcher_plan_preparations_plan_id_key" UNIQUE (plan_id);

ALTER TABLE ONLY "public"."dispatcher_plan_preparations" ADD CONSTRAINT "dispatcher_plan_preparations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'cancelled'::text])));

ALTER TABLE ONLY "public"."driver_cash_balance" ADD CONSTRAINT "driver_cash_balance_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."driver_cash_balance" ADD CONSTRAINT "driver_cash_balance_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'handed_to_finance'::text, 'sent_via_fawry'::text, 'settled'::text])));

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_check_status_check" CHECK ((check_status = ANY (ARRAY['collected'::text, 'not_collected'::text])));

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_payment_method_check" CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'installments'::text, 'cheque'::text, 'credit'::text]))));

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_review_status_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_shipment_id_key" UNIQUE (shipment_id);

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_plan_id_key" UNIQUE (plan_id);

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text])));

ALTER TABLE ONLY "public"."dynamic_form_field_options" ADD CONSTRAINT "dynamic_form_field_options_field_id_value_key_key" UNIQUE (field_id, value_key);

ALTER TABLE ONLY "public"."dynamic_form_field_options" ADD CONSTRAINT "dynamic_form_field_options_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."dynamic_form_fields" ADD CONSTRAINT "dynamic_form_fields_form_context_field_key_key" UNIQUE (form_context, field_key);

ALTER TABLE ONLY "public"."dynamic_form_fields" ADD CONSTRAINT "dynamic_form_fields_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_accounts" ADD CONSTRAINT "finance_accounts_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_accounts" ADD CONSTRAINT "finance_accounts_type_check" CHECK ((type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])));

ALTER TABLE ONLY "public"."finance_cost_centers" ADD CONSTRAINT "finance_cost_centers_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_credit_note_lines" ADD CONSTRAINT "finance_credit_note_lines_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_credit_note_number_key" UNIQUE (credit_note_number);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text])));

ALTER TABLE ONLY "public"."finance_document_sequences" ADD CONSTRAINT "finance_document_sequences_pkey" PRIMARY KEY (document_type);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'posted'::text, 'paid'::text])));

ALTER TABLE ONLY "public"."finance_fiscal_periods" ADD CONSTRAINT "finance_fiscal_periods_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_fiscal_periods" ADD CONSTRAINT "finance_fiscal_periods_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'locked'::text])));

ALTER TABLE ONLY "public"."finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'paid'::text, 'partially_paid'::text, 'void'::text])));

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_source_type_check" CHECK ((source_type = ANY (ARRAY['invoice'::text, 'credit_note'::text, 'delivery'::text, 'collection'::text, 'warehouse_adjustment'::text, 'driver_settlement'::text, 'manual'::text, 'reversal'::text])));

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_status_check" CHECK ((status = ANY (ARRAY['posted'::text, 'reversed'::text])));

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_check" CHECK (((debit >= (0)::numeric) AND (credit >= (0)::numeric)));

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_check1" CHECK ((NOT ((debit > (0)::numeric) AND (credit > (0)::numeric))));

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_journals" ADD CONSTRAINT "finance_journals_code_key" UNIQUE (code);

ALTER TABLE ONLY "public"."finance_journals" ADD CONSTRAINT "finance_journals_name_key" UNIQUE (name);

ALTER TABLE ONLY "public"."finance_journals" ADD CONSTRAINT "finance_journals_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_journals" ADD CONSTRAINT "finance_journals_type_check" CHECK ((type = ANY (ARRAY['sale'::text, 'purchase'::text, 'cash'::text, 'bank'::text, 'general'::text])));

ALTER TABLE ONLY "public"."finance_page_visibility" ADD CONSTRAINT "finance_page_visibility_page_key_check" CHECK ((page_key = ANY (ARRAY['dashboard'::text, 'accounts'::text, 'journal'::text, 'invoices'::text, 'credit-notes'::text, 'receivables'::text, 'driver-settlements'::text, 'cost-centers'::text, 'reports'::text, 'settings'::text, 'audit-log'::text])));

ALTER TABLE ONLY "public"."finance_page_visibility" ADD CONSTRAINT "finance_page_visibility_pkey" PRIMARY KEY (page_key);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'cheque'::text, 'card'::text, 'online'::text])));

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_payment_number_key" UNIQUE (payment_number);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'reconciled'::text, 'void'::text])));

ALTER TABLE ONLY "public"."finance_tax_rates" ADD CONSTRAINT "finance_tax_rates_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_fiscal_periods" ADD CONSTRAINT "fiscal_period_dates" CHECK ((start_date <= end_date));

ALTER TABLE ONLY "public"."finance_fiscal_periods" ADD CONSTRAINT "fiscal_period_unique_dates" UNIQUE (start_date, end_date);

ALTER TABLE ONLY "public"."kpi_manual_upload_batches" ADD CONSTRAINT "kpi_manual_upload_batches_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."kpi_manual_upload_batches" ADD CONSTRAINT "kpi_manual_upload_batches_row_count_check" CHECK ((row_count >= 0));

ALTER TABLE ONLY "public"."kpi_manual_upload_batches" ADD CONSTRAINT "kpi_manual_upload_batches_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])));

ALTER TABLE ONLY "public"."kpi_manual_values" ADD CONSTRAINT "kpi_manual_values_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "kpi"."kpi_tracking" ADD CONSTRAINT "kpi_tracking_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."last_rows_report" ADD CONSTRAINT "last_rows_report_pkey" PRIMARY KEY (table_name);

ALTER TABLE ONLY "public"."location_tracking" ADD CONSTRAINT "location_tracking_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_collection_handovers" ADD CONSTRAINT "logistics_collection_handovers_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_collection_requests" ADD CONSTRAINT "logistics_collection_requests_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_collection_requests" ADD CONSTRAINT "logistics_collection_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_plan_reference_key" UNIQUE (plan_reference);

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_plan_status_check" CHECK ((plan_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'returned'::text])));

ALTER TABLE ONLY "public"."logistics_departments" ADD CONSTRAINT "logistics_departments_external_department_id_key" UNIQUE (external_department_id);

ALTER TABLE ONLY "public"."logistics_departments" ADD CONSTRAINT "logistics_departments_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_alert_type_check" CHECK ((alert_type = 'sos'::text));

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])));

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_accounting_status_check" CHECK ((accounting_status = ANY (ARRAY['pending_accounting_review'::text, 'confirmed'::text, 'rejected'::text])));

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_bank_transfer_rep_check" CHECK (((payment_method <> 'bank_transfer'::text) OR (sales_rep_id IS NOT NULL))) NOT VALID;

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_cash_debt_check" CHECK ((((payment_method = 'cash'::text) AND (driver_debt_amount = collected_amount)) OR ((payment_method <> 'cash'::text) AND (driver_debt_amount = (0)::numeric))));

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_collection_status_check" CHECK ((collection_status = ANY (ARRAY['pending'::text, 'collected'::text, 'confirmed'::text, 'exempt'::text])));

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'credit'::text, 'cheque'::text, 'bank_transfer'::text])));

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_shipment_id_order_id_key" UNIQUE (shipment_id, order_id);

ALTER TABLE ONLY "public"."logistics_return_shipment_items" ADD CONSTRAINT "logistics_return_shipment_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_settlement_method_check" CHECK ((settlement_method = ANY (ARRAY['hand_to_finance'::text, 'send_via_fawry'::text])));

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_status_check" CHECK ((status = ANY (ARRAY['waiting_for_finance'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE ONLY "public"."logistics_route_tracking" ADD CONSTRAINT "logistics_route_tracking_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_route_tracking" ADD CONSTRAINT "logistics_route_tracking_plan_id_key" UNIQUE (plan_id);

ALTER TABLE ONLY "public"."logistics_route_tracking" ADD CONSTRAINT "logistics_route_tracking_tracking_status_check" CHECK ((tracking_status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])));

ALTER TABLE ONLY "public"."logistics_route_tracking" ADD CONSTRAINT "logistics_route_tracking_vehicle_type_check" CHECK ((vehicle_type = ANY (ARRAY['van'::text, 'car'::text, 'heavy'::text])));

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_accounting_status_check" CHECK ((accounting_status = ANY (ARRAY['pending_accounting_review'::text, 'confirmed'::text, 'rejected'::text])));

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_collection_status_check" CHECK ((collection_status = ANY (ARRAY['pending_delivery_amount'::text, 'collected_from_customer'::text, 'collected_successfully'::text])));

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'credit'::text, 'cheque'::text, 'bank_transfer'::text])));

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_shipment_id_key" UNIQUE (shipment_id);

ALTER TABLE ONLY "public"."logistics_shipment_events" ADD CONSTRAINT "logistics_shipment_events_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_external_move_id_key" UNIQUE (external_move_id);

ALTER TABLE ONLY "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_shipment_status_history" ADD CONSTRAINT "logistics_shipment_status_history_new_status_check" CHECK ((new_status = ANY (ARRAY['PENDING_ASSIGN'::text, 'ASSIGNED'::text, 'CHECK_IN'::text, 'PICKUP'::text, 'OUT_FOR_DELIVERY'::text, 'ARRIVED'::text, 'DELIVERED'::text, 'FINISHED'::text, 'SETTLED'::text, 'CANCELLED'::text])));

ALTER TABLE ONLY "public"."logistics_shipment_status_history" ADD CONSTRAINT "logistics_shipment_status_history_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_external_shipment_id_key" UNIQUE (external_shipment_id);

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_status_check" CHECK ((shipment_status = ANY (ARRAY['PENDING_ASSIGN'::text, 'ASSIGNED'::text, 'CHECK_IN'::text, 'PICKUP'::text, 'OUT_FOR_DELIVERY'::text, 'ARRIVED'::text, 'DELIVERED'::text, 'FINISHED'::text, 'SETTLED'::text, 'CANCELLED'::text])));

ALTER TABLE ONLY "public"."logistics_sync_watermarks" ADD CONSTRAINT "logistics_sync_watermarks_entity_type_key" UNIQUE (entity_type);

ALTER TABLE ONLY "public"."logistics_sync_watermarks" ADD CONSTRAINT "logistics_sync_watermarks_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_users" ADD CONSTRAINT "logistics_users_external_employee_id_key" UNIQUE (external_employee_id);

ALTER TABLE ONLY "public"."logistics_users" ADD CONSTRAINT "logistics_users_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_vehicle_profiles" ADD CONSTRAINT "logistics_vehicle_profiles_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."logistics_vehicle_profiles" ADD CONSTRAINT "logistics_vehicle_profiles_vehicle_type_check" CHECK ((vehicle_type = ANY (ARRAY['van'::text, 'car'::text, 'heavy'::text])));

ALTER TABLE ONLY "public"."logistics_vehicle_profiles" ADD CONSTRAINT "logistics_vehicle_profiles_vehicle_type_key" UNIQUE (vehicle_type);

ALTER TABLE ONLY "public"."logistics_warehouses" ADD CONSTRAINT "logistics_warehouses_external_warehouse_id_key" UNIQUE (external_warehouse_id);

ALTER TABLE ONLY "public"."logistics_warehouses" ADD CONSTRAINT "logistics_warehouses_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "kpi"."manual_upload_batches" ADD CONSTRAINT "manual_upload_batches_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "kpi"."manual_upload_batches" ADD CONSTRAINT "manual_upload_batches_row_count_check" CHECK ((row_count >= 0));

ALTER TABLE ONLY "kpi"."manual_upload_batches" ADD CONSTRAINT "manual_upload_batches_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])));

ALTER TABLE ONLY "kpi"."manual_values" ADD CONSTRAINT "manual_values_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_user_id_key" UNIQUE (notification_id, user_id);

ALTER TABLE ONLY "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_actions" ADD CONSTRAINT "odoo_actions_action_key_key" UNIQUE (action_key);

ALTER TABLE ONLY "public"."odoo_actions" ADD CONSTRAINT "odoo_actions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_activity_type_id_check" CHECK ((activity_type_id > 0));

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_attempt_count_check" CHECK ((attempt_count > 0));

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_mapped_odoo_user_id_check" CHECK ((mapped_odoo_user_id > 0));

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_mode_check" CHECK ((mode = ANY (ARRAY['disabled'::text, 'test'::text, 'live'::text])));

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_request_id_key" UNIQUE (request_id);

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'blocked'::text])));

ALTER TABLE ONLY "public"."odoo_crm_activity_reports" ADD CONSTRAINT "odoo_crm_activity_reports_external_activity_id_key" UNIQUE (external_activity_id);

ALTER TABLE ONLY "public"."odoo_crm_activity_reports" ADD CONSTRAINT "odoo_crm_activity_reports_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_crm_lead_actions" ADD CONSTRAINT "odoo_crm_lead_actions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_crm_leads" ADD CONSTRAINT "odoo_crm_leads_external_lead_id_key" UNIQUE (external_lead_id);

ALTER TABLE ONLY "public"."odoo_crm_leads" ADD CONSTRAINT "odoo_crm_leads_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_crm_model_records" ADD CONSTRAINT "odoo_crm_model_records_odoo_model_external_id_key" UNIQUE (odoo_model, external_id);

ALTER TABLE ONLY "public"."odoo_crm_model_records" ADD CONSTRAINT "odoo_crm_model_records_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_pending_action_audit_log" ADD CONSTRAINT "odoo_pending_action_audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_pending_actions" ADD CONSTRAINT "odoo_pending_actions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."odoo_sync_rules" ADD CONSTRAINT "odoo_sync_rules_direction_check" CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text])));

ALTER TABLE ONLY "public"."odoo_sync_rules" ADD CONSTRAINT "odoo_sync_rules_entity_type_odoo_model_direction_key" UNIQUE (entity_type, odoo_model, direction);

ALTER TABLE ONLY "public"."odoo_sync_rules" ADD CONSTRAINT "odoo_sync_rules_governance_check" CHECK ((governance = ANY (ARRAY['auto'::text, 'pending_approval'::text])));

ALTER TABLE ONLY "public"."odoo_sync_rules" ADD CONSTRAINT "odoo_sync_rules_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "kpi"."odoo_values" ADD CONSTRAINT "odoo_values_kpi_code_period_start_period_end_key" UNIQUE (kpi_code, period_start, period_end);

ALTER TABLE ONLY "kpi"."odoo_values" ADD CONSTRAINT "odoo_values_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."onboarding_progress" ADD CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_tenant_id_key" UNIQUE (user_id, tenant_id);

ALTER TABLE ONLY "public"."order_cancellations" ADD CONSTRAINT "order_cancellations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_delivery_documents" ADD CONSTRAINT "order_delivery_documents_external_picking_id_key" UNIQUE (external_picking_id);

ALTER TABLE ONLY "public"."order_delivery_documents" ADD CONSTRAINT "order_delivery_documents_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_profiles_array" CHECK ((jsonb_typeof(selected_customer_profiles) = 'array'::text));

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_source_payload_object" CHECK ((jsonb_typeof(source_payload) = 'object'::text));

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'converted'::text, 'dismissed'::text, 'cancelled'::text])));

ALTER TABLE ONLY "public"."order_invoice_documents" ADD CONSTRAINT "order_invoice_documents_external_invoice_id_key" UNIQUE (external_invoice_id);

ALTER TABLE ONLY "public"."order_invoice_documents" ADD CONSTRAINT "order_invoice_documents_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_line_items" ADD CONSTRAINT "order_line_items_external_line_id_key" UNIQUE (external_line_id);

ALTER TABLE ONLY "public"."order_line_items" ADD CONSTRAINT "order_line_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_status_history" ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_ticket_comments" ADD CONSTRAINT "order_ticket_comments_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."order_tickets" ADD CONSTRAINT "order_tickets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_external_order_id_key" UNIQUE (external_order_id);

ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."permission_catalog" ADD CONSTRAINT "permission_catalog_pkey" PRIMARY KEY (permission_key);

ALTER TABLE ONLY "public"."permission_catalog" ADD CONSTRAINT "permission_catalog_risk_level_check" CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_barcode_key" UNIQUE (barcode);

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_product_or_dataset_check" CHECK (((product_id IS NOT NULL) OR (dataset_id IS NOT NULL)));

ALTER TABLE ONLY "public"."product_catalog" ADD CONSTRAINT "product_catalog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."product_catalog" ADD CONSTRAINT "product_catalog_slug_key" UNIQUE (slug);

ALTER TABLE ONLY "public"."product_catalog" ADD CONSTRAINT "product_catalog_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));

ALTER TABLE ONLY "public"."product_variants" ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."products_dataset" ADD CONSTRAINT "products_dataset_barcode_key" UNIQUE (barcode);

ALTER TABLE ONLY "public"."products_dataset" ADD CONSTRAINT "products_dataset_base_id_key" UNIQUE (base_id);

ALTER TABLE ONLY "public"."products_dataset" ADD CONSTRAINT "products_dataset_keywords_array" CHECK ((jsonb_typeof(search_keywords) = 'array'::text));

ALTER TABLE ONLY "public"."products_dataset" ADD CONSTRAINT "products_dataset_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."products" ADD CONSTRAINT "products_external_product_id_key" UNIQUE (external_product_id);

ALTER TABLE ONLY "public"."products" ADD CONSTRAINT "products_internal_reference_key" UNIQUE (internal_reference);

ALTER TABLE ONLY "public"."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);

ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."quotation_items" ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."quotation_items" ADD CONSTRAINT "quotation_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE ONLY "public"."quotations" ADD CONSTRAINT "quotations_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."role_definitions" ADD CONSTRAINT "role_definitions_pkey" PRIMARY KEY (role);

ALTER TABLE ONLY "public"."role_permission_assignments" ADD CONSTRAINT "role_permission_assignments_pkey" PRIMARY KEY (role, permission_key);

ALTER TABLE ONLY "public"."sales_brand_mappings" ADD CONSTRAINT "sales_brand_mappings_pkey" PRIMARY KEY (brand_key);

ALTER TABLE ONLY "public"."sales_customer_speciality_mappings" ADD CONSTRAINT "sales_customer_speciality_mappings_pkey" PRIMARY KEY (customer_type_key, speciality_key);

ALTER TABLE ONLY "public"."sales_customer_type_mappings" ADD CONSTRAINT "sales_customer_type_mappings_pkey" PRIMARY KEY (customer_type_key);

ALTER TABLE ONLY "public"."sales_product_category_mappings" ADD CONSTRAINT "sales_product_category_mappings_pkey" PRIMARY KEY (category_key, subcategory_key);

ALTER TABLE ONLY "public"."sales_product_customer_mappings" ADD CONSTRAINT "sales_product_customer_mappings_pkey" PRIMARY KEY (external_product_id);

ALTER TABLE ONLY "public"."sales_targets" ADD CONSTRAINT "sales_targets_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."sales_targets" ADD CONSTRAINT "sales_targets_user_id_target_month_key" UNIQUE (user_id, target_month);

ALTER TABLE ONLY "public"."service_issues" ADD CONSTRAINT "service_issues_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "settlement_period" CHECK ((period_start <= period_end));

ALTER TABLE ONLY "public"."sla_breaches" ADD CONSTRAINT "sla_breaches_breach_type_check" CHECK ((breach_type = ANY (ARRAY['warning'::text, 'breach'::text])));

ALTER TABLE ONLY "public"."sla_breaches" ADD CONSTRAINT "sla_breaches_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."sla_definitions" ADD CONSTRAINT "sla_definitions_entity_type_check" CHECK ((entity_type = ANY (ARRAY['order'::text, 'shipment'::text, 'visit'::text, 'call'::text])));

ALTER TABLE ONLY "public"."sla_definitions" ADD CONSTRAINT "sla_definitions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."suplyd_products_history" ADD CONSTRAINT "suplyd_products_history_pkey" PRIMARY KEY (batch_id, product_id);

ALTER TABLE ONLY "public"."suplyd_products_live" ADD CONSTRAINT "suplyd_products_live_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."suplyd_scrape_batches" ADD CONSTRAINT "suplyd_scrape_batches_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."suplyd_scrape_batches" ADD CONSTRAINT "suplyd_scrape_batches_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'partial'::text, 'failed'::text])));

ALTER TABLE ONLY "public"."tenants" ADD CONSTRAINT "tenants_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."tenants" ADD CONSTRAINT "tenants_slug_key" UNIQUE (slug);

ALTER TABLE ONLY "public"."tenants" ADD CONSTRAINT "tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])));

ALTER TABLE ONLY "public"."user_device_sessions" ADD CONSTRAINT "user_device_sessions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."visit_dynamic_answers" ADD CONSTRAINT "visit_dynamic_answers_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."visit_dynamic_answers" ADD CONSTRAINT "visit_dynamic_answers_visit_id_field_id_key" UNIQUE (visit_id, field_id);

ALTER TABLE ONLY "public"."visit_note_translations" ADD CONSTRAINT "visit_note_translations_pkey" PRIMARY KEY (visit_id);

ALTER TABLE ONLY "public"."visits" ADD CONSTRAINT "visits_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_warehouse_id_product_id_key" UNIQUE (warehouse_id, product_id);

ALTER TABLE ONLY "public"."app_download_links" ADD CONSTRAINT "app_download_links_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."app_download_links" ADD CONSTRAINT "app_download_links_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."calls" ADD CONSTRAINT "calls_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."calls" ADD CONSTRAINT "calls_linked_order_id_fkey" FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."calls" ADD CONSTRAINT "calls_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cart_items" ADD CONSTRAINT "cart_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."competitor_intel" ADD CONSTRAINT "competitor_intel_call_id_fkey" FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."competitor_intel" ADD CONSTRAINT "competitor_intel_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_visit_id_fkey" FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customers" ADD CONSTRAINT "customers_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customers" ADD CONSTRAINT "customers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."department_role_assignments" ADD CONSTRAINT "department_role_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."department_role_assignments" ADD CONSTRAINT "department_role_assignments_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."department_role_assignments" ADD CONSTRAINT "department_role_assignments_role_fkey" FOREIGN KEY (role) REFERENCES role_definitions(role) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_manager_user_id_fkey" FOREIGN KEY (manager_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."departments" ADD CONSTRAINT "departments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_activity_log" ADD CONSTRAINT "dispatcher_activity_log_actor_profile_id_fkey" FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_confirmed_by_profile_id_fkey" FOREIGN KEY (confirmed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES products_dataset(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_order_line_item_id_fkey" FOREIGN KEY (order_line_item_id) REFERENCES order_line_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_preparation_id_fkey" FOREIGN KEY (preparation_id) REFERENCES dispatcher_order_preparations(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_order_item_preparations" ADD CONSTRAINT "dispatcher_order_item_preparations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_dispatcher_profile_id_fkey" FOREIGN KEY (dispatcher_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_order_preparations" ADD CONSTRAINT "dispatcher_order_preparations_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_confirmed_by_profile_id_fkey" FOREIGN KEY (confirmed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES products_dataset(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_plan_preparation_id_fkey" FOREIGN KEY (plan_preparation_id) REFERENCES dispatcher_plan_preparations(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dispatcher_plan_item_preparations" ADD CONSTRAINT "dispatcher_plan_item_preparations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_plan_preparations" ADD CONSTRAINT "dispatcher_plan_preparations_dispatcher_profile_id_fkey" FOREIGN KEY (dispatcher_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dispatcher_plan_preparations" ADD CONSTRAINT "dispatcher_plan_preparations_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."driver_cash_balance" ADD CONSTRAINT "driver_cash_balance_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."driver_cash_balance" ADD CONSTRAINT "driver_cash_balance_settled_by_fkey" FOREIGN KEY (settled_by) REFERENCES profiles(id);

ALTER TABLE ONLY "public"."driver_plan_collection_checks" ADD CONSTRAINT "driver_plan_collection_checks_sales_rep_id_fkey" FOREIGN KEY (sales_rep_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_driver_profile_id_fkey" FOREIGN KEY (driver_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."driver_plan_settlement_requests" ADD CONSTRAINT "driver_plan_settlement_requests_reviewed_by_profile_id_fkey" FOREIGN KEY (reviewed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dynamic_form_field_options" ADD CONSTRAINT "dynamic_form_field_options_field_id_fkey" FOREIGN KEY (field_id) REFERENCES dynamic_form_fields(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dynamic_form_fields" ADD CONSTRAINT "dynamic_form_fields_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."dynamic_form_fields" ADD CONSTRAINT "dynamic_form_fields_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_accounts" ADD CONSTRAINT "finance_accounts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_accounts" ADD CONSTRAINT "finance_accounts_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES finance_accounts(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_credit_note_lines" ADD CONSTRAINT "finance_credit_note_lines_credit_note_id_fkey" FOREIGN KEY (credit_note_id) REFERENCES finance_credit_notes(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."finance_credit_note_lines" ADD CONSTRAINT "finance_credit_note_lines_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE ONLY "public"."finance_credit_note_lines" ADD CONSTRAINT "finance_credit_note_lines_tax_rate_id_fkey" FOREIGN KEY (tax_rate_id) REFERENCES finance_tax_rates(id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_journal_id_fkey" FOREIGN KEY (journal_id) REFERENCES finance_journals(id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_original_invoice_id_fkey" FOREIGN KEY (original_invoice_id) REFERENCES finance_invoices(id);

ALTER TABLE ONLY "public"."finance_credit_notes" ADD CONSTRAINT "finance_credit_notes_posted_by_fkey" FOREIGN KEY (posted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES logistics_users(id);

ALTER TABLE ONLY "public"."finance_driver_settlements" ADD CONSTRAINT "finance_driver_settlements_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."finance_fiscal_periods" ADD CONSTRAINT "finance_fiscal_periods_closed_by_fkey" FOREIGN KEY (closed_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES finance_invoices(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE ONLY "public"."finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_tax_rate_id_fkey" FOREIGN KEY (tax_rate_id) REFERENCES finance_tax_rates(id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."finance_invoices" ADD CONSTRAINT "finance_invoices_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_fiscal_period_id_fkey" FOREIGN KEY (fiscal_period_id) REFERENCES finance_fiscal_periods(id);

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_posted_by_fkey" FOREIGN KEY (posted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_reversed_by_entry_id_fkey" FOREIGN KEY (reversed_by_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_account_id_fkey" FOREIGN KEY (account_id) REFERENCES finance_accounts(id);

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES finance_cost_centers(id);

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE ONLY "public"."finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."finance_page_visibility" ADD CONSTRAINT "finance_page_visibility_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_confirmed_by_fkey" FOREIGN KEY (confirmed_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES finance_invoices(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."finance_payments" ADD CONSTRAINT "finance_payments_reconciled_by_fkey" FOREIGN KEY (reconciled_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."finance_tax_rates" ADD CONSTRAINT "finance_tax_rates_account_id_fkey" FOREIGN KEY (account_id) REFERENCES finance_accounts(id);

ALTER TABLE ONLY "public"."kpi_manual_upload_batches" ADD CONSTRAINT "kpi_manual_upload_batches_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."kpi_manual_values" ADD CONSTRAINT "kpi_manual_values_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES kpi_manual_upload_batches(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."kpi_manual_values" ADD CONSTRAINT "kpi_manual_values_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."location_tracking" ADD CONSTRAINT "location_tracking_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_collection_handovers" ADD CONSTRAINT "logistics_collection_handovers_driver_profile_id_fkey" FOREIGN KEY (driver_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_collection_handovers" ADD CONSTRAINT "logistics_collection_handovers_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_collection_requests" ADD CONSTRAINT "logistics_collection_requests_driver_profile_id_fkey" FOREIGN KEY (driver_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_collection_requests" ADD CONSTRAINT "logistics_collection_requests_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_collection_requests" ADD CONSTRAINT "logistics_collection_requests_reviewed_by_profile_id_fkey" FOREIGN KEY (reviewed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_assigned_profile_id_fkey" FOREIGN KEY (assigned_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_created_by_profile_id_fkey" FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_logistics_user_id_fkey" FOREIGN KEY (logistics_user_id) REFERENCES logistics_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_delivery_plans" ADD CONSTRAINT "logistics_delivery_plans_return_of_plan_id_fkey" FOREIGN KEY (return_of_plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_acknowledged_by_profile_id_fkey" FOREIGN KEY (acknowledged_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_driver_profile_id_fkey" FOREIGN KEY (driver_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_resolved_by_profile_id_fkey" FOREIGN KEY (resolved_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_driver_alerts" ADD CONSTRAINT "logistics_driver_alerts_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_order_collections" ADD CONSTRAINT "logistics_order_collections_sales_rep_id_fkey" FOREIGN KEY (sales_rep_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_return_shipment_items" ADD CONSTRAINT "logistics_return_shipment_items_parent_item_id_fkey" FOREIGN KEY (parent_item_id) REFERENCES logistics_shipment_items(id);

ALTER TABLE ONLY "public"."logistics_return_shipment_items" ADD CONSTRAINT "logistics_return_shipment_items_parent_shipment_id_fkey" FOREIGN KEY (parent_shipment_id) REFERENCES logistics_shipments(id);

ALTER TABLE ONLY "public"."logistics_return_shipment_items" ADD CONSTRAINT "logistics_return_shipment_items_return_shipment_id_fkey" FOREIGN KEY (return_shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id);

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_route_settlements" ADD CONSTRAINT "logistics_route_settlements_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collection_admin_confirmed_by_profile_i_fkey" FOREIGN KEY (admin_confirmed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collection_collected_by_logistics_user__fkey" FOREIGN KEY (collected_by_logistics_user_id) REFERENCES logistics_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_collected_by_profile_id_fkey" FOREIGN KEY (collected_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_sales_rep_id_fkey" FOREIGN KEY (sales_rep_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_collections" ADD CONSTRAINT "logistics_shipment_collections_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipment_events" ADD CONSTRAINT "logistics_shipment_events_actor_profile_id_fkey" FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipment_events" ADD CONSTRAINT "logistics_shipment_events_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipment_status_history" ADD CONSTRAINT "logistics_shipment_status_history_changed_by_profile_id_fkey" FOREIGN KEY (changed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipment_status_history" ADD CONSTRAINT "logistics_shipment_status_history_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_assigned_profile_id_fkey" FOREIGN KEY (assigned_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_linked_order_id_fkey" FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_logistics_user_id_fkey" FOREIGN KEY (logistics_user_id) REFERENCES logistics_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_parent_shipment_id_fkey" FOREIGN KEY (parent_shipment_id) REFERENCES logistics_shipments(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES logistics_delivery_plans(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES logistics_warehouses(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."logistics_users" ADD CONSTRAINT "logistics_users_linked_profile_id_fkey" FOREIGN KEY (linked_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "kpi"."manual_upload_batches" ADD CONSTRAINT "manual_upload_batches_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "kpi"."manual_values" ADD CONSTRAINT "manual_values_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES kpi.manual_upload_batches(id) ON DELETE CASCADE;

ALTER TABLE ONLY "kpi"."manual_values" ADD CONSTRAINT "manual_values_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_audience_user_id_fkey" FOREIGN KEY (audience_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_crm_activity_dispatches" ADD CONSTRAINT "odoo_crm_activity_dispatches_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."odoo_crm_lead_actions" ADD CONSTRAINT "odoo_crm_lead_actions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_crm_lead_actions" ADD CONSTRAINT "odoo_crm_lead_actions_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES odoo_crm_leads(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_pending_action_audit_log" ADD CONSTRAINT "odoo_pending_action_audit_log_action_id_fkey" FOREIGN KEY (action_id) REFERENCES odoo_pending_actions(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."odoo_pending_action_audit_log" ADD CONSTRAINT "odoo_pending_action_audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_pending_actions" ADD CONSTRAINT "odoo_pending_actions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_pending_actions" ADD CONSTRAINT "odoo_pending_actions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."odoo_pending_actions" ADD CONSTRAINT "odoo_pending_actions_rejected_by_fkey" FOREIGN KEY (rejected_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_cancellations" ADD CONSTRAINT "order_cancellations_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES auth.users(id);

ALTER TABLE ONLY "public"."order_cancellations" ADD CONSTRAINT "order_cancellations_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES finance_journal_entries(id);

ALTER TABLE ONLY "public"."order_cancellations" ADD CONSTRAINT "order_cancellations_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id);

ALTER TABLE ONLY "public"."order_delivery_documents" ADD CONSTRAINT "order_delivery_documents_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_assigned_admin_profile_id_fkey" FOREIGN KEY (assigned_admin_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_converted_order_id_fkey" FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_sales_profile_id_fkey" FOREIGN KEY (sales_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_intents" ADD CONSTRAINT "order_intents_visit_id_fkey" FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_invoice_documents" ADD CONSTRAINT "order_invoice_documents_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_line_items" ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_ticket_comments" ADD CONSTRAINT "order_ticket_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_ticket_comments" ADD CONSTRAINT "order_ticket_comments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES order_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_tickets" ADD CONSTRAINT "order_tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_tickets" ADD CONSTRAINT "order_tickets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_tickets" ADD CONSTRAINT "order_tickets_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_tickets" ADD CONSTRAINT "order_tickets_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES products_dataset(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."product_barcodes" ADD CONSTRAINT "product_barcodes_registered_by_profile_id_fkey" FOREIGN KEY (registered_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."product_catalog" ADD CONSTRAINT "product_catalog_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."products_dataset" ADD CONSTRAINT "products_dataset_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."role_permission_assignments" ADD CONSTRAINT "role_permission_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."role_permission_assignments" ADD CONSTRAINT "role_permission_assignments_permission_key_fkey" FOREIGN KEY (permission_key) REFERENCES permission_catalog(permission_key) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."role_permission_assignments" ADD CONSTRAINT "role_permission_assignments_role_fkey" FOREIGN KEY (role) REFERENCES role_definitions(role) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sales_customer_speciality_mappings" ADD CONSTRAINT "sales_customer_speciality_mappings_customer_type_key_fkey" FOREIGN KEY (customer_type_key) REFERENCES sales_customer_type_mappings(customer_type_key) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sales_product_customer_mappings" ADD CONSTRAINT "sales_product_customer_mappin_category_key_subcategory_key_fkey" FOREIGN KEY (category_key, subcategory_key) REFERENCES sales_product_category_mappings(category_key, subcategory_key);

ALTER TABLE ONLY "public"."sales_product_customer_mappings" ADD CONSTRAINT "sales_product_customer_mappings_brand_key_fkey" FOREIGN KEY (brand_key) REFERENCES sales_brand_mappings(brand_key);

ALTER TABLE ONLY "public"."sales_targets" ADD CONSTRAINT "sales_targets_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."sales_targets" ADD CONSTRAINT "sales_targets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."service_issues" ADD CONSTRAINT "service_issues_call_id_fkey" FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."service_issues" ADD CONSTRAINT "service_issues_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."sla_breaches" ADD CONSTRAINT "sla_breaches_sla_definition_id_fkey" FOREIGN KEY (sla_definition_id) REFERENCES sla_definitions(id);

ALTER TABLE ONLY "public"."suplyd_products_history" ADD CONSTRAINT "suplyd_products_history_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES suplyd_scrape_batches(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_device_sessions" ADD CONSTRAINT "user_device_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."visit_dynamic_answers" ADD CONSTRAINT "visit_dynamic_answers_field_id_fkey" FOREIGN KEY (field_id) REFERENCES dynamic_form_fields(id) ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."visit_dynamic_answers" ADD CONSTRAINT "visit_dynamic_answers_visit_id_fkey" FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."visit_note_translations" ADD CONSTRAINT "visit_note_translations_visit_id_fkey" FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."visits" ADD CONSTRAINT "visits_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."visits" ADD CONSTRAINT "visits_linked_order_id_fkey" FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."visits" ADD CONSTRAINT "visits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

CREATE INDEX app_download_links_sort_order_idx ON public.app_download_links USING btree (sort_order, app_key);

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action_type, created_at DESC);

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_user_id, created_at DESC);

CREATE INDEX audit_logs_metadata_gin_idx ON public.audit_logs USING gin (metadata);

CREATE INDEX calls_contact_status_idx ON public.calls USING btree (contact_status, created_at DESC);

CREATE INDEX calls_customer_disposition_idx ON public.calls USING btree (customer_disposition, created_at DESC);

CREATE INDEX calls_customer_external_idx ON public.calls USING btree (customer_external_id);

CREATE INDEX calls_customer_idx ON public.calls USING btree (customer_id, created_at DESC);

CREATE INDEX calls_outcome_idx ON public.calls USING btree (call_outcome, created_at DESC);

CREATE INDEX calls_service_issue_flagged_idx ON public.calls USING btree (created_at DESC) WHERE (service_issue_flagged = true);

CREATE INDEX calls_user_email_idx ON public.calls USING btree (user_email);

CREATE INDEX calls_user_idx ON public.calls USING btree (user_id, created_at DESC);

CREATE INDEX competitor_intel_call_idx ON public.competitor_intel USING btree (call_id);

CREATE INDEX competitor_intel_customer_idx ON public.competitor_intel USING btree (customer_id, created_at DESC);

CREATE INDEX customers_assigned_user_idx ON public.customers USING btree (assigned_user_id);

CREATE INDEX customers_geo_idx ON public.customers USING btree (governorate, district, place);

CREATE INDEX customers_last_visit_idx ON public.customers USING btree (last_visit_at DESC);

CREATE INDEX customers_name_trgm_idx ON public.customers USING gin (customer_name gin_trgm_ops);

CREATE INDEX customers_product_interests_gin_idx ON public.customers USING gin (product_interests);

CREATE INDEX customers_raw_payload_gin_idx ON public.customers USING gin (raw_payload);

CREATE INDEX department_role_assignments_role_idx ON public.department_role_assignments USING btree (role);

CREATE INDEX departments_active_idx ON public.departments USING btree (is_active);

CREATE INDEX dispatcher_activity_log_created_at_idx ON public.dispatcher_activity_log USING btree (created_at DESC);

CREATE INDEX dispatcher_activity_log_entity_idx ON public.dispatcher_activity_log USING btree (entity_type, entity_id);

CREATE INDEX dispatcher_order_item_preparations_order_id_idx ON public.dispatcher_order_item_preparations USING btree (order_id);

CREATE INDEX dispatcher_order_item_preparations_status_idx ON public.dispatcher_order_item_preparations USING btree (status);

CREATE INDEX dispatcher_order_preparations_dispatcher_idx ON public.dispatcher_order_preparations USING btree (dispatcher_profile_id);

CREATE INDEX dispatcher_order_preparations_status_idx ON public.dispatcher_order_preparations USING btree (status);

CREATE INDEX dispatcher_plan_item_preparations_plan_id_idx ON public.dispatcher_plan_item_preparations USING btree (plan_id);

CREATE INDEX dispatcher_plan_item_preparations_status_idx ON public.dispatcher_plan_item_preparations USING btree (status);

CREATE INDEX dispatcher_plan_preparations_dispatcher_idx ON public.dispatcher_plan_preparations USING btree (dispatcher_profile_id);

CREATE INDEX dispatcher_plan_preparations_status_idx ON public.dispatcher_plan_preparations USING btree (status);

CREATE INDEX idx_cart_items_tenant_customer ON public.cart_items USING btree (tenant_id, customer_id);

CREATE INDEX idx_cart_items_tenant_session ON public.cart_items USING btree (tenant_id, session_id);

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);

CREATE INDEX idx_credit_note_lines_credit_note ON public.finance_credit_note_lines USING btree (credit_note_id);

CREATE INDEX idx_credit_notes_customer ON public.finance_credit_notes USING btree (customer_id);

CREATE INDEX idx_credit_notes_original_invoice ON public.finance_credit_notes USING btree (original_invoice_id);

CREATE INDEX idx_credit_notes_status ON public.finance_credit_notes USING btree (status);

CREATE INDEX idx_driver_cash_balance_driver_id ON public.driver_cash_balance USING btree (driver_id);

CREATE INDEX idx_driver_cash_balance_plan_id ON public.driver_cash_balance USING btree (route_plan_id);

CREATE INDEX idx_driver_cash_balance_status ON public.driver_cash_balance USING btree (status);

CREATE INDEX idx_finance_accounts_parent ON public.finance_accounts USING btree (parent_id);

CREATE INDEX idx_finance_accounts_type ON public.finance_accounts USING btree (type);

CREATE INDEX idx_finance_driver_settlements_driver ON public.finance_driver_settlements USING btree (driver_id);

CREATE INDEX idx_finance_driver_settlements_period ON public.finance_driver_settlements USING btree (period_start, period_end);

CREATE INDEX idx_finance_driver_settlements_status ON public.finance_driver_settlements USING btree (status);

CREATE INDEX idx_finance_fiscal_periods_dates ON public.finance_fiscal_periods USING btree (start_date, end_date);

CREATE INDEX idx_finance_fiscal_periods_status ON public.finance_fiscal_periods USING btree (status);

CREATE INDEX idx_finance_invoice_lines_invoice ON public.finance_invoice_lines USING btree (invoice_id);

CREATE INDEX idx_finance_invoices_customer ON public.finance_invoices USING btree (customer_id);

CREATE INDEX idx_finance_invoices_issue_date ON public.finance_invoices USING btree (issue_date);

CREATE INDEX idx_finance_invoices_order ON public.finance_invoices USING btree (order_id) WHERE (order_id IS NOT NULL);

CREATE INDEX idx_finance_invoices_status ON public.finance_invoices USING btree (status);

CREATE INDEX idx_finance_journal_entries_date ON public.finance_journal_entries USING btree (entry_date);

CREATE INDEX idx_finance_journal_entries_period ON public.finance_journal_entries USING btree (fiscal_period_id);

CREATE INDEX idx_finance_journal_entries_source ON public.finance_journal_entries USING btree (source_type, source_id);

CREATE INDEX idx_finance_journal_entries_status ON public.finance_journal_entries USING btree (status);

CREATE INDEX idx_finance_journal_lines_account ON public.finance_journal_lines USING btree (account_id);

CREATE INDEX idx_finance_journal_lines_cost_center ON public.finance_journal_lines USING btree (cost_center_id) WHERE (cost_center_id IS NOT NULL);

CREATE INDEX idx_finance_journal_lines_customer ON public.finance_journal_lines USING btree (customer_id) WHERE (customer_id IS NOT NULL);

CREATE INDEX idx_finance_journal_lines_entry ON public.finance_journal_lines USING btree (journal_entry_id);

CREATE INDEX idx_finance_payments_customer ON public.finance_payments USING btree (customer_id);

CREATE INDEX idx_finance_payments_date ON public.finance_payments USING btree (payment_date DESC);

CREATE INDEX idx_finance_payments_invoice ON public.finance_payments USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);

CREATE INDEX idx_finance_payments_order ON public.finance_payments USING btree (order_id) WHERE (order_id IS NOT NULL);

CREATE INDEX idx_finance_payments_status ON public.finance_payments USING btree (status);

CREATE INDEX idx_finance_tax_rates_active ON public.finance_tax_rates USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_location_tracking_plan ON public.location_tracking USING btree (plan_id, captured_at) WHERE (plan_id IS NOT NULL);

CREATE INDEX idx_location_tracking_user_time ON public.location_tracking USING btree (user_id, captured_at DESC);

CREATE INDEX idx_logistics_route_settlements_driver_id ON public.logistics_route_settlements USING btree (driver_id);

CREATE INDEX idx_logistics_route_settlements_plan_id ON public.logistics_route_settlements USING btree (plan_id);

CREATE INDEX idx_logistics_route_settlements_status ON public.logistics_route_settlements USING btree (status);

CREATE INDEX idx_logistics_shipments_return ON public.logistics_shipments USING btree (is_return_shipment) WHERE (is_return_shipment = true);

CREATE INDEX idx_onboarding_progress_user_tenant ON public.onboarding_progress USING btree (user_id, tenant_id);

CREATE INDEX idx_opaal_action_id ON public.odoo_pending_action_audit_log USING btree (action_id);

CREATE INDEX idx_opaal_created_at ON public.odoo_pending_action_audit_log USING btree (created_at DESC);

CREATE INDEX idx_oppa_action_type ON public.odoo_pending_actions USING btree (action_type);

CREATE INDEX idx_oppa_created_at ON public.odoo_pending_actions USING btree (created_at DESC);

CREATE INDEX idx_oppa_created_by ON public.odoo_pending_actions USING btree (created_by);

CREATE INDEX idx_oppa_entity_type ON public.odoo_pending_actions USING btree (entity_type);

CREATE INDEX idx_oppa_status ON public.odoo_pending_actions USING btree (status);

CREATE INDEX idx_order_cancellations_order ON public.order_cancellations USING btree (order_id);

CREATE INDEX idx_order_status_history_order ON public.order_status_history USING btree (order_id);

CREATE INDEX idx_order_ticket_comments_created_at ON public.order_ticket_comments USING btree (created_at);

CREATE INDEX idx_order_ticket_comments_ticket_id ON public.order_ticket_comments USING btree (ticket_id);

CREATE INDEX idx_order_tickets_assigned_to ON public.order_tickets USING btree (assigned_to);

CREATE INDEX idx_order_tickets_created_at ON public.order_tickets USING btree (created_at DESC);

CREATE INDEX idx_order_tickets_created_by ON public.order_tickets USING btree (created_by);

CREATE INDEX idx_order_tickets_order_id ON public.order_tickets USING btree (order_id);

CREATE INDEX idx_order_tickets_status ON public.order_tickets USING btree (status);

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);

CREATE INDEX idx_orders_tenant ON public.orders USING btree (tenant_id);

CREATE INDEX idx_product_catalog_category ON public.product_catalog USING btree (category_id);

CREATE INDEX idx_product_catalog_slug ON public.product_catalog USING btree (slug);

CREATE INDEX idx_product_catalog_status ON public.product_catalog USING btree (status);

CREATE INDEX idx_product_variants_product ON public.product_variants USING btree (product_id);

CREATE INDEX idx_products_barcode_trgm ON public.products USING gin (COALESCE(barcode, ''::text) gin_trgm_ops);

CREATE INDEX idx_products_ref_trgm ON public.products USING gin (COALESCE(internal_reference, ''::text) gin_trgm_ops);

CREATE INDEX idx_return_items_shipment ON public.logistics_return_shipment_items USING btree (return_shipment_id);

CREATE INDEX idx_sla_breaches_definition ON public.sla_breaches USING btree (sla_definition_id);

CREATE INDEX idx_sla_breaches_entity ON public.sla_breaches USING btree (entity_type, entity_id);

CREATE INDEX idx_sla_breaches_unresolved ON public.sla_breaches USING btree (resolved_at) WHERE (resolved_at IS NULL);

CREATE INDEX idx_suplyd_products_history_batch ON public.suplyd_products_history USING btree (batch_id);

CREATE INDEX idx_suplyd_products_history_product ON public.suplyd_products_history USING btree (product_id);

CREATE INDEX idx_suplyd_products_live_brand ON public.suplyd_products_live USING btree (brand_name);

CREATE INDEX idx_suplyd_products_live_category ON public.suplyd_products_live USING btree (category_name);

CREATE INDEX idx_suplyd_products_live_cost ON public.suplyd_products_live USING btree (cost_per_unit);

CREATE INDEX idx_suplyd_products_live_stock ON public.suplyd_products_live USING btree (stock_level);

CREATE INDEX idx_suplyd_scrape_batches_started ON public.suplyd_scrape_batches USING btree (started_at DESC);

CREATE INDEX idx_suplyd_scrape_batches_status ON public.suplyd_scrape_batches USING btree (status);

CREATE INDEX kpi_manual_upload_batches_department_period_idx ON public.kpi_manual_upload_batches USING btree (department_slug, period_start, period_end, uploaded_at DESC);

CREATE INDEX kpi_manual_values_code ON kpi.manual_values USING btree (kpi_code, period_start, period_end);

CREATE INDEX kpi_manual_values_code_period_idx ON public.kpi_manual_values USING btree (kpi_code, period_start, period_end, uploaded_at DESC);

CREATE INDEX kpi_manual_values_department_period_idx ON public.kpi_manual_values USING btree (department_slug, period_start, period_end, uploaded_at DESC);

CREATE INDEX kpi_tracking_code_month ON kpi.kpi_tracking USING btree (kpi_code, tracking_month);

CREATE INDEX location_tracking_metadata_gin_idx ON public.location_tracking USING gin (metadata);

CREATE INDEX location_tracking_user_idx ON public.location_tracking USING btree (user_id, captured_at DESC);

CREATE INDEX logistics_collection_handovers_driver_created_idx ON public.logistics_collection_handovers USING btree (driver_profile_id, created_at DESC);

CREATE INDEX logistics_collection_requests_driver_idx ON public.logistics_collection_requests USING btree (driver_profile_id, created_at DESC);

CREATE INDEX logistics_collection_requests_plan_idx ON public.logistics_collection_requests USING btree (plan_id);

CREATE INDEX logistics_collection_requests_status_idx ON public.logistics_collection_requests USING btree (status, created_at DESC);

CREATE INDEX logistics_delivery_plans_return_of_plan_id_idx ON public.logistics_delivery_plans USING btree (return_of_plan_id) WHERE (return_of_plan_id IS NOT NULL);

CREATE INDEX logistics_delivery_plans_status_idx ON public.logistics_delivery_plans USING btree (plan_status, planned_date DESC);

CREATE INDEX logistics_delivery_plans_user_date_idx ON public.logistics_delivery_plans USING btree (logistics_user_id, planned_date DESC);

CREATE INDEX logistics_departments_name_idx ON public.logistics_departments USING btree (department_name);

CREATE INDEX logistics_driver_alerts_driver_created_idx ON public.logistics_driver_alerts USING btree (driver_profile_id, created_at DESC);

CREATE INDEX logistics_driver_alerts_status_created_idx ON public.logistics_driver_alerts USING btree (status, created_at DESC);

CREATE INDEX logistics_shipment_collections_status_idx ON public.logistics_shipment_collections USING btree (collection_status);

CREATE INDEX logistics_shipment_events_actor_idx ON public.logistics_shipment_events USING btree (actor_profile_id, created_at DESC);

CREATE INDEX logistics_shipment_events_shipment_idx ON public.logistics_shipment_events USING btree (shipment_id, created_at DESC);

CREATE INDEX logistics_shipment_items_product_idx ON public.logistics_shipment_items USING btree (product_id);

CREATE INDEX logistics_shipment_items_shipment_idx ON public.logistics_shipment_items USING btree (shipment_id);

CREATE INDEX logistics_shipment_status_history_shipment_idx ON public.logistics_shipment_status_history USING btree (shipment_id, changed_at DESC);

CREATE INDEX logistics_shipments_customer_idx ON public.logistics_shipments USING btree (customer_id, scheduled_at DESC);

CREATE INDEX logistics_shipments_dashboard_active_idx ON public.logistics_shipments USING btree (scheduled_at DESC, shipment_status, assigned_profile_id) WHERE (assigned_profile_id IS NOT NULL);

CREATE INDEX logistics_shipments_linked_order_idx ON public.logistics_shipments USING btree (linked_order_id);

CREATE INDEX logistics_shipments_map_query_idx ON public.logistics_shipments USING btree (shipment_status, created_at DESC) WHERE (customer_latitude IS NOT NULL);

CREATE INDEX logistics_shipments_order_idx ON public.logistics_shipments USING btree (linked_order_id, scheduled_at DESC);

CREATE INDEX logistics_shipments_phase_idx ON public.logistics_shipments USING btree (delivery_phase, shipment_state);

CREATE INDEX logistics_shipments_plan_id_idx ON public.logistics_shipments USING btree (plan_id);

CREATE INDEX logistics_shipments_plan_sequence_idx ON public.logistics_shipments USING btree (plan_id, route_sequence, scheduled_at);

CREATE INDEX logistics_shipments_plan_status_idx ON public.logistics_shipments USING btree (plan_id, shipment_status) WHERE (plan_id IS NOT NULL);

CREATE INDEX logistics_shipments_profile_idx ON public.logistics_shipments USING btree (assigned_profile_id, scheduled_at DESC);

CREATE INDEX logistics_shipments_reference_idx ON public.logistics_shipments USING btree (shipment_reference);

CREATE INDEX logistics_shipments_shipment_status_idx ON public.logistics_shipments USING btree (shipment_status);

CREATE INDEX logistics_users_department_external_idx ON public.logistics_users USING btree (department_external_id);

CREATE INDEX logistics_users_email_idx ON public.logistics_users USING btree (work_email);

CREATE INDEX logistics_users_external_user_idx ON public.logistics_users USING btree (external_user_id);

CREATE INDEX logistics_users_linked_profile_idx ON public.logistics_users USING btree (linked_profile_id);

CREATE INDEX logistics_users_manager_external_idx ON public.logistics_users USING btree (manager_external_employee_id);

CREATE INDEX logistics_warehouses_code_idx ON public.logistics_warehouses USING btree (warehouse_code);

CREATE INDEX notification_recipients_user_idx ON public.notification_recipients USING btree (user_id, created_at DESC);

CREATE INDEX notifications_sent_at_idx ON public.notifications USING btree (sent_at DESC);

CREATE INDEX odoo_crm_activity_dispatches_pending_idx ON public.odoo_crm_activity_dispatches USING btree (status, updated_at) WHERE (status = 'pending'::text);

CREATE INDEX odoo_crm_activity_dispatches_requester_created_idx ON public.odoo_crm_activity_dispatches USING btree (requester_id, created_at DESC);

CREATE INDEX odoo_crm_activity_reports_date_idx ON public.odoo_crm_activity_reports USING btree (date_deadline);

CREATE INDEX odoo_crm_activity_reports_lead_idx ON public.odoo_crm_activity_reports USING btree (lead_external_id);

CREATE INDEX odoo_crm_activity_reports_odoo_updated_idx ON public.odoo_crm_activity_reports USING btree (odoo_updated_at DESC NULLS LAST, last_sync_at DESC NULLS LAST);

CREATE INDEX odoo_crm_activity_reports_state_idx ON public.odoo_crm_activity_reports USING btree (state);

CREATE INDEX odoo_crm_activity_reports_user_idx ON public.odoo_crm_activity_reports USING btree (user_name);

CREATE INDEX odoo_crm_lead_actions_external_idx ON public.odoo_crm_lead_actions USING btree (external_lead_id, created_at DESC);

CREATE INDEX odoo_crm_lead_actions_lead_idx ON public.odoo_crm_lead_actions USING btree (lead_id, created_at DESC);

CREATE INDEX odoo_crm_leads_odoo_updated_idx ON public.odoo_crm_leads USING btree (odoo_updated_at DESC NULLS LAST, last_sync_at DESC NULLS LAST);

CREATE INDEX odoo_crm_leads_salesperson_idx ON public.odoo_crm_leads USING btree (salesperson_name);

CREATE INDEX odoo_crm_leads_search_idx ON public.odoo_crm_leads USING gin (to_tsvector('simple'::regconfig, ((((((((((((((COALESCE(opportunity_name, ''::text) || ' '::text) || COALESCE(customer_name, ''::text)) || ' '::text) || COALESCE(contact_name, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(phone, ''::text)) || ' '::text) || COALESCE(salesperson_name, ''::text)) || ' '::text) || COALESCE(stage_name, ''::text)) || ' '::text) || COALESCE(notes, ''::text))));

CREATE INDEX odoo_crm_leads_stage_idx ON public.odoo_crm_leads USING btree (stage_name);

CREATE INDEX odoo_crm_model_records_model_updated_idx ON public.odoo_crm_model_records USING btree (odoo_model, odoo_updated_at DESC NULLS LAST, updated_at DESC);

CREATE INDEX odoo_crm_model_records_payload_gin_idx ON public.odoo_crm_model_records USING gin (raw_payload);

CREATE INDEX odoo_values_code_period_idx ON kpi.odoo_values USING btree (kpi_code, period_start, period_end);

CREATE INDEX order_delivery_documents_external_order_idx ON public.order_delivery_documents USING btree (external_order_id);

CREATE INDEX order_delivery_documents_order_idx ON public.order_delivery_documents USING btree (order_id, scheduled_at DESC);

CREATE INDEX order_intents_customer_idx ON public.order_intents USING btree (customer_id, created_at DESC);

CREATE INDEX order_intents_sales_profile_idx ON public.order_intents USING btree (sales_profile_id, created_at DESC);

CREATE INDEX order_intents_status_created_idx ON public.order_intents USING btree (status, created_at DESC);

CREATE INDEX order_invoice_documents_external_order_idx ON public.order_invoice_documents USING btree (external_order_id);

CREATE INDEX order_invoice_documents_order_idx ON public.order_invoice_documents USING btree (order_id, invoice_date DESC);

CREATE INDEX order_line_items_display_type_idx ON public.order_line_items USING btree (display_type) WHERE (display_type IS NOT NULL);

CREATE INDEX order_line_items_external_order_idx ON public.order_line_items USING btree (external_order_id);

CREATE INDEX order_line_items_order_idx ON public.order_line_items USING btree (order_id, sort_order, created_at);

CREATE INDEX orders_assigned_user_idx ON public.orders USING btree (assigned_user_id, order_date DESC);

CREATE INDEX orders_create_date_idx ON public.orders USING btree (create_date DESC);

CREATE INDEX orders_customer_idx ON public.orders USING btree (customer_id, order_date DESC);

CREATE INDEX orders_delivery_status_idx ON public.orders USING btree (delivery_status);

CREATE INDEX orders_raw_payload_gin_idx ON public.orders USING gin (raw_payload);

CREATE INDEX permission_catalog_module_idx ON public.permission_catalog USING btree (module_key, is_active, sort_order);

CREATE INDEX product_barcodes_dataset_id_idx ON public.product_barcodes USING btree (dataset_id);

CREATE INDEX product_barcodes_product_id_idx ON public.product_barcodes USING btree (product_id);

CREATE INDEX products_dataset_barcode_idx ON public.products_dataset USING btree (barcode) WHERE ((barcode IS NOT NULL) AND (barcode <> ''::text));

CREATE INDEX products_dataset_product_id_idx ON public.products_dataset USING btree (product_id);

CREATE INDEX products_dataset_search_keywords_gin_idx ON public.products_dataset USING gin (search_keywords);

CREATE INDEX products_internal_reference_idx ON public.products USING btree (internal_reference);

CREATE INDEX products_name_trgm_idx ON public.products USING gin (product_name gin_trgm_ops);

CREATE INDEX products_odoo_updated_at_idx ON public.products USING btree (odoo_updated_at DESC) WHERE (odoo_updated_at IS NOT NULL);

CREATE INDEX profiles_department_idx ON public.profiles USING btree (department_id);

CREATE INDEX profiles_odoo_user_id_idx ON public.profiles USING btree (odoo_user_id) WHERE (odoo_user_id IS NOT NULL);

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);

CREATE INDEX profiles_status_idx ON public.profiles USING btree (status);

CREATE INDEX quotations_created_by_idx ON public.quotations USING btree (created_by, generated_at DESC);

CREATE INDEX quotations_rendered_payload_gin_idx ON public.quotations USING gin (rendered_payload);

CREATE INDEX role_permission_assignments_role_idx ON public.role_permission_assignments USING btree (role);

CREATE INDEX sales_product_customer_mappings_brand_idx ON public.sales_product_customer_mappings USING btree (brand_key) WHERE is_active;

CREATE INDEX sales_product_customer_mappings_category_idx ON public.sales_product_customer_mappings USING btree (category_key, subcategory_key) WHERE is_active;

CREATE INDEX sales_product_customer_mappings_customer_types_gin_idx ON public.sales_product_customer_mappings USING gin (customer_types);

CREATE INDEX sales_product_customer_mappings_specialities_gin_idx ON public.sales_product_customer_mappings USING gin (customer_specialities);

CREATE INDEX sales_targets_user_month_idx ON public.sales_targets USING btree (user_id, target_month DESC);

CREATE INDEX service_issues_call_idx ON public.service_issues USING btree (call_id);

CREATE INDEX service_issues_customer_idx ON public.service_issues USING btree (customer_id, created_at DESC);

CREATE INDEX service_issues_status_idx ON public.service_issues USING btree (status, created_at DESC);

CREATE INDEX visits_customer_external_idx ON public.visits USING btree (customer_external_id);

CREATE INDEX visits_customer_idx ON public.visits USING btree (customer_id, checked_in_at DESC);

CREATE INDEX visits_fraud_idx ON public.visits USING btree (fraud_status, checked_in_at DESC);

CREATE INDEX visits_fraud_signals_gin_idx ON public.visits USING gin (fraud_signals);

CREATE INDEX visits_raw_payload_gin_idx ON public.visits USING gin (raw_payload);

CREATE INDEX visits_user_email_idx ON public.visits USING btree (user_email);

CREATE INDEX visits_user_idx ON public.visits USING btree (user_id, checked_in_at DESC);

CREATE INDEX warehouse_inventory_product_idx ON public.warehouse_inventory USING btree (product_id);

CREATE INDEX warehouse_inventory_warehouse_idx ON public.warehouse_inventory USING btree (warehouse_id);

CREATE UNIQUE INDEX dispatcher_plan_item_preparations_product_key_idx ON public.dispatcher_plan_item_preparations USING btree (plan_preparation_id, COALESCE(product_name, ''::text), COALESCE(product_ref, ''::text), COALESCE(product_code, ''::text));

CREATE UNIQUE INDEX idx_finance_accounts_code ON public.finance_accounts USING btree (code);

CREATE UNIQUE INDEX idx_finance_cost_centers_code ON public.finance_cost_centers USING btree (code);

CREATE UNIQUE INDEX idx_finance_journal_entries_number ON public.finance_journal_entries USING btree (entry_number);

CREATE UNIQUE INDEX idx_logistics_shipments_return_ref ON public.logistics_shipments USING btree (return_reference) WHERE (return_reference IS NOT NULL);

CREATE UNIQUE INDEX idx_odoo_crm_leads_phone_unique ON public.odoo_crm_leads USING btree (phone_number) WHERE (phone_number IS NOT NULL);

CREATE UNIQUE INDEX idx_products_barcode ON public.products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND (barcode <> ''::text));

CREATE UNIQUE INDEX idx_profiles_odoo_user_id ON public.profiles USING btree (odoo_user_id) WHERE (odoo_user_id IS NOT NULL);

CREATE UNIQUE INDEX order_intents_visit_id_key ON public.order_intents USING btree (visit_id) WHERE (visit_id IS NOT NULL);
