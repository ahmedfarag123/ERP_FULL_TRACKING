CREATE SCHEMA IF NOT EXISTS kpi;

CREATE TYPE "public"."app_role" AS ENUM ('admin', 'manager', 'supervisor', 'sales_agent', 'telesales', 'driver', 'dispatcher', 'spv');

CREATE TYPE "public"."customer_priority" AS ENUM ('low', 'medium', 'high');

CREATE TYPE "public"."customer_size" AS ENUM ('small', 'medium', 'large');

CREATE TYPE "public"."dynamic_field_type" AS ENUM ('text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'photo', 'tel');

CREATE TYPE "public"."fraud_status" AS ENUM ('normal', 'suspicious', 'fraudulent');

CREATE TYPE "public"."notification_audience_type" AS ENUM ('all', 'role', 'user');

CREATE TYPE "public"."notification_channel" AS ENUM ('in_app', 'push');

CREATE TYPE "public"."odoo_action_status" AS ENUM ('draft', 'waiting_approval', 'approved', 'sending', 'completed', 'failed', 'rejected');

CREATE TYPE "public"."order_status" AS ENUM ('pending', 'confirmed', 'processing', 'delivered', 'cancelled');

CREATE TYPE "public"."quotation_status" AS ENUM ('draft', 'generated', 'sent', 'accepted', 'rejected', 'expired');

CREATE TYPE "public"."record_status" AS ENUM ('active', 'inactive', 'archived');

CREATE TYPE "public"."ticket_priority" AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE "public"."ticket_status" AS ENUM ('open', 'pending', 'in_progress', 'resolved', 'closed');

CREATE TYPE "public"."visit_mode" AS ENUM ('gps', 'manual');

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

CREATE INDEX idx_mv_account_balances_code ON public.mv_account_balances USING btree (account_code);

CREATE INDEX idx_mv_account_balances_type ON public.mv_account_balances USING btree (account_type);

CREATE UNIQUE INDEX idx_mv_account_balances_id ON public.mv_account_balances USING btree (account_id);

CREATE UNIQUE INDEX idx_mv_agent_monthly_facts ON public.mv_agent_monthly_facts USING btree (user_id, month_start);

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

CREATE OR REPLACE VIEW "public"."agent_performance_snapshot" AS
 WITH months AS (
         SELECT sales_targets.user_id,
            sales_targets.target_month
           FROM sales_targets
        UNION
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS target_month
           FROM visits
        UNION
         SELECT calls.user_id,
            date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date AS target_month
           FROM calls
        UNION
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS target_month
           FROM quotations
        UNION
         SELECT COALESCE(o.assigned_user_id, p_1.id) AS user_id,
            date_trunc('month'::text, o.order_date)::date AS target_month
           FROM orders o
             LEFT JOIN profiles p_1 ON p_1.odoo_user_id = o.user_id
          WHERE COALESCE(o.assigned_user_id, p_1.id) IS NOT NULL
        ), visit_metrics AS (
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS target_month,
            count(*) AS actual_visits,
            count(DISTINCT visits.customer_id) AS unique_customers_visited,
            count(*) FILTER (WHERE visits.fraud_status = 'suspicious'::fraud_status) AS suspicious_visits,
            count(*) FILTER (WHERE visits.fraud_status = 'fraudulent'::fraud_status) AS fraudulent_visits
           FROM visits
          GROUP BY visits.user_id, (date_trunc('month'::text, visits.checked_in_at)::date)
        ), call_metrics AS (
         SELECT calls.user_id,
            date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date AS target_month,
            count(*) AS actual_calls,
            count(*) FILTER (WHERE is_reachable_call(calls.call_outcome)) AS reachable_calls
           FROM calls
          GROUP BY calls.user_id, (date_trunc('month'::text, COALESCE(calls.completed_at, calls.started_at, calls.created_at))::date)
        ), quotation_metrics AS (
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS target_month,
            count(*) AS actual_quotations
           FROM quotations
          GROUP BY quotations.created_by, (date_trunc('month'::text, quotations.generated_at)::date)
        ), order_metrics AS (
         SELECT COALESCE(o.assigned_user_id, p_1.id) AS user_id,
            date_trunc('month'::text, o.order_date)::date AS target_month,
            count(*) AS actual_orders,
            COALESCE(sum(o.total_amount), 0::numeric)::numeric(14,2) AS actual_gmv
           FROM orders o
             LEFT JOIN profiles p_1 ON p_1.odoo_user_id = o.user_id
          WHERE COALESCE(o.assigned_user_id, p_1.id) IS NOT NULL
          GROUP BY (COALESCE(o.assigned_user_id, p_1.id)), (date_trunc('month'::text, o.order_date)::date)
        )
 SELECT p.id AS user_id,
    p.full_name,
    p.email,
    p.role,
    m.target_month,
    COALESCE(t.target_visits, 0) AS target_visits,
    COALESCE(t.target_calls, 0) AS target_calls,
    COALESCE(t.target_reachability, 0::numeric) AS target_reachability,
    COALESCE(t.target_gmv, 0::numeric)::numeric(14,2) AS target_gmv,
    COALESCE(t.target_quotations, 0) AS target_quotations,
    COALESCE(vm.actual_visits, 0::bigint) AS actual_visits,
    COALESCE(cm.actual_calls, 0::bigint) AS actual_calls,
        CASE
            WHEN COALESCE(cm.actual_calls, 0::bigint) = 0 THEN 0::numeric(8,2)
            ELSE round(COALESCE(cm.reachable_calls, 0::bigint)::numeric / cm.actual_calls::numeric * 100::numeric, 2)
        END AS actual_reachability,
    COALESCE(qm.actual_quotations, 0::bigint) AS actual_quotations,
    COALESCE(om.actual_orders, 0::bigint) AS actual_orders,
    COALESCE(om.actual_gmv, 0::numeric)::numeric(14,2) AS actual_gmv,
    COALESCE(vm.unique_customers_visited, 0::bigint) AS unique_customers_visited,
    COALESCE(vm.suspicious_visits, 0::bigint) AS suspicious_visits,
    COALESCE(vm.fraudulent_visits, 0::bigint) AS fraudulent_visits
   FROM months m
     JOIN profiles p ON p.id = m.user_id
     LEFT JOIN sales_targets t ON t.user_id = m.user_id AND t.target_month = m.target_month
     LEFT JOIN visit_metrics vm ON vm.user_id = m.user_id AND vm.target_month = m.target_month
     LEFT JOIN call_metrics cm ON cm.user_id = m.user_id AND cm.target_month = m.target_month
     LEFT JOIN quotation_metrics qm ON qm.user_id = m.user_id AND qm.target_month = m.target_month
     LEFT JOIN order_metrics om ON om.user_id = m.user_id AND om.target_month = m.target_month;

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

DROP MATERIALIZED VIEW IF EXISTS "public"."mv_account_balances";
CREATE MATERIALIZED VIEW "public"."mv_account_balances" AS
 SELECT a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(sum(l.debit), 0::numeric) AS total_debit,
    COALESCE(sum(l.credit), 0::numeric) AS total_credit,
        CASE
            WHEN a.type = ANY (ARRAY['asset'::text, 'expense'::text]) THEN COALESCE(sum(l.debit), 0::numeric) - COALESCE(sum(l.credit), 0::numeric)
            ELSE COALESCE(sum(l.credit), 0::numeric) - COALESCE(sum(l.debit), 0::numeric)
        END AS balance,
    now() AS refreshed_at
   FROM finance_accounts a
     LEFT JOIN finance_journal_lines l ON l.account_id = a.id
     LEFT JOIN finance_journal_entries e ON e.id = l.journal_entry_id AND e.status = 'posted'::text
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type WITH NO DATA;

DROP MATERIALIZED VIEW IF EXISTS "public"."mv_agent_kpis";
CREATE MATERIALIZED VIEW "public"."mv_agent_kpis" AS
 SELECT f.user_id,
    f.month_start,
    f.year,
    f.month,
    f.month_name,
    f.role,
    p.job_title,
    p.full_name AS agent_name,
    p.email AS agent_email,
    f.target_visits,
    f.target_calls,
    f.target_reachability,
    f.target_quotations,
    f.target_orders,
    f.target_gmv,
    f.actual_visits,
    f.successful_visits,
    f.suspicious_visits,
    f.fraudulent_visits,
    f.cancelled_visits,
    f.avg_visit_duration_seconds,
    f.actual_calls,
    f.reachable_calls,
    f.actual_quotations,
    f.actual_orders,
    f.actual_gmv,
    f.unique_customers,
    f.new_customers,
    f.returning_customers,
    f.gross_profit,
    f.gross_margin,
    round(f.actual_visits::numeric / NULLIF(f.target_visits, 0)::numeric * 100::numeric, 2) AS visit_achievement_pct,
    round(f.actual_calls::numeric / NULLIF(f.target_calls, 0)::numeric * 100::numeric, 2) AS call_achievement_pct,
    round(f.actual_quotations::numeric / NULLIF(f.target_quotations, 0)::numeric * 100::numeric, 2) AS quotation_achievement_pct,
    NULL::numeric AS order_achievement_pct,
    round(f.actual_gmv / NULLIF(f.target_gmv, 0::numeric) * 100::numeric, 2) AS gmv_achievement_pct,
    round(f.reachable_calls::numeric / NULLIF(f.target_reachability, 0::numeric) * 100::numeric, 2) AS reachability_achievement_pct,
    round(f.actual_calls::numeric / NULLIF(f.actual_visits, 0)::numeric * 100::numeric, 2) AS call_to_visit_pct,
    round(f.actual_quotations::numeric / NULLIF(f.actual_visits, 0)::numeric * 100::numeric, 2) AS visit_to_quote_pct,
    round(f.actual_orders::numeric / NULLIF(f.actual_quotations, 0)::numeric * 100::numeric, 2) AS quote_to_order_pct,
    round(f.actual_orders::numeric / NULLIF(f.actual_calls, 0)::numeric * 100::numeric, 2) AS call_to_order_pct,
    f.actual_gmv / NULLIF(f.actual_visits, 0)::numeric AS gmv_per_visit,
    f.actual_gmv / NULLIF(f.actual_calls, 0)::numeric AS gmv_per_call,
    f.actual_orders::numeric / NULLIF(f.actual_visits, 0)::numeric AS orders_per_visit,
    f.actual_orders::numeric / NULLIF(f.actual_calls, 0)::numeric AS orders_per_call,
    f.actual_gmv / NULLIF(f.actual_orders, 0)::numeric AS avg_order_value,
    GREATEST(COALESCE(f.target_visits, 0::bigint) - f.actual_visits, 0::bigint) AS remaining_visits,
    GREATEST(COALESCE(f.target_calls, 0::bigint) - f.actual_calls, 0::bigint) AS remaining_calls,
    GREATEST(COALESCE(f.target_quotations, 0::bigint) - f.actual_quotations, 0::bigint) AS remaining_quotations,
    GREATEST(COALESCE(f.target_gmv, 0::numeric) - f.actual_gmv, 0::numeric) AS remaining_gmv
   FROM mv_agent_monthly_facts f
     LEFT JOIN profiles p ON p.id = f.user_id WITH NO DATA;

DROP MATERIALIZED VIEW IF EXISTS "public"."mv_agent_monthly_facts";
CREATE MATERIALIZED VIEW "public"."mv_agent_monthly_facts" AS
 WITH month_grid AS (
         SELECT visits.user_id,
            date_trunc('month'::text, visits.checked_in_at)::date AS month_start
           FROM visits
          WHERE visits.checked_in_at IS NOT NULL
        UNION
         SELECT calls.user_id,
            date_trunc('month'::text, calls.completed_at)::date AS month_start
           FROM calls
          WHERE calls.completed_at IS NOT NULL
        UNION
         SELECT orders.assigned_user_id AS user_id,
            date_trunc('month'::text, orders.order_date)::date AS month_start
           FROM orders
          WHERE orders.order_date IS NOT NULL
        UNION
         SELECT quotations.created_by AS user_id,
            date_trunc('month'::text, quotations.generated_at)::date AS month_start
           FROM quotations
          WHERE quotations.generated_at IS NOT NULL
        UNION
         SELECT sales_targets.user_id,
            date_trunc('month'::text, sales_targets.target_month::timestamp with time zone)::date AS month_start
           FROM sales_targets
          WHERE sales_targets.target_month IS NOT NULL
        ), base AS (
         SELECT g.user_id,
            g.month_start,
            EXTRACT(year FROM g.month_start)::integer AS year,
            EXTRACT(month FROM g.month_start)::integer AS month,
            to_char(g.month_start::timestamp with time zone, 'FMMonth'::text) AS month_name,
            p.role,
            st.target_visits,
            st.target_calls,
            st.target_reachability,
            st.target_quotations,
            st.target_gmv
           FROM month_grid g
             LEFT JOIN sales_targets st ON st.user_id = g.user_id AND date_trunc('month'::text, st.target_month::timestamp with time zone)::date = g.month_start
             LEFT JOIN profiles p ON p.id = g.user_id
        )
 SELECT b.user_id,
    b.month_start,
    b.year,
    b.month,
    b.month_name,
    b.role,
    COALESCE(b.target_visits, 0)::bigint AS target_visits,
    COALESCE(b.target_calls, 0)::bigint AS target_calls,
    b.target_reachability::numeric AS target_reachability,
    COALESCE(b.target_quotations, 0)::bigint AS target_quotations,
    NULL::bigint AS target_orders,
    b.target_gmv::numeric AS target_gmv,
    count(v.id) AS actual_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text IS DISTINCT FROM 'fraudulent'::text AND v.fraud_status::text IS DISTINCT FROM 'suspicious'::text AND v.visit_result IS DISTINCT FROM 'cancelled'::text) AS successful_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text = 'suspicious'::text) AS suspicious_visits,
    count(v.id) FILTER (WHERE v.fraud_status::text = 'fraudulent'::text) AS fraudulent_visits,
    count(v.id) FILTER (WHERE v.visit_result = 'cancelled'::text) AS cancelled_visits,
    avg(EXTRACT(epoch FROM v.completed_at - v.checked_in_at)) AS avg_visit_duration_seconds,
    count(c.id) AS actual_calls,
    count(c.id) FILTER (WHERE c.call_outcome IS DISTINCT FROM 'unreachable'::text) AS reachable_calls,
    count(q.id) AS actual_quotations,
    count(o.id) AS actual_orders,
    COALESCE(sum(o.amount_total), 0::numeric) AS actual_gmv,
    count(DISTINCT v.customer_id) AS unique_customers,
    count(DISTINCT v.customer_id) FILTER (WHERE v.created_at = (( SELECT min(v2.created_at) AS min
           FROM visits v2
          WHERE v2.customer_id = v.customer_id))) AS new_customers,
    count(DISTINCT v.customer_id) FILTER (WHERE v.created_at > (( SELECT min(v2.created_at) AS min
           FROM visits v2
          WHERE v2.customer_id = v.customer_id))) AS returning_customers,
    COALESCE(sum(o.margin), 0::numeric) AS gross_profit,
        CASE
            WHEN count(o.id) = 0 THEN NULL::numeric
            ELSE COALESCE(sum(o.margin) / NULLIF(sum(o.amount_total), 0::numeric), 0::numeric)
        END AS gross_margin
   FROM base b
     LEFT JOIN visits v ON v.user_id = b.user_id AND v.checked_in_at >= b.month_start AND v.checked_in_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN calls c ON c.user_id = b.user_id AND c.completed_at >= b.month_start AND c.completed_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN quotations q ON q.created_by = b.user_id AND q.generated_at >= b.month_start AND q.generated_at < (b.month_start + '1 mon'::interval)
     LEFT JOIN orders o ON o.assigned_user_id = b.user_id AND o.order_date >= b.month_start AND o.order_date < (b.month_start + '1 mon'::interval)
  GROUP BY b.user_id, b.month_start, b.year, b.month, b.month_name, b.role, b.target_visits, b.target_calls, b.target_reachability, b.target_quotations, b.target_gmv WITH NO DATA;

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

CREATE OR REPLACE VIEW "public"."v_ar_aging" AS
 SELECT customer_id,
    id AS invoice_id,
    invoice_number,
    issue_date,
    due_date,
    total AS invoice_total,
        CASE
            WHEN due_date IS NULL THEN 'Not Due'::text
            WHEN due_date >= CURRENT_DATE THEN 'Current'::text
            WHEN due_date >= (CURRENT_DATE - '30 days'::interval) THEN '1-30 Days'::text
            WHEN due_date >= (CURRENT_DATE - '60 days'::interval) THEN '31-60 Days'::text
            WHEN due_date >= (CURRENT_DATE - '90 days'::interval) THEN '61-90 Days'::text
            ELSE '90+ Days'::text
        END AS aging_bucket,
    CURRENT_DATE - due_date AS days_overdue
   FROM finance_invoices i
  WHERE status = 'posted'::text AND total > 0::numeric
  ORDER BY customer_id, due_date;

CREATE OR REPLACE VIEW "public"."v_balance_sheet" AS
 SELECT account_code,
    account_name,
    account_type,
    total_debit,
    total_credit,
    balance,
        CASE
            WHEN account_type = 'asset'::text THEN 'Assets'::text
            WHEN account_type = 'liability'::text THEN 'Liabilities'::text
            WHEN account_type = 'equity'::text THEN 'Equity'::text
            ELSE 'Other'::text
        END AS bs_category
   FROM mv_account_balances
  WHERE account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text])
  ORDER BY account_type, account_code;

CREATE OR REPLACE VIEW "public"."v_general_ledger" AS
 SELECT e.id AS entry_id,
    e.entry_number,
    e.entry_date,
    e.source_type,
    e.source_id,
    e.description AS entry_description,
    e.status,
    l.id AS line_id,
    a.code AS account_code,
    a.name AS account_name,
    l.debit,
    l.credit,
    l.description AS line_description,
    l.cost_center_id,
    cc.name AS cost_center_name,
    e.posted_by,
    e.created_at
   FROM finance_journal_entries e
     JOIN finance_journal_lines l ON l.journal_entry_id = e.id
     JOIN finance_accounts a ON a.id = l.account_id
     LEFT JOIN finance_cost_centers cc ON cc.id = l.cost_center_id
  ORDER BY e.entry_date, e.entry_number, l.id;

CREATE OR REPLACE VIEW "public"."v_profit_and_loss" AS
 SELECT account_code,
    account_name,
    account_type,
    total_debit,
    total_credit,
    balance,
        CASE
            WHEN account_type = 'revenue'::text THEN 'Revenue'::text
            WHEN account_type = 'expense'::text THEN 'Expense'::text
            ELSE 'Other'::text
        END AS pl_category
   FROM mv_account_balances
  WHERE account_type = ANY (ARRAY['revenue'::text, 'expense'::text])
  ORDER BY account_type, account_code;

CREATE OR REPLACE VIEW "public"."v_trial_balance" AS
 SELECT account_code,
    account_name,
    account_type,
        CASE
            WHEN balance >= 0::numeric THEN balance
            ELSE 0::numeric
        END AS debit_balance,
        CASE
            WHEN balance < 0::numeric THEN abs(balance)
            ELSE 0::numeric
        END AS credit_balance
   FROM mv_account_balances
  WHERE abs(balance) > 0.01
  ORDER BY account_code;

CREATE OR REPLACE FUNCTION public.admin_approve_collection_request(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.logistics_collection_requests%rowtype;
  v_collection public.logistics_shipment_collections%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management users can approve collection requests.';
  end if;

  select *
  into v_request
  from public.logistics_collection_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Collection request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This collection request has already been %.', v_request.status;
  end if;

  -- Update request status
  update public.logistics_collection_requests
  set
    status = 'approved',
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_request_id
  returning *
  into v_request;

  -- Mark all shipments in the plan as settled
  if v_request.plan_id is not null then
    update public.logistics_shipments
    set
      shipment_status = 'SETTLED',
      delivery_phase = 'settled',
      updated_at = timezone('utc', now())
    where plan_id = v_request.plan_id
      and shipment_status not in ('SETTLED', 'CANCELLED');

    update public.logistics_shipment_collections
    set
      collection_status = 'collected_successfully',
      collected_successfully_amount = v_request.collected_amount,
      admin_confirmed_by_profile_id = auth.uid(),
      admin_confirmed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where shipment_id in (
      select id from public.logistics_shipments
      where plan_id = v_request.plan_id
    )
    and collection_status <> 'collected_successfully';
  end if;

  return v_request;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assign_order_to_driver(p_order_id uuid, p_logistics_user_id uuid, p_scheduled_at timestamp with time zone, p_notes text DEFAULT NULL::text, p_planned_date date DEFAULT NULL::date, p_force_new boolean DEFAULT false, p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_plan public.logistics_delivery_plans%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_shipment_id uuid;
  v_planned_date date;
  v_total_amount numeric(14, 2);
  v_currency text;
begin
  perform public.logistics_admin_required();

  if p_scheduled_at is null then
    raise exception 'Scheduled delivery time is required.';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  select *
  into v_customer
  from public.customers
  where id = v_order.customer_id;

  v_planned_date := coalesce(p_planned_date, (p_scheduled_at at time zone 'Africa/Cairo')::date);

  if p_plan_id is not null then
    select *
    into v_plan
    from public.logistics_delivery_plans
    where id = p_plan_id
    for update;

    if v_plan.id is null then
      perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
    end if;

    if v_plan.logistics_user_id is distinct from p_logistics_user_id then
      perform public.raise_logistics_error('PLAN_DRIVER_MISMATCH', 'Selected plan belongs to a different driver.');
    end if;

    if v_plan.plan_status not in ('pending', 'in_progress') then
      perform public.raise_logistics_error('INVALID_PLAN_STATUS', 'Plan cannot receive assigned orders in its current status.');
    end if;
  else
    select *
    into v_plan
    from public.admin_create_delivery_plan(p_logistics_user_id, v_planned_date, p_notes, p_force_new);
  end if;

  select *
  into v_shipment
  from public.logistics_shipments
  where linked_order_id = v_order.id
    and coalesce(shipment_status, 'PENDING_ASSIGN') not in ('DELIVERED', 'FINISHED', 'SETTLED')
  order by created_at desc
  limit 1
  for update;

  if v_shipment.id is null then
    insert into public.logistics_shipments (
      plan_id,
      shipment_reference,
      origin_ref,
      external_order_id,
      odoo_order_name,
      linked_order_id,
      customer_id,
      customer_name,
      external_warehouse_id,
      warehouse_name,
      shipment_state,
      shipment_status,
      delivery_phase,
      scheduled_at,
      customer_latitude,
      customer_longitude,
      notes,
      source,
      raw_payload
    )
    values (
      v_plan.id,
      'SHIP-' || coalesce(v_order.odoo_order_name, v_order.external_order_id, left(v_order.id::text, 8)),
      coalesce(v_order.odoo_order_name, v_order.external_order_id, v_order.id::text),
      v_order.external_order_id,
      v_order.odoo_order_name,
      v_order.id,
      v_order.customer_id,
      coalesce(v_order.customer_name, v_customer.customer_name),
      v_order.warehouse_id,
      v_order.warehouse_id,
      'assigned',
      'ASSIGNED',
      'assigned',
      p_scheduled_at,
      v_customer.lat,
      v_customer.lng,
      nullif(trim(coalesce(p_notes, '')), ''),
      'manual',
      jsonb_build_object(
        'assigned_from', 'admin_assign_order_to_driver',
        'assigned_by', auth.uid(),
        'payment_term', v_order.payment_term_id
      )
    )
    returning *
    into v_shipment;
  else
    update public.logistics_shipments
    set
      customer_id = coalesce(customer_id, v_order.customer_id),
      customer_name = coalesce(customer_name, v_order.customer_name, v_customer.customer_name),
      external_order_id = coalesce(external_order_id, v_order.external_order_id),
      odoo_order_name = coalesce(odoo_order_name, v_order.odoo_order_name),
      external_warehouse_id = coalesce(external_warehouse_id, v_order.warehouse_id),
      warehouse_name = coalesce(warehouse_name, v_order.warehouse_id),
      customer_latitude = coalesce(customer_latitude, v_customer.lat),
      customer_longitude = coalesce(customer_longitude, v_customer.lng),
      scheduled_at = p_scheduled_at,
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      updated_at = timezone('utc', now())
    where id = v_shipment.id
    returning *
    into v_shipment;
  end if;

  v_shipment_id := v_shipment.id;

  select *
  into v_shipment
  from public.admin_assign_shipment_to_plan(v_shipment_id, v_plan.id, p_scheduled_at, p_notes);

  perform public.sync_logistics_shipment_items_from_order(v_shipment.id, v_order.id);

  v_total_amount := coalesce(v_order.amount_total, v_order.total_amount, 0);
  v_currency := coalesce(v_order.currency_code, 'EGP');

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    collected_successfully_amount,
    currency_code,
    collection_status
  )
  values (
    v_shipment.id,
    v_total_amount,
    0,
    0,
    v_currency,
    'pending_delivery_amount'
  )
  on conflict (shipment_id) do update
  set
    pending_delivery_amount = greatest(public.logistics_shipment_collections.pending_delivery_amount, excluded.pending_delivery_amount),
    currency_code = excluded.currency_code,
    updated_at = timezone('utc', now());

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assign_shipment_to_plan(p_shipment_id uuid, p_plan_id uuid, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_driver public.logistics_users%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_next_sequence integer;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can receive shipments.';
  end if;

  select *
  into v_driver
  from public.logistics_users
  where id = v_plan.logistics_user_id;

  if v_driver.id is null or v_driver.linked_profile_id is null then
    raise exception 'Plan driver is not linked to an app profile.';
  end if;

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN') in ('DELIVERED', 'FINISHED', 'SETTLED') then
    raise exception 'Completed shipments cannot be reassigned.';
  end if;

  select coalesce(max(route_sequence), 0) + 1
  into v_next_sequence
  from public.logistics_shipments
  where plan_id = v_plan.id;

  update public.logistics_shipments
  set
    plan_id = v_plan.id,
    logistics_user_id = v_driver.id,
    assigned_profile_id = v_driver.linked_profile_id,
    assigned_user_name = v_driver.employee_name,
    assigned_job_title = v_driver.job_title,
    shipment_state = 'assigned',
    shipment_status = 'ASSIGNED',
    delivery_phase = 'assigned',
    completed_at = null,
    scheduled_at = coalesce(p_scheduled_at, scheduled_at, v_plan.planned_date::timestamptz),
    route_sequence = case
      when plan_id is distinct from v_plan.id then v_next_sequence
      else coalesce(route_sequence, v_next_sequence)
    end,
    notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
    raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'assigned_from', 'admin_plan_control',
      'assigned_by', auth.uid(),
      'assigned_at', timezone('utc', now())
    ),
    updated_at = timezone('utc', now())
  where id = v_shipment.id
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_bulk_assign_shipments_to_plan(p_shipment_ids uuid[], p_plan_id uuid, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_driver public.logistics_users%rowtype;
  v_count integer;
  v_max_batch constant integer := 100;
  v_shipment_id uuid;
  v_order_id uuid;
begin
  perform public.logistics_admin_required();

  if coalesce(array_length(p_shipment_ids, 1), 0) = 0 then
    raise exception 'At least one shipment is required.';
  end if;

  if array_length(p_shipment_ids, 1) > v_max_batch then
    raise exception 'Cannot assign more than % shipments at once.', v_max_batch;
  end if;

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can receive shipments.';
  end if;

  select *
  into v_driver
  from public.logistics_users
  where id = v_plan.logistics_user_id;

  if v_driver.id is null or v_driver.linked_profile_id is null then
    raise exception 'Plan driver is not linked to an app profile.';
  end if;

  update public.logistics_shipments
  set
    plan_id = v_plan.id,
    logistics_user_id = v_driver.id,
    assigned_profile_id = v_driver.linked_profile_id,
    assigned_user_name = v_driver.employee_name,
    assigned_job_title = v_driver.job_title,
    shipment_state = 'assigned',
    shipment_status = case
      when shipment_status in ('PENDING_ASSIGN') then 'ASSIGNED'
      else shipment_status
    end,
    delivery_phase = case
      when delivery_phase in ('pending', 'ready') then 'assigned'
      else delivery_phase
    end,
    scheduled_at = coalesce(p_scheduled_at, scheduled_at, v_plan.planned_date::timestamptz),
    route_sequence = case
      when plan_id is distinct from v_plan.id then
        coalesce(
          (select coalesce(max(s2.route_sequence), 0) + 1
           from public.logistics_shipments s2
           where s2.plan_id = v_plan.id),
          1
        )
      else coalesce(route_sequence, 1)
    end,
    raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'assigned_from', 'admin_plan_control',
      'assigned_by', auth.uid(),
      'assigned_at', timezone('utc', now())
    ),
    updated_at = timezone('utc', now())
  where id = any(p_shipment_ids)
    and coalesce(shipment_status, 'PENDING_ASSIGN') not in ('DELIVERED', 'FINISHED', 'SETTLED');

  for v_shipment_id, v_order_id in
    select ls.id, ls.linked_order_id
    from public.logistics_shipments ls
    where ls.id = any(p_shipment_ids)
      and ls.linked_order_id is not null
      and not exists (
        select 1 from public.logistics_shipment_items lsi
        where lsi.shipment_id = ls.id
      )
  loop
    perform public.sync_logistics_shipment_items_from_order(v_shipment_id, v_order_id);
  end loop;

  with ordered as (
    select id, row_number() over (
      order by
        case when route_locked then 0 else 1 end,
        route_sequence nulls last,
        scheduled_at nulls last,
        created_at
    ) as new_seq
    from public.logistics_shipments
    where plan_id = v_plan.id
      and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
  )
  update public.logistics_shipments s
  set route_sequence = ordered.new_seq,
      updated_at = timezone('utc', now())
  from ordered
  where s.id = ordered.id
    and s.route_sequence is distinct from ordered.new_seq;

  select count(*) into v_count
  from public.logistics_shipments
  where plan_id = v_plan.id;

  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_delivery_plan(p_plan_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
begin
  perform public.logistics_admin_required();

  update public.logistics_delivery_plans
  set
    plan_status = 'cancelled',
    cancelled_at = timezone('utc', now()),
    notes = coalesce(nullif(trim(coalesce(p_reason, '')), ''), notes),
    updated_at = timezone('utc', now())
  where id = p_plan_id
    and plan_status in ('pending', 'in_progress')
  returning *
  into v_plan;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND_OR_LOCKED', 'Plan not found or cannot be cancelled.');
  end if;

  update public.logistics_shipments
  set
    shipment_status = 'CANCELLED',
    delivery_phase = 'cancelled',
    shipment_state = 'cancel',
    cancelled_at = timezone('utc', now()),
    notes = coalesce(nullif(trim(coalesce(p_reason, '')), ''), notes),
    updated_at = timezone('utc', now())
  where plan_id = p_plan_id
    and shipment_status in ('PENDING_ASSIGN', 'ASSIGNED', 'CHECK_IN', 'PICKUP', 'OUT_FOR_DELIVERY', 'ARRIVED');

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_close_delivery_plan(p_plan_id uuid)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_open_count integer;
begin
  perform public.logistics_admin_required();

  select count(*)
  into v_open_count
  from public.logistics_shipments
  where plan_id = p_plan_id
    and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');

  if v_open_count > 0 then
    perform public.raise_logistics_error('OPEN_SHIPMENTS', format('Plan still has % open shipments.', v_open_count));
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning *
  into v_plan;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
  end if;

  update public.logistics_shipments
  set
    shipment_status = case when shipment_status = 'DELIVERED' then 'FINISHED' else shipment_status end,
    delivery_phase = case when delivery_phase = 'delivered' then 'finished' else delivery_phase end,
    updated_at = timezone('utc', now())
  where plan_id = p_plan_id
    and shipment_status = 'DELIVERED';

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_complete_plan_close_shipments(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.logistics_delivery_plans%ROWTYPE;
  v_shipment RECORD;
  v_closed_count integer := 0;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can complete plans.';
  END IF;

  SELECT * INTO v_plan FROM public.logistics_delivery_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found.'; END IF;
  IF v_plan.plan_status = 'completed' THEN
    RAISE EXCEPTION 'Plan is already completed.';
  END IF;

  -- Close all non-terminal shipments in the plan
  FOR v_shipment IN
    SELECT s.id, s.delivery_phase, s.shipment_status, s.linked_order_id
    FROM public.logistics_shipments s
    WHERE s.plan_id = p_plan_id
      AND public.logistics_canonical_driver_phase(s.delivery_phase, s.shipment_status)
          NOT IN ('delivered', 'finished', 'settled', 'cancelled', 'failed', 'attempted')
  LOOP
    -- Mark shipment as delivered
    UPDATE public.logistics_shipments
    SET
      delivery_phase = 'delivered',
      shipment_status = 'DELIVERED',
      shipment_state = 'done',
      completed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = v_shipment.id;

    -- Log event
    INSERT INTO public.logistics_shipment_events (
      shipment_id, actor_profile_id, previous_phase, next_phase, note
    ) VALUES (
      v_shipment.id, auth.uid(), v_shipment.delivery_phase, 'delivered', 'Plan completed by management'
    );

    -- Update linked order
    IF v_shipment.linked_order_id IS NOT NULL THEN
      UPDATE public.orders
      SET
        delivery_status = 'full',
        status = 'delivered',
        delivered_at = coalesce(delivered_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
      WHERE id = v_shipment.linked_order_id;
    END IF;

    v_closed_count := v_closed_count + 1;
  END LOOP;

  -- Mark plan as completed
  UPDATE public.logistics_delivery_plans
  SET
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  WHERE id = p_plan_id;

  PERFORM public.log_audit_event(
    'admin_complete_plan',
    'logistics_delivery_plan',
    p_plan_id,
    'Plan completed with ' || v_closed_count || ' shipments closed',
    jsonb_build_object('closed_shipments', v_closed_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'closed_shipments', v_closed_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_confirm_shipment_collection(p_shipment_id uuid)
 RETURNS logistics_shipment_collections
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collection public.logistics_shipment_collections%rowtype;
  v_amount numeric(14, 2);
begin
  if not public.is_management_role() then
    raise exception 'Only management users can confirm shipment collections.';
  end if;

  select *
  into v_collection
  from public.logistics_shipment_collections
  where shipment_id = p_shipment_id
  for update;

  if v_collection.id is null then
    raise exception 'Shipment collection was not found.';
  end if;

  v_amount := greatest(
    coalesce(v_collection.collected_from_customer, 0),
    coalesce(v_collection.pending_delivery_amount, 0),
    coalesce(v_collection.collected_successfully_amount, 0)
  );

  update public.logistics_shipment_collections
  set
    pending_delivery_amount = 0,
    collected_from_customer = 0,
    collected_successfully_amount = v_amount,
    collection_status = 'collected_successfully',
    admin_confirmed_by_profile_id = auth.uid(),
    admin_confirmed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where shipment_id = p_shipment_id
  returning *
  into v_collection;

  update public.logistics_shipments
  set
    shipment_status = 'SETTLED',
    delivery_phase = 'settled',
    updated_at = timezone('utc', now())
  where id = p_shipment_id;

  return v_collection;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_delivery_plan(p_logistics_user_id uuid, p_planned_date date, p_notes text DEFAULT NULL::text, p_force_new boolean DEFAULT false, p_district text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver   public.logistics_users%rowtype;
  v_plan_id  uuid;
begin
  perform public.logistics_admin_required();

  select * into v_driver
  from public.logistics_users
  where id = p_logistics_user_id and status = 'active';

  if v_driver.id is null then
    perform public.raise_logistics_error('DRIVER_NOT_FOUND', 'Active logistics user not found.');
  end if;

  if v_driver.linked_profile_id is null then
    perform public.raise_logistics_error('DRIVER_NOT_LINKED', 'Driver must be linked to an app profile before dispatch.');
  end if;

  if p_planned_date is null then
    perform public.raise_logistics_error('DATE_REQUIRED', 'Planned date is required.');
  end if;

  if not p_force_new then
    select id into v_plan_id
    from public.logistics_delivery_plans
    where logistics_user_id = p_logistics_user_id
      and planned_date = p_planned_date
      and plan_status in ('pending', 'in_progress')
    order by created_at limit 1;
  end if;

  if v_plan_id is not null then
    update public.logistics_delivery_plans
    set notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
        updated_at = timezone('utc', now())
    where id = v_plan_id;

    return (select to_jsonb(p.*) from public.logistics_delivery_plans p where p.id = v_plan_id);
  end if;

  insert into public.logistics_delivery_plans (
    logistics_user_id, assigned_profile_id, planned_date, plan_status, notes, created_by_profile_id
  ) values (
    v_driver.id, v_driver.linked_profile_id, p_planned_date, 'pending',
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_plan_id;

  return (select to_jsonb(p.*) from public.logistics_delivery_plans p where p.id = v_plan_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_delivery_plan(p_logistics_user_id uuid, p_planned_date date, p_notes text DEFAULT NULL::text)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver public.logistics_users%rowtype;
  v_plan public.logistics_delivery_plans%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_driver
  from public.logistics_users
  where id = p_logistics_user_id
    and status = 'active';

  if v_driver.id is null then
    perform public.raise_logistics_error('DRIVER_NOT_FOUND', 'Active logistics user not found.');
  end if;

  if v_driver.linked_profile_id is null then
    perform public.raise_logistics_error('DRIVER_NOT_LINKED', 'Driver must be linked to an app profile before dispatch.');
  end if;

  if p_planned_date is null then
    perform public.raise_logistics_error('DATE_REQUIRED', 'Planned date is required.');
  end if;

  select *
  into v_plan
  from public.logistics_delivery_plans
  where logistics_user_id = p_logistics_user_id
    and planned_date = p_planned_date
    and plan_status in ('pending', 'in_progress')
  order by created_at
  limit 1;

  if v_plan.id is not null then
    update public.logistics_delivery_plans
    set
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      updated_at = timezone('utc', now())
    where id = v_plan.id
    returning *
    into v_plan;

    return v_plan;
  end if;

  insert into public.logistics_delivery_plans (
    logistics_user_id,
    assigned_profile_id,
    planned_date,
    plan_status,
    notes,
    created_by_profile_id
  )
  values (
    v_driver.id,
    v_driver.linked_profile_id,
    p_planned_date,
    'pending',
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning *
  into v_plan;

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_delivery_plan(p_logistics_user_id uuid, p_planned_date date, p_notes text DEFAULT NULL::text, p_force_new boolean DEFAULT false)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver public.logistics_users%rowtype;
  v_plan public.logistics_delivery_plans%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_driver
  from public.logistics_users
  where id = p_logistics_user_id
    and status = 'active';

  if v_driver.id is null then
    perform public.raise_logistics_error('DRIVER_NOT_FOUND', 'Active logistics user not found.');
  end if;

  if v_driver.linked_profile_id is null then
    perform public.raise_logistics_error('DRIVER_NOT_LINKED', 'Driver must be linked to an app profile before dispatch.');
  end if;

  if p_planned_date is null then
    perform public.raise_logistics_error('DATE_REQUIRED', 'Planned date is required.');
  end if;

  -- Only reuse existing plan when force_new is false
  if not p_force_new then
    select *
    into v_plan
    from public.logistics_delivery_plans
    where logistics_user_id = p_logistics_user_id
      and planned_date = p_planned_date
      and plan_status in ('pending', 'in_progress')
    order by created_at
    limit 1;

    if v_plan.id is not null then
      update public.logistics_delivery_plans
      set
        notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
        updated_at = timezone('utc', now())
      where id = v_plan.id
      returning *
      into v_plan;

      return v_plan;
    end if;
  end if;

  insert into public.logistics_delivery_plans (
    logistics_user_id,
    assigned_profile_id,
    planned_date,
    plan_status,
    notes,
    created_by_profile_id
  )
  values (
    v_driver.id,
    v_driver.linked_profile_id,
    p_planned_date,
    'pending',
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning *
  into v_plan;

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_manual_stop(p_plan_id uuid, p_customer_name text, p_customer_phone text DEFAULT NULL::text, p_customer_address text DEFAULT NULL::text, p_customer_latitude double precision DEFAULT NULL::double precision, p_customer_longitude double precision DEFAULT NULL::double precision, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_driver public.logistics_users%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_next_sequence integer;
  v_ref text;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can receive stops.';
  end if;

  select *
  into v_driver
  from public.logistics_users
  where id = v_plan.logistics_user_id;

  if v_driver.id is null or v_driver.linked_profile_id is null then
    raise exception 'Plan driver is not linked to an app profile.';
  end if;

  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required.';
  end if;

  select coalesce(max(route_sequence), 0) + 1
  into v_next_sequence
  from public.logistics_shipments
  where plan_id = v_plan.id;

  v_ref := 'MSN-' || upper(substr(md5(random()::text), 1, 8));

  insert into public.logistics_shipments (
    shipment_reference,
    linked_order_id,
    plan_id,
    logistics_user_id,
    assigned_profile_id,
    assigned_user_name,
    assigned_job_title,
    customer_name,
    customer_phone,
    source_location_ref,
    destination_location_ref,
    customer_latitude,
    customer_longitude,
    scheduled_at,
    shipment_status,
    shipment_state,
    delivery_phase,
    route_sequence,
    source,
    notes,
    raw_payload
  )
  values (
    v_ref,
    null,
    v_plan.id,
    v_driver.id,
    v_driver.linked_profile_id,
    v_driver.employee_name,
    v_driver.job_title,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    p_customer_latitude,
    p_customer_longitude,
    coalesce(p_scheduled_at, v_plan.planned_date::timestamptz),
    'ASSIGNED',
    'assigned',
    'assigned',
    v_next_sequence,
    'manual',
    nullif(trim(coalesce(p_notes, '')), ''),
    jsonb_build_object(
      'created_by', 'admin',
      'created_by_user', auth.uid(),
      'created_at', timezone('utc', now())
    )
  )
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_dispatch_delivery_plan(p_plan_id uuid)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_open_count integer;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found.');
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    perform public.raise_logistics_error('INVALID_PLAN_STATUS', 'Plan cannot be dispatched in its current status.');
  end if;

  select count(*)
  into v_open_count
  from public.logistics_shipments
  where plan_id = p_plan_id
    and shipment_status in ('ASSIGNED', 'CHECK_IN', 'PICKUP', 'OUT_FOR_DELIVERY', 'ARRIVED');

  if v_open_count = 0 then
    perform public.raise_logistics_error('NO_SHIPMENTS', 'Plan has no assigned shipments to dispatch.');
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'in_progress',
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    started_at = coalesce(started_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning *
  into v_plan;

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_collection_checks(p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, shipment_id text, odoo_order_name text, customer_name text, plan_id text, driver_profile_id uuid, driver_name text, check_status text, payment_method text, reason text, driver_notes text, review_status text, admin_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id,
    c.shipment_id,
    s.odoo_order_name,
    s.customer_name,
    c.plan_id::text,
    c.driver_profile_id,
    coalesce(p.full_name, p.email::text, c.driver_profile_id::text) as driver_name,
    c.check_status,
    c.payment_method,
    c.reason,
    c.driver_notes,
    c.review_status,
    c.admin_notes,
    c.reviewed_at,
    c.created_at
  from public.driver_plan_collection_checks c
  left join public.profiles p on p.id = c.driver_profile_id
  left join public.logistics_shipments s on s.id::text = c.shipment_id
  where (p_status is null or c.review_status = p_status)
  order by c.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_driver_debts()
 RETURNS TABLE(driver_profile_id uuid, driver_name text, driver_email text, total_debt numeric, currency_code text, oldest_debt_at timestamp with time zone, hours_since_oldest numeric, overdue boolean, pending_requests bigint, approved_today bigint, total_collected_today numeric, total_approved_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_management_role() then
    raise exception 'Only management users can view driver debts.';
  end if;

  return query
  with driver_plan_debts as (
    select
      s.assigned_profile_id as driver_id,
      sum(
        coalesce(lsc.collected_from_customer, lsc.pending_delivery_amount, 0)
      ) as debt_amount,
      min(s.completed_at) as oldest_completed_at
    from public.logistics_shipments s
    left join public.logistics_shipment_collections lsc
      on lsc.shipment_id = s.id
    where s.assigned_profile_id is not null
      and s.shipment_status in ('DELIVERED', 'FINISHED')
      and (lsc.id is null or lsc.collection_status <> 'collected_successfully')
    group by s.assigned_profile_id
  ),
  request_stats as (
    select
      cr.driver_profile_id,
      count(*) filter (where cr.status = 'pending') as pending_count,
      count(*) filter (where cr.status = 'approved' and cr.reviewed_at::date = current_date) as approved_today_count,
      sum(cr.collected_amount) filter (where cr.status = 'approved' and cr.reviewed_at::date = current_date) as approved_today_amount,
      sum(cr.collected_amount) filter (where cr.status = 'approved') as total_approved_amount
    from public.logistics_collection_requests cr
    group by cr.driver_profile_id
  )
  select
    d.driver_profile_id,
    coalesce(p.full_name, 'Unknown') as driver_name,
    coalesce(p.email, '') as driver_email,
    coalesce(d.debt_amount, 0) as total_debt,
    'EGP' as currency_code,
    d.oldest_completed_at as oldest_debt_at,
    case when d.oldest_completed_at is not null
      then round(extract(epoch from (now() - d.oldest_completed_at)) / 3600, 1)
      else 0
    end as hours_since_oldest,
    case when d.oldest_completed_at is not null
         and extract(epoch from (now() - d.oldest_completed_at)) > 86400
      then true
      else false
    end as overdue,
    coalesce(rs.pending_count, 0) as pending_requests,
    coalesce(rs.approved_today_count, 0) as approved_today,
    coalesce(rs.approved_today_amount, 0) as total_collected_today,
    coalesce(rs.total_approved_amount, 0) as total_approved_amount
  from driver_plan_debts d
  left join public.profiles p on p.id = d.driver_profile_id
  left join request_stats rs on rs.driver_profile_id = d.driver_profile_id
  where d.debt_amount > 0
  order by d.debt_amount desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_mark_settlement_paid(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_management_role() then
    raise exception 'Admin access required.';
  end if;

  update public.driver_plan_settlement_requests
  set
    status = 'paid',
    paid_at = timezone('utc', now())
  where id = p_request_id and status = 'approved';

  if not found then
    raise exception 'Settlement request not found or not approved.';
  end if;

  return jsonb_build_object('success', true, 'status', 'paid');
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_optimize_delivery_plan(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_remaining uuid[];
  v_current uuid;
  v_next uuid;
  v_open_count integer;
  v_sequence integer := 1;
  v_locked_sequences integer[];
  v_total_distance double precision := 0;
  v_prev_lat double precision := null;
  v_prev_lng double precision := null;
  v_start_lat double precision := null;
  v_start_lng double precision := null;
  v_start_source text := 'shipment_schedule';
  v_next_lat double precision;
  v_next_lng double precision;
  v_leg double precision;
begin
  perform public.logistics_admin_required();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Only pending or in-progress plans can be optimized.';
  end if;

  select count(*)
  into v_open_count
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');

  if v_open_count = 0 then
    raise exception 'Plan has no open shipments.';
  end if;

  select
    shipment.warehouse_latitude,
    shipment.warehouse_longitude,
    'warehouse_coordinates'
  into v_start_lat, v_start_lng, v_start_source
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and shipment.warehouse_latitude is not null
    and shipment.warehouse_longitude is not null
  order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
  limit 1;

  if v_start_lat is not null and v_start_lng is not null then
    v_prev_lat := v_start_lat;
    v_prev_lng := v_start_lng;
  else
    v_start_source := 'shipment_schedule';
  end if;

  select coalesce(array_agg(distinct shipment.route_sequence), array[]::integer[])
  into v_locked_sequences
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and coalesce(shipment.route_locked, false) = true
    and shipment.route_sequence is not null;

  select array_agg(shipment.id order by shipment.scheduled_at nulls last, shipment.created_at)
  into v_remaining
  from public.logistics_shipments shipment
  where shipment.plan_id = p_plan_id
    and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
    and coalesce(shipment.route_locked, false) = false;

  loop
    exit when coalesce(array_length(v_remaining, 1), 0) = 0;

    if v_prev_lat is null or v_prev_lng is null then
      select shipment.id, coalesce(shipment.customer_latitude, customer.lat), coalesce(shipment.customer_longitude, customer.lng)
      into v_next, v_next_lat, v_next_lng
      from public.logistics_shipments shipment
      left join public.customers customer on customer.id = shipment.customer_id
      where shipment.id = any(v_remaining)
      order by shipment.scheduled_at nulls last, shipment.created_at
      limit 1;
    else
      select shipment.id,
        coalesce(shipment.customer_latitude, customer.lat),
        coalesce(shipment.customer_longitude, customer.lng),
        public.logistics_distance_km(
          v_prev_lat,
          v_prev_lng,
          coalesce(shipment.customer_latitude, customer.lat),
          coalesce(shipment.customer_longitude, customer.lng)
        )
      into v_next, v_next_lat, v_next_lng, v_leg
      from public.logistics_shipments shipment
      left join public.customers customer on customer.id = shipment.customer_id
      where shipment.id = any(v_remaining)
      order by
        public.logistics_distance_km(
          v_prev_lat,
          v_prev_lng,
          coalesce(shipment.customer_latitude, customer.lat),
          coalesce(shipment.customer_longitude, customer.lng)
        ) nulls last,
        shipment.scheduled_at nulls last,
        shipment.created_at
      limit 1;

      v_total_distance := v_total_distance + coalesce(v_leg, 0);
    end if;

    while v_sequence = any(v_locked_sequences) loop
      v_sequence := v_sequence + 1;
    end loop;

    update public.logistics_shipments
    set
      route_sequence = v_sequence,
      customer_latitude = coalesce(customer_latitude, v_next_lat),
      customer_longitude = coalesce(customer_longitude, v_next_lng),
      updated_at = timezone('utc', now())
    where id = v_next;

    v_remaining := array_remove(v_remaining, v_next);
    v_current := v_next;
    v_prev_lat := v_next_lat;
    v_prev_lng := v_next_lng;
    v_sequence := v_sequence + 1;
  end loop;

  with ordered_stops as (
    select
      coalesce(shipment.customer_latitude, customer.lat) as lat,
      coalesce(shipment.customer_longitude, customer.lng) as lng,
      lag(coalesce(shipment.customer_latitude, customer.lat)) over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as prev_lat,
      lag(coalesce(shipment.customer_longitude, customer.lng)) over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as prev_lng,
      row_number() over (
        order by shipment.route_sequence nulls last, shipment.scheduled_at nulls last, shipment.created_at
      ) as rn
    from public.logistics_shipments shipment
    left join public.customers customer on customer.id = shipment.customer_id
    where shipment.plan_id = p_plan_id
      and shipment.shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED')
  )
  select coalesce(sum(coalesce(public.logistics_distance_km(
    case when rn = 1 and v_start_lat is not null and v_start_lng is not null then v_start_lat else prev_lat end,
    case when rn = 1 and v_start_lat is not null and v_start_lng is not null then v_start_lng else prev_lng end,
    lat,
    lng
  ), 0)), 0)
  into v_total_distance
  from ordered_stops;

  update public.logistics_delivery_plans
  set
    route_optimized_at = timezone('utc', now()),
    route_total_distance_km = round(v_total_distance::numeric, 2)::double precision,
    route_metadata = coalesce(route_metadata, '{}'::jsonb) || jsonb_build_object(
      'optimizer', 'nearest_neighbor',
      'optimized_by', auth.uid(),
      'optimized_at', timezone('utc', now()),
      'stop_count', v_open_count,
      'start_source', v_start_source,
      'start_lat', v_start_lat,
      'start_lng', v_start_lng,
      'last_shipment_id', v_current
    ),
    updated_at = timezone('utc', now())
  where id = p_plan_id;

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'stop_count', v_open_count,
    'estimated_distance_km', round(v_total_distance::numeric, 2)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_collection_request(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.logistics_collection_requests%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management users can reject collection requests.';
  end if;

  select *
  into v_request
  from public.logistics_collection_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Collection request not found.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This collection request has already been %.', v_request.status;
  end if;

  update public.logistics_collection_requests
  set
    status = 'rejected',
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_request_id
  returning *
  into v_request;

  return v_request;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_remove_shipment_from_plan(p_shipment_id uuid)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN') not in ('PENDING_ASSIGN', 'ASSIGNED') then
    raise exception 'Only unstarted shipments can be removed from a plan.';
  end if;

  update public.logistics_shipments
  set
    plan_id = null,
    logistics_user_id = null,
    assigned_profile_id = null,
    assigned_user_name = null,
    assigned_job_title = null,
    shipment_state = 'draft',
    shipment_status = 'PENDING_ASSIGN',
    delivery_phase = 'pending',
    route_sequence = null,
    route_locked = false,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_remove_shipment_from_plan_any_status(p_shipment_id uuid)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
begin
  perform public.logistics_admin_required();

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN') in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED') then
    raise exception 'Completed or cancelled shipments cannot be removed.';
  end if;

  update public.logistics_shipments
  set
    plan_id = null,
    logistics_user_id = null,
    assigned_profile_id = null,
    assigned_user_name = null,
    assigned_job_title = null,
    route_sequence = null,
    route_locked = false,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning *
  into v_shipment;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_collection_check(p_check_id uuid, p_review_status text, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  perform public.logistics_admin_required();

  if p_review_status not in ('approved', 'rejected') then
    raise exception 'Invalid review_status: %', p_review_status;
  end if;

  update public.driver_plan_collection_checks
  set
    review_status = p_review_status,
    admin_notes = p_admin_notes,
    reviewed_by_profile_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_check_id;

  if not found then
    raise exception 'Collection check not found.';
  end if;

  if p_review_status = 'approved' then
    perform private.sync_approved_collection_check_accounting(p_check_id);
  end if;

  return jsonb_build_object('success', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_settlement_request(p_request_id uuid, p_status text, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_management_role() then
    raise exception 'Admin access required.';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status. Must be approved or rejected.';
  end if;

  update public.driver_plan_settlement_requests
  set
    status = p_status,
    admin_notes = p_admin_notes,
    reviewed_by_profile_id = auth.uid()::text::uuid,
    reviewed_at = timezone('utc', now())
  where id = p_request_id;

  if not found then
    raise exception 'Settlement request not found.';
  end if;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_plan_stop_sequence(p_plan_id uuid, p_shipment_id uuid, p_route_sequence integer)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
begin
  perform public.logistics_admin_required();

  if p_route_sequence is null or p_route_sequence < 1 then
    raise exception 'Route sequence must be greater than zero.';
  end if;

  update public.logistics_shipments
  set
    route_sequence = p_route_sequence,
    route_locked = true,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
    and plan_id = p_plan_id
  returning *
  into v_shipment;

  if v_shipment.id is null then
    raise exception 'Shipment not found in this plan.';
  end if;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_plan_status(p_plan_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan_id    uuid;
  v_old_status text;
  v_affected   integer;
begin
  perform public.logistics_admin_required();

  select plan_status into v_old_status
  from public.logistics_delivery_plans where id = p_plan_id;

  if not found then
    perform public.raise_logistics_error('PLAN_NOT_FOUND', 'Plan not found');
  end if;

  if p_new_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    perform public.raise_logistics_error('INVALID_STATUS', 'Invalid plan status: ' || p_new_status);
  end if;

  if v_old_status in ('completed', 'cancelled') then
    perform public.raise_logistics_error('TERMINAL_STATUS', 'Cannot change from terminal status ' || v_old_status);
  end if;

  if v_old_status = 'pending' and p_new_status = 'completed' then
    perform public.raise_logistics_error('INVALID_TRANSITION', 'Cannot complete a pending plan. Start it first.');
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = p_new_status,
    dispatched_at = case when p_new_status = 'in_progress' and dispatched_at is null then timezone('utc', now()) else dispatched_at end,
    started_at = case when p_new_status = 'in_progress' and started_at is null then timezone('utc', now()) else started_at end,
    finished_at = case when p_new_status = 'completed' and finished_at is null then timezone('utc', now()) else finished_at end,
    cancelled_at = case when p_new_status = 'cancelled' and cancelled_at is null then timezone('utc', now()) else cancelled_at end,
    notes = case when p_reason is not null and trim(p_reason) != ''
            then coalesce(notes, '') || E'\n[' || p_new_status || '] ' || p_reason
            else notes end,
    updated_at = timezone('utc', now())
  where id = p_plan_id
  returning id into v_plan_id;

  if p_new_status = 'completed' then
    update public.logistics_shipments
    set shipment_status = 'FINISHED', delivery_phase = 'finished', updated_at = timezone('utc', now())
    where plan_id = v_plan_id and shipment_status = 'DELIVERED';
  elsif p_new_status = 'cancelled' then
    update public.logistics_shipments
    set shipment_status = 'CANCELLED', delivery_phase = 'cancelled', shipment_state = 'cancel',
        cancelled_at = coalesce(cancelled_at, timezone('utc', now())), updated_at = timezone('utc', now())
    where plan_id = v_plan_id
      and shipment_status not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED');
  end if;

  return (select to_jsonb(p.*) from public.logistics_delivery_plans p where p.id = v_plan_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_profile_access(p_target_user_id uuid, p_full_name text DEFAULT NULL::text, p_role app_role DEFAULT NULL::app_role, p_status record_status DEFAULT NULL::record_status, p_department_id uuid DEFAULT NULL::uuid, p_clear_department boolean DEFAULT false, p_job_title text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_password_enabled boolean DEFAULT NULL::boolean, p_otp_enabled boolean DEFAULT NULL::boolean, p_prefer_otp boolean DEFAULT NULL::boolean, p_approved boolean DEFAULT NULL::boolean, p_force_unlock boolean DEFAULT false)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update user access';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    role = coalesce(p_role, role),
    status = coalesce(p_status, status),
    department_id = case
      when p_clear_department then null
      when p_department_id is not null then p_department_id
      else department_id
    end,
    job_title = case
      when p_job_title is not null then nullif(trim(p_job_title), '')
      else job_title
    end,
    phone = case
      when p_phone is not null then nullif(trim(p_phone), '')
      else phone
    end,
    password_enabled = coalesce(p_password_enabled, password_enabled),
    otp_enabled = coalesce(p_otp_enabled, otp_enabled),
    prefer_otp = coalesce(p_prefer_otp, prefer_otp),
    force_logout_at = case
      when p_force_unlock then null
      else force_logout_at
    end,
    approved_at = case
      when p_approved is true then coalesce(approved_at, timezone('utc', now()))
      when p_approved is false then null
      else approved_at
    end,
    approved_by = case
      when p_approved is true then coalesce(approved_by, auth.uid())
      when p_approved is false then null
      else approved_by
    end
  where id = p_target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Target profile not found';
  end if;

  perform public.log_audit_event(
    'update_profile_access',
    'profile',
    v_profile.id,
    'Updated profile access controls',
    jsonb_build_object(
      'role', v_profile.role,
      'status', v_profile.status,
      'department_id', v_profile.department_id,
      'job_title', v_profile.job_title,
      'password_enabled', v_profile.password_enabled,
      'otp_enabled', v_profile.otp_enabled,
      'prefer_otp', v_profile.prefer_otp,
      'approved_at', v_profile.approved_at,
      'force_unlock', p_force_unlock
    )
  );

  return v_profile;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_shipment_status(p_shipment_id uuid, p_new_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment_id uuid;
begin
  perform public.logistics_admin_required();

  if not exists (select 1 from public.logistics_shipments where id = p_shipment_id) then
    perform public.raise_logistics_error('SHIPMENT_NOT_FOUND', 'Shipment not found.');
  end if;

  update public.logistics_shipments
  set shipment_status = p_new_status,
      updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning id into v_shipment_id;

  return (select to_jsonb(s.*) from public.logistics_shipments s where s.id = v_shipment_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.approve_driver_settlement(p_settlement_id uuid)
 RETURNS finance_driver_settlements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement public.finance_driver_settlements%ROWTYPE;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_settlement FROM public.finance_driver_settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found.'; END IF;
  IF v_settlement.status != 'draft' THEN RAISE EXCEPTION 'Only draft settlements can be approved.'; END IF;

  UPDATE public.finance_driver_settlements
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;

  PERFORM public.log_audit_event(
    'approve_driver_settlement',
    'finance_driver_settlement',
    p_settlement_id,
    'Settlement approved',
    jsonb_build_object('net_payable', v_settlement.net_payable)
  );

  RETURN v_settlement;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_odoo_pending_action(p_action_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_current_status odoo_action_status;
BEGIN
  v_user_id := auth.uid();

  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status NOT IN ('waiting_approval', 'failed') THEN
    RAISE EXCEPTION 'Cannot approve action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'approved',
      approved_by = v_user_id,
      approved_at = now(),
      rejected_by = NULL,
      rejected_at = NULL,
      rejection_reason = NULL,
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (p_action_id, 'approved', v_user_id, jsonb_build_object('event', 'approved'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_customer(p_customer_id uuid, p_assigned_user_id uuid)
 RETURNS customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer public.customers%rowtype;
begin
  if not public.is_management_role() then
    raise exception 'Only management roles can assign customers';
  end if;

  update public.customers
  set
    assigned_user_id = p_assigned_user_id,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_customer_id
  returning * into v_customer;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  perform public.log_audit_event(
    'assign_customer',
    'customer',
    v_customer.id,
    'Assigned customer to user',
    jsonb_build_object('assigned_user_id', p_assigned_user_id)
  );

  return v_customer;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_customers_by_district(p_governorate text, p_district text, p_assigned_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_updated_count integer;
begin
  if not public.is_management_role() then
    raise exception 'Only management roles can bulk-assign customers';
  end if;

  update public.customers
  set
    assigned_user_id = p_assigned_user_id,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where coalesce(governorate, '') = coalesce(p_governorate, coalesce(governorate, ''))
    and district = p_district;

  get diagnostics v_updated_count = row_count;

  perform public.log_audit_event(
    'bulk_assign_customers',
    'customer',
    null,
    format('Bulk assigned customers in district %s', p_district),
    jsonb_build_object(
      'governorate', p_governorate,
      'district', p_district,
      'assigned_user_id', p_assigned_user_id,
      'updated_count', v_updated_count
    )
  );

  return v_updated_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.build_calls_odoo_insert(p_row calls)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'res_id', (
      select public.odoo_ref_id(lead.external_lead_id)
      from public.odoo_crm_leads lead
      join public.customers customer on customer.external_customer_id = lead.partner_id
      where customer.id = p_row.customer_id
        and lead.active = true
      order by lead.odoo_updated_at desc nulls last, lead.last_sync_at desc nulls last
      limit 1
    ),
    'activity_type_id', coalesce(
      (
        select dispatch.activity_type_id
        from public.odoo_crm_activity_dispatches dispatch
        where dispatch.requester_id = p_row.user_id
        order by dispatch.created_at desc
        limit 1
      ),
      (
        select public.odoo_ref_id(type_record.external_id)
        from public.odoo_crm_model_records type_record
        where type_record.odoo_model = 'mail.activity.type'
        order by (type_record.display_name ilike '%call%') desc,
          (type_record.external_id = '2') desc,
          type_record.odoo_updated_at desc nulls last,
          type_record.updated_at desc
        limit 1
      ),
      2
    ),
    'user_id', (
      select profile.user_uid
      from public.profiles profile
      where profile.id = p_row.user_id
      limit 1
    ),
    'summary', coalesce(
      nullif(btrim(coalesce(p_row.raw_form_payload->'call_reason_details'->>'label', '')), ''),
      nullif(btrim(coalesce(p_row.call_reason, '')), ''),
      nullif(btrim(coalesce(p_row.customer_disposition, '')), ''),
      nullif(btrim(coalesce(p_row.customer_response, '')), ''),
      nullif(btrim(coalesce(p_row.call_outcome, '')), '')
    ),
    'note', nullif(btrim(coalesce(p_row.call_notes, '')), ''),
    'date_deadline', to_char(
      coalesce(p_row.callback_at, p_row.completed_at, p_row.started_at, p_row.created_at)
        at time zone 'UTC',
      'YYYY-MM-DD'
    )
  ));
$function$;

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

CREATE OR REPLACE FUNCTION public.build_products_odoo_insert(p_row products)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', p_row.product_name,
    'default_code', nullif(btrim(coalesce(
      p_row.internal_reference,
      p_row.raw_payload->>'default_code',
      p_row.raw_payload->>'code'
    )), ''),
    'list_price', p_row.sales_price,
    'standard_price', p_row.average_cost
  ));
$function$;

CREATE OR REPLACE FUNCTION public.calculate_haversine_meters(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public'
AS $function$
  select
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((p_lat2 - p_lat1) / 2)), 2) +
        cos(radians(p_lat1)) * cos(radians(p_lat2)) *
        power(sin(radians((p_lng2 - p_lng1) / 2)), 2)
      )
    )
$function$;

CREATE OR REPLACE FUNCTION public.calls_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null then
    new.user_uid := null;
  else
    select p.user_uid into new.user_uid
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_cancellation_id uuid;
  v_inventory_reversed boolean := false;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can cancel orders.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order is already %.', v_order.status;
  END IF;

  INSERT INTO public.order_cancellations (order_id, reason, cancelled_by, notes)
  VALUES (p_order_id, p_reason, auth.uid(), p_notes)
  RETURNING id INTO v_cancellation_id;

  UPDATE public.orders
  SET status = 'cancelled',
      delivery_status = 'cancelled',
      updated_at = timezone('utc', now())
  WHERE id = p_order_id;

  UPDATE public.products p
  SET quantity_on_hand = p.quantity_on_hand + oli.delivered_quantity,
      outgoing_quantity = greatest(p.outgoing_quantity - oli.delivered_quantity, 0)
  FROM public.order_line_items oli
  WHERE oli.order_id = p_order_id
    AND oli.product_id = p.id
    AND oli.delivered_quantity > 0;

  v_inventory_reversed := FOUND;

  UPDATE public.order_cancellations
  SET inventory_reversed = v_inventory_reversed
  WHERE id = v_cancellation_id;

  PERFORM public.log_audit_event(
    'cancel_order',
    'order',
    p_order_id,
    p_reason,
    jsonb_build_object(
      'cancellation_id', v_cancellation_id,
      'inventory_reversed', v_inventory_reversed
    )
  );

  RETURN jsonb_build_object(
    'cancellation_id', v_cancellation_id,
    'order_id', p_order_id,
    'inventory_reversed', v_inventory_reversed
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_sla_breaches()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_sla RECORD;
  v_inserted integer;
BEGIN
  FOR v_sla IN
    SELECT * FROM public.sla_definitions WHERE is_active = true
  LOOP
    IF v_sla.entity_type = 'shipment' THEN
      INSERT INTO public.sla_breaches (sla_definition_id, entity_type, entity_id, breach_type)
      SELECT v_sla.id, 'shipment', ls.id, 'warning'
      FROM public.logistics_shipments ls
      WHERE ls.delivery_phase NOT IN ('delivered', 'finished', 'settled', 'cancelled')
        AND ls.scheduled_at < now() - (v_sla.warning_hours || ' hours')::interval
        AND ls.scheduled_at > now() - (v_sla.target_hours || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.sla_breaches sb
          WHERE sb.entity_type = 'shipment' AND sb.entity_id = ls.id
            AND sb.sla_definition_id = v_sla.id AND sb.breach_type = 'warning'
        )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_count := v_count + v_inserted;

      INSERT INTO public.sla_breaches (sla_definition_id, entity_type, entity_id, breach_type)
      SELECT v_sla.id, 'shipment', ls.id, 'breach'
      FROM public.logistics_shipments ls
      WHERE ls.delivery_phase NOT IN ('delivered', 'finished', 'settled', 'cancelled')
        AND ls.scheduled_at < now() - (v_sla.target_hours || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.sla_breaches sb
          WHERE sb.entity_type = 'shipment' AND sb.entity_id = ls.id
            AND sb.sla_definition_id = v_sla.id AND sb.breach_type = 'breach'
        )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_count := v_count + v_inserted;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_odoo_crm_activity_dispatch(p_request_id uuid, p_requester_id uuid, p_mapped_odoo_user_id bigint, p_lead_external_id text, p_activity_type_id bigint, p_payload jsonb, p_mode text)
 RETURNS TABLE(dispatch_id uuid, dispatch_status text, should_dispatch boolean, remote_activity_id bigint, error_code text, error_message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_inserted public.odoo_crm_activity_dispatches%rowtype;
  v_existing public.odoo_crm_activity_dispatches%rowtype;
  v_initial_status text := case when p_mode = 'disabled' then 'blocked' else 'pending' end;
begin
  if p_mode not in ('disabled', 'test', 'live') then
    raise exception 'Unsupported Odoo CRM activity mode.' using errcode = '22023';
  end if;

  if p_requester_id is null or p_mapped_odoo_user_id <= 0 or p_activity_type_id <= 0
    or coalesce(btrim(p_lead_external_id), '') = '' or p_payload is null then
    raise exception 'Invalid Odoo CRM activity dispatch claim.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_requester_id::text));

  if (
    select count(*)
    from public.odoo_crm_activity_dispatches
    where requester_id = p_requester_id
      and request_id <> p_request_id
      and created_at >= timezone('utc', now()) - interval '1 minute'
  ) >= 10 then
    raise exception 'CRM activity dispatch rate limit exceeded.' using errcode = 'P0001';
  end if;

  insert into public.odoo_crm_activity_dispatches (
    request_id,
    requester_id,
    mapped_odoo_user_id,
    lead_external_id,
    activity_type_id,
    payload,
    mode,
    status
  )
  values (
    p_request_id,
    p_requester_id,
    p_mapped_odoo_user_id,
    p_lead_external_id,
    p_activity_type_id,
    p_payload,
    p_mode,
    v_initial_status
  )
  on conflict (request_id) do nothing
  returning * into v_inserted;

  if found then
    return query select v_inserted.id, v_inserted.status, v_inserted.status = 'pending', v_inserted.remote_activity_id, v_inserted.error_code, v_inserted.error_message;
    return;
  end if;

  select * into v_existing
  from public.odoo_crm_activity_dispatches
  where request_id = p_request_id;

  if v_existing.requester_id <> p_requester_id then
    raise exception 'CRM activity request id belongs to another user.' using errcode = '23505';
  end if;

  if v_existing.status = 'sent' then
    return query select v_existing.id, v_existing.status, false, v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
    return;
  end if;

  if v_existing.status = 'pending'
    and v_existing.updated_at >= timezone('utc', now()) - interval '10 minutes' then
    return query select v_existing.id, v_existing.status, false, v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
    return;
  end if;

  update public.odoo_crm_activity_dispatches
  set
    mapped_odoo_user_id = p_mapped_odoo_user_id,
    lead_external_id = p_lead_external_id,
    activity_type_id = p_activity_type_id,
    payload = p_payload,
    mode = p_mode,
    status = v_initial_status,
    attempt_count = attempt_count + 1,
    remote_activity_id = null,
    error_code = null,
    error_message = null,
    sent_at = null
  where id = v_existing.id
  returning * into v_existing;

  return query select v_existing.id, v_existing.status, v_existing.status = 'pending', v_existing.remote_activity_id, v_existing.error_code, v_existing.error_message;
end;
$function$;

CREATE OR REPLACE FUNCTION public.close_fiscal_period(p_period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
BEGIN
  -- Permission check: finance.close_period required
  IF NOT public.has_role_permission('finance.close_period') THEN
    RAISE EXCEPTION 'Permission denied: finance.close_period required';
  END IF;

  SELECT id, status, start_date, end_date INTO v_period
  FROM public.finance_fiscal_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiscal period not found.';
  END IF;

  IF v_period.status != 'open' THEN
    RAISE EXCEPTION 'Period is already %.', v_period.status;
  END IF;

  -- Block if any draft invoices reference dates inside the period
  IF EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE status = 'draft'
      AND invoice_date BETWEEN v_period.start_date AND v_period.end_date
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft invoices exist for this period.';
  END IF;

  -- Block if any draft settlements reference dates inside the period
  IF EXISTS (
    SELECT 1 FROM public.finance_driver_settlements
    WHERE status = 'draft'
      AND settlement_date BETWEEN v_period.start_date AND v_period.end_date
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft driver settlements exist for this period.';
  END IF;

  -- Block if any draft journal entries exist in the period
  IF EXISTS (
    SELECT 1 FROM public.finance_journal_entries e
    JOIN public.finance_fiscal_periods fp ON fp.id = e.fiscal_period_id
    WHERE e.status = 'draft'
      AND fp.id = p_period_id
  ) THEN
    RAISE EXCEPTION 'Cannot close period: draft journal entries exist for this period.';
  END IF;

  UPDATE public.finance_fiscal_periods
  SET status = 'closed', closed_at = now(), closed_by = auth.uid()
  WHERE id = p_period_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_forced_password_change()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set requires_password_change = false,
      temporary_password_set_at = null,
      password_changed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_odoo_action(p_action_id uuid, p_odoo_record_id integer DEFAULT NULL::integer, p_odoo_reference text DEFAULT NULL::text, p_odoo_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE odoo_pending_actions
  SET status = 'completed',
      odoo_record_id = p_odoo_record_id,
      odoo_reference = p_odoo_reference,
      odoo_response = p_odoo_response,
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'completed', jsonb_build_object(
    'event', 'completed',
    'odoo_record_id', p_odoo_record_id,
    'odoo_reference', p_odoo_reference
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid)
 RETURNS finance_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.finance_payments%ROWTYPE;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_payment FROM public.finance_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF v_payment.status != 'draft' THEN RAISE EXCEPTION 'Only draft payments can be confirmed.'; END IF;

  UPDATE public.finance_payments
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = timezone('utc', now())
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF v_payment.invoice_id IS NOT NULL THEN
    UPDATE public.finance_invoices
    SET status = CASE
      WHEN total <= (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.finance_payments
        WHERE invoice_id = v_payment.invoice_id AND status = 'confirmed'
      ) THEN 'paid'
      ELSE 'partially_paid'
    END,
    updated_at = timezone('utc', now())
    WHERE id = v_payment.invoice_id;
  END IF;

  PERFORM public.log_audit_event(
    'confirm_payment',
    'finance_payment',
    p_payment_id,
    'Payment confirmed',
    jsonb_build_object('amount', v_payment.amount, 'customer_id', v_payment.customer_id, 'method', v_payment.payment_method)
  );

  RETURN v_payment;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_odoo_pending_action(p_entity_type text, p_action_type text, p_odoo_model text, p_odoo_method text, p_entity_id text DEFAULT NULL::text, p_payload_json jsonb DEFAULT '{}'::jsonb, p_validation_result jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_action_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO odoo_pending_actions (
    entity_type, action_type, odoo_model, odoo_method,
    entity_id, payload_json, validation_result,
    status, created_by
  ) VALUES (
    p_entity_type, p_action_type, p_odoo_model, p_odoo_method,
    p_entity_id, p_payload_json, p_validation_result,
    'waiting_approval', v_user_id
  ) RETURNING id INTO v_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (v_action_id, 'waiting_approval', v_user_id, jsonb_build_object('event', 'created'));

  RETURN v_action_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_order_intent_from_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payload jsonb;
  v_order_intent jsonb;
  v_summary text;
  v_estimated_value numeric(14, 2);
  v_requested_date date;
  v_estimated_raw text;
  v_requested_raw text;
begin
  v_payload := coalesce(new.raw_form_payload, new.raw_payload, '{}'::jsonb);

  if coalesce(v_payload->>'next_action', '') <> 'CREATE_ORDER_NOW' then
    return new;
  end if;

  v_order_intent := coalesce(v_payload->'order_intent', '{}'::jsonb);
  v_summary := nullif(trim(coalesce(v_order_intent->>'summary', new.note, '')), '');

  if v_summary is null then
    v_summary := 'Order requested during sales visit';
  end if;

  v_estimated_raw := nullif(regexp_replace(coalesce(v_order_intent->>'estimatedValue', ''), '[^0-9\.\-]', '', 'g'), '');
  if v_estimated_raw is not null then
    v_estimated_value := v_estimated_raw::numeric(14, 2);
  end if;

  v_requested_raw := nullif(trim(coalesce(v_order_intent->>'requestedDeliveryDate', '')), '');
  if v_requested_raw ~ '^\d{4}-\d{2}-\d{2}$' then
    v_requested_date := v_requested_raw::date;
  end if;

  insert into public.order_intents (
    visit_id,
    customer_id,
    sales_profile_id,
    status,
    priority,
    summary,
    estimated_value,
    requested_delivery_date,
    decision_maker_status,
    interest_level,
    next_action,
    selected_customer_profiles,
    source_payload
  )
  values (
    new.id,
    new.customer_id,
    new.user_id,
    'pending',
    'high',
    v_summary,
    v_estimated_value,
    v_requested_date,
    v_payload->>'decision_maker_status',
    v_payload->>'interest_level',
    'CREATE_ORDER_NOW',
    coalesce(v_payload->'selected_customer_profiles', '[]'::jsonb),
    v_payload
  )
  on conflict (visit_id) where visit_id is not null do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_system_notification_for_roles(p_roles app_role[], p_title text, p_body text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_ids uuid[];
begin
  select coalesce(array_agg(profile.id), '{}'::uuid[])
  into v_user_ids
  from public.profiles profile
  where profile.status = 'active'
    and profile.role = any(p_roles);

  return public.create_system_notification_for_users(v_user_ids, p_title, p_body, p_metadata);
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_system_notification_for_users(p_user_ids uuid[], p_title text, p_body text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_notification_id uuid;
begin
  if coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return null;
  end if;

  insert into public.notifications (
    created_by,
    audience_type,
    channel,
    title,
    body,
    metadata
  )
  values (
    null,
    'user',
    'in_app',
    p_title,
    p_body,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('system_generated', true)
  )
  returning id into v_notification_id;

  insert into public.notification_recipients (notification_id, user_id)
  select distinct v_notification_id, target.profile_id
  from unnest(p_user_ids) as target(profile_id)
  join public.profiles profile on profile.id = target.profile_id
  where profile.status = 'active'
  on conflict (notification_id, user_id) do nothing;

  if not exists (
    select 1
    from public.notification_recipients
    where notification_id = v_notification_id
  ) then
    delete from public.notifications where id = v_notification_id;
    return null;
  end if;

  return v_notification_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.customer_interactions_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.actor_user_id is null then
    new.user_uid := null;
  else
    select p.user_uid into new.user_uid
    from public.profiles p
    where p.id = new.actor_user_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.debug_crm_sync()
 RETURNS TABLE(status_code integer, response_body text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  secret_val text;
  response record;
BEGIN
  SELECT decrypted_secret INTO secret_val FROM vault.decrypted_secrets WHERE name = 'sales_sync_edge_secret';
  
  SELECT * INTO response FROM http(
    'POST',
    current_setting('app.settings.supabase_url') || '/functions/v1/crm-odoo',
    ARRAY[http_header('Content-Type', 'application/json'), http_header('x-sync-secret', secret_val)],
    '{"maxRows": 10}'::json
  );
  
  RETURN QUERY SELECT response.status, response.content::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_bulk_mark_all_ready(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation_id uuid;
  v_updated integer;
begin
  perform public.logistics_admin_required();

  select id into v_preparation_id
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation_id is null then
    raise exception 'No preparation found for this plan';
  end if;

  update public.dispatcher_plan_item_preparations
  set
    approved_quantity = total_requested_quantity,
    status = 'ready',
    confirmed_at = now(),
    confirmed_by_profile_id = auth.uid(),
    updated_at = now()
  where plan_preparation_id = v_preparation_id
    and status = 'pending';

  get diagnostics v_updated = row_count;

  return jsonb_build_object('updated', v_updated);
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_complete_plan_preparation(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation record;
  v_pending_count integer;
  v_total_items integer;
  v_has_shortage boolean;
  v_duration integer;
begin
  select id, status, started_at into v_preparation
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation is null then
    raise exception 'Plan preparation not found';
  end if;

  if v_preparation.status = 'ready' then
    return jsonb_build_object('status', 'ready', 'message', 'Already completed');
  end if;

  -- Check all items are processed
  select count(*) into v_pending_count
  from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation.id
    and status = 'pending';

  if v_pending_count > 0 then
    raise exception 'يجب تجهيز كل المنتجات قبل إكمال الخطة. متبقي % منتج', v_pending_count;
  end if;

  -- Check at least one item is available
  select count(*) into v_total_items
  from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation.id;

  if not exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation.id
      and approved_quantity > 0
      and status <> 'unavailable'
  ) then
    raise exception 'Cannot complete preparation without at least one available item';
  end if;

  -- Check for shortages
  select exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation.id
      and status in ('partial', 'unavailable')
  ) into v_has_shortage;

  -- Calculate duration
  v_duration := greatest(0, extract(epoch from (now() - v_preparation.started_at))::int);

  -- Update preparation status to ready
  update public.dispatcher_plan_preparations
  set status = 'ready',
      completed_at = now(),
      duration_seconds = v_duration,
      updated_at = now()
  where id = v_preparation.id;

  -- Bridge: auto-dispatch the delivery plan when preparation completes
  -- This advances the plan from pending to in_progress so the driver
  -- can immediately see and act on it.
  update public.logistics_delivery_plans
  set
    plan_status = 'in_progress',
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    started_at = coalesce(started_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_plan_id
    and plan_status = 'pending';

  return jsonb_build_object(
    'status', 'ready',
    'duration_seconds', v_duration,
    'has_shortage', v_has_shortage,
    'total_items', v_total_items
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_confirm_plan_item(p_plan_preparation_id uuid, p_item_id uuid, p_approved_quantity numeric, p_shortage_reason text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_barcode text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item record;
  v_approved numeric;
  v_status text;
  v_actor uuid := auth.uid();
begin
  -- Validate item belongs to this preparation
  select id, total_requested_quantity into v_item
  from public.dispatcher_plan_item_preparations
  where id = p_item_id
    and plan_preparation_id = p_plan_preparation_id;

  if v_item is null then
    raise exception 'Plan item not found';
  end if;

  v_approved := greatest(0, least(p_approved_quantity, v_item.total_requested_quantity));

  if v_approved <= 0 then
    v_status := 'unavailable';
  elsif v_approved < v_item.total_requested_quantity then
    v_status := 'partial';
  else
    v_status := 'ready';
  end if;

  if v_status <> 'ready' and p_shortage_reason is null then
    raise exception 'Shortage reason is required when quantity is less than requested';
  end if;

  update public.dispatcher_plan_item_preparations
  set approved_quantity = v_approved,
      status = v_status,
      shortage_reason = case when v_status = 'ready' then null else p_shortage_reason end,
      note = p_note,
      barcode = p_barcode,
      barcode_validated_at = case when p_barcode is not null then now() else barcode_validated_at end,
      confirmed_at = now(),
      confirmed_by_profile_id = v_actor,
      updated_at = now()
  where id = p_item_id;

  return jsonb_build_object(
    'item_id', p_item_id,
    'status', v_status,
    'approved_quantity', v_approved
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_get_plan_items(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', dpi.id,
      'plan_preparation_id', dpi.plan_preparation_id,
      'plan_id', dpi.plan_id,
      'product_name', dpi.product_name,
      'product_ref', dpi.product_ref,
      'product_code', dpi.product_code,
      'external_product_id', dpi.external_product_id,
      'product_id', dpi.product_id,
      'dataset_id', dpi.dataset_id,
      'total_requested_quantity', dpi.total_requested_quantity,
      'approved_quantity', dpi.approved_quantity,
      'preparation_status', dpi.status,
      'shortage_reason', dpi.shortage_reason,
      'note', dpi.note,
      'barcode_scanned', (dpi.barcode_validated_at is not null)
    )
    order by dpi.product_name
  ), '[]'::jsonb)
  from public.dispatcher_plan_item_preparations dpi
  where dpi.plan_id = p_plan_id;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_get_plan_orders(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'odoo_order_name', o.odoo_order_name,
      'customer_name', o.customer_name,
      'total_amount', o.total_amount,
      'currency_code', o.currency_code,
      'items_count', (
        select count(*)
        from public.order_line_items oli
        where oli.order_id = o.id
          and oli.display_type is null
      )
    )
    order by o.odoo_order_name
  ), '[]'::jsonb)
  from public.logistics_shipments ls
  join public.orders o on o.id = ls.linked_order_id
  where ls.plan_id = p_plan_id
    and ls.linked_order_id is not null;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_receive_returned_item(p_return_shipment_id uuid, p_item_id uuid, p_received_quantity numeric, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item public.logistics_return_shipment_items%rowtype;
  v_return_shipment public.logistics_shipments%rowtype;
  v_all_received boolean;
begin
  if not public.is_management_role() then
    raise exception 'Only dispatchers can receive returned items.';
  end if;

  select * into v_item
  from public.logistics_return_shipment_items
  where id = p_item_id and return_shipment_id = p_return_shipment_id
  for update;

  if v_item.id is null then
    raise exception 'Return item not found.';
  end if;

  if p_received_quantity < 0 or p_received_quantity > v_item.returned_quantity then
    raise exception 'Received quantity must be between 0 and % (returned qty).', v_item.returned_quantity;
  end if;

  if p_received_quantity < v_item.returned_quantity and p_reason is null then
    raise exception 'Reason is required when received quantity is less than returned quantity.';
  end if;

  update public.logistics_return_shipment_items
  set
    received_quantity = p_received_quantity,
    return_reason = coalesce(p_reason, return_reason),
    updated_at = timezone('utc', now())
  where id = p_item_id;

  -- Check if all items in this return shipment have been fully received
  select * into v_return_shipment
  from public.logistics_shipments
  where id = p_return_shipment_id
  for update;

  select not exists (
    select 1
    from public.logistics_return_shipment_items
    where return_shipment_id = p_return_shipment_id
      and received_quantity < returned_quantity
  ) into v_all_received;

  if v_all_received then
    -- All items received - mark return shipment as finished then settled
    update public.logistics_shipments
    set
      shipment_status = 'FINISHED',
      delivery_phase = 'finished',
      shipment_state = 'done',
      completed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = p_return_shipment_id;

    -- Complete the return-trip plan if it exists
    if v_return_shipment.plan_id is not null then
      perform private.logistics_complete_plan_if_shipments_delivered(v_return_shipment.plan_id);
    end if;
  else
    -- Partially received - update status to indicate progress
    update public.logistics_shipments
    set
      shipment_status = 'ASSIGNED',
      updated_at = timezone('utc', now())
    where id = p_return_shipment_id
      and shipment_status = 'PENDING_ASSIGN';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_resync_plan_items(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_preparation_id uuid;
  v_deleted integer;
  v_inserted integer;
begin
  select id into v_preparation_id
  from public.dispatcher_plan_preparations
  where plan_id = p_plan_id;

  if v_preparation_id is null then
    raise exception 'No preparation found for plan %', p_plan_id;
  end if;

  -- Delete existing items
  delete from public.dispatcher_plan_item_preparations
  where plan_preparation_id = v_preparation_id;

  get diagnostics v_deleted = row_count;

  -- Re-seed from current shipments
  insert into public.dispatcher_plan_item_preparations (
    plan_preparation_id, plan_id, product_name, product_ref, product_code,
    external_product_id, product_id, dataset_id,
    total_requested_quantity, approved_quantity, status
  )
  select
    v_preparation_id,
    p_plan_id,
    coalesce(oli.product_name, oli.product_ref, oli.product_code, 'product'),
    oli.product_ref,
    oli.product_code,
    oli.external_product_id,
    null as product_id,
    null as dataset_id,
    sum(coalesce(oli.ordered_quantity, 0)) as total_requested_quantity,
    0 as approved_quantity,
    'pending' as status
  from public.logistics_shipments ls
  join public.order_line_items oli on oli.order_id = ls.linked_order_id
  where ls.plan_id = p_plan_id
    and ls.linked_order_id is not null
    and (oli.display_type is null or oli.display_type = 'false')
    and (
      coalesce(oli.external_product_id, '') <> ''
      or coalesce(oli.product_ref, '') <> ''
      or coalesce(oli.product_code, '') <> ''
    )
    and (
      coalesce(oli.ordered_quantity, 0) > 0
      or coalesce(oli.delivered_quantity, 0) > 0
      or coalesce(oli.total_amount, 0) > 0
      or coalesce(oli.subtotal_amount, 0) > 0
      or coalesce(oli.unit_price, 0) > 0
    )
  group by
    oli.product_name, oli.product_ref, oli.product_code, oli.external_product_id;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'preparation_id', v_preparation_id,
    'deleted', v_deleted,
    'inserted', v_inserted
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatcher_start_plan_preparation(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_plan record;
  v_preparation_id uuid;
  v_actor uuid := auth.uid();
  v_result jsonb;
  v_is_return_plan boolean;
begin
  select id, plan_status into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id;

  if v_plan is null then
    raise exception 'Plan not found';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Plan is not in a assignable status: %', v_plan.plan_status;
  end if;

  -- Check if this is a return plan (has return shipments)
  select exists (
    select 1 from public.logistics_shipments ls
    where ls.plan_id = p_plan_id and ls.is_return_shipment = true
  ) into v_is_return_plan;

  insert into public.dispatcher_plan_preparations (
    plan_id, status, started_at, dispatcher_profile_id
  ) values (
    p_plan_id, 'preparing', now(), v_actor
  )
  on conflict (plan_id) do update
  set status = 'preparing',
      dispatcher_profile_id = v_actor,
      started_at = coalesce(public.dispatcher_plan_preparations.started_at, now()),
      updated_at = now()
  returning id into v_preparation_id;

  if not exists (
    select 1 from public.dispatcher_plan_item_preparations
    where plan_preparation_id = v_preparation_id
  ) then
    if v_is_return_plan then
      -- For return plans: seed from logistics_return_shipment_items
      insert into public.dispatcher_plan_item_preparations (
        plan_preparation_id, plan_id, product_name, product_ref, product_code,
        external_product_id, product_id, dataset_id,
        total_requested_quantity, approved_quantity, status
      )
      select
        v_preparation_id,
        p_plan_id,
        lrsi.product_name,
        lrsi.product_ref,
        null,
        lrsi.external_product_id,
        null,
        null,
        sum(coalesce(lrsi.returned_quantity, 0)) as total_requested_quantity,
        0 as approved_quantity,
        'pending' as status
      from public.logistics_return_shipment_items lrsi
      join public.logistics_shipments ls ON ls.id = lrsi.return_shipment_id
      where ls.plan_id = p_plan_id
        and lrsi.returned_quantity > 0
      group by lrsi.product_name, lrsi.product_ref, lrsi.external_product_id;
    else
      -- For regular plans: seed from order_line_items
      insert into public.dispatcher_plan_item_preparations (
        plan_preparation_id, plan_id, product_name, product_ref, product_code,
        external_product_id, product_id, dataset_id,
        total_requested_quantity, approved_quantity, status
      )
      select
        v_preparation_id,
        p_plan_id,
        coalesce(oli.product_name, oli.product_ref, oli.product_code, 'product'),
        oli.product_ref,
        oli.product_code,
        oli.external_product_id,
        null as product_id,
        null as dataset_id,
        sum(coalesce(oli.ordered_quantity, 0)) as total_requested_quantity,
        0 as approved_quantity,
        'pending' as status
      from public.logistics_shipments ls
      join public.order_line_items oli on oli.order_id = ls.linked_order_id
      where ls.plan_id = p_plan_id
        and ls.linked_order_id is not null
        and (oli.display_type is null or oli.display_type = 'false')
        and (
          coalesce(oli.external_product_id, '') <> ''
          or coalesce(oli.product_ref, '') <> ''
          or coalesce(oli.product_code, '') <> ''
        )
        and (
          coalesce(oli.ordered_quantity, 0) > 0
          or coalesce(oli.delivered_quantity, 0) > 0
          or coalesce(oli.total_amount, 0) > 0
          or coalesce(oli.subtotal_amount, 0) > 0
          or coalesce(oli.unit_price, 0) > 0
        )
      group by
        oli.product_name, oli.product_ref, oli.product_code, oli.external_product_id;
    end if;
  end if;

  select jsonb_build_object(
    'preparation_id', v_preparation_id,
    'plan_id', p_plan_id,
    'status', 'preparing'
  ) into v_result;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_append_route_breadcrumb(p_plan_id text, p_lat double precision, p_lng double precision, p_accuracy double precision DEFAULT NULL::double precision, p_speed double precision DEFAULT NULL::double precision)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := auth.uid()::text;
BEGIN
  UPDATE logistics_route_tracking
  SET actual_route = actual_route || jsonb_build_object(
    'lat', p_lat, 'lng', p_lng,
    'ts', extract(epoch from now()),
    'acc', p_accuracy, 'spd', p_speed
  ),
  updated_at = now()
  WHERE plan_id = p_plan_id
    AND driver_profile_id = v_actor
    AND tracking_status = 'active';
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_complete_route_tracking(p_plan_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor text := auth.uid()::text;
  v_actual_distance double precision := 0;
  v_actual_duration integer := 0;
  v_point jsonb;
  v_prev_lat double precision;
  v_prev_lng double precision;
  v_first_ts double precision;
  v_last_ts double precision;
  v_started_at timestamptz;
begin
  select started_at
  into v_started_at
  from public.logistics_route_tracking
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = v_actor
  order by started_at desc
  limit 1;

  for v_point in
    select jsonb_array_elements(actual_route)
    from public.logistics_route_tracking
    where plan_id::text = p_plan_id::text
      and driver_profile_id::text = v_actor
      and tracking_status = 'active'
  loop
    if v_first_ts is null then
      v_first_ts := (v_point->>'ts')::double precision;
    end if;
    v_last_ts := (v_point->>'ts')::double precision;

    if v_prev_lat is not null and v_prev_lng is not null then
      v_actual_distance := v_actual_distance + (
        6371 * 2 * asin(sqrt(
          power(sin(radians((v_point->>'lat')::double precision - v_prev_lat) / 2), 2) +
          cos(radians(v_prev_lat)) * cos(radians((v_point->>'lat')::double precision)) *
          power(sin(radians((v_point->>'lng')::double precision - v_prev_lng) / 2), 2)
        ))
      );
    end if;

    v_prev_lat := (v_point->>'lat')::double precision;
    v_prev_lng := (v_point->>'lng')::double precision;
  end loop;

  if v_first_ts is not null and v_last_ts is not null then
    v_actual_duration := greatest(1, ceil((v_last_ts - v_first_ts) / 60))::integer;
  end if;

  update public.logistics_route_tracking
  set
    actual_distance_km = v_actual_distance,
    actual_duration_minutes = v_actual_duration,
    actual_stop_count = (
      select count(distinct event.shipment_id)
      from public.logistics_shipment_events event
      where event.actor_profile_id::text = v_actor
        and event.next_phase in ('arrived_delivery', 'delivered')
        and (v_started_at is null or event.created_at >= v_started_at)
    ),
    tracking_status = 'completed',
    completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = v_actor
    and tracking_status = 'active';
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_create_sos_alert(p_shipment_id uuid DEFAULT NULL::uuid, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_message text DEFAULT NULL::text)
 RETURNS logistics_driver_alerts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_alert public.logistics_driver_alerts%rowtype;
  v_notification_id uuid;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if p_shipment_id is not null then
    select *
    into v_shipment
    from public.logistics_shipments
    where id = p_shipment_id;

    if v_shipment.id is null then
      raise exception 'Shipment not found.';
    end if;

    if v_shipment.assigned_profile_id <> auth.uid() then
      raise exception 'You can only create SOS alerts for your assigned shipments.';
    end if;
  end if;

  insert into public.logistics_driver_alerts (
    driver_profile_id,
    shipment_id,
    plan_id,
    message,
    location_lat,
    location_lng,
    metadata
  )
  values (
    auth.uid(),
    p_shipment_id,
    v_shipment.plan_id,
    nullif(trim(coalesce(p_message, '')), ''),
    p_location_lat,
    p_location_lng,
    jsonb_build_object(
      'driver_name', v_profile.full_name,
      'driver_phone', v_profile.phone,
      'shipment_reference', v_shipment.shipment_reference,
      'customer_name', v_shipment.customer_name
    )
  )
  returning *
  into v_alert;

  insert into public.notifications (
    created_by,
    audience_type,
    audience_role,
    audience_user_id,
    channel,
    title,
    body,
    metadata
  )
  values (
    auth.uid(),
    'role',
    'admin',
    null,
    'in_app',
    'SOS Alert',
    concat(
      coalesce(v_profile.full_name, 'Driver'),
      ' fired an SOS alert',
      case when v_shipment.shipment_reference is not null then concat(' for ', v_shipment.shipment_reference) else '' end
    ),
    jsonb_build_object(
      'type', 'alert',
      'importance', 'High',
      'sender', coalesce(v_profile.full_name, 'driver'),
      'driver_alert_id', v_alert.id,
      'driver_profile_id', auth.uid(),
      'shipment_id', p_shipment_id,
      'plan_id', v_alert.plan_id,
      'location_lat', p_location_lat,
      'location_lng', p_location_lng
    )
  )
  returning id
  into v_notification_id;

  insert into public.notification_recipients (notification_id, user_id)
  select v_notification_id, p.id
  from public.profiles p
  where p.status = 'active'
    and p.role in ('admin', 'manager', 'supervisor')
  on conflict (notification_id, user_id) do nothing;

  return v_alert;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_finish_delivery_route(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_open_count integer := 0;
begin
  select *
  into v_plan
  from public.logistics_delivery_plans
  where id::text = p_plan_id::text
  for update;

  if v_plan.id is null or v_plan.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Plan not found or not authorized.';
  end if;

  perform public.driver_complete_route_tracking(p_plan_id::text);

  update public.logistics_route_tracking
  set
    tracking_status = 'completed',
    completed_at = coalesce(completed_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where plan_id::text = p_plan_id::text
    and driver_profile_id::text = auth.uid()::text
    and tracking_status = 'active';

  select count(*)
  into v_open_count
  from public.logistics_shipments shipment
  where shipment.plan_id::text = p_plan_id::text
    and coalesce(shipment.shipment_status, 'PENDING_ASSIGN')
      not in ('DELIVERED', 'FINISHED', 'SETTLED', 'CANCELLED', 'FAILED', 'ATTEMPTED');

  if v_open_count > 0 then
    raise exception 'Plan still has % open shipments.', v_open_count;
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = 'completed',
    finished_at = coalesce(finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
  returning *
  into v_plan;

  return jsonb_build_object('success', true, 'plan_id', p_plan_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_get_cash_balance(p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_id UUID;
  v_result JSONB;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_plan_id IS NOT NULL THEN
    -- Get balance for specific plan
    SELECT jsonb_build_object(
      'cash_amount', cash_amount,
      'currency_code', currency_code,
      'status', status,
      'route_plan_id', route_plan_id
    ) INTO v_result
    FROM driver_cash_balance
    WHERE driver_id = v_driver_id
      AND route_plan_id = p_plan_id;
  ELSE
    -- Get all pending balances
    SELECT jsonb_agg(jsonb_build_object(
      'cash_amount', cash_amount,
      'currency_code', currency_code,
      'status', status,
      'route_plan_id', route_plan_id
    )) INTO v_result
    FROM driver_cash_balance
    WHERE driver_id = v_driver_id;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_get_plan_collection_checks(p_plan_id text DEFAULT NULL::text)
 RETURNS TABLE(shipment_id text, plan_id text, check_status text, payment_method text, reason text, driver_notes text, review_status text, admin_notes text, reviewed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.shipment_id,
    c.plan_id::text,
    c.check_status,
    c.payment_method,
    c.reason,
    c.driver_notes,
    c.review_status,
    c.admin_notes,
    c.reviewed_at,
    c.created_at
  from public.driver_plan_collection_checks c
  where c.driver_profile_id = auth.uid()
    and (p_plan_id is null or c.plan_id::text = p_plan_id)
  order by c.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.driver_get_route_settlements(p_plan_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_id UUID;
  v_result JSONB;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_plan_id IS NOT NULL THEN
    -- Get settlements for specific plan
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'settlement_method', settlement_method,
      'total_cash_amount', total_cash_amount,
      'currency_code', currency_code,
      'status', status,
      'driver_notes', driver_notes,
      'finance_notes', finance_notes,
      'created_at', created_at
    )) INTO v_result
    FROM logistics_route_settlements
    WHERE driver_id = v_driver_id
      AND plan_id = p_plan_id;
  ELSE
    -- Get all settlements
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'settlement_method', settlement_method,
      'total_cash_amount', total_cash_amount,
      'currency_code', currency_code,
      'status', status,
      'driver_notes', driver_notes,
      'finance_notes', finance_notes,
      'created_at', created_at
    )) INTO v_result
    FROM logistics_route_settlements
    WHERE driver_id = v_driver_id;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_get_settlement_requests()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'plan_id', r.plan_id,
      'total_debt_amount', r.total_debt_amount,
      'currency_code', r.currency_code,
      'status', r.status,
      'driver_notes', r.driver_notes,
      'admin_notes', r.admin_notes,
      'reviewed_at', r.reviewed_at,
      'paid_at', r.paid_at,
      'created_at', r.created_at,
      'plan_reference', p.plan_reference
    )
    order by r.created_at desc
  ), '[]'::jsonb)
  from public.driver_plan_settlement_requests r
  left join public.logistics_delivery_plans p on p.id = r.plan_id
  where r.driver_profile_id = auth.uid()::text::uuid
     or r.driver_profile_id::text = auth.uid()::text;
$function$;

CREATE OR REPLACE FUNCTION public.driver_get_shipment_orders(p_shipment_ids uuid[])
 RETURNS TABLE(shipment_id uuid, order_id uuid, order_number text, order_total numeric, payment_term text, order_create_uid text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    shipment.id as shipment_id,
    o.id as order_id,
    coalesce(o.odoo_order_name, o.external_order_id) as order_number,
    o.total_amount as order_total,
    case
      when o.raw_payload ? 'payment_term_id' then o.raw_payload->>'payment_term_id'
      else null
    end as payment_term,
    o.create_uid as order_create_uid
  from public.logistics_shipments as shipment
  join lateral (
    select matched_order.*
    from public.orders as matched_order
    where matched_order.id = shipment.linked_order_id
      or (
        shipment.linked_order_id is null
        and (
          (shipment.odoo_order_name is not null and matched_order.odoo_order_name = shipment.odoo_order_name)
          or (shipment.external_order_id is not null and matched_order.external_order_id = shipment.external_order_id)
        )
      )
    order by
      case when matched_order.id = shipment.linked_order_id then 0 else 1 end,
      matched_order.created_at desc
    limit 1
  ) as o on true
  where shipment.id = any(coalesce(p_shipment_ids, array[]::uuid[]))
    and shipment.assigned_profile_id::text = auth.uid()::text;
$function$;

CREATE OR REPLACE FUNCTION public.driver_record_cash_payment(p_shipment_id uuid, p_amount numeric, p_currency_code text DEFAULT 'EGP'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_plan_id UUID;
  v_driver_id UUID;
  v_existing_balance NUMERIC;
BEGIN
  -- Get shipment details
  SELECT plan_id, assigned_profile_id INTO v_plan_id, v_driver_id
  FROM logistics_shipments
  WHERE id = p_shipment_id;

  IF v_plan_id IS NULL OR v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  -- Check if driver has existing cash balance for this plan
  SELECT cash_amount INTO v_existing_balance
  FROM driver_cash_balance
  WHERE driver_id = v_driver_id
    AND route_plan_id = v_plan_id
    AND status = 'pending';

  IF v_existing_balance IS NOT NULL THEN
    -- Update existing balance
    UPDATE driver_cash_balance
    SET cash_amount = v_existing_balance + p_amount,
        updated_at = now()
    WHERE driver_id = v_driver_id
      AND route_plan_id = v_plan_id
      AND status = 'pending';
  ELSE
    -- Create new balance record
    INSERT INTO driver_cash_balance (driver_id, route_plan_id, cash_amount, currency_code)
    VALUES (v_driver_id, v_plan_id, p_amount, p_currency_code);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', v_plan_id,
    'total_cash', v_existing_balance + p_amount
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_reorder_plan_shipments(p_plan_id uuid, p_shipment_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_profile_id uuid;
  v_shipment_id uuid;
  v_seq integer;
begin
  v_profile_id := auth.uid();

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id = p_plan_id
  for update;

  if v_plan.id is null then
    raise exception 'Plan not found.';
  end if;

  if v_plan.assigned_profile_id is distinct from v_profile_id then
    raise exception 'This plan is not assigned to you.';
  end if;

  if v_plan.plan_status not in ('pending', 'in_progress') then
    raise exception 'Can only reorder shipments in active plans.';
  end if;

  v_seq := 1;
  foreach v_shipment_id in array p_shipment_ids loop
    update public.logistics_shipments
    set
      route_sequence = v_seq,
      updated_at = timezone('utc', now())
    where id = v_shipment_id
      and plan_id = p_plan_id;

    v_seq := v_seq + 1;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_start_delivery_route(p_plan_id uuid, p_planned_route jsonb DEFAULT '[]'::jsonb, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_updated_count integer := 0;
  v_tracking_id uuid;
begin
  if p_location_lat is null or p_location_lng is null then
    raise exception 'Driver location is required to start the delivery route.';
  end if;

  select *
  into v_plan
  from public.logistics_delivery_plans
  where id::text = p_plan_id::text
  for update;

  if v_plan.id is null or v_plan.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Plan not found or not authorized.';
  end if;

  if v_plan.plan_status <> 'in_progress' then
    raise exception 'Plan must be prepared by dispatcher before route start. Current status: %.', v_plan.plan_status;
  end if;

  update public.logistics_delivery_plans
  set
    started_at = coalesce(started_at, timezone('utc', now())),
    dispatched_at = coalesce(dispatched_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
  returning *
  into v_plan;

  insert into public.logistics_route_tracking (
    plan_id,
    driver_profile_id,
    planned_route,
    actual_route,
    planned_stop_count,
    vehicle_type,
    tracking_status,
    started_at
  )
  values (
    p_plan_id::text,
    auth.uid()::text,
    coalesce(p_planned_route, '[]'::jsonb),
    jsonb_build_array(jsonb_build_object(
      'lat', p_location_lat,
      'lng', p_location_lng,
      'ts', extract(epoch from now()),
      'source', 'route_start'
    )),
    jsonb_array_length(coalesce(p_planned_route, '[]'::jsonb)),
    coalesce(nullif(p_vehicle_type, ''), 'van'),
    'active',
    timezone('utc', now())
  )
  on conflict (plan_id) do update set
    driver_profile_id = excluded.driver_profile_id,
    planned_route = excluded.planned_route,
    actual_route = excluded.actual_route,
    planned_stop_count = excluded.planned_stop_count,
    vehicle_type = excluded.vehicle_type,
    tracking_status = 'active',
    started_at = timezone('utc', now()),
    completed_at = null,
    updated_at = timezone('utc', now())
  returning id
  into v_tracking_id;

  with candidates as (
    select
      shipment.id,
      case shipment.shipment_status
        when 'ASSIGNED' then 'assigned'
        when 'CHECK_IN' then 'arrived_pickup'
        when 'PICKUP' then 'picked_up'
        else lower(coalesce(shipment.shipment_status, 'assigned'))
      end as previous_phase
    from public.logistics_shipments shipment
    where shipment.plan_id::text = p_plan_id::text
      and shipment.shipment_status in ('ASSIGNED', 'CHECK_IN', 'PICKUP')
    for update
  ),
  updated as (
    update public.logistics_shipments
    set
      shipment_status = 'OUT_FOR_DELIVERY',
      shipment_state = 'assigned',
      updated_at = timezone('utc', now())
    from candidates
    where logistics_shipments.id = candidates.id
    returning logistics_shipments.id, candidates.previous_phase
  )
  insert into public.logistics_shipment_events (
    shipment_id,
    actor_profile_id,
    previous_phase,
    next_phase,
    note,
    location_lat,
    location_lng,
    payload
  )
  select
    id,
    auth.uid(),
    previous_phase,
    'in_transit',
    'Driver started delivery route',
    p_location_lat,
    p_location_lng,
    jsonb_build_object('route_tracking_id', v_tracking_id, 'plan_id', p_plan_id)
  from updated;

  get diagnostics v_updated_count = row_count;

  return jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'tracking_id', v_tracking_id,
    'updated_shipments', v_updated_count
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_start_route_tracking(p_plan_id text, p_planned_route jsonb, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := auth.uid()::text;
  v_tracking_id uuid;
  v_vehicle RECORD;
  v_planned_distance double precision := 0;
  v_planned_duration integer := 0;
  v_stop_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM logistics_delivery_plans
    WHERE id = p_plan_id AND "assignedProfileId" = v_actor
  ) THEN
    RAISE EXCEPTION 'Plan not found or not authorized';
  END IF;

  SELECT * INTO v_vehicle FROM logistics_vehicle_profiles WHERE vehicle_type = p_vehicle_type;
  v_stop_count := jsonb_array_length(p_planned_route);

  IF v_stop_count >= 2 THEN
    WITH points AS (
      SELECT
        (elem->>'lat')::double precision AS lat,
        (elem->>'lng')::double precision AS lng,
        row_number() OVER () AS rn
      FROM jsonb_array_elements(p_planned_route) AS elem
    )
    SELECT COALESCE(SUM(
      6371 * 2 * asin(sqrt(
        power(sin(radians(p2.lat - p1.lat) / 2), 2) +
        cos(radians(p1.lat)) * cos(radians(p2.lat)) *
        power(sin(radians(p2.lng - p1.lng) / 2), 2)
      ))
    ), 0)
    INTO v_planned_distance
    FROM points p1
    JOIN points p2 ON p2.rn = p1.rn + 1;
  END IF;

  IF v_vehicle IS NOT NULL AND v_planned_distance > 0 THEN
    v_planned_duration := ceil((v_planned_distance / v_vehicle.avg_speed_kmh) * 60) + (v_stop_count * 5);
  ELSE
    v_planned_duration := v_stop_count * 10;
  END IF;

  INSERT INTO logistics_route_tracking (
    plan_id, driver_profile_id,
    planned_route, planned_distance_km, planned_duration_minutes,
    planned_stop_count, vehicle_type, avg_speed_kmh
  ) VALUES (
    p_plan_id, v_actor,
    p_planned_route, v_planned_distance, v_planned_duration,
    v_stop_count, p_vehicle_type, COALESCE(v_vehicle.avg_speed_kmh, 40)
  )
  ON CONFLICT (plan_id) DO UPDATE SET
    planned_route = EXCLUDED.planned_route,
    planned_distance_km = EXCLUDED.planned_distance_km,
    planned_duration_minutes = EXCLUDED.planned_duration_minutes,
    planned_stop_count = EXCLUDED.planned_stop_count,
    vehicle_type = EXCLUDED.vehicle_type,
    avg_speed_kmh = EXCLUDED.avg_speed_kmh,
    updated_at = now()
  RETURNING id INTO v_tracking_id;

  RETURN v_tracking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_start_route_tracking(p_plan_id uuid, p_planned_route jsonb, p_vehicle_type text DEFAULT 'van'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.logistics_delivery_plans%rowtype;
  v_tracking_id uuid;
  v_vehicle RECORD;
  v_planned_distance double precision := 0;
  v_planned_duration integer := 0;
  v_stop_count integer;
BEGIN
  SELECT * INTO v_plan
  FROM public.logistics_delivery_plans
  WHERE id = p_plan_id;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan not found.';
  END IF;

  IF NOT public.is_management_role() AND v_plan.assigned_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'You do not have access to this plan.';
  END IF;

  SELECT * INTO v_vehicle FROM public.logistics_vehicle_profiles WHERE vehicle_type = p_vehicle_type;
  v_stop_count := jsonb_array_length(p_planned_route);

  IF v_stop_count >= 2 THEN
    WITH points AS (
      SELECT
        (elem->>'lat')::double precision AS lat,
        (elem->>'lng')::double precision AS lng,
        row_number() OVER () AS rn
      FROM jsonb_array_elements(p_planned_route) AS elem
    )
    SELECT COALESCE(SUM(
      6371 * 2 * asin(sqrt(
        power(sin(radians(p2.lat - p1.lat) / 2), 2) +
        cos(radians(p1.lat)) * cos(radians(p2.lat)) *
        power(sin(radians(p2.lng - p1.lng) / 2), 2)
      ))
    ), 0)
    INTO v_planned_distance
    FROM points p1
    JOIN points p2 ON p2.rn = p1.rn + 1;

    v_planned_duration := GREATEST(v_stop_count * 5, (v_planned_distance / 40.0 * 60)::int);
  END IF;

  INSERT INTO public.logistics_route_trackings (
    plan_id, driver_profile_id, vehicle_type,
    planned_distance_km, planned_duration_min, planned_stop_count,
    planned_route
  ) VALUES (
    p_plan_id, auth.uid(), v_vehicle.vehicle_type,
    v_planned_distance, v_planned_duration, v_stop_count,
    p_planned_route
  )
  RETURNING id INTO v_tracking_id;

  UPDATE public.logistics_delivery_plans
  SET plan_status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  WHERE id = p_plan_id;

  RETURN v_tracking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_collection_check(p_shipment_id text, p_check_status text, p_payment_method text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_plan_id  uuid;
  v_payment_method text;
begin
  v_payment_method := nullif(trim(lower(p_payment_method)), '');

  select * into v_shipment
  from public.logistics_shipments
  where id::text = p_shipment_id::text
  for update;

  if v_shipment.id is null or v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'Shipment not found or not authorized.';
  end if;

  v_plan_id := v_shipment.plan_id;

  if p_check_status not in ('collected', 'not_collected') then
    raise exception 'Invalid check_status: %', p_check_status;
  end if;

  if p_check_status = 'collected' then
    if v_payment_method not in ('cash', 'bank_transfer', 'installments', 'cheque', 'credit') then
      raise exception 'payment_method is required for collected status. Allowed values: cash, bank_transfer, installments, cheque, credit.';
    end if;
  end if;

  if p_check_status = 'not_collected' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason is required for not_collected status.';
    end if;
  end if;

  insert into public.driver_plan_collection_checks (
    shipment_id, driver_profile_id, plan_id,
    check_status, payment_method, reason, driver_notes
  ) values (
    p_shipment_id, auth.uid(), v_plan_id,
    p_check_status, v_payment_method, p_reason, p_driver_notes
  )
  on conflict (shipment_id) do update set
    check_status    = excluded.check_status,
    payment_method  = excluded.payment_method,
    reason          = excluded.reason,
    driver_notes    = excluded.driver_notes,
    review_status   = 'pending',
    reviewed_by_profile_id = null,
    admin_notes     = null,
    reviewed_at     = null,
    updated_at      = timezone('utc', now());

  return jsonb_build_object('success', true, 'shipment_id', p_shipment_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_collection_check(p_shipment_id text, p_check_status text, p_payment_method text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text, p_proof_photo_url text DEFAULT NULL::text, p_sales_rep_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_plan_id  uuid;
  v_payment_method text;
  v_sales_rep_id uuid;
begin
  v_payment_method := nullif(trim(lower(p_payment_method)), '');
  v_sales_rep_id := nullif(p_sales_rep_id, '00000000-0000-0000-0000-000000000000'::uuid);

  select * into v_shipment
  from public.logistics_shipments
  where id::text = p_shipment_id::text
  for update;

  if v_shipment.id is null or v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'Shipment not found or not authorized.';
  end if;

  v_plan_id := v_shipment.plan_id;

  if p_check_status not in ('collected', 'not_collected') then
    raise exception 'Invalid check_status: %', p_check_status;
  end if;

  if p_check_status = 'collected' then
    if v_payment_method not in ('cash', 'bank_transfer', 'installments', 'cheque', 'credit') then
      raise exception 'payment_method is required for collected status. Allowed values: cash, bank_transfer, installments, cheque, credit.';
    end if;
  end if;

  if p_check_status = 'not_collected' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason is required for not_collected status.';
    end if;
  end if;

  insert into public.driver_plan_collection_checks (
    shipment_id, driver_profile_id, plan_id,
    check_status, payment_method, reason, driver_notes,
    proof_photo_url, sales_rep_id
  ) values (
    p_shipment_id, auth.uid(), v_plan_id,
    p_check_status, v_payment_method, p_reason, p_driver_notes,
    p_proof_photo_url, v_sales_rep_id
  )
  on conflict (shipment_id) do update set
    check_status    = excluded.check_status,
    payment_method  = excluded.payment_method,
    reason          = excluded.reason,
    driver_notes    = excluded.driver_notes,
    proof_photo_url = excluded.proof_photo_url,
    sales_rep_id    = excluded.sales_rep_id,
    review_status   = 'pending',
    reviewed_by_profile_id = null,
    admin_notes     = null,
    reviewed_at     = null,
    updated_at      = timezone('utc', now());

  return jsonb_build_object('success', true, 'shipment_id', p_shipment_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_collection_handover(p_plan_id uuid DEFAULT NULL::uuid, p_handed_to_manager boolean DEFAULT false, p_reason text DEFAULT NULL::text, p_total_amount numeric DEFAULT 0, p_currency_code text DEFAULT 'EGP'::text)
 RETURNS logistics_collection_handovers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_handover public.logistics_collection_handovers%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if not p_handed_to_manager and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Reason is required when collection was not handed to manager.';
  end if;

  insert into public.logistics_collection_handovers (
    driver_profile_id,
    plan_id,
    handed_to_manager,
    reason,
    total_amount,
    currency_code,
    metadata
  )
  values (
    auth.uid(),
    p_plan_id,
    p_handed_to_manager,
    nullif(trim(coalesce(p_reason, '')), ''),
    coalesce(p_total_amount, 0),
    coalesce(nullif(trim(p_currency_code), ''), 'EGP'),
    jsonb_build_object('driver_name', v_profile.full_name)
  )
  returning *
  into v_handover;

  return v_handover;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_collection_request(p_plan_id uuid DEFAULT NULL::uuid, p_collected_amount numeric DEFAULT 0, p_currency_code text DEFAULT 'EGP'::text, p_proof_photo_url text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS logistics_collection_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_request public.logistics_collection_requests%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(p_collected_amount, 0) <= 0 then
    raise exception 'Collected amount must be greater than zero.';
  end if;

  insert into public.logistics_collection_requests (
    driver_profile_id,
    plan_id,
    collected_amount,
    currency_code,
    proof_photo_url,
    driver_notes,
    status
  )
  values (
    auth.uid(),
    p_plan_id,
    p_collected_amount,
    coalesce(nullif(trim(p_currency_code), ''), 'EGP'),
    nullif(trim(coalesce(p_proof_photo_url, '')), ''),
    nullif(trim(coalesce(p_driver_notes, '')), ''),
    'pending'
  )
  returning *
  into v_request;

  return v_request;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_order_collections(p_shipment_id uuid, p_order_collections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_order jsonb;
  v_payment_method text;
  v_order_total numeric(14, 2);
  v_collected_amount numeric(14, 2);
  v_driver_debt_amount numeric(14, 2);
  v_cash_total numeric(14, 2) := 0;
  v_sales_rep_id uuid;
  v_transfer_responsible_name text;
begin
  select *
  into v_shipment
  from public.logistics_shipments
  where id::text = p_shipment_id::text
  for update;

  if v_shipment.id is null or v_shipment.assigned_profile_id::text <> auth.uid()::text then
    raise exception 'Shipment not found or not authorized.';
  end if;

  if jsonb_typeof(coalesce(p_order_collections, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_order_collections, '[]'::jsonb)) = 0
  then
    raise exception 'At least one order collection is required.';
  end if;

  for v_order in select * from jsonb_array_elements(p_order_collections)
  loop
    v_payment_method := lower(trim(coalesce(v_order->>'paymentMethod', '')));
    if v_payment_method = 'transfer' then
      v_payment_method := 'bank_transfer';
    elsif v_payment_method = 'installments' then
      v_payment_method := 'credit';
    end if;

    if v_payment_method not in ('cash', 'credit', 'cheque', 'bank_transfer') then
      raise exception 'Unsupported payment method: %.', v_payment_method;
    end if;

    v_sales_rep_id := nullif(v_order->>'salesRepId', '')::uuid;
    v_transfer_responsible_name := coalesce(
      nullif(v_order->>'salesRepName', ''),
      nullif(v_order->>'orderCreateUid', '')
    );

    v_order_total := coalesce((v_order->>'orderTotal')::numeric, 0);
    v_collected_amount := case when v_payment_method = 'cash' then v_order_total else 0 end;
    v_driver_debt_amount := case when v_payment_method = 'cash' then v_order_total else 0 end;
    v_cash_total := v_cash_total + v_driver_debt_amount;

    insert into public.logistics_order_collections (
      shipment_id,
      order_id,
      order_number,
      order_total,
      payment_method,
      collected_amount,
      driver_debt_amount,
      sales_rep_id,
      transfer_responsible_name,
      cheque_reference,
      installment_count,
      collection_status,
      accounting_status,
      driver_notes,
      collected_at
    )
    values (
      p_shipment_id::text,
      v_order->>'orderId',
      nullif(v_order->>'orderNumber', ''),
      v_order_total,
      v_payment_method,
      v_collected_amount,
      v_driver_debt_amount,
      v_sales_rep_id,
      v_transfer_responsible_name,
      nullif(v_order->>'chequeReference', ''),
      null,
      case when v_payment_method = 'cash' then 'collected' else 'exempt' end,
      'pending_accounting_review',
      nullif(v_order->>'driverNotes', ''),
      timezone('utc', now())
    )
    on conflict (shipment_id, order_id) do update set
      order_number = excluded.order_number,
      order_total = excluded.order_total,
      payment_method = excluded.payment_method,
      collected_amount = excluded.collected_amount,
      driver_debt_amount = excluded.driver_debt_amount,
      sales_rep_id = excluded.sales_rep_id,
      transfer_responsible_name = excluded.transfer_responsible_name,
      cheque_reference = excluded.cheque_reference,
      installment_count = null,
      collection_status = excluded.collection_status,
      accounting_status = excluded.accounting_status,
      driver_notes = excluded.driver_notes,
      collected_at = excluded.collected_at,
      updated_at = timezone('utc', now());
  end loop;

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    driver_debt_amount,
    payment_method,
    collection_status,
    accounting_status,
    collected_from_customer_at
  )
  values (
    p_shipment_id,
    v_cash_total,
    v_cash_total,
    v_cash_total,
    case when v_cash_total > 0 then 'cash' else 'credit' end,
    case when v_cash_total > 0 then 'collected_from_customer' else 'pending_delivery_amount' end,
    'pending_accounting_review',
    case when v_cash_total > 0 then timezone('utc', now()) else null end
  )
  on conflict (shipment_id) do update set
    pending_delivery_amount = excluded.pending_delivery_amount,
    collected_from_customer = excluded.collected_from_customer,
    driver_debt_amount = excluded.driver_debt_amount,
    payment_method = excluded.payment_method,
    collection_status = excluded.collection_status,
    accounting_status = excluded.accounting_status,
    collected_from_customer_at = case
      when excluded.driver_debt_amount > 0
        then coalesce(public.logistics_shipment_collections.collected_from_customer_at, excluded.collected_from_customer_at)
      else public.logistics_shipment_collections.collected_from_customer_at
    end,
    updated_at = timezone('utc', now());

  insert into public.logistics_shipment_events (
    shipment_id,
    actor_profile_id,
    previous_phase,
    next_phase,
    note,
    payload
  )
  values (
    p_shipment_id,
    auth.uid(),
    v_shipment.delivery_phase,
    'collection_submitted',
    'Order collections submitted',
    jsonb_build_object(
      'order_count', jsonb_array_length(p_order_collections),
      'cash_total', v_cash_total,
      'cash_only_driver_debt', true,
      'transfer_attribution_source', 'orders.create_uid'
    )
  );

  return jsonb_build_object(
    'success', true,
    'order_count', jsonb_array_length(p_order_collections),
    'cash_total', v_cash_total
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_plan_settlement_request(p_plan_id uuid, p_total_debt_amount numeric, p_currency_code text DEFAULT 'EGP'::text, p_driver_notes text DEFAULT NULL::text, p_proof_photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_driver_id uuid;
  v_existing uuid;
begin
  v_driver_id := auth.uid();

  if v_driver_id is null then
    raise exception 'Driver authentication required.';
  end if;

  if not exists (
    select 1 from public.logistics_delivery_plans
    where id = p_plan_id
      and assigned_profile_id = v_driver_id
  ) then
    raise exception 'Plan not found or not authorized.';
  end if;

  select id into v_existing
  from public.driver_plan_settlement_requests
  where plan_id = p_plan_id;

  if v_existing is not null then
    raise exception 'Settlement request already exists for this plan.';
  end if;

  insert into public.driver_plan_settlement_requests (
    driver_profile_id,
    plan_id,
    total_debt_amount,
    currency_code,
    driver_notes,
    proof_photo_url
  ) values (
    v_driver_id,
    p_plan_id,
    p_total_debt_amount,
    p_currency_code,
    p_driver_notes,
    p_proof_photo_url
  );

  return jsonb_build_object('success', true, 'message', 'Settlement request submitted successfully.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_submit_route_settlement(p_plan_id uuid, p_settlement_method text, p_receipt_image_url text DEFAULT NULL::text, p_driver_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_id UUID;
  v_total_cash NUMERIC;
  v_currency_code TEXT;
  v_settlement_id UUID;
BEGIN
  v_driver_id := auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_settlement_method NOT IN ('hand_to_finance', 'send_via_fawry') THEN
    RAISE EXCEPTION 'Invalid settlement method';
  END IF;

  -- Compute total from shipment collections (driver_debt_amount)
  SELECT
    COALESCE(SUM(lsc.driver_debt_amount), 0),
    COALESCE(MAX(lsc.currency_code), 'EGP')
  INTO v_total_cash, v_currency_code
  FROM public.logistics_shipment_collections lsc
  JOIN public.logistics_shipments ls ON ls.id = lsc.shipment_id
  WHERE ls.plan_id = p_plan_id
    AND lsc.driver_debt_amount > 0
    AND lsc.accounting_status = 'pending_accounting_review';

  IF v_total_cash IS NULL OR v_total_cash <= 0 THEN
    RAISE EXCEPTION 'No pending collection amount for this route';
  END IF;

  INSERT INTO public.logistics_route_settlements (
    plan_id, driver_id, settlement_method, total_cash_amount,
    receipt_image_url, driver_notes, currency_code
  ) VALUES (
    p_plan_id, v_driver_id, p_settlement_method, v_total_cash,
    p_receipt_image_url, p_driver_notes, v_currency_code
  ) RETURNING id INTO v_settlement_id;

  -- Update accounting_status on the collections
  UPDATE public.logistics_shipment_collections lsc
  SET accounting_status = 'pending_accounting_review'
  FROM public.logistics_shipments ls
  WHERE ls.id = lsc.shipment_id
    AND ls.plan_id = p_plan_id
    AND lsc.driver_debt_amount > 0
    AND lsc.accounting_status = 'pending_accounting_review';

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'total_cash_amount', v_total_cash,
    'currency_code', v_currency_code,
    'settlement_method', p_settlement_method,
    'status', 'waiting_for_finance'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.driver_update_plan_status(p_plan_id uuid, p_next_status text)
 RETURNS logistics_delivery_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan public.logistics_delivery_plans%rowtype;
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
begin
  if v_next_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Unsupported plan status: %. Plan status is broad; use shipment delivery_phase for driver workflow stages.', v_next_status;
  end if;

  update public.logistics_delivery_plans
  set
    plan_status = v_next_status,
    started_at = case
      when v_next_status = 'in_progress' then coalesce(started_at, timezone('utc', now()))
      else started_at
    end,
    finished_at = case
      when v_next_status = 'completed' then coalesce(finished_at, timezone('utc', now()))
      else finished_at
    end,
    updated_at = timezone('utc', now())
  where id::text = p_plan_id::text
    and assigned_profile_id::text = auth.uid()::text
    and plan_status in ('pending', 'in_progress', 'completed')
  returning *
  into v_plan;

  if v_plan.id is null then
    raise exception 'Plan not found or not authorized.';
  end if;

  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_update_shipment_items(p_shipment_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment public.logistics_shipments%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_done_quantity numeric;
begin
  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null
    or (
      not public.is_management_role()
      and v_shipment.assigned_profile_id <> auth.uid()
    )
  then
    raise exception 'Shipment not found or not authorized.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Shipment items payload must be an array.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_item_id := nullif(v_item->>'item_id', '')::uuid;
    v_done_quantity := nullif(v_item->>'done_quantity', '')::numeric;

    if v_item_id is null then
      raise exception 'Shipment item id is required.';
    end if;

    if v_done_quantity is null or v_done_quantity < 0 then
      raise exception 'Done quantity must be zero or greater.';
    end if;

    update public.logistics_shipment_items
    set
      done_quantity = v_done_quantity,
      updated_at = timezone('utc', now())
    where id = v_item_id
      and shipment_id = p_shipment_id;

    if not found then
      raise exception 'Shipment item % was not found for shipment %.', v_item_id, p_shipment_id;
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_update_shipment_phase(p_shipment_id uuid, p_next_phase text, p_note text DEFAULT NULL::text, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_proof_photo_path text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_current_status text;
  v_previous_phase text;
  v_next_phase text;
  v_next_status text;
  v_completed_at timestamptz;
  v_cogs_account uuid;
  v_revenue_account uuid;
  v_line_total numeric(14,2);
  v_journal_lines jsonb;
  v_item record;
  v_return_shipment_id uuid;
  v_return_plan_id uuid;
  v_has_returns boolean := false;
  v_return_items jsonb := '[]'::jsonb;
  v_total_returned_value numeric(14,2) := 0;
  v_unit_price numeric(14,2);
  v_delivered_total numeric(14,2) := 0;
  v_savings_account uuid;
  v_ar_account uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Authentication required.'; end if;

  select * into v_shipment from public.logistics_shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found.'; end if;

  if not public.is_management_role()
    and not (
      v_shipment.assigned_profile_id::text = auth.uid()::text
      or exists (
        select 1 from public.logistics_delivery_plans plan
        where plan.id = v_shipment.plan_id and plan.assigned_profile_id::text = auth.uid()::text
      )
    )
  then raise exception 'You do not have access to update this shipment.'; end if;

  if p_idempotency_key is not null
    and exists (
      select 1 from public.logistics_shipment_events
      where shipment_id = p_shipment_id and payload->>'idempotency_key' = p_idempotency_key
    )
  then return v_shipment; end if;

  v_current_status := upper(trim(coalesce(v_shipment.shipment_status, 'PENDING_ASSIGN')));
  v_previous_phase := case v_current_status
    when 'PENDING_ASSIGN' then 'pending' when 'ASSIGNED' then 'assigned'
    when 'CHECK_IN' then 'arrived_pickup' when 'PICKUP' then 'picked_up'
    when 'OUT_FOR_DELIVERY' then 'in_transit' when 'ARRIVED' then 'arrived_delivery'
    when 'DELIVERED' then 'delivered' when 'FINISHED' then 'finished'
    when 'SETTLED' then 'settled' when 'CANCELLED' then 'cancelled'
    when 'FAILED' then 'failed' when 'ATTEMPTED' then 'attempted'
    else lower(v_current_status)
  end;
  v_next_phase := lower(trim(coalesce(p_next_phase, '')));
  v_next_status := case v_next_phase
    when 'pending_assign' then 'PENDING_ASSIGN' when 'pending' then 'PENDING_ASSIGN'
    when 'ready' then 'PENDING_ASSIGN' when 'assigned' then 'ASSIGNED'
    when 'check_in' then 'CHECK_IN' when 'arrived_pickup' then 'CHECK_IN'
    when 'pickup' then 'PICKUP' when 'picked_up' then 'PICKUP'
    when 'out_for_delivery' then 'OUT_FOR_DELIVERY' when 'in_transit' then 'OUT_FOR_DELIVERY'
    when 'arrived' then 'ARRIVED' when 'arrived_delivery' then 'ARRIVED'
    when 'delivered' then 'DELIVERED' when 'finished' then 'FINISHED'
    when 'settled' then 'SETTLED' when 'cancelled' then 'CANCELLED'
    when 'canceled' then 'CANCELLED' when 'failed' then 'FAILED'
    when 'attempted' then 'ATTEMPTED' else null
  end;

  if v_next_phase = '' then raise exception 'Next phase is required.'; end if;
  if v_next_status is null then raise exception 'Unsupported shipment phase: %', p_next_phase; end if;
  if v_current_status = v_next_status then return v_shipment; end if;

  v_completed_at := case
    when v_next_status in ('DELIVERED', 'CANCELLED', 'FAILED', 'FINISHED', 'SETTLED') then timezone('utc', now())
    else v_shipment.completed_at
  end;

  update public.logistics_shipments
  set
    shipment_status = v_next_status,
    shipment_state = case
      when v_next_status in ('DELIVERED', 'FINISHED', 'SETTLED') then 'done'
      when v_next_status in ('CANCELLED', 'FAILED', 'ATTEMPTED') then 'cancel'
      when v_next_status in ('CHECK_IN', 'PICKUP', 'OUT_FOR_DELIVERY', 'ARRIVED') then 'assigned'
      else shipment_state
    end,
    delivery_phase = case
      when v_next_status = 'DELIVERED' then 'delivered'
      when v_next_status = 'CANCELLED' then 'cancelled'
      when v_next_status = 'FAILED' then 'failed'
      when v_next_status = 'ARRIVED' then 'arrived_delivery'
      when v_next_status = 'OUT_FOR_DELIVERY' then 'in_transit'
      when v_next_status = 'PICKUP' then 'picked_up'
      when v_next_status = 'CHECK_IN' then 'arrived_pickup'
      when v_next_status = 'ASSIGNED' then 'assigned'
      when v_next_status = 'PENDING_ASSIGN' then 'pending'
      else delivery_phase
    end,
    arrived_at_customer_at = case
      when v_next_status = 'ARRIVED' and v_shipment.arrived_at_customer_at is null then timezone('utc', now())
      else arrived_at_customer_at
    end,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes),
    completed_at = v_completed_at,
    pod_signed_at = case when v_next_status = 'DELIVERED' and p_proof_photo_path is not null then timezone('utc', now()) else pod_signed_at end,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning * into v_shipment;

  insert into public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note, proof_photo_path, location_lat, location_lng, payload
  ) values (
    v_shipment.id, auth.uid(), v_previous_phase, v_next_phase,
    nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_proof_photo_path, '')), ''),
    p_location_lat, p_location_lng,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  if v_next_status = 'DELIVERED' and v_shipment.linked_order_id is not null then
    if exists (select 1 from public.logistics_shipment_items li where li.shipment_id = p_shipment_id and li.done_quantity is null) then
      raise exception 'All items must have confirmed delivered quantities before marking delivered.';
    end if;

    update public.logistics_shipment_items li
    set approved_quantity = coalesce(li.approved_quantity, dp.approved_quantity)
    from public.dispatcher_plan_item_preparations dp
    join public.dispatcher_plan_preparations dpp on dpp.id = dp.plan_preparation_id
    join public.logistics_delivery_plans ldp on ldp.id = dpp.plan_id
    where li.shipment_id = p_shipment_id
      and li.approved_quantity is null
      and ldp.id = v_shipment.plan_id
      and lower(trim(dp.product_name)) = lower(trim(li.product_name));

    for v_item in
      select li.id as item_id, li.product_id, li.external_product_id, li.product_ref, li.product_name,
        li.requested_quantity,
        coalesce(li.approved_quantity, li.requested_quantity) as effective_approved,
        coalesce(li.done_quantity, 0) as delivered_qty
      from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id
    loop
      if v_item.delivered_qty < v_item.effective_approved then
        v_has_returns := true;
        update public.logistics_shipment_items
        set returned_quantity = v_item.effective_approved - v_item.delivered_qty
        where id = v_item.item_id;

        select coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)
        into v_unit_price
        from public.order_line_items oli
        where oli.order_id = v_shipment.linked_order_id
          and lower(trim(oli.product_name)) = lower(trim(v_item.product_name))
        limit 1;

        v_total_returned_value := v_total_returned_value + ((v_item.effective_approved - v_item.delivered_qty) * coalesce(v_unit_price, 0));
        v_return_items := v_return_items || jsonb_build_object(
          'parent_item_id', v_item.item_id, 'product_id', v_item.product_id,
          'external_product_id', v_item.external_product_id, 'product_ref', v_item.product_ref,
          'product_name', v_item.product_name, 'requested_quantity', v_item.requested_quantity,
          'approved_quantity', v_item.effective_approved, 'delivered_quantity', v_item.delivered_qty,
          'returned_quantity', v_item.effective_approved - v_item.delivered_qty
        );
      else
        update public.logistics_shipment_items set returned_quantity = 0 where id = v_item.item_id;
      end if;
    end loop;

    if v_has_returns then
      insert into public.logistics_shipments (
        origin_ref, odoo_order_name, external_order_id, linked_order_id,
        customer_id, external_customer_id, customer_name, customer_phone,
        customer_latitude, customer_longitude,
        warehouse_id, external_warehouse_id, warehouse_name,
        warehouse_latitude, warehouse_longitude,
        logistics_user_id, assigned_profile_id, assigned_user_name,
        shipment_status, shipment_state, delivery_phase,
        parent_shipment_id, is_return_shipment, return_reference,
        total_gmv, notes, priority, scheduled_at, last_sync_at
      ) values (
        v_shipment.origin_ref, v_shipment.odoo_order_name, v_shipment.external_order_id, v_shipment.linked_order_id,
        v_shipment.customer_id, v_shipment.external_customer_id, v_shipment.customer_name, v_shipment.customer_phone,
        v_shipment.customer_latitude, v_shipment.customer_longitude,
        v_shipment.warehouse_id, v_shipment.external_warehouse_id, v_shipment.warehouse_name,
        v_shipment.warehouse_latitude, v_shipment.warehouse_longitude,
        v_shipment.logistics_user_id, null, null,
        'PENDING_ASSIGN', 'assigned', 'pending',
        p_shipment_id, true, 'R-' || v_shipment.origin_ref,
        v_total_returned_value, 'Auto-created return from delivery of shipment ' || v_shipment.shipment_reference,
        v_shipment.priority, current_date, timezone('utc', now())
      ) returning id into v_return_shipment_id;

      insert into public.logistics_delivery_plans (
        plan_reference, return_of_plan_id, logistics_user_id, planned_date, plan_status, notes
      ) values (
        'RET-' || v_shipment.origin_ref,
        v_shipment.plan_id,
        v_shipment.logistics_user_id, current_date, 'returned',
        'Return trip for shipment ' || v_shipment.origin_ref
      ) returning id into v_return_plan_id;

      update public.logistics_shipments set plan_id = v_return_plan_id where id = v_return_shipment_id;

      insert into public.logistics_return_shipment_items (
        return_shipment_id, parent_shipment_id, parent_item_id,
        product_id, external_product_id, product_ref, product_name,
        requested_quantity, approved_quantity, delivered_quantity, returned_quantity, return_reason
      )
      select v_return_shipment_id, p_shipment_id, (item->>'parent_item_id')::uuid,
        item->>'product_id', item->>'external_product_id', item->>'product_ref', item->>'product_name',
        (item->>'requested_quantity')::numeric, (item->>'approved_quantity')::numeric,
        (item->>'delivered_quantity')::numeric, (item->>'returned_quantity')::numeric,
        'driver_partial_delivery'
      from jsonb_array_elements(v_return_items) as item;

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_shipment.id, auth.uid(), 'delivered', 'return_created', 'Auto-created return shipment',
        jsonb_build_object('event_type', 'return_created', 'return_shipment_id', v_return_shipment_id,
          'return_plan_id', v_return_plan_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_return_shipment_id, auth.uid(), null, 'pending', 'Return shipment created from delivery',
        jsonb_build_object('parent_shipment_id', p_shipment_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));
    end if;

    select id into v_cogs_account from public.finance_accounts where code = '5010' and allow_posting = true limit 1;
    select id into v_revenue_account from public.finance_accounts where code = '4010' and allow_posting = true limit 1;

    select coalesce(sum(li.done_quantity * coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)), 0)
    into v_delivered_total
    from public.logistics_shipment_items li
    join public.order_line_items oli on oli.order_id = v_shipment.linked_order_id
      and lower(trim(oli.product_name)) = lower(trim(li.product_name))
    where li.shipment_id = p_shipment_id;

    if v_cogs_account is not null and v_revenue_account is not null and v_delivered_total > 0 then
      perform public.post_journal_entry(
        p_entry_date := current_date, p_source_type := 'delivery', p_source_id := v_shipment.linked_order_id,
        p_description := 'Auto journal: delivery of order ' || v_shipment.linked_order_id || ' (delivered qty)',
        p_lines := jsonb_build_array(
          jsonb_build_object('account_id', v_cogs_account, 'debit', v_delivered_total, 'credit', 0),
          jsonb_build_object('account_id', v_revenue_account, 'debit', 0, 'credit', v_delivered_total)));
    end if;

    if v_has_returns and v_total_returned_value > 0 then
      select id into v_savings_account from public.finance_accounts where code = '4030' and allow_posting = true limit 1;
      select id into v_ar_account from public.finance_accounts where code = '1013' and allow_posting = true limit 1;
      if v_savings_account is not null and v_ar_account is not null then
        perform public.post_journal_entry(
          p_entry_date := current_date, p_source_type := 'reversal', p_source_id := v_return_shipment_id,
          p_description := 'Auto credit note: returned goods from delivery ' || coalesce(v_shipment.shipment_reference, v_shipment.id::text),
          p_lines := jsonb_build_array(
            jsonb_build_object('account_id', v_savings_account, 'debit', v_total_returned_value, 'credit', 0),
            jsonb_build_object('account_id', v_ar_account, 'debit', 0, 'credit', v_total_returned_value)));
      end if;
    end if;
  end if;

  if v_shipment.linked_order_id is not null and v_next_status = 'DELIVERED' then
    update public.orders
    set delivery_status = 'full', status = 'delivered',
      delivered_at = coalesce(delivered_at, timezone('utc', now())), updated_at = timezone('utc', now())
    where id = v_shipment.linked_order_id;
  elsif v_shipment.linked_order_id is not null and v_next_status in ('FAILED', 'ATTEMPTED', 'CANCELLED') then
    update public.orders
    set delivery_status = lower(v_next_status), updated_at = timezone('utc', now())
    where id = v_shipment.linked_order_id;
  end if;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_update_shipment_phase(p_shipment_id uuid, p_next_phase text, p_note text DEFAULT NULL::text, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_proof_photo_path text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_current_phase text;
  v_next_phase text;
  v_completed_at timestamptz;
  v_cogs_account uuid;
  v_revenue_account uuid;
  v_line_total numeric(14,2);
  v_journal_lines jsonb;
  v_item record;
  v_return_shipment_id uuid;
  v_return_plan_id uuid;
  v_has_returns boolean := false;
  v_return_items jsonb := '[]'::jsonb;
  v_total_returned_value numeric(14,2) := 0;
  v_unit_price numeric(14,2);
  v_delivered_total numeric(14,2) := 0;
  v_savings_account uuid;
  v_ar_account uuid;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into v_shipment
  from public.logistics_shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if not public.is_management_role() and v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'You do not have access to update this shipment.';
  end if;

  v_current_phase := lower(coalesce(v_shipment.delivery_phase, 'pending'));
  v_next_phase := lower(trim(coalesce(p_next_phase, '')));

  if v_next_phase = '' then
    raise exception 'Next phase is required.';
  end if;

  if v_current_phase = v_next_phase then
    return v_shipment;
  end if;

  -- Transition guard (updated for arrived step)
  if v_current_phase in ('pending', 'ready') and v_next_phase not in ('in_transit', 'cancelled', 'failed') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;

  if v_current_phase = 'in_transit' and v_next_phase not in ('arrived_delivery', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %. Must arrive at customer before delivery.', v_current_phase, v_next_phase;
  end if;

  if v_current_phase = 'arrived_delivery' and v_next_phase not in ('delivered', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;

  if v_current_phase in ('failed', 'cancelled') and v_next_phase not in ('in_transit', 'arrived_delivery', 'delivered') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;

  v_completed_at :=
    case
      when v_next_phase in ('delivered', 'cancelled') then timezone('utc', now())
      else v_shipment.completed_at
    end;

  update public.logistics_shipments
  set
    delivery_phase = v_next_phase,
    shipment_state = case
      when v_next_phase = 'delivered' then 'done'
      when v_next_phase = 'cancelled' then 'cancel'
      when v_next_phase = 'failed' then 'exception'
      when v_next_phase in ('in_transit', 'arrived_delivery') then 'assigned'
      else shipment_state
    end,
    arrived_at_customer_at = case
      when v_next_phase = 'arrived_delivery' and v_shipment.arrived_at_customer_at is null
        then timezone('utc', now())
      else arrived_at_customer_at
    end,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes),
    completed_at = v_completed_at,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning *
  into v_shipment;

  insert into public.logistics_shipment_events (
    shipment_id,
    actor_profile_id,
    previous_phase,
    next_phase,
    note,
    proof_photo_path,
    location_lat,
    location_lng,
    payload
  )
  values (
    v_shipment.id,
    auth.uid(),
    v_current_phase,
    v_next_phase,
    nullif(trim(coalesce(p_note, '')), ''),
    nullif(trim(coalesce(p_proof_photo_path, '')), ''),
    p_location_lat,
    p_location_lng,
    coalesce(p_payload, '{}'::jsonb)
  );

  -- On delivery: validate all items confirmed, compute returns, create return shipment
  if v_next_phase = 'delivered' and v_shipment.linked_order_id is not null then
    -- Validate every item has done_quantity set (driver must confirm items)
    if exists (
      select 1
      from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id
        and li.done_quantity is null
    ) then
      raise exception 'All items must have confirmed delivered quantities before marking delivered.';
    end if;

    -- Denormalize approved_quantity from dispatcher preparations if not yet set
    update public.logistics_shipment_items li
    set approved_quantity = coalesce(li.approved_quantity, dp.approved_quantity)
    from public.dispatcher_plan_item_preparations dp
    join public.dispatcher_plan_preparations dpp on dpp.id = dp.plan_preparation_id
    join public.logistics_delivery_plans ldp on ldp.id = dpp.plan_id
    where li.shipment_id = p_shipment_id
      and li.approved_quantity is null
      and ldp.id = v_shipment.plan_id
      and lower(trim(dp.product_name)) = lower(trim(li.product_name));

    -- Compute returned_quantity per item and build return items payload
    for v_item in
      select
        li.id as item_id,
        li.product_id,
        li.external_product_id,
        li.product_ref,
        li.product_name,
        li.requested_quantity,
        coalesce(li.approved_quantity, li.requested_quantity) as effective_approved,
        coalesce(li.done_quantity, 0) as delivered_qty
      from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id
    loop
      if v_item.delivered_qty < v_item.effective_approved then
        v_has_returns := true;

        -- Update returned_quantity on the shipment item
        update public.logistics_shipment_items
        set returned_quantity = v_item.effective_approved - v_item.delivered_qty
        where id = v_item.item_id;

        -- Get unit price for value calculation
        select coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)
        into v_unit_price
        from public.order_line_items oli
        where oli.order_id = v_shipment.linked_order_id
          and lower(trim(oli.product_name)) = lower(trim(v_item.product_name))
        limit 1;

        v_total_returned_value := v_total_returned_value + ((v_item.effective_approved - v_item.delivered_qty) * coalesce(v_unit_price, 0));

        v_return_items := v_return_items || jsonb_build_object(
          'parent_item_id', v_item.item_id,
          'product_id', v_item.product_id,
          'external_product_id', v_item.external_product_id,
          'product_ref', v_item.product_ref,
          'product_name', v_item.product_name,
          'requested_quantity', v_item.requested_quantity,
          'approved_quantity', v_item.effective_approved,
          'delivered_quantity', v_item.delivered_qty,
          'returned_quantity', v_item.effective_approved - v_item.delivered_qty
        );
      else
        -- Fully delivered, no return
        update public.logistics_shipment_items
        set returned_quantity = 0
        where id = v_item.item_id;
      end if;

      -- Track delivered total for journal
      v_delivered_total := v_delivered_total + (v_item.delivered_qty * coalesce(v_unit_price, 0));
    end loop;

    -- Create return shipment if any returns exist
    if v_has_returns then
      -- Create the return shipment
      insert into public.logistics_shipments (
        origin_ref,
        odoo_order_name,
        external_order_id,
        linked_order_id,
        customer_id,
        external_customer_id,
        customer_name,
        customer_phone,
        customer_latitude,
        customer_longitude,
        warehouse_id,
        external_warehouse_id,
        warehouse_name,
        warehouse_latitude,
        warehouse_longitude,
        logistics_user_id,
        assigned_profile_id,
        assigned_user_name,
        shipment_status,
        shipment_state,
        delivery_phase,
        parent_shipment_id,
        is_return_shipment,
        return_reference,
        total_gmv,
        notes,
        priority,
        scheduled_at,
        last_sync_at
      ) values (
        v_shipment.origin_ref,
        v_shipment.odoo_order_name,
        v_shipment.external_order_id,
        v_shipment.linked_order_id,
        v_shipment.customer_id,
        v_shipment.external_customer_id,
        v_shipment.customer_name,
        v_shipment.customer_phone,
        v_shipment.customer_latitude,
        v_shipment.customer_longitude,
        v_shipment.warehouse_id,
        v_shipment.external_warehouse_id,
        v_shipment.warehouse_name,
        v_shipment.warehouse_latitude,
        v_shipment.warehouse_longitude,
        v_shipment.logistics_user_id,
        null,
        null,
        'PENDING_ASSIGN',
        'assigned',
        'pending',
        p_shipment_id,
        true,
        'R-' || v_shipment.origin_ref,
        v_total_returned_value,
        'Auto-created return from delivery of shipment ' || v_shipment.shipment_reference,
        v_shipment.priority,
        current_date,
        timezone('utc', now())
      )
      returning id into v_return_shipment_id;

      -- Create return-trip plan
      insert into public.logistics_delivery_plans (
        plan_reference,
        return_of_plan_id,
        logistics_user_id,
        planned_date,
        plan_status,
        notes
      ) values (
        'RET-' || v_shipment.origin_ref,
        v_shipment.plan_id,
        v_shipment.logistics_user_id,
        current_date,
        'returned',
        'Return trip for shipment ' || v_shipment.origin_ref
      )
      returning id into v_return_plan_id;

      -- Link return shipment to return plan
      update public.logistics_shipments
      set plan_id = v_return_plan_id
      where id = v_return_shipment_id;

      -- Insert return shipment items
      insert into public.logistics_return_shipment_items (
        return_shipment_id,
        parent_shipment_id,
        parent_item_id,
        product_id,
        external_product_id,
        product_ref,
        product_name,
        requested_quantity,
        approved_quantity,
        delivered_quantity,
        returned_quantity,
        return_reason
      )
      select
        v_return_shipment_id,
        p_shipment_id,
        (item->>'parent_item_id')::uuid,
        item->>'product_id',
        item->>'external_product_id',
        item->>'product_ref',
        item->>'product_name',
        (item->>'requested_quantity')::numeric,
        (item->>'approved_quantity')::numeric,
        (item->>'delivered_quantity')::numeric,
        (item->>'returned_quantity')::numeric,
        'driver_partial_delivery'
      from jsonb_array_elements(v_return_items) as item;

      -- Emit return-created event
      insert into public.logistics_shipment_events (
        shipment_id,
        actor_profile_id,
        previous_phase,
        next_phase,
        note,
        payload
      ) values (
        v_shipment.id,
        auth.uid(),
        'delivered',
        'return_created',
        'Auto-created return shipment',
        jsonb_build_object(
          'event_type', 'return_created',
          'return_shipment_id', v_return_shipment_id,
          'return_plan_id', v_return_plan_id,
          'returned_items', v_return_items,
          'total_returned_value', v_total_returned_value
        )
      );

      -- Also emit event on the return shipment
      insert into public.logistics_shipment_events (
        shipment_id,
        actor_profile_id,
        previous_phase,
        next_phase,
        note,
        payload
      ) values (
        v_return_shipment_id,
        auth.uid(),
        null,
        'pending',
        'Return shipment created from delivery',
        jsonb_build_object(
          'parent_shipment_id', p_shipment_id,
          'returned_items', v_return_items,
          'total_returned_value', v_total_returned_value
        )
      );
    end if;

    -- Auto-create journal entry on delivery (Dr COGS, Cr Revenue)
    -- Use delivered qty (not ordered qty) for accurate accounting
    select id into v_cogs_account
    from public.finance_accounts
    where code = '5010' and allow_posting = true
    limit 1;

    select id into v_revenue_account
    from public.finance_accounts
    where code = '4010' and allow_posting = true
    limit 1;

    -- Calculate delivered total from shipment items
    select coalesce(sum(li.done_quantity * coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)), 0)
    into v_delivered_total
    from public.logistics_shipment_items li
    join public.order_line_items oli on oli.order_id = v_shipment.linked_order_id
      and lower(trim(oli.product_name)) = lower(trim(li.product_name))
    where li.shipment_id = p_shipment_id;

    if v_cogs_account is not null and v_revenue_account is not null and v_delivered_total > 0 then
      v_journal_lines := jsonb_build_array(
        jsonb_build_object('account_id', v_cogs_account, 'debit', v_delivered_total, 'credit', 0),
        jsonb_build_object('account_id', v_revenue_account, 'debit', 0, 'credit', v_delivered_total)
      );

      perform public.post_journal_entry(
        p_entry_date := current_date,
        p_source_type := 'delivery',
        p_source_id := v_shipment.linked_order_id,
        p_description := 'Auto journal: delivery of order ' || v_shipment.linked_order_id || ' (delivered qty)',
        p_lines := v_journal_lines
      );
    end if;

    -- If there are returns, post a credit-note-style reversal (Dr Sales Returns, Cr AR)
    if v_has_returns and v_total_returned_value > 0 then
      select id into v_savings_account
      from public.finance_accounts
      where code = '4030' and allow_posting = true
      limit 1;

      select id into v_ar_account
      from public.finance_accounts
      where code = '1013' and allow_posting = true
      limit 1;

      if v_savings_account is not null and v_ar_account is not null then
        perform public.post_journal_entry(
          p_entry_date := current_date,
          p_source_type := 'reversal',
          p_source_id := v_return_shipment_id,
          p_description := 'Auto credit note: returned goods from delivery ' || coalesce(v_shipment.shipment_reference, v_shipment.id::text),
          p_lines := jsonb_build_array(
            jsonb_build_object('account_id', v_savings_account, 'debit', v_total_returned_value, 'credit', 0),
            jsonb_build_object('account_id', v_ar_account, 'debit', 0, 'credit', v_total_returned_value)
          )
        );
      end if;
    end if;
  end if;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.driver_update_shipment_phase(p_shipment_id uuid, p_next_phase text, p_note text DEFAULT NULL::text, p_proof_photo_path text DEFAULT NULL::text, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_current_phase text;
  v_next_phase text;
  v_completed_at timestamptz;
  v_cogs_account uuid;
  v_revenue_account uuid;
  v_line_total numeric(14,2);
  v_journal_lines jsonb;
  v_item record;
  v_return_shipment_id uuid;
  v_return_plan_id uuid;
  v_has_returns boolean := false;
  v_return_items jsonb := '[]'::jsonb;
  v_total_returned_value numeric(14,2) := 0;
  v_unit_price numeric(14,2);
  v_delivered_total numeric(14,2) := 0;
  v_savings_account uuid;
  v_ar_account uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Authentication required.'; end if;

  select * into v_shipment from public.logistics_shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found.'; end if;

  if not public.is_management_role() and v_shipment.assigned_profile_id <> auth.uid() then
    raise exception 'You do not have access to update this shipment.'; end if;

  v_current_phase := lower(coalesce(v_shipment.delivery_phase, 'pending'));
  v_next_phase := lower(trim(coalesce(p_next_phase, '')));

  if v_next_phase = '' then raise exception 'Next phase is required.'; end if;
  if v_current_phase = v_next_phase then return v_shipment; end if;

  -- Transition guard
  if v_current_phase in ('pending', 'ready') and v_next_phase not in ('in_transit', 'cancelled', 'failed') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase = 'in_transit' and v_next_phase not in ('arrived_delivery', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %. Must arrive at customer before delivery.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase = 'arrived_delivery' and v_next_phase not in ('delivered', 'failed', 'cancelled') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;
  if v_current_phase in ('failed', 'cancelled') and v_next_phase not in ('in_transit', 'arrived_delivery', 'delivered') then
    raise exception 'Invalid transition from % to %.', v_current_phase, v_next_phase;
  end if;

  v_completed_at := case
    when v_next_phase in ('delivered', 'cancelled') then timezone('utc', now())
    else v_shipment.completed_at
  end;

  update public.logistics_shipments set
    delivery_phase = v_next_phase,
    shipment_state = case
      when v_next_phase = 'delivered' then 'done'
      when v_next_phase = 'cancelled' then 'cancel'
      when v_next_phase = 'failed' then 'exception'
      when v_next_phase in ('in_transit', 'arrived_delivery') then 'assigned'
      else shipment_state
    end,
    arrived_at_customer_at = case
      when v_next_phase = 'arrived_delivery' and v_shipment.arrived_at_customer_at is null then timezone('utc', now())
      else arrived_at_customer_at
    end,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes),
    completed_at = v_completed_at,
    updated_at = timezone('utc', now())
  where id = p_shipment_id
  returning * into v_shipment;

  insert into public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note, proof_photo_path, location_lat, location_lng, payload
  ) values (
    v_shipment.id, auth.uid(), v_current_phase, v_next_phase,
    nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_proof_photo_path, '')), ''),
    p_location_lat, p_location_lng, coalesce(p_payload, '{}'::jsonb)
  );

  -- On delivery: validate all items confirmed, compute returns, create return shipment
  if v_next_phase = 'delivered' and v_shipment.linked_order_id is not null then
    if exists (
      select 1 from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id and li.done_quantity is null
    ) then
      raise exception 'All items must have confirmed delivered quantities before marking delivered.';
    end if;

    update public.logistics_shipment_items li
    set approved_quantity = coalesce(li.approved_quantity, dp.approved_quantity)
    from public.dispatcher_plan_item_preparations dp
    join public.dispatcher_plan_preparations dpp on dpp.id = dp.plan_preparation_id
    join public.logistics_delivery_plans ldp on ldp.id = dpp.plan_id
    where li.shipment_id = p_shipment_id
      and li.approved_quantity is null
      and ldp.id = v_shipment.plan_id
      and lower(trim(dp.product_name)) = lower(trim(li.product_name));

    for v_item in
      select li.id as item_id, li.product_id, li.external_product_id, li.product_ref, li.product_name,
        li.requested_quantity,
        coalesce(li.approved_quantity, li.requested_quantity) as effective_approved,
        coalesce(li.done_quantity, 0) as delivered_qty
      from public.logistics_shipment_items li
      where li.shipment_id = p_shipment_id
    loop
      if v_item.delivered_qty < v_item.effective_approved then
        v_has_returns := true;
        update public.logistics_shipment_items
        set returned_quantity = v_item.effective_approved - v_item.delivered_qty
        where id = v_item.item_id;

        select coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)
        into v_unit_price
        from public.order_line_items oli
        where oli.order_id = v_shipment.linked_order_id
          and lower(trim(oli.product_name)) = lower(trim(v_item.product_name))
        limit 1;

        v_total_returned_value := v_total_returned_value + ((v_item.effective_approved - v_item.delivered_qty) * coalesce(v_unit_price, 0));
        v_return_items := v_return_items || jsonb_build_object(
          'parent_item_id', v_item.item_id, 'product_id', v_item.product_id,
          'external_product_id', v_item.external_product_id, 'product_ref', v_item.product_ref,
          'product_name', v_item.product_name, 'requested_quantity', v_item.requested_quantity,
          'approved_quantity', v_item.effective_approved, 'delivered_quantity', v_item.delivered_qty,
          'returned_quantity', v_item.effective_approved - v_item.delivered_qty
        );
      else
        update public.logistics_shipment_items set returned_quantity = 0 where id = v_item.item_id;
      end if;
    end loop;

    if v_has_returns then
      insert into public.logistics_shipments (
        origin_ref, odoo_order_name,
        customer_id, external_customer_id, customer_name, customer_phone,
        customer_latitude, customer_longitude,
        warehouse_id, external_warehouse_id, warehouse_name,
        warehouse_latitude, warehouse_longitude,
        logistics_user_id, assigned_profile_id, assigned_user_name,
        shipment_status, shipment_state, delivery_phase,
        parent_shipment_id, is_return_shipment, return_reference,
        total_gmv, notes, priority, scheduled_at, last_sync_at
      ) values (
        v_shipment.origin_ref, v_shipment.odoo_order_name,
        v_shipment.customer_id, v_shipment.external_customer_id, v_shipment.customer_name, v_shipment.customer_phone,
        v_shipment.customer_latitude, v_shipment.customer_longitude,
        v_shipment.warehouse_id, v_shipment.external_warehouse_id, v_shipment.warehouse_name,
        v_shipment.warehouse_latitude, v_shipment.warehouse_longitude,
        v_shipment.logistics_user_id, null, null,
        'PENDING_ASSIGN', 'assigned', 'pending',
        p_shipment_id, true, 'R-' || v_shipment.origin_ref,
        v_total_returned_value, 'Auto-created return from delivery of shipment ' || v_shipment.shipment_reference,
        v_shipment.priority, current_date, timezone('utc', now())
      ) returning id into v_return_shipment_id;

      insert into public.logistics_delivery_plans (
        plan_reference, return_of_plan_id, logistics_user_id, planned_date, plan_status, notes
      ) values (
        'RET-' || v_shipment.origin_ref,
        v_shipment.plan_id,
        v_shipment.logistics_user_id, current_date, 'returned',
        'Return trip for shipment ' || v_shipment.origin_ref
      ) returning id into v_return_plan_id;

      update public.logistics_shipments set plan_id = v_return_plan_id where id = v_return_shipment_id;

      insert into public.logistics_return_shipment_items (
        return_shipment_id, parent_shipment_id, parent_item_id,
        product_id, external_product_id, product_ref, product_name,
        requested_quantity, approved_quantity, delivered_quantity, returned_quantity, return_reason
      )
      select v_return_shipment_id, p_shipment_id, (item->>'parent_item_id')::uuid,
        item->>'product_id', item->>'external_product_id', item->>'product_ref', item->>'product_name',
        (item->>'requested_quantity')::numeric, (item->>'approved_quantity')::numeric,
        (item->>'delivered_quantity')::numeric, (item->>'returned_quantity')::numeric,
        'driver_partial_delivery'
      from jsonb_array_elements(v_return_items) as item;

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_shipment.id, auth.uid(), 'delivered', 'return_created', 'Auto-created return shipment',
        jsonb_build_object('event_type', 'return_created', 'return_shipment_id', v_return_shipment_id,
          'return_plan_id', v_return_plan_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));

      insert into public.logistics_shipment_events (shipment_id, actor_profile_id, previous_phase, next_phase, note, payload)
      values (v_return_shipment_id, auth.uid(), null, 'pending', 'Return shipment created from delivery',
        jsonb_build_object('parent_shipment_id', p_shipment_id, 'returned_items', v_return_items, 'total_returned_value', v_total_returned_value));
    end if;

    select id into v_cogs_account from public.finance_accounts where code = '5010' and allow_posting = true limit 1;
    select id into v_revenue_account from public.finance_accounts where code = '4010' and allow_posting = true limit 1;

    select coalesce(sum(li.done_quantity * coalesce(oli.unit_price, oli.total_amount / nullif(oli.ordered_quantity, 0), 0)), 0)
    into v_delivered_total
    from public.logistics_shipment_items li
    join public.order_line_items oli on oli.order_id = v_shipment.linked_order_id
      and lower(trim(oli.product_name)) = lower(trim(li.product_name))
    where li.shipment_id = p_shipment_id;

    if v_cogs_account is not null and v_revenue_account is not null and v_delivered_total > 0 then
      perform public.post_journal_entry(
        p_entry_date := current_date, p_source_type := 'delivery', p_source_id := v_shipment.linked_order_id,
        p_description := 'Auto journal: delivery of order ' || v_shipment.linked_order_id || ' (delivered qty)',
        p_lines := jsonb_build_array(
          jsonb_build_object('account_id', v_cogs_account, 'debit', v_delivered_total, 'credit', 0),
          jsonb_build_object('account_id', v_revenue_account, 'debit', 0, 'credit', v_delivered_total)));
    end if;

    if v_has_returns and v_total_returned_value > 0 then
      select id into v_savings_account from public.finance_accounts where code = '4030' and allow_posting = true limit 1;
      select id into v_ar_account from public.finance_accounts where code = '1013' and allow_posting = true limit 1;
      if v_savings_account is not null and v_ar_account is not null then
        perform public.post_journal_entry(
          p_entry_date := current_date, p_source_type := 'reversal', p_source_id := v_return_shipment_id,
          p_description := 'Auto credit note: returned goods from delivery ' || coalesce(v_shipment.shipment_reference, v_shipment.id::text),
          p_lines := jsonb_build_array(
            jsonb_build_object('account_id', v_savings_account, 'debit', v_total_returned_value, 'credit', 0),
            jsonb_build_object('account_id', v_ar_account, 'debit', 0, 'credit', v_total_returned_value)));
      end if;
    end if;
  end if;

  return v_shipment;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fail_odoo_action(p_action_id uuid, p_error_message text DEFAULT NULL::text, p_odoo_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE odoo_pending_actions
  SET status = 'failed',
      error_message = p_error_message,
      odoo_response = p_odoo_response,
      retry_count = retry_count + 1
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'failed', jsonb_build_object(
    'event', 'failed',
    'error', p_error_message
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.finance_review_settlement(p_settlement_id uuid, p_approved boolean, p_finance_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_settlement RECORD;
  v_reviewer_id UUID;
BEGIN
  v_reviewer_id := auth.uid();
  IF v_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get settlement record
  SELECT * INTO v_settlement
  FROM logistics_route_settlements
  WHERE id = p_settlement_id;

  IF v_settlement IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  IF v_settlement.status != 'waiting_for_finance' THEN
    RAISE EXCEPTION 'Settlement is not pending review';
  END IF;

  -- Update settlement status
  UPDATE logistics_route_settlements
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      approved_by = v_reviewer_id,
      approved_at = now(),
      finance_notes = p_finance_notes,
      updated_at = now()
  WHERE id = p_settlement_id;

  -- If approved, mark cash balance as settled
  IF p_approved THEN
    UPDATE driver_cash_balance
    SET status = 'settled',
        settled_by = v_reviewer_id,
        settled_at = now(),
        updated_at = now()
    WHERE driver_id = v_settlement.driver_id
      AND route_plan_id = v_settlement.plan_id
      AND status IN ('handed_to_finance', 'sent_via_fawry');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', p_settlement_id,
    'approved', p_approved,
    'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
  );
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.force_logout_user(p_target_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can force logout users';
  end if;

  update public.profiles
  set
    force_logout_at = timezone('utc', now()),
    session_version = session_version + 1
  where id = p_target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Target user not found';
  end if;

  perform public.log_audit_event(
    'force_logout',
    'profile',
    v_profile.id,
    coalesce(p_reason, 'User forced to logout by admin'),
    jsonb_build_object('target_user_id', p_target_user_id)
  );

  return v_profile;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_all_kpi_actuals(p_date_from date, p_date_to date)
 RETURNS TABLE(kpi_code text, actual_value numeric, target_value numeric, department text, achieved boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_val numeric;
  v_tgt numeric;
  v_ach boolean;
  v_from timestamptz := p_date_from;
  v_to timestamptz := p_date_to + interval '1 day';
  v_prev_from timestamptz := p_date_from - (p_date_to - p_date_from);
  v_prev_to timestamptz := p_date_from;
  codes text[];
  tgts numeric[];
  depts text[];
  i int;
BEGIN

  -- SAL-01: Total Revenue
  v_tgt := 5000000;
  SELECT SUM(oli.total_amount) INTO v_val
  FROM kpi.order_line_items oli
  JOIN kpi.orders o ON o.id = oli.order_id
  WHERE o.created_at >= v_from AND o.created_at < v_to;
  IF v_val IS NULL THEN
    SELECT SUM(o.total_amount) INTO v_val FROM public.orders o
    WHERE o.created_at >= v_from AND o.created_at < v_to;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-01'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-02: Gross Profit Margin
  v_tgt := 25;
  SELECT CASE WHEN SUM(o.total_amount) > 0 THEN SUM(COALESCE(o.margin, 0)) / SUM(o.total_amount) * 100 ELSE NULL END
  INTO v_val FROM public.orders o WHERE o.created_at >= v_from AND o.created_at < v_to;
  IF v_val IS NULL THEN
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = 'SAL-02' AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-02'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-03: Sales Conversion Rate
  v_tgt := 30;
  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM public.orders WHERE created_at >= v_from AND created_at < v_to) AS order_cnt,
      GREATEST(
        (SELECT COUNT(*) FROM public.visits WHERE created_at >= v_from AND created_at < v_to) +
        (SELECT COUNT(*) FROM public.customer_interactions WHERE interaction_type = 'call' AND created_at >= v_from AND created_at < v_to),
        1
      ) AS interactions
  )
  SELECT CASE WHEN interactions > 0 THEN (order_cnt::numeric / interactions * 100) ELSE NULL END INTO v_val FROM stats;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-03'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-04: Average Order Value
  v_tgt := 5000;
  SELECT CASE WHEN COUNT(*) > 0 THEN SUM(total_amount) / COUNT(*) ELSE NULL END
  INTO v_val FROM public.orders WHERE created_at >= v_from AND created_at < v_to;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-04'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-05: Revenue Growth Rate
  v_tgt := 10;
  WITH curr AS (
    SELECT COALESCE(SUM(total_amount), 0) AS rev FROM public.orders WHERE created_at >= v_from AND created_at < v_to
  ), prev AS (
    SELECT COALESCE(SUM(total_amount), 0) AS rev FROM public.orders WHERE created_at >= v_prev_from AND created_at < v_prev_to
  )
  SELECT CASE WHEN prev.rev > 0 THEN ((curr.rev - prev.rev) / prev.rev * 100) ELSE NULL END INTO v_val FROM curr, prev;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-05'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-06: New Customer Acquisition
  v_tgt := 50;
  SELECT COUNT(*)::numeric INTO v_val FROM kpi.customers WHERE created_at >= v_from AND created_at < v_to;
  IF v_val IS NULL OR v_val = 0 THEN
    SELECT COUNT(DISTINCT customer_id)::numeric INTO v_val FROM public.orders
    WHERE created_at >= v_from AND created_at < v_to AND customer_id IS NOT NULL;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-06'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-07: Customer Retention Rate
  v_tgt := 70;
  WITH prev_cust AS (
    SELECT DISTINCT customer_id FROM public.orders WHERE created_at >= v_prev_from AND created_at < v_prev_to AND customer_id IS NOT NULL
  ), returned AS (
    SELECT DISTINCT customer_id FROM public.orders WHERE created_at >= v_from AND created_at < v_to AND customer_id IS NOT NULL
  )
  SELECT CASE WHEN (SELECT COUNT(*) FROM prev_cust) > 0
    THEN ((SELECT COUNT(*) FROM returned WHERE customer_id IN (SELECT customer_id FROM prev_cust))::numeric
          / (SELECT COUNT(*) FROM prev_cust) * 100) ELSE NULL END INTO v_val;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-07'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-08: Sales Target Achievement
  v_tgt := 100;
  v_val := NULL;
  SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
  WHERE ov.kpi_code = 'SAL-08' AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
  ORDER BY ov.computed_at DESC LIMIT 1;
  IF v_val IS NULL THEN
    SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
    WHERE kt.kpi_code = 'SAL-08' AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
  END IF;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-08'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- SAL-09: Customer Satisfaction Score
  v_tgt := 4.5;
  v_val := NULL;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-09'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  v_tgt := 500000;
  WITH rep_sales AS (
    SELECT COALESCE(o.assigned_user_id, p.id) AS user_id, SUM(o.total_amount) AS total
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE o.created_at >= v_from AND o.created_at < v_to
      AND COALESCE(o.assigned_user_id, p.id) IS NOT NULL
    GROUP BY 1
  )
  SELECT CASE WHEN COUNT(*) > 0 THEN SUM(total) / COUNT(*) ELSE NULL END INTO v_val FROM rep_sales;
  v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= v_tgt ELSE NULL END;
  kpi_code := 'SAL-10'; actual_value := v_val; target_value := v_tgt; department := 'Sales'; achieved := v_ach;
  RETURN NEXT;

  -- ===== NON-LIVE KPIs: use parallel arrays =====
  codes := ARRAY['PRO-01','PRO-02','PRO-03','PRO-04','PRO-05','PRO-06','PRO-07','PRO-08','PRO-09'];
  tgts  := ARRAY[8,7,2,90,5,95,100,80,2];
  depts := ARRAY['Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement','Procurement'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['FIN-01','FIN-02','FIN-03','FIN-04','FIN-05','FIN-06','FIN-07','FIN-08','FIN-09','FIN-10'];
  tgts  := ARRAY[5,30,98,5,90,100,100,14,3,100];
  depts := ARRAY['Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance','Accounting & Finance'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['WAR-01','WAR-02','WAR-03','WAR-04','WAR-05','WAR-06','WAR-07','WAR-08','WAR-09','WAR-10'];
  tgts  := ARRAY[98,99,8,1,2,4,85,50,3,0];
  depts := ARRAY['Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse','Warehouse'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['FLT-01','FLT-02','FLT-03','FLT-04','FLT-05','FLT-06','FLT-07','FLT-08'];
  tgts  := ARRAY[90,95,20,5,0.12,100,5,90];
  depts := ARRAY['Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet','Transportation & Fleet'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['DEL-01','DEL-02','DEL-03','DEL-04','DEL-05','DEL-06','DEL-07'];
  tgts  := ARRAY[95,90,4,4.5,25,3,100];
  depts := ARRAY['Delivery','Delivery','Delivery','Delivery','Delivery','Delivery','Delivery'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['QCS-01','QCS-02','QCS-03','QCS-04','QCS-05','QCS-06','QCS-07','QCS-08'];
  tgts  := ARRAY[4.5,50,24,70,95,90,90,100];
  depts := ARRAY['Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS','Quality & CS'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['BOD-01','BOD-02','BOD-03','BOD-04','BOD-05','BOD-06','BOD-07','BOD-08','BOD-09'];
  tgts  := ARRAY[70,500000,50,95,5,1000000,100,100,80];
  depts := ARRAY['Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD','Business Dev / OD'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['HR-01','HR-02','HR-03','HR-04','HR-05','HR-06','HR-07','HR-08','HR-09'];
  tgts  := ARRAY[5,21,90,95,100,100,100,4,4];
  depts := ARRAY['HR','HR','HR','HR','HR','HR','HR','HR','HR'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['ITD-01','ITD-02','ITD-03','ITD-04','ITD-05','ITD-06'];
  tgts  := ARRAY[99.5,8,99,20,95,4];
  depts := ARRAY['IT & Data','IT & Data','IT & Data','IT & Data','IT & Data','IT & Data'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

  codes := ARRAY['MKT-01','MKT-02','MKT-03','MKT-04','MKT-05'];
  tgts  := ARRAY[200,50,5,90,150];
  depts := ARRAY['Marketing','Marketing','Marketing','Marketing','Marketing'];
  FOR i IN 1..array_length(codes,1) LOOP
    SELECT ov.actual_value INTO v_val FROM kpi.odoo_values ov
    WHERE ov.kpi_code = codes[i] AND ov.period_start <= p_date_from AND ov.period_end >= p_date_to
    ORDER BY ov.computed_at DESC LIMIT 1;
    IF v_val IS NULL THEN
      SELECT kt.actual_value INTO v_val FROM kpi.kpi_tracking kt
      WHERE kt.kpi_code = codes[i] AND kt.tracking_month BETWEEN p_date_from AND p_date_to LIMIT 1;
    END IF;
    v_ach := CASE WHEN v_val IS NOT NULL THEN v_val >= tgts[i] ELSE NULL END;
    kpi_code := codes[i]; actual_value := v_val; target_value := tgts[i]; department := depts[i]; achieved := v_ach;
    RETURN NEXT;
  END LOOP;

END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ar_aging_report()
 RETURNS TABLE(customer_id uuid, customer_name text, total_outstanding numeric, current_amount numeric, days_30 numeric, days_60 numeric, days_90 numeric, over_90 numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role_permission('finance.view') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.customer_name,
    COALESCE(SUM(fi.total - COALESCE(
      (SELECT SUM(fp.amount) FROM public.finance_payments fp WHERE fp.invoice_id = fi.id AND fp.status = 'confirmed'), 0
    )), 0) AS total_outstanding,
    COALESCE(SUM(CASE WHEN fi.due_date >= current_date THEN fi.total ELSE 0 END), 0) AS current_amount,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date AND fi.due_date >= current_date - 30 THEN fi.total ELSE 0 END), 0) AS days_30,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 30 AND fi.due_date >= current_date - 60 THEN fi.total ELSE 0 END), 0) AS days_60,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 60 AND fi.due_date >= current_date - 90 THEN fi.total ELSE 0 END), 0) AS days_90,
    COALESCE(SUM(CASE WHEN fi.due_date < current_date - 90 THEN fi.total ELSE 0 END), 0) AS over_90
  FROM public.finance_invoices fi
  JOIN public.customers c ON c.id = fi.customer_id
  WHERE fi.status IN ('posted', 'partially_paid')
  GROUP BY c.id, c.customer_name
  HAVING COALESCE(SUM(fi.total - COALESCE(
    (SELECT SUM(fp.amount) FROM public.finance_payments fp WHERE fp.invoice_id = fi.id AND fp.status = 'confirmed'), 0
  )), 0) > 0
  ORDER BY total_outstanding DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_timeline(p_customer_id uuid)
 RETURNS TABLE(event_time timestamp with time zone, event_type text, title text, description text, actor_user_id uuid, actor_name text, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
  v_customer public.customers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  select *
  into v_customer
  from public.customers
  where id = p_customer_id;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  if v_role not in ('admin', 'manager', 'supervisor')
     and coalesce(v_customer.assigned_user_id, auth.uid()) <> auth.uid()
     and coalesce(v_customer.created_by, auth.uid()) <> auth.uid() then
    raise exception 'You do not have access to this customer timeline';
  end if;

  return query
  select
    ci.created_at as event_time,
    ci.interaction_type as event_type,
    ci.title,
    ci.description,
    ci.actor_user_id,
    p.full_name as actor_name,
    ci.metadata
  from public.customer_interactions ci
  left join public.profiles p on p.id = ci.actor_user_id
  where ci.customer_id = p_customer_id
  order by ci.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_scope_user uuid;
  v_month date;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    raise exception 'Authentication required';
  END IF;

  v_role := public.current_app_role();
  v_month := date_trunc('month', coalesce(p_date_to, current_date))::date;

  IF v_role IN ('sales_agent', 'telesales') THEN
    v_scope_user := auth.uid();
  ELSE
    v_scope_user := p_user_id;
  END IF;

  WITH
  visit_stats AS (
    SELECT
      count(*)::int AS visits,
      count(distinct customer_id)::int AS unique_customers,
      count(*) filter (where fraud_status = 'suspicious')::int AS suspicious_visits,
      count(*) filter (where fraud_status = 'fraudulent')::int AS fraudulent_visits
    FROM public.visits
    WHERE checked_in_at >= p_date_from::timestamp
      AND checked_in_at < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  ),
  call_stats AS (
    SELECT
      count(*)::int AS calls,
      count(*) filter (where public.is_reachable_call(call_outcome))::int AS reachable_calls
    FROM public.calls
    WHERE coalesce(completed_at, started_at, created_at) >= p_date_from::timestamp
      AND coalesce(completed_at, started_at, created_at) < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  ),
  order_stats AS (
    SELECT
      count(*)::int AS orders,
      coalesce(sum(total_amount), 0)::numeric(14,2) AS gmv
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE order_date >= p_date_from::timestamp
      AND order_date < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR COALESCE(o.assigned_user_id, p.id) = v_scope_user)
  ),
  quotation_stats AS (
    SELECT
      count(*)::int AS quotations
    FROM public.quotations
    WHERE generated_at >= p_date_from::timestamp
      AND generated_at < (p_date_to + 1)::timestamp
      AND (v_scope_user IS NULL OR created_by = v_scope_user)
  ),
  target_stats AS (
    SELECT
      coalesce(sum(target_visits), 0)::int AS target_visits,
      coalesce(sum(target_calls), 0)::int AS target_calls,
      coalesce(sum(target_reachability), 0)::numeric(8,2) AS target_reachability,
      coalesce(sum(target_gmv), 0)::numeric(14,2) AS target_gmv,
      coalesce(sum(target_quotations), 0)::int AS target_quotations
    FROM public.sales_targets
    WHERE target_month = v_month
      AND (v_scope_user IS NULL OR user_id = v_scope_user)
  )
  SELECT jsonb_build_object(
    'date_from', p_date_from,
    'date_to', p_date_to,
    'scope_user_id', v_scope_user,
    'visits', vs.visits,
    'unique_customers', vs.unique_customers,
    'suspicious_visits', vs.suspicious_visits,
    'fraudulent_visits', vs.fraudulent_visits,
    'calls', cs.calls,
    'reachable_calls', cs.reachable_calls,
    'reachability_rate',
      CASE
        WHEN cs.calls = 0 THEN 0
        ELSE round((cs.reachable_calls::numeric / cs.calls::numeric) * 100, 2)
      END,
    'orders', os.orders,
    'gmv', os.gmv,
    'quotations', qs.quotations,
    'targets', jsonb_build_object(
      'target_visits', ts.target_visits,
      'target_calls', ts.target_calls,
      'target_reachability', ts.target_reachability,
      'target_gmv', ts.target_gmv,
      'target_quotations', ts.target_quotations
    ),
    'notifications_unread', public.get_unread_notification_count()
  )
  INTO v_result
  FROM visit_stats vs, call_stats cs, order_stats os, quotation_stats qs, target_stats ts;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_fraud_overview(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, full_name text, total_visits bigint, suspicious_visits bigint, fraudulent_visits bigint, average_fraud_score numeric, fraud_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
  v_scope_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();
  if v_role in ('sales_agent', 'telesales') then
    v_scope_user := auth.uid();
  else
    v_scope_user := p_user_id;
  end if;

  return query
  select
    p.id,
    p.full_name,
    count(v.id)::bigint as total_visits,
    count(v.id) filter (where v.fraud_status = 'suspicious')::bigint as suspicious_visits,
    count(v.id) filter (where v.fraud_status = 'fraudulent')::bigint as fraudulent_visits,
    coalesce(avg(v.fraud_score), 0)::numeric(10,2) as average_fraud_score,
    case
      when count(v.id) = 0 then 0::numeric(8,2)
      else round((count(v.id) filter (where v.fraud_status in ('suspicious', 'fraudulent'))::numeric / count(v.id)::numeric) * 100, 2)
    end as fraud_rate
  from public.profiles p
  left join public.visits v
    on v.user_id = p.id
   and v.checked_in_at >= p_date_from::timestamp
   and v.checked_in_at < (p_date_to + 1)::timestamp
  where p.status = 'active'
    and (v_scope_user is null or p.id = v_scope_user)
  group by p.id, p.full_name
  order by fraudulent_visits desc, suspicious_visits desc, average_fraud_score desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_individual_kpi_per_agent(p_date_from date, p_date_to date)
 RETURNS TABLE(profile_id uuid, full_name text, role text, job_title text, department text, department_slug text, kpi_code text, kpi_name_en text, kpi_name_ar text, actual_value numeric, target_value numeric, unit text, weight numeric, frequency text, direction text)
 LANGUAGE sql
 STABLE
AS $function$
WITH
period AS (
  SELECT p_date_from::date AS f, p_date_to::date AS t
),
prior AS (
  SELECT (p.f - ((p.t - p.f) + 1))::date AS f, (p.f - 1)::date AS t
  FROM period p
),
wd AS (
  SELECT count(*)::numeric AS n
  FROM generate_series((SELECT f FROM period), (SELECT t FROM period), interval '1 day') d(day)
  WHERE extract(isodow FROM d.day) <= 5
),
excluded_profiles AS (
  SELECT p.id
  FROM public.profiles p
  WHERE p.job_title = 'test'
     OR p.email ILIKE '%test%'
     OR p.full_name ILIKE '%screenshot%'
     OR p.user_uid = 78 -- karim (admin): ignored
),
defs AS (
  SELECT * FROM (VALUES
    ('IND-TC-01','Tele-Sales Agent','Sales','sales','Calls Productivity','إنتاجية المكالمات','calls/day','Daily','Higher is Better',0.20,45),
    ('IND-TC-02','Tele-Sales Agent','Sales','sales','Order Conversion','تحويل المكالمات لأوردرات','%','Daily / Weekly','Higher is Better',0.25,25),
    ('IND-TC-03','Tele-Sales Agent','Sales','sales','Customer Retention','الحفاظ على العملاء','%','Monthly','Higher is Better',0.20,80),
    ('IND-TC-04','Tele-Sales Agent','Sales','sales','Reactivation','تنشيط العملاء النائمين','customers','Weekly','Higher is Better',0.15,5),
    ('IND-TC-05','Tele-Sales Agent','Sales','sales','Collection Follow-up Quality','جودة متابعة التحصيل','%','Weekly','Higher is Better',0.10,95),
    ('IND-TC-06','Tele-Sales Agent','Sales','sales','CRM Discipline','الالتزام بتسجيل النشاط','%','Daily','Higher is Better',0.10,95),
    ('IND-OS-01','Outdoor Sales Rep','Sales','sales','Visit Achievement','تحقيق الزيارات','visits/day','Daily','Higher is Better',0.20,15),
    ('IND-OS-02','Outdoor Sales Rep','Sales','sales','New Customers','عملاء جدد','customers','Weekly / Monthly','Higher is Better',0.20,10),
    ('IND-OS-03','Outdoor Sales Rep','Sales','sales','Sales Achievement','تحقيق المبيعات','%','Monthly','Higher is Better',0.25,100),
    ('IND-OS-04','Outdoor Sales Rep','Sales','sales','Conversion Rate','نسبة التحويل','%','Weekly','Higher is Better',0.15,25),
    ('IND-OS-05','Outdoor Sales Rep','Sales','sales','Collection Support','دعم التحصيل','%','Weekly','Higher is Better',0.10,95),
    ('IND-OS-06','Outdoor Sales Rep','Sales','sales','Customer Satisfaction','رضا العملاء','%','Monthly','Higher is Better',0.10,85),
    ('IND-DR-01','Driver / Delivery Rep','Delivery','delivery','On-Time Delivery','التسليم في الموعد','%','Daily','Higher is Better',0.25,90),
    ('IND-DR-02','Driver / Delivery Rep','Delivery','delivery','Delivered Orders','الطلبات المسلمة','orders/day','Daily','Higher is Better',0.20,20),
    ('IND-DR-03','Driver / Delivery Rep','Delivery','delivery','Cash Collection Accuracy','دقة تحصيل الكاش','%','Daily','Higher is Better',0.25,100),
    ('IND-DR-04','Driver / Delivery Rep','Delivery','delivery','Returned Orders','المرتجعات','%','Weekly','Lower is Better',0.10,3),
    ('IND-DR-05','Driver / Delivery Rep','Delivery','delivery','Vehicle/Route Discipline','الالتزام بخط السير','%','Daily','Higher is Better',0.10,90),
    ('IND-DR-06','Driver / Delivery Rep','Delivery','delivery','Customer Rating','تقييم العميل','%','Weekly','Higher is Better',0.10,85),
    ('IND-WH-01','Warehouse Worker','Warehouse','warehouse','Picking Accuracy','دقة التجهيز','%','Daily','Higher is Better',0.35,98),
    ('IND-WH-02','Warehouse Worker','Warehouse','warehouse','Productivity','الإنتاجية','items/shift','Daily','Higher is Better',0.20,40),
    ('IND-WH-03','Warehouse Worker','Warehouse','warehouse','Damage Control','تقليل التالف','%','Weekly','Lower is Better',0.15,0.5),
    ('IND-WH-04','Warehouse Worker','Warehouse','warehouse','Receiving/Dispatch Discipline','الالتزام بالاستلام والصرف','%','Daily','Higher is Better',0.15,95),
    ('IND-WH-05','Warehouse Worker','Warehouse','warehouse','Attendance & Safety','الحضور والسلامة','%','Monthly','Higher is Better',0.15,95),
    ('IND-CS-01','Customer Service','Quality & CS','quality-customer-service','First Response Time','زمن أول استجابة','hours','Daily','Lower is Better',0.15,2),
    ('IND-CS-02','Customer Service','Quality & CS','quality-customer-service','Complaint Resolution Rate','معدل حل الشكاوى','%','Weekly','Higher is Better',0.20,90),
    ('IND-CS-03','Customer Service','Quality & CS','quality-customer-service','Complaint Resolution Time','وقت حل الشكوى','hours','Weekly','Lower is Better',0.15,24),
    ('IND-CS-04','Customer Service','Quality & CS','quality-customer-service','Closure Accuracy','دقة الإغلاق','%','Monthly','Higher is Better',0.10,95),
    ('IND-CS-05','Customer Service','Quality & CS','quality-customer-service','Complaint Recurrence Rate','نسبة تكرار الشكاوى','%','Monthly','Lower is Better',0.15,10),
    ('IND-CS-06','Customer Service','Quality & CS','quality-customer-service','Customer Satisfaction','رضا العملاء','%','Monthly','Higher is Better',0.25,85)
  ) AS d(kpi_code, role, department, department_slug, kpi_name_en, kpi_name_ar, unit, frequency, direction, weight, target_value)
),


tc_calls AS (
  SELECT c.user_id,
    count(*)::numeric AS calls,
    count(DISTINCT c.customer_id)::numeric AS called_customers,
    count(DISTINCT date_trunc('day', coalesce(c.completed_at, c.started_at, c.created_at)))::numeric AS active_days
  FROM public.calls c
  WHERE coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
    AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY c.user_id
),
odoo_activity AS (
  SELECT p.id AS profile_id,
    count(*) FILTER (WHERE o.activity_type_name = 'Call')::numeric AS odoo_calls,
    count(DISTINCT date_trunc('day', coalesce(o.odoo_created_at, o.created_at)))::numeric AS odoo_days
  FROM (SELECT * FROM public.odoo_crm_activity_reports WHERE user_id ~ '^[0-9]+$') o
  JOIN public.profiles p ON p.user_uid = o.user_id::integer
  WHERE coalesce(o.odoo_created_at, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.odoo_created_at, o.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY p.id
),
period_orders AS (
  SELECT DISTINCT o.customer_id
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
),
prior_orders AS (
  SELECT DISTINCT o.assigned_user_id, o.customer_id
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM prior)
    AND coalesce(o.order_date, o.created_at) < (SELECT f FROM period)
),
tc_retention AS (
  SELECT pp.assigned_user_id,
    count(DISTINCT pp.customer_id)::numeric AS prior_customers,
    count(DISTINCT CASE WHEN pe.customer_id IS NOT NULL THEN pp.customer_id END)::numeric AS retained
  FROM prior_orders pp
  LEFT JOIN period_orders pe ON pe.customer_id = pp.customer_id
  GROUP BY pp.assigned_user_id
),
reactivated AS (
  SELECT DISTINCT o.assigned_user_id, o.customer_id
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o2
      WHERE o2.customer_id = o.customer_id
        AND coalesce(o2.order_date, o2.created_at) >= (SELECT f FROM period) - interval '60 days'
        AND coalesce(o2.order_date, o2.created_at) < (SELECT f FROM period)
    )
),
tc_converted AS (
  SELECT DISTINCT c.user_id, c.customer_id
  FROM public.calls c
  JOIN period_orders pe ON pe.customer_id = c.customer_id
  WHERE c.user_id IS NOT NULL AND c.customer_id IS NOT NULL
    AND coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
    AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
),
due_customers AS (
  SELECT DISTINCT o.assigned_user_id AS owner_id, o.customer_id
  FROM public.order_invoice_documents i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.invoice_state = 'posted'
    AND i.payment_state IN ('not_paid','partial')
    AND (i.invoice_date <= (SELECT t FROM period) OR i.invoice_date IS NULL)
    AND o.assigned_user_id IS NOT NULL AND o.customer_id IS NOT NULL
),
followed_up AS (
  SELECT DISTINCT dc.owner_id, dc.customer_id
  FROM due_customers dc
  WHERE EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.customer_id = dc.customer_id
      AND coalesce(c.completed_at, c.started_at, c.created_at) >= (SELECT f FROM period)
      AND coalesce(c.completed_at, c.started_at, c.created_at) < (SELECT t FROM period) + interval '1 day'
  )
  OR EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.customer_id = dc.customer_id
      AND v.checked_in_at >= (SELECT f FROM period)
      AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
  )
),
tc_activity_days AS (
  SELECT user_id, count(*)::numeric AS active_days
  FROM (
    SELECT c.user_id, date_trunc('day', coalesce(c.completed_at, c.started_at, c.created_at)) AS day FROM public.calls c
    UNION
    SELECT v.user_id, date_trunc('day', v.checked_in_at) FROM public.visits v
    UNION
    SELECT p.id, date_trunc('day', coalesce(o.odoo_created_at, o.created_at))
    FROM (SELECT * FROM public.odoo_crm_activity_reports WHERE user_id ~ '^[0-9]+$') o
    JOIN public.profiles p ON p.user_uid = o.user_id::integer
  ) a
  WHERE a.day >= (SELECT f FROM period)
    AND a.day < (SELECT t FROM period) + interval '1 day'
  GROUP BY user_id
),
os_visits AS (
  SELECT v.user_id,
    count(*)::numeric AS visits,
    count(DISTINCT v.customer_id)::numeric AS visited_customers
  FROM public.visits v
  WHERE v.checked_in_at >= (SELECT f FROM period)
    AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY v.user_id
),
os_converted AS (
  SELECT DISTINCT v.user_id, v.customer_id
  FROM public.visits v
  JOIN period_orders pe ON pe.customer_id = v.customer_id
  WHERE v.user_id IS NOT NULL AND v.customer_id IS NOT NULL
    AND v.checked_in_at >= (SELECT f FROM period)
    AND v.checked_in_at < (SELECT t FROM period) + interval '1 day'
),
first_orders AS (
  SELECT DISTINCT ON (o.customer_id) o.customer_id, o.assigned_user_id,
         coalesce(o.order_date, o.created_at) AS first_order_at
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL AND o.assigned_user_id IS NOT NULL
  ORDER BY o.customer_id, coalesce(o.order_date, o.created_at)
),
os_new_customers AS (
  SELECT fo.assigned_user_id AS owner_id, count(*)::numeric AS new_customers
  FROM first_orders fo
  WHERE fo.first_order_at >= (SELECT f FROM period)
    AND fo.first_order_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY fo.assigned_user_id
),
os_sales AS (
  SELECT o.assigned_user_id, coalesce(sum(o.total_amount), 0)::numeric AS gmv
  FROM public.orders o
  WHERE o.assigned_user_id IS NOT NULL AND o.state = 'sale'
    AND coalesce(o.order_date, o.created_at) >= (SELECT f FROM period)
    AND coalesce(o.order_date, o.created_at) < (SELECT t FROM period) + interval '1 day'
  GROUP BY o.assigned_user_id
),
sales_targets_agg AS (
  SELECT user_id, coalesce(sum(target_gmv), 0)::numeric AS target_gmv
  FROM public.sales_targets
  WHERE target_month >= date_trunc('month', (SELECT f FROM period))::date
    AND target_month <= date_trunc('month', (SELECT t FROM period))::date
  GROUP BY user_id
),
dr_shipments AS (
  SELECT s.assigned_profile_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED'))::numeric AS delivered,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED')
                       AND (s.scheduled_at IS NULL OR s.completed_at <= s.scheduled_at))::numeric AS on_time,
    count(*) FILTER (WHERE s.shipment_status <> 'PENDING_ASSIGN')::numeric AS progressed
  FROM public.logistics_shipments s
  WHERE s.assigned_profile_id IS NOT NULL AND s.is_return_shipment IS NOT TRUE
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY s.assigned_profile_id
),
dr_returns AS (
  SELECT coalesce(r.assigned_profile_id, parent.assigned_profile_id) AS assigned_profile_id,
    count(*)::numeric AS returned
  FROM public.logistics_shipments r
  LEFT JOIN public.logistics_shipments parent ON parent.id = r.parent_shipment_id
  WHERE r.is_return_shipment IS TRUE
    AND r.created_at >= (SELECT f FROM period)
    AND r.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY 1
),
dr_collections AS (
  SELECT s.assigned_profile_id,
    sum(c.order_total)::numeric AS expected,
    sum(c.collected_amount)::numeric AS collected
  FROM public.logistics_order_collections c
  JOIN public.logistics_shipments s ON s.id::text = c.shipment_id
  WHERE c.payment_method = 'cash'
    AND c.collection_status IN ('collected','confirmed')
    AND c.created_at >= (SELECT f FROM period)
    AND c.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY s.assigned_profile_id
),
dr_overall AS (
  SELECT
    count(*)::numeric AS total,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED'))::numeric AS delivered,
    count(*) FILTER (WHERE s.shipment_status IN ('DELIVERED','FINISHED','SETTLED')
                       AND (s.scheduled_at IS NULL OR s.completed_at <= s.scheduled_at))::numeric AS on_time,
    count(*) FILTER (WHERE s.shipment_status <> 'PENDING_ASSIGN')::numeric AS progressed
  FROM public.logistics_shipments s
  WHERE s.assigned_profile_id IS NOT NULL AND s.is_return_shipment IS NOT TRUE
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
),
dr_returns_overall AS (
  SELECT count(*)::numeric AS returned
  FROM public.logistics_shipments r
  WHERE r.is_return_shipment IS TRUE
    AND r.created_at >= (SELECT f FROM period)
    AND r.created_at < (SELECT t FROM period) + interval '1 day'
),
dr_collections_overall AS (
  SELECT sum(c.order_total)::numeric AS expected,
    sum(c.collected_amount)::numeric AS collected
  FROM public.logistics_order_collections c
  JOIN public.logistics_shipments s ON s.id::text = c.shipment_id
  WHERE c.payment_method = 'cash'
    AND c.collection_status IN ('collected','confirmed')
    AND c.created_at >= (SELECT f FROM period)
    AND c.created_at < (SELECT t FROM period) + interval '1 day'
),
wh_picks AS (
  SELECT dp.dispatcher_profile_id,
    count(dpi.id)::numeric AS total_items,
    count(dpi.id) FILTER (WHERE dpi.status = 'ready')::numeric AS ready_items,
    count(dpi.id) FILTER (WHERE dpi.shortage_reason = 'damaged')::numeric AS damaged_items
  FROM public.dispatcher_plan_item_preparations dpi
  JOIN public.dispatcher_plan_preparations dp ON dp.id = dpi.plan_preparation_id
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND dpi.created_at >= (SELECT f FROM period)
    AND dpi.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
wh_dispatch AS (
  SELECT dp.dispatcher_profile_id,
    count(DISTINCT s.id)::numeric AS total_shipments,
    count(DISTINCT CASE WHEN r.parent_shipment_id IS NOT NULL THEN s.id END)::numeric AS returned_shipments
  FROM public.dispatcher_plan_preparations dp
  JOIN public.logistics_shipments s ON s.plan_id = dp.plan_id
  LEFT JOIN public.logistics_return_shipment_items r ON r.parent_shipment_id = s.id
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND s.shipment_status NOT IN ('PENDING_ASSIGN','CANCELLED')
    AND s.created_at >= (SELECT f FROM period)
    AND s.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
wh_preps AS (
  SELECT dp.dispatcher_profile_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE dp.completed_at IS NOT NULL AND dp.status <> 'cancelled')::numeric AS completed
  FROM public.dispatcher_plan_preparations dp
  WHERE dp.dispatcher_profile_id IS NOT NULL
    AND dp.created_at >= (SELECT f FROM period)
    AND dp.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY dp.dispatcher_profile_id
),
cs_tickets AS (
  SELECT t.created_by AS agent_id,
    count(*)::numeric AS total,
    count(*) FILTER (WHERE t.status = 'resolved')::numeric AS resolved,
    count(*) FILTER (WHERE t.closed_at IS NOT NULL)::numeric AS closed,
    count(DISTINCT t.customer_id)::numeric AS ticket_customers
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),
cs_repeat AS (
  SELECT t.created_by AS agent_id, count(DISTINCT t.customer_id)::numeric AS repeat_customers
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL AND t.customer_id IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by, t.customer_id
  HAVING count(*) > 1
),
cs_first_response AS (
  SELECT t.created_by AS agent_id,
    avg(EXTRACT(EPOCH FROM (c2.first_comment_at - t.created_at)) / 3600)::numeric AS first_response_hours
  FROM public.order_tickets t
  JOIN LATERAL (
    SELECT created_at AS first_comment_at
    FROM public.order_ticket_comments c
    WHERE c.ticket_id = t.id
    ORDER BY c.created_at
    LIMIT 1
  ) c2 ON true
  WHERE t.created_by IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),
cs_resolution AS (
  SELECT t.created_by AS agent_id,
    avg(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600)::numeric AS resolution_hours
  FROM public.order_tickets t
  WHERE t.created_by IS NOT NULL AND t.resolved_at IS NOT NULL
    AND t.created_at >= (SELECT f FROM period)
    AND t.created_at < (SELECT t FROM period) + interval '1 day'
  GROUP BY t.created_by
),

branch_telesales AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-TC-01' THEN round((tc_calls.calls + coalesce(odoo_activity.odoo_calls, 0)) / wd.n, 2)
      WHEN 'IND-TC-02' THEN round(
        (SELECT count(*)::numeric FROM tc_converted tc WHERE tc.user_id = p.id)
        / nullif(tc_calls.called_customers, 0) * 100, 2)
      WHEN 'IND-TC-03' THEN round(tr.retained / nullif(tr.prior_customers, 0) * 100, 2)
      WHEN 'IND-TC-04' THEN (SELECT count(*) FROM reactivated r WHERE r.assigned_user_id = p.id)::numeric
      WHEN 'IND-TC-05' THEN round(
        (SELECT count(DISTINCT fu.customer_id)::numeric FROM followed_up fu WHERE fu.owner_id = p.id)
        / nullif((SELECT count(DISTINCT dc.customer_id)::numeric FROM due_customers dc WHERE dc.owner_id = p.id), 0) * 100, 2)
      WHEN 'IND-TC-06' THEN round(tc_activity_days.active_days / wd.n * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN tc_calls ON tc_calls.user_id = p.id
  LEFT JOIN odoo_activity ON odoo_activity.profile_id = p.id
  LEFT JOIN tc_retention tr ON tr.assigned_user_id = p.id
  LEFT JOIN tc_activity_days ON tc_activity_days.user_id = p.id
  WHERE p.job_title = 'telesales' AND p.status = 'active' AND d.role = 'Tele-Sales Agent'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (tc_calls.user_id IS NOT NULL OR odoo_activity.profile_id IS NOT NULL)
),

branch_outdoor AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-OS-01' THEN round(os_visits.visits / wd.n, 2)
      WHEN 'IND-OS-02' THEN os_new_customers.new_customers
      WHEN 'IND-OS-03' THEN round(os_sales.gmv / nullif(sta.target_gmv, 0) * 100, 2)
      WHEN 'IND-OS-04' THEN round(
        (SELECT count(*)::numeric FROM os_converted oc WHERE oc.user_id = p.id)
        / nullif(os_visits.visited_customers, 0) * 100, 2)
      WHEN 'IND-OS-05' THEN round(
        (SELECT count(DISTINCT fu.customer_id)::numeric FROM followed_up fu WHERE fu.owner_id = p.id)
        / nullif((SELECT count(DISTINCT dc.customer_id)::numeric FROM due_customers dc WHERE dc.owner_id = p.id), 0) * 100, 2)
      WHEN 'IND-OS-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN os_visits ON os_visits.user_id = p.id
  LEFT JOIN os_new_customers ON os_new_customers.owner_id = p.id
  LEFT JOIN os_sales ON os_sales.assigned_user_id = p.id
  LEFT JOIN sales_targets_agg sta ON sta.user_id = p.id
  WHERE p.job_title = 'sales' AND p.status = 'active' AND d.role = 'Outdoor Sales Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (os_visits.user_id IS NOT NULL OR os_sales.assigned_user_id IS NOT NULL OR os_new_customers.owner_id IS NOT NULL)
),

branch_driver AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-DR-01' THEN round(ds.on_time / nullif(ds.delivered, 0) * 100, 2)
      WHEN 'IND-DR-02' THEN round(ds.delivered / wd.n, 2)
      WHEN 'IND-DR-03' THEN round(dc.collected / nullif(dc.expected, 0) * 100, 2)
      WHEN 'IND-DR-04' THEN round(dr.returned / nullif(ds.delivered, 0) * 100, 2)
      WHEN 'IND-DR-05' THEN round(ds.progressed / nullif(ds.total, 0) * 100, 2)
      WHEN 'IND-DR-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN dr_shipments ds ON ds.assigned_profile_id = p.id
  LEFT JOIN dr_returns dr ON dr.assigned_profile_id = p.id
  LEFT JOIN dr_collections dc ON dc.assigned_profile_id = p.id
  WHERE p.job_title = 'driver' AND p.status = 'active' AND d.role = 'Driver / Delivery Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND NOT EXISTS (
      SELECT 1 FROM public.dispatcher_plan_item_preparations dpi2
      JOIN public.dispatcher_plan_preparations dp2 ON dp2.id = dpi2.plan_preparation_id
      WHERE dp2.dispatcher_profile_id = p.id
    )
    AND (ds.assigned_profile_id IS NOT NULL OR dr.assigned_profile_id IS NOT NULL OR dc.assigned_profile_id IS NOT NULL)
),
branch_driver_overall AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-DR-01' THEN round(dr_o.on_time / nullif(dr_o.delivered, 0) * 100, 2)
      WHEN 'IND-DR-02' THEN round(dr_o.delivered / wd.n, 2)
      WHEN 'IND-DR-03' THEN round(dr_co.collected / nullif(dr_co.expected, 0) * 100, 2)
      WHEN 'IND-DR-04' THEN round(dr_r.returned / nullif(dr_o.delivered, 0) * 100, 2)
      WHEN 'IND-DR-05' THEN round(dr_o.progressed / nullif(dr_o.total, 0) * 100, 2)
      WHEN 'IND-DR-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  CROSS JOIN dr_overall dr_o
  CROSS JOIN dr_returns_overall dr_r
  CROSS JOIN dr_collections_overall dr_co
  WHERE p.full_name = 'Hassan el sheikh' AND p.status = 'active' AND d.role = 'Driver / Delivery Rep'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),

branch_warehouse_dispatcher AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-WH-01' THEN round(
        (wh_dispatch.total_shipments - coalesce(wh_dispatch.returned_shipments, 0))
        / nullif(wh_dispatch.total_shipments, 0) * 100, 2)
      WHEN 'IND-WH-02' THEN round(wp.total_items / wd.n, 2)
      WHEN 'IND-WH-03' THEN round(wp.damaged_items / nullif(wp.total_items, 0) * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN wh_picks wp ON wp.dispatcher_profile_id = p.id
  LEFT JOIN wh_dispatch ON wh_dispatch.dispatcher_profile_id = p.id
  WHERE p.status = 'active' AND d.role = 'Warehouse Worker' AND d.kpi_code IN ('IND-WH-01','IND-WH-02','IND-WH-03')
    AND p.job_title = 'driver' -- dispatcher role (mahmoud)
    AND EXISTS (
      SELECT 1 FROM public.dispatcher_plan_item_preparations dpi2
      JOIN public.dispatcher_plan_preparations dp2 ON dp2.id = dpi2.plan_preparation_id
      WHERE dp2.dispatcher_profile_id = p.id
        AND dpi2.created_at >= (SELECT f FROM period)
        AND dpi2.created_at < (SELECT t FROM period) + interval '1 day'
    )
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),
branch_warehouse_plans AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-WH-04' THEN round(wp2.completed / nullif(wp2.total, 0) * 100, 2)
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN wh_preps wp2 ON wp2.dispatcher_profile_id = p.id
  WHERE p.status = 'active' AND d.role = 'Warehouse Worker' AND d.kpi_code = 'IND-WH-04'
    AND p.job_title = 'logistics spv' -- plan creator (Hassan el sheikh)
    AND EXISTS (
      SELECT 1 FROM public.dispatcher_plan_preparations dp2
      WHERE dp2.dispatcher_profile_id = p.id
        AND dp2.created_at >= (SELECT f FROM period)
        AND dp2.created_at < (SELECT t FROM period) + interval '1 day'
    )
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
),

branch_customer_service AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    d.role,
    p.job_title,
    d.department,
    d.department_slug,
    d.kpi_code,
    d.kpi_name_en,
    d.kpi_name_ar,
    CASE d.kpi_code
      WHEN 'IND-CS-01' THEN round(cs_fr.first_response_hours, 2)
      WHEN 'IND-CS-02' THEN round(cs_t.resolved / nullif(cs_t.total, 0) * 100, 2)
      WHEN 'IND-CS-03' THEN round(cs_r2.resolution_hours, 2)
      WHEN 'IND-CS-04' THEN round(cs_t.closed / nullif(cs_t.resolved, 0) * 100, 2)
      WHEN 'IND-CS-05' THEN round(
        (SELECT coalesce(sum(rc.repeat_customers), 0)::numeric FROM cs_repeat rc WHERE rc.agent_id = p.id)
        / nullif(cs_t.ticket_customers, 0) * 100, 2)
      WHEN 'IND-CS-06' THEN NULL
    END AS actual_value,
    d.target_value,
    d.unit,
    d.weight,
    d.frequency,
    d.direction
  FROM public.profiles p
  CROSS JOIN defs d
  CROSS JOIN wd
  LEFT JOIN cs_tickets cs_t ON cs_t.agent_id = p.id
  LEFT JOIN cs_first_response cs_fr ON cs_fr.agent_id = p.id
  LEFT JOIN cs_resolution cs_r2 ON cs_r2.agent_id = p.id
  WHERE p.job_title ILIKE 'customer service%' AND p.status = 'active' AND d.role = 'Customer Service'
    AND p.id NOT IN (SELECT id FROM excluded_profiles)
    AND (cs_t.agent_id IS NOT NULL)
)

SELECT * FROM branch_telesales
UNION ALL
SELECT * FROM branch_outdoor
UNION ALL
SELECT * FROM branch_driver
UNION ALL
SELECT * FROM branch_driver_overall
UNION ALL
SELECT * FROM branch_warehouse_dispatcher
UNION ALL
SELECT * FROM branch_warehouse_plans
UNION ALL
SELECT * FROM branch_customer_service
ORDER BY department_slug, role, full_name, kpi_code;
$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_date_from date DEFAULT (CURRENT_DATE - 30), p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(user_id uuid, full_name text, email citext, role app_role, total_visits bigint, total_calls bigint, reachability_rate numeric, total_orders bigint, total_gmv numeric, total_quotations bigint, suspicious_visits bigint, fraudulent_visits bigint, target_visits integer, target_calls integer, target_reachability numeric, target_gmv numeric, target_quotations integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month date;
BEGIN
  IF auth.uid() IS NULL THEN
    raise exception 'Authentication required';
  END IF;

  v_month := date_trunc('month', coalesce(p_date_to, current_date))::date;

  RETURN QUERY
  WITH
  visit_stats AS (
    SELECT
      v.user_id,
      count(*)::bigint AS total_visits,
      count(*) filter (where v.fraud_status = 'suspicious')::bigint AS suspicious_visits,
      count(*) filter (where v.fraud_status = 'fraudulent')::bigint AS fraudulent_visits
    FROM public.visits v
    WHERE v.checked_in_at >= p_date_from::timestamp
      AND v.checked_in_at < (p_date_to + 1)::timestamp
    GROUP BY v.user_id
  ),
  call_stats AS (
    SELECT
      c.user_id,
      count(*)::bigint AS total_calls,
      count(*) filter (where public.is_reachable_call(c.call_outcome))::bigint AS reachable_calls
    FROM public.calls c
    WHERE coalesce(c.completed_at, c.started_at, c.created_at) >= p_date_from::timestamp
      AND coalesce(c.completed_at, c.started_at, c.created_at) < (p_date_to + 1)::timestamp
    GROUP BY c.user_id
  ),
  order_stats AS (
    SELECT
      COALESCE(o.assigned_user_id, p.id) AS user_id,
      count(*)::bigint AS total_orders,
      coalesce(sum(o.total_amount), 0)::numeric(14,2) AS total_gmv
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
    WHERE COALESCE(o.assigned_user_id, p.id) IS NOT NULL
      AND o.order_date >= p_date_from::timestamp
      AND o.order_date < (p_date_to + 1)::timestamp
    GROUP BY 1
  ),
  quotation_stats AS (
    SELECT
      q.created_by AS user_id,
      count(*)::bigint AS total_quotations
    FROM public.quotations q
    WHERE q.generated_at >= p_date_from::timestamp
      AND q.generated_at < (p_date_to + 1)::timestamp
    GROUP BY q.created_by
  ),
  target_stats AS (
    SELECT
      t.user_id,
      t.target_visits,
      t.target_calls,
      t.target_reachability,
      t.target_gmv,
      t.target_quotations
    FROM public.sales_targets t
    WHERE t.target_month = v_month
  )
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    coalesce(vs.total_visits, 0),
    coalesce(cs.total_calls, 0),
    CASE
      WHEN coalesce(cs.total_calls, 0) = 0 THEN 0::numeric(8,2)
      ELSE round((coalesce(cs.reachable_calls, 0)::numeric / cs.total_calls::numeric) * 100, 2)
    END,
    coalesce(os.total_orders, 0),
    coalesce(os.total_gmv, 0)::numeric(14,2),
    coalesce(qs.total_quotations, 0),
    coalesce(vs.suspicious_visits, 0),
    coalesce(vs.fraudulent_visits, 0),
    coalesce(ts.target_visits, 0),
    coalesce(ts.target_calls, 0),
    coalesce(ts.target_reachability, 0)::numeric(8,2),
    coalesce(ts.target_gmv, 0)::numeric(14,2),
    coalesce(ts.target_quotations, 0)
  FROM public.profiles p
  LEFT JOIN visit_stats vs ON vs.user_id = p.id
  LEFT JOIN call_stats cs ON cs.user_id = p.id
  LEFT JOIN order_stats os ON os.user_id = p.id
  LEFT JOIN quotation_stats qs ON qs.user_id = p.id
  LEFT JOIN target_stats ts ON ts.user_id = p.id
  WHERE p.status = 'active'
  ORDER BY coalesce(os.total_gmv, 0) DESC, coalesce(vs.total_visits, 0) DESC, p.full_name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_odoo_action_audit_log(p_action_id uuid)
 RETURNS TABLE(id uuid, status odoo_action_status, user_id uuid, user_name text, details jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.status,
    l.user_id,
    COALESCE(p.full_name, p.email, 'System')::TEXT AS user_name,
    l.details,
    l.created_at
  FROM odoo_pending_action_audit_log l
  LEFT JOIN profiles p ON p.id = l.user_id
  WHERE l.action_id = p_action_id
  ORDER BY l.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_odoo_action_counts()
 RETURNS TABLE(status odoo_action_status, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.status,
    COUNT(*) AS count
  FROM odoo_pending_actions a
  WHERE a.created_at >= (now() - INTERVAL '30 days')
  GROUP BY a.status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_delivery_reconciliation(p_order_id uuid)
 RETURNS TABLE(product_name text, ordered_qty numeric, delivered_qty numeric, remaining_qty numeric, delivery_status text)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT
    oli.product_name,
    oli.ordered_quantity AS ordered_qty,
    COALESCE(SUM(
      greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)
    ), 0) AS delivered_qty,
    oli.ordered_quantity - COALESCE(SUM(
      greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)
    ), 0) AS remaining_qty,
    CASE
      WHEN COALESCE(SUM(greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)), 0) >= oli.ordered_quantity THEN 'complete'
      WHEN COALESCE(SUM(greatest(coalesce(nullif(item.done_quantity, 0), item.requested_quantity, 0), 0)), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END AS delivery_status
  FROM public.order_line_items oli
  LEFT JOIN public.logistics_shipment_items item
    ON item.external_product_id = oli.external_product_id
    AND item.shipment_id IN (
      SELECT id FROM public.logistics_shipments WHERE linked_order_id = p_order_id
    )
  WHERE oli.order_id = p_order_id
  GROUP BY oli.id, oli.product_name, oli.ordered_quantity
  ORDER BY oli.sort_order;
$function$;

CREATE OR REPLACE FUNCTION public.get_orders_with_details(p_status text DEFAULT NULL::text, p_assigned_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_odoo_user_id text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Resolve the caller's odoo_user_id for user_id fallback
  SELECT odoo_user_id INTO v_odoo_user_id FROM public.profiles WHERE id = auth.uid();

  SELECT jsonb_build_object(
    'orders', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'external_order_id', o.external_order_id,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'status', o.status,
        'delivery_status', o.delivery_status,
        'total_amount', o.total_amount,
        'order_date', o.order_date,
        'odoo_order_name', o.odoo_order_name,
        'assigned_user_id', o.assigned_user_id,
        'user_id', o.user_id,
        'line_items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', oli.id,
            'product_name', oli.product_name,
            'ordered_quantity', oli.ordered_quantity,
            'delivered_quantity', oli.delivered_quantity,
            'unit_price', oli.unit_price,
            'total_amount', oli.total_amount
          ))
          FROM public.order_line_items oli WHERE oli.order_id = o.id
        ), '[]'::jsonb),
        'shipments', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ls.id,
            'shipment_reference', ls.shipment_reference,
            'delivery_phase', ls.delivery_phase,
            'assigned_user_name', ls.assigned_user_name,
            'scheduled_at', ls.scheduled_at
          ))
          FROM public.logistics_shipments ls WHERE ls.linked_order_id = o.id
        ), '[]'::jsonb)
      )
    ), '[]'::jsonb),
    'total_count', (SELECT count(*) FROM public.orders o2
      LEFT JOIN public.profiles p2 ON p2.odoo_user_id = o2.user_id
      WHERE (p_status IS NULL OR o2.status = p_status)
        AND (p_assigned_user_id IS NULL OR COALESCE(o2.assigned_user_id, p2.id) = p_assigned_user_id))
  ) INTO v_result
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.odoo_user_id = o.user_id
  WHERE (p_status IS NULL OR o.status = p_status)
    AND (p_assigned_user_id IS NULL OR COALESCE(o.assigned_user_id, p.id) = p_assigned_user_id)
  ORDER BY o.order_date DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_rep_route_summary(p_user_id uuid, p_date_from date DEFAULT CURRENT_DATE, p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(user_id uuid, total_tracking_points bigint, total_distance_meters numeric, total_visits bigint, unique_customers bigint, avg_visit_duration_minutes numeric, suspicious_visits bigint, fraudulent_visits bigint, first_point_at timestamp with time zone, last_point_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  if v_role in ('sales_agent', 'telesales') and p_user_id <> auth.uid() then
    raise exception 'You cannot inspect another user''s route summary';
  end if;

  return query
  with ordered_points as (
    select
      lt.*,
      lag(lt.lat) over (partition by lt.user_id order by lt.captured_at) as prev_lat,
      lag(lt.lng) over (partition by lt.user_id order by lt.captured_at) as prev_lng
    from public.location_tracking lt
    where lt.user_id = p_user_id
      and lt.captured_at >= p_date_from::timestamp
      and lt.captured_at < (p_date_to + 1)::timestamp
  ),
  tracking_stats as (
    select
      p_user_id as user_id,
      count(*)::bigint as total_tracking_points,
      coalesce(sum(
        case
          when prev_lat is null or prev_lng is null then 0
          else public.calculate_haversine_meters(prev_lat, prev_lng, lat, lng)
        end
      ), 0)::numeric(14,2) as total_distance_meters,
      min(captured_at) as first_point_at,
      max(captured_at) as last_point_at
    from ordered_points
  ),
  visit_stats as (
    select
      count(*)::bigint as total_visits,
      count(distinct customer_id)::bigint as unique_customers,
      avg(
        case
          when started_at is not null and completed_at is not null
          then extract(epoch from (completed_at - started_at)) / 60.0
          else null
        end
      )::numeric(10,2) as avg_visit_duration_minutes,
      count(*) filter (where fraud_status = 'suspicious')::bigint as suspicious_visits,
      count(*) filter (where fraud_status = 'fraudulent')::bigint as fraudulent_visits
    from public.visits
    where user_id = p_user_id
      and checked_in_at >= p_date_from::timestamp
      and checked_in_at < (p_date_to + 1)::timestamp
  )
  select
    ts.user_id,
    ts.total_tracking_points,
    ts.total_distance_meters,
    coalesce(vs.total_visits, 0),
    coalesce(vs.unique_customers, 0),
    coalesce(vs.avg_visit_duration_minutes, 0),
    coalesce(vs.suspicious_visits, 0),
    coalesce(vs.fraudulent_visits, 0),
    ts.first_point_at,
    ts.last_point_at
  from tracking_stats ts
  cross join visit_stats vs;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_rep_route_visits(p_user_id uuid, p_date_from date DEFAULT CURRENT_DATE, p_date_to date DEFAULT CURRENT_DATE)
 RETURNS TABLE(visit_id uuid, checked_in_at timestamp with time zone, customer_id uuid, customer_name text, lat double precision, lng double precision, visit_result text, fraud_score numeric, fraud_status fraud_status, note text, linked_order_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_app_role();

  if v_role in ('sales_agent', 'telesales') and p_user_id <> auth.uid() then
    raise exception 'You cannot inspect another user''s route visits';
  end if;

  return query
  select
    v.id,
    v.checked_in_at,
    v.customer_id,
    c.customer_name,
    v.lat,
    v.lng,
    v.visit_result,
    v.fraud_score,
    v.fraud_status,
    v.note,
    v.linked_order_id
  from public.visits v
  left join public.customers c on c.id = v.customer_id
  where v.user_id = p_user_id
    and v.checked_in_at >= p_date_from::timestamp
    and v.checked_in_at < (p_date_to + 1)::timestamp
  order by v.checked_in_at asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::integer
  from public.notification_recipients nr
  where nr.user_id = auth.uid()
    and nr.read_at is null
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'sales_agent',
    'active',
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_logistics_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only create logistics_users if the new profile is a driver in the Logistics department
  IF NEW.role = 'driver' 
     AND NEW.department_id = '07b531a2-af74-4379-b739-e98b11720bef'
     AND NEW.status = 'active' THEN
    
    INSERT INTO logistics_users (
      employee_name,
      linked_profile_id,
      work_email,
      work_phone,
      mobile_phone,
      job_title,
      department_name,
      status,
      source,
      raw_payload,
      created_at,
      updated_at
    ) VALUES (
      NEW.full_name,
      NEW.id,
      NEW.email,
      NEW.phone,
      NEW.phone,
      NEW.job_title,
      'Logistics',
      'active',
      'profile_sync',
      jsonb_build_object(
        'profile_id', NEW.id,
        'role', NEW.role,
        'department_id', NEW.department_id
      ),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role_permission(p_permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.role_permission_assignments assignment
    join public.permission_catalog catalog
      on catalog.permission_key = assignment.permission_key
    where assignment.role = public.current_app_role()
      and assignment.permission_key = p_permission_key
      and catalog.is_active
  );
$function$;

CREATE OR REPLACE FUNCTION public.invoke_scheduled_edge_function(function_name text, payload jsonb DEFAULT NULL::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  project_url text;
  bearer_key text;
  sync_secret text;
  headers jsonb;
  request_id bigint;
begin
  if function_name not in (
    'customers-odoo',
    'orders-odoo',
    'products-odoo',
    'crm-odoo',
    'logistics-shipments-odoo',
    'logistics-users-odoo',
    'logistics-warehouse-odoo',
    'logistics-warehouses-odoo',
    'scrape-suplyd-shop',
    'kpi-odoo-query'
  ) then
    raise exception 'Unsupported scheduled Edge Function: %', function_name;
  end if;

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'sales_sync_project_url';

  select decrypted_secret
  into bearer_key
  from vault.decrypted_secrets
  where name = 'sales_sync_service_role_key';

  if bearer_key is null then
    select decrypted_secret
    into bearer_key
    from vault.decrypted_secrets
    where name = 'sales_sync_anon_key';
  end if;

  select decrypted_secret
  into sync_secret
  from vault.decrypted_secrets
  where name = 'sales_sync_edge_secret';

  if project_url is null then
    raise exception 'Missing vault secret sales_sync_project_url';
  end if;

  if bearer_key is null then
    raise exception 'Missing vault secret sales_sync_service_role_key or sales_sync_anon_key';
  end if;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || bearer_key
  );

  if sync_secret is not null then
    headers := headers || jsonb_build_object('x-sync-secret', sync_secret);
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_name,
    headers := headers,
    body := coalesce(payload, '{}'::jsonb)
  )
  into request_id;

  return request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.current_app_role() = 'admin', false)
$function$;

CREATE OR REPLACE FUNCTION public.is_management_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(public.current_app_role() in ('admin', 'manager', 'supervisor', 'dispatcher', 'spv'), false);
$function$;

CREATE OR REPLACE FUNCTION public.is_reachable_call(p_call_outcome text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_call_outcome is null then false
    when lower(p_call_outcome) like '%تم الوصول%' then true
    when lower(p_call_outcome) like '%answered%' then true
    when lower(p_call_outcome) like '%connected%' then true
    when lower(p_call_outcome) like '%reached%' then true
    else false
  end
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action_type text, p_entity_type text, p_entity_id uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_audit_id uuid;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  )
  values (
    auth.uid(),
    v_profile.email,
    v_profile.role,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_admin_required()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role_permission('logistics.manage') then
    raise exception 'Only logistics management users can perform this action.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_assert_plan_shipments_have_items(p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_shipment record;
begin
  for v_shipment in
    select shipment.id as shipment_id, shipment.linked_order_id
    from public.logistics_shipments shipment
    where shipment.plan_id = p_plan_id
      and coalesce(shipment.shipment_status, '') not in ('DELIVERED', 'CANCELLED', 'FAILED')
      and not exists (
        select 1
        from public.logistics_shipment_items item
        where item.shipment_id = shipment.id
      )
  loop
    if v_shipment.linked_order_id is not null then
      perform public.sync_logistics_shipment_items_from_order(
        v_shipment.shipment_id,
        v_shipment.linked_order_id
      );
    end if;
  end loop;

  if exists (
    select 1
    from public.logistics_shipments shipment
    where shipment.plan_id = p_plan_id
      and coalesce(shipment.shipment_status, '') not in ('DELIVERED', 'CANCELLED', 'FAILED')
      and shipment.linked_order_id is null
      and not exists (
        select 1
        from public.logistics_shipment_items item
        where item.shipment_id = shipment.id
      )
  ) then
    raise exception 'Some shipments have no linked order and no items. Link the order first.'
      using errcode = 'P0001';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_canonical_driver_phase(p_delivery_phase text, p_shipment_status text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  with phases as (
    select
      lower(trim(nullif(coalesce(p_delivery_phase, ''), ''))) as delivery_phase,
      public.logistics_delivery_phase_from_status(p_shipment_status) as status_phase
  )
  select case
    when status_phase is null then coalesce(delivery_phase, 'pending')
    when delivery_phase is null then status_phase
    when public.logistics_driver_phase_rank(status_phase) >= public.logistics_driver_phase_rank(delivery_phase)
      then status_phase
    else delivery_phase
  end
  from phases;
$function$;

CREATE OR REPLACE FUNCTION private.logistics_complete_plan_if_shipments_delivered(p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if p_plan_id is null then
    return;
  end if;

  update public.logistics_delivery_plans as plan
  set
    plan_status = 'completed',
    finished_at = coalesce(plan.finished_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where plan.id = p_plan_id
    and plan.plan_status in ('pending', 'in_progress')
    and exists (
      select 1
      from public.logistics_shipments as shipment
      where shipment.plan_id = plan.id
    )
    and not exists (
      select 1
      from public.logistics_shipments as shipment
      where shipment.plan_id = plan.id
        and coalesce(shipment.shipment_status, 'PENDING_ASSIGN')
          not in ('DELIVERED', 'FINISHED', 'SETTLED')
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_delivery_phase_from_status(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case upper(trim(coalesce(p_value, '')))
    when 'PENDING_ASSIGN' then 'pending'
    when 'ASSIGNED' then 'assigned'
    when 'CHECK_IN' then 'arrived_pickup'
    when 'PICKUP' then 'picked_up'
    when 'OUT_FOR_DELIVERY' then 'in_transit'
    when 'ARRIVED' then 'arrived_delivery'
    when 'DELIVERED' then 'delivered'
    when 'FINISHED' then 'finished'
    when 'SETTLED' then 'settled'
    when 'CANCELLED' then 'cancelled'
    when 'FAILED' then 'failed'
    when 'ATTEMPTED' then 'attempted'
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_distance_km(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null
    else 6371 * 2 * asin(
      sqrt(
        power(sin(radians((p_lat2 - p_lat1) / 2)), 2) +
        cos(radians(p_lat1)) * cos(radians(p_lat2)) *
        power(sin(radians((p_lng2 - p_lng1) / 2)), 2)
      )
    )
  end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_driver_phase_rank(p_value text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case lower(trim(coalesce(p_value, '')))
    when 'pending' then 0
    when 'ready' then 0
    when 'ready_for_pickup' then 0
    when 'assigned' then 1
    when 'accepted' then 1
    when 'arrived_pickup' then 2
    when 'check_in' then 2
    when 'picked_up' then 3
    when 'in_transit' then 4
    when 'out_for_delivery' then 4
    when 'arrived_delivery' then 5
    when 'delivered' then 6
    when 'finished' then 7
    when 'settled' then 8
    when 'attempted' then 9
    when 'failed' then 9
    when 'cancelled' then 9
    else -1
  end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_hydrate_shipment_route_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_default_warehouse_latitude constant double precision := 30.1592333;
  v_default_warehouse_longitude constant double precision := 31.357159;
  v_order_customer_id uuid;
  v_order_external_order_id text;
  v_order_name text;
  v_order_customer_name text;
  v_order_warehouse_ref text;
  v_customer_id uuid;
  v_customer_external_id text;
  v_customer_name text;
  v_customer_latitude double precision;
  v_customer_longitude double precision;
  v_warehouse public.logistics_warehouses%rowtype;
  v_warehouse_ref text;
begin
  if new.linked_order_id is not null then
    select
      sales_order.customer_id,
      sales_order.external_order_id,
      sales_order.odoo_order_name,
      sales_order.customer_name,
      sales_order.warehouse_id
    into
      v_order_customer_id,
      v_order_external_order_id,
      v_order_name,
      v_order_customer_name,
      v_order_warehouse_ref
    from public.orders as sales_order
    where sales_order.id = new.linked_order_id;

    new.customer_id := coalesce(new.customer_id, v_order_customer_id);
    new.external_order_id := coalesce(new.external_order_id, v_order_external_order_id);
    new.odoo_order_name := coalesce(new.odoo_order_name, v_order_name);
    new.customer_name := coalesce(new.customer_name, v_order_customer_name);
    new.external_warehouse_id := coalesce(new.external_warehouse_id, v_order_warehouse_ref);
    new.warehouse_name := coalesce(new.warehouse_name, v_order_warehouse_ref);
  end if;

  if new.customer_id is not null then
    select
      customer.id,
      customer.external_customer_id,
      customer.customer_name,
      customer.lat,
      customer.lng
    into
      v_customer_id,
      v_customer_external_id,
      v_customer_name,
      v_customer_latitude,
      v_customer_longitude
    from public.customers as customer
    where customer.id = new.customer_id;
  elsif nullif(trim(coalesce(new.external_customer_id, '')), '') is not null then
    select
      customer.id,
      customer.external_customer_id,
      customer.customer_name,
      customer.lat,
      customer.lng
    into
      v_customer_id,
      v_customer_external_id,
      v_customer_name,
      v_customer_latitude,
      v_customer_longitude
    from public.customers as customer
    where customer.external_customer_id = new.external_customer_id
    limit 1;
  end if;

  if v_customer_id is not null then
    new.customer_id := coalesce(new.customer_id, v_customer_id);
    new.external_customer_id := coalesce(new.external_customer_id, v_customer_external_id);
    new.customer_name := coalesce(new.customer_name, v_customer_name);

    if v_customer_latitude is not null
      and v_customer_longitude is not null
      and abs(v_customer_latitude) <= 90
      and abs(v_customer_longitude) <= 180
      and not (abs(v_customer_latitude) < 0.000001 and abs(v_customer_longitude) < 0.000001)
    then
      new.customer_latitude := v_customer_latitude;
      new.customer_longitude := v_customer_longitude;
    end if;
  end if;

  v_warehouse_ref := nullif(trim(coalesce(new.external_warehouse_id, new.warehouse_name, '')), '');

  if new.warehouse_id is null and v_warehouse_ref is not null then
    select warehouse.*
    into v_warehouse
    from public.logistics_warehouses as warehouse
    where warehouse.external_warehouse_id = v_warehouse_ref
       or warehouse.external_warehouse_id = nullif(trim(split_part(v_warehouse_ref, '|', 1)), '')
       or warehouse.warehouse_code = v_warehouse_ref
       or warehouse.warehouse_name = new.warehouse_name
    order by warehouse.created_at
    limit 1;

    if v_warehouse.id is not null then
      new.warehouse_id := v_warehouse.id;
      new.external_warehouse_id := coalesce(new.external_warehouse_id, v_warehouse.external_warehouse_id);
      new.warehouse_name := coalesce(new.warehouse_name, v_warehouse.warehouse_name);
    end if;
  end if;

  new.warehouse_latitude := coalesce(new.warehouse_latitude, v_default_warehouse_latitude);
  new.warehouse_longitude := coalesce(new.warehouse_longitude, v_default_warehouse_longitude);

  if new.customer_latitude is not null
    and new.customer_longitude is not null
    and new.warehouse_latitude is not null
    and new.warehouse_longitude is not null
  then
    if tg_op = 'INSERT'
      or new.estimated_road_distance_km is null
    then
      new.estimated_road_distance_km := round(public.logistics_distance_km(
        new.warehouse_latitude,
        new.warehouse_longitude,
        new.customer_latitude,
        new.customer_longitude
      )::numeric, 2)::double precision;
    elsif old.customer_latitude is distinct from new.customer_latitude
      or old.customer_longitude is distinct from new.customer_longitude
      or old.warehouse_latitude is distinct from new.warehouse_latitude
      or old.warehouse_longitude is distinct from new.warehouse_longitude
    then
      new.estimated_road_distance_km := round(public.logistics_distance_km(
        new.warehouse_latitude,
        new.warehouse_longitude,
        new.customer_latitude,
        new.customer_longitude
      )::numeric, 2)::double precision;
    end if;
  end if;

  return new;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.logistics_prevent_multiple_working_plans()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.plan_status = 'in_progress' and new.assigned_profile_id is not null then
    if exists (
      select 1
      from public.logistics_delivery_plans existing
      where existing.assigned_profile_id = new.assigned_profile_id
        and existing.plan_status = 'in_progress'
        and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
      raise exception 'Driver already has an in-progress delivery plan.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_record_shipment_status_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' and old.shipment_status is distinct from new.shipment_status then
    insert into public.logistics_shipment_status_history (
      shipment_id,
      old_status,
      new_status,
      changed_by_profile_id,
      changed_by_role
    )
    values (
      new.id,
      old.shipment_status,
      new.shipment_status,
      auth.uid(),
      case when public.is_management_role() then 'admin' else 'driver' end
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_refresh_customer_shipment_route_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.logistics_shipments as shipment
  set
    customer_id = coalesce(shipment.customer_id, new.id),
    external_customer_id = coalesce(shipment.external_customer_id, new.external_customer_id),
    customer_name = coalesce(shipment.customer_name, new.customer_name),
    customer_latitude = new.lat,
    customer_longitude = new.lng,
    updated_at = timezone('utc', now())
  where new.lat is not null
    and new.lng is not null
    and abs(new.lat) <= 90
    and abs(new.lng) <= 180
    and not (abs(new.lat) < 0.000001 and abs(new.lng) < 0.000001)
    and (
      shipment.customer_id = new.id
      or (
        shipment.customer_id is null
        and shipment.external_customer_id is not null
        and shipment.external_customer_id = new.external_customer_id
      )
    );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_shipment_status_from_phase(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE lower(trim(p_value))
    WHEN 'pending' THEN 'PENDING_ASSIGN'
    WHEN 'assigned' THEN 'ASSIGNED'
    WHEN 'accepted' THEN 'ASSIGNED'
    WHEN 'arrived_pickup' THEN 'CHECK_IN'
    WHEN 'check_in' THEN 'CHECK_IN'
    WHEN 'picked_up' THEN 'PICKUP'
    WHEN 'in_transit' THEN 'OUT_FOR_DELIVERY'
    WHEN 'arrived_delivery' THEN 'ARRIVED'
    WHEN 'delivered' THEN 'DELIVERED'
    WHEN 'finished' THEN 'FINISHED'
    WHEN 'settled' THEN 'SETTLED'
    WHEN 'attempted' THEN 'CANCELLED'
    WHEN 'failed' THEN 'CANCELLED'
    WHEN 'cancelled' THEN 'CANCELLED'
    WHEN 'rescheduled' THEN 'PENDING_ASSIGN'
    ELSE 'PENDING_ASSIGN'
  END;
$function$;

CREATE OR REPLACE FUNCTION public.logistics_shipment_status_rank(p_status text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE upper(trim(p_status))
    WHEN 'PENDING_ASSIGN' THEN 1
    WHEN 'ASSIGNED' THEN 2
    WHEN 'CHECK_IN' THEN 3
    WHEN 'PICKUP' THEN 4
    WHEN 'OUT_FOR_DELIVERY' THEN 5
    WHEN 'ARRIVED' THEN 6
    WHEN 'DELIVERED' THEN 7
    WHEN 'FINISHED' THEN 8
    WHEN 'SETTLED' THEN 9
    WHEN 'CANCELLED' THEN 10
    ELSE 0
  END;
$function$;

CREATE OR REPLACE FUNCTION private.logistics_shipments_complete_plan_after_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform private.logistics_complete_plan_if_shipments_delivered(old.plan_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.plan_id is distinct from new.plan_id then
    perform private.logistics_complete_plan_if_shipments_delivered(old.plan_id);
  end if;

  perform private.logistics_complete_plan_if_shipments_delivered(new.plan_id);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.map_delivery_phase_from_odoo_state(p_state text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE lower(trim(COALESCE(p_state, '')))
    WHEN 'done' THEN 'ready'
    WHEN 'cancel' THEN 'cancelled'
    WHEN 'assigned' THEN 'ready'
    WHEN 'ready' THEN 'ready'
    WHEN 'waiting' THEN 'pending'
    WHEN 'confirmed' THEN 'pending'
    WHEN 'draft' THEN 'pending'
    ELSE 'pending'
  END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS notification_recipients
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_recipient public.notification_recipients%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.notification_recipients
  set read_at = coalesce(read_at, timezone('utc', now()))
  where notification_id = p_notification_id
    and user_id = auth.uid()
  returning * into v_recipient;

  if v_recipient.id is null then
    raise exception 'Notification recipient not found';
  end if;

  return v_recipient;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_odoo_action_sending(p_action_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_status odoo_action_status;
BEGIN
  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status != 'approved' THEN
    RAISE EXCEPTION 'Cannot send action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions SET status = 'sending' WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'sending', jsonb_build_object('event', 'sending'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_settlement_paid(p_settlement_id uuid)
 RETURNS finance_driver_settlements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement public.finance_driver_settlements%ROWTYPE;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_settlement FROM public.finance_driver_settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found.'; END IF;
  IF v_settlement.status != 'posted' THEN RAISE EXCEPTION 'Only posted settlements can be marked as paid.'; END IF;

  UPDATE public.finance_driver_settlements
  SET status = 'paid',
      paid_by = auth.uid(),
      paid_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;

  PERFORM public.log_audit_event(
    'mark_settlement_paid',
    'finance_driver_settlement',
    p_settlement_id,
    'Settlement marked as paid',
    jsonb_build_object('net_payable', v_settlement.net_payable)
  );

  RETURN v_settlement;
END;
$function$;

CREATE OR REPLACE FUNCTION public.next_document_number(p_document_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seq record;
  v_year_prefix text;
  v_next integer;
  v_result text;
BEGIN
  SELECT * INTO v_seq
  FROM public.finance_document_sequences
  WHERE document_type = p_document_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document sequence for "%" not found.', p_document_type;
  END IF;

  IF v_seq.year_reset THEN
    v_year_prefix := to_char(now(), 'YYYY') || '-';
  ELSE
    v_year_prefix := '';
  END IF;

  v_next := v_seq.current_number + 1;

  UPDATE public.finance_document_sequences
  SET current_number = v_next
  WHERE document_type = p_document_type;

  v_result := v_seq.prefix || '-' || v_year_prefix || lpad(v_next::text, 6, '0');
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.next_payment_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seq RECORD;
  v_next text;
BEGIN
  SELECT * INTO v_seq
  FROM public.finance_document_sequences
  WHERE document_type = 'payment'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.finance_document_sequences (document_type, prefix, current_number, year_reset)
    VALUES ('payment', 'PAY', 0, true)
    RETURNING * INTO v_seq;
  END IF;

  v_seq.current_number := v_seq.current_number + 1;

  UPDATE public.finance_document_sequences
  SET current_number = v_seq.current_number
  WHERE id = v_seq.id;

  v_next := v_seq.prefix || '-' || to_char(current_date, 'YYYY') || '-' || lpad(v_seq.current_number::text, 6, '0');
  RETURN v_next;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_display_type()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if NEW.display_type in ('false','False','FALSE') then
    NEW.display_type := null;
  end if;
  return NEW;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_logistics_shipment_business_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reference text;
  v_customer text;
  v_old_driver uuid;
  v_new_driver uuid;
  v_terminal_failed boolean;
begin
  v_reference := coalesce(new.odoo_order_name, new.shipment_reference, new.external_order_id, left(new.id::text, 8));
  v_customer := coalesce(new.customer_name, 'customer');

  if tg_op = 'INSERT' then
    v_old_driver := null;
  else
    v_old_driver := old.assigned_profile_id;
  end if;
  v_new_driver := new.assigned_profile_id;

  if v_new_driver is not null and (tg_op = 'INSERT' or v_new_driver is distinct from v_old_driver) then
    perform public.create_system_notification_for_users(
      array[v_new_driver],
      'Shipment assigned',
      'Shipment ' || v_reference || ' for ' || v_customer || ' is assigned to you.',
      jsonb_build_object(
        'type', 'shipment_assigned',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'old_driver_profile_id', v_old_driver,
        'new_driver_profile_id', v_new_driver
      )
    );
  end if;

  if tg_op = 'UPDATE' and v_old_driver is not null and v_old_driver is distinct from v_new_driver then
    perform public.create_system_notification_for_users(
      array[v_old_driver],
      'Shipment reassigned',
      'Shipment ' || v_reference || ' for ' || v_customer || ' was reassigned.',
      jsonb_build_object(
        'type', 'shipment_reassigned',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'old_driver_profile_id', v_old_driver,
        'new_driver_profile_id', v_new_driver
      )
    );
  end if;

  v_terminal_failed :=
    lower(coalesce(new.delivery_phase, '')) in ('failed', 'attempted', 'cancelled')
    or upper(coalesce(new.shipment_status, '')) in ('CANCELLED', 'FAILED', 'ATTEMPTED');

  if v_terminal_failed and (
    tg_op = 'INSERT'
    or lower(coalesce(old.delivery_phase, '')) is distinct from lower(coalesce(new.delivery_phase, ''))
    or upper(coalesce(old.shipment_status, '')) is distinct from upper(coalesce(new.shipment_status, ''))
  ) then
    perform public.create_system_notification_for_roles(
      array['admin'::public.app_role, 'manager'::public.app_role, 'supervisor'::public.app_role, 'dispatcher'::public.app_role],
      'Delivery needs attention',
      'Shipment ' || v_reference || ' for ' || v_customer || ' is marked ' || coalesce(new.delivery_phase, new.shipment_status, 'failed') || '.',
      jsonb_build_object(
        'type', 'delivery_failed',
        'shipment_id', new.id,
        'plan_id', new.plan_id,
        'customer_id', new.customer_id,
        'assigned_profile_id', new.assigned_profile_id,
        'delivery_phase', new.delivery_phase,
        'shipment_status', new.shipment_status
      )
    );
  end if;

  return new;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.odoo_datetime(p_value text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_value is null then null
    when p_value ~ '^\d{4}-\d{2}-\d{2}' then p_value::timestamptz
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.odoo_ref_id(p_value text)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_value is null then null
    when p_value ~ '^[0-9]+$' then p_value::bigint
    when p_value ~ '^[0-9]+\s*\|' then split_part(p_value, '|', 1)::bigint
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null or btrim(new.user_id) = '' then
    new.user_uid := null;
  else
    new.user_uid := nullif(btrim(split_part(new.user_id, '|', 1)), '')::integer;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.post_credit_note(p_invoice_id uuid, p_reason text, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice record;
  v_ar_account_id uuid;
  v_returns_account_id uuid;
  v_journal_entry_id uuid;
  v_journal_lines jsonb;
BEGIN
  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found.';
  END IF;

  IF v_invoice.status NOT IN ('posted', 'partially_paid') THEN
    RAISE EXCEPTION 'Credit note can only be issued against posted or partially paid invoices.';
  END IF;

  SELECT id INTO v_ar_account_id FROM public.finance_accounts WHERE code = '1013' AND allow_posting = true;
  SELECT id INTO v_returns_account_id FROM public.finance_accounts WHERE code = '4030' AND allow_posting = true;

  -- Credit note: Dr Sales Returns, Cr Accounts Receivable
  v_journal_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_returns_account_id, 'debit', p_amount, 'credit', 0),
    jsonb_build_object('account_id', v_ar_account_id, 'debit', 0, 'credit', p_amount, 'customer_id', v_invoice.customer_id)
  );

  v_journal_entry_id := public.post_journal_entry(
    current_date,
    'credit_note',
    p_invoice_id,
    COALESCE(p_reason, 'Credit note for invoice ' || COALESCE(v_invoice.invoice_number, '')),
    v_journal_lines
  );

  RETURN v_journal_entry_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_credit_note(p_credit_note_id uuid, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cn record;
  v_entry_id uuid;
  v_total numeric := 0;
  v_line jsonb;
  v_ar_account_id uuid;
BEGIN
  SELECT * INTO v_cn FROM public.finance_credit_notes
    WHERE id = p_credit_note_id AND status = 'draft'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note not found or not in draft status';
  END IF;

  -- Validate fiscal period is open for the credit note date
  IF NOT EXISTS (
    SELECT 1 FROM public.finance_fiscal_periods
    WHERE status = 'open'
      AND start_date <= v_cn.credit_note_date
      AND end_date >= v_cn.credit_note_date
  ) THEN
    RAISE EXCEPTION 'No open fiscal period found for credit note date %', v_cn.credit_note_date;
  END IF;

  -- Validate lines balance
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total := v_total + (v_line->>'debit')::numeric - (v_line->>'credit')::numeric;
  END LOOP;
  IF abs(v_total) > 0.01 THEN
    RAISE EXCEPTION 'Credit note journal entry must be balanced';
  END IF;

  -- Get AR account
  SELECT id INTO v_ar_account_id FROM public.finance_accounts
    WHERE account_code = '1200';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AR account (1200) not found';
  END IF;

  -- Create journal entry
  INSERT INTO public.finance_journal_entries (
    fiscal_period_id, source_document_type, source_document_id,
    reference, notes, created_by
  ) VALUES (
    (SELECT id FROM public.finance_fiscal_periods
      WHERE status = 'open'
      AND start_date <= v_cn.credit_note_date
      AND end_date >= v_cn.credit_note_date
      LIMIT 1),
    'credit_note',
    p_credit_note_id,
    'CN-' || v_cn.credit_note_number,
    'Credit note posted',
    auth.uid()
  ) RETURNING id INTO v_entry_id;

  -- Insert journal lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.finance_journal_lines (
      journal_entry_id, account_id, debit, credit,
      description, cost_center_id
    ) VALUES (
      v_entry_id,
      (v_line->>'account_id')::uuid,
      (v_line->>'debit')::numeric,
      (v_line->>'credit')::numeric,
      v_line->>'description',
      NULLIF(v_line->>'cost_center_id', '')::uuid
    );
  END LOOP;

  -- Update credit note
  UPDATE public.finance_credit_notes
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid(),
      journal_entry_id = v_entry_id,
      total = v_cn.total
  WHERE id = p_credit_note_id;

  -- Update original invoice amount_to_invoice if linked
  IF v_cn.original_invoice_id IS NOT NULL THEN
    UPDATE public.finance_invoices
    SET amount_to_invoice = GREATEST(0, total - v_cn.total)
    WHERE id = v_cn.original_invoice_id;
  END IF;

  RETURN v_entry_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_driver_settlement(p_settlement_id uuid)
 RETURNS finance_driver_settlements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement public.finance_driver_settlements%ROWTYPE;
  v_journal_entry_id uuid;
  v_journal_lines jsonb;
  v_cash_account uuid;
  v_receivable_account uuid;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_settlement FROM public.finance_driver_settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found.'; END IF;
  IF v_settlement.status != 'approved' THEN RAISE EXCEPTION 'Only approved settlements can be posted.'; END IF;

  SELECT id INTO v_cash_account FROM public.finance_accounts WHERE code = '1010' AND allow_posting = true LIMIT 1;
  SELECT id INTO v_receivable_account FROM public.finance_accounts WHERE code = '1120' AND allow_posting = true LIMIT 1;

  IF v_cash_account IS NOT NULL AND v_receivable_account IS NOT NULL AND v_settlement.net_payable > 0 THEN
    v_journal_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_cash_account, 'debit', v_settlement.net_payable, 'credit', 0),
      jsonb_build_object('account_id', v_receivable_account, 'debit', 0, 'credit', v_settlement.net_payable)
    );

    v_journal_entry_id := public.post_journal_entry(
      p_entry_date := current_date,
      p_source_type := 'driver_settlement',
      p_source_id := p_settlement_id,
      p_description := 'Driver settlement posting',
      p_lines := v_journal_lines
    );
  END IF;

  UPDATE public.finance_driver_settlements
  SET status = 'posted',
      journal_entry_id = v_journal_entry_id,
      posted_by = auth.uid(),
      posted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;

  PERFORM public.log_audit_event(
    'post_driver_settlement',
    'finance_driver_settlement',
    p_settlement_id,
    'Settlement posted',
    jsonb_build_object('journal_entry_id', v_journal_entry_id, 'net_payable', v_settlement.net_payable)
  );

  RETURN v_settlement;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_invoice(p_invoice_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice record;
  v_line record;
  v_ar_account_id uuid;
  v_rev_account_id uuid;
  v_tax_account_id uuid;
  v_journal_entry_id uuid;
  v_journal_lines jsonb := '[]';
  v_line_obj jsonb;
  v_tax_amount numeric(14,2) := 0;
  v_line_tax numeric(14,2);
BEGIN
  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found.';
  END IF;

  IF v_invoice.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be posted.';
  END IF;

  -- Get required accounts
  SELECT id INTO v_ar_account_id FROM public.finance_accounts WHERE code = '1013' AND allow_posting = true;
  SELECT id INTO v_rev_account_id FROM public.finance_accounts WHERE code = '4010' AND allow_posting = true;
  SELECT id INTO v_tax_account_id FROM public.finance_accounts WHERE code = '2030' AND allow_posting = true;

  IF v_ar_account_id IS NULL OR v_rev_account_id IS NULL THEN
    RAISE EXCEPTION 'Required accounts (AR or Revenue) not found in chart of accounts.';
  END IF;

  -- Build journal lines from invoice lines
  FOR v_line IN
    SELECT il.*, tr.rate as tax_rate_pct, tr.id as tax_rate_id
    FROM public.finance_invoice_lines il
    LEFT JOIN public.finance_tax_rates tr ON il.tax_rate_id = tr.id
    WHERE il.invoice_id = p_invoice_id
  LOOP
    -- Revenue line (credit)
    v_line_obj := jsonb_build_object(
      'account_id', v_rev_account_id,
      'debit', 0,
      'credit', v_line.line_total
    );
    v_journal_lines := v_journal_lines || jsonb_build_array(v_line_obj);

    -- Tax line (credit) if applicable
    IF v_line.tax_rate_pct IS NOT NULL AND v_line.tax_rate_pct > 0 THEN
      v_line_tax := round(v_line.line_total * v_line.tax_rate_pct / 100, 2);
      v_tax_amount := v_tax_amount + v_line_tax;

      v_line_obj := jsonb_build_object(
        'account_id', v_tax_account_id,
        'debit', 0,
        'credit', v_line_tax
      );
      v_journal_lines := v_journal_lines || jsonb_build_array(v_line_obj);
    END IF;
  END LOOP;

  -- Accounts Receivable line (debit = total + tax)
  v_line_obj := jsonb_build_object(
    'account_id', v_ar_account_id,
    'debit', v_invoice.subtotal + v_tax_amount,
    'credit', 0,
    'customer_id', v_invoice.customer_id
  );
  v_journal_lines := jsonb_build_array(v_line_obj) || v_journal_lines;

  -- Post the journal entry
  v_journal_entry_id := public.post_journal_entry(
    v_invoice.issue_date,
    'invoice',
    p_invoice_id,
    'Invoice ' || COALESCE(v_invoice.invoice_number, p_invoice_id::text),
    v_journal_lines
  );

  -- Allocate invoice number
  UPDATE public.finance_invoices
  SET invoice_number = public.next_document_number('invoice'),
      status = 'posted',
      tax_total = v_tax_amount,
      total = v_invoice.subtotal + v_tax_amount,
      journal_entry_id = v_journal_entry_id
  WHERE id = p_invoice_id;

  RETURN v_journal_entry_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_date date DEFAULT NULL::date, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_lines jsonb DEFAULT '[]'::jsonb, p_fiscal_period_id uuid DEFAULT NULL::uuid, p_source_document_type text DEFAULT NULL::text, p_source_document_id uuid DEFAULT NULL::uuid, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_entry_id      uuid;
  v_period_id     uuid;
  v_entry_number  text;
  v_line          jsonb;
  v_total_debit   numeric(14,2) := 0;
  v_total_credit  numeric(14,2) := 0;
  v_line_debit    numeric(14,2);
  v_line_credit   numeric(14,2);
  v_desc          text;
  v_src_type      text;
  v_src_id        uuid;
  v_date          date;
begin
  v_date     := coalesce(p_entry_date, current_date);
  v_src_type := coalesce(p_source_type, p_source_document_type);
  v_src_id   := coalesce(p_source_id, p_source_document_id);
  v_desc     := coalesce(p_description, p_reference, p_notes);

  if p_fiscal_period_id is not null then
    v_period_id := p_fiscal_period_id;
  else
    select id into v_period_id
    from public.finance_fiscal_periods
    where v_date between start_date and end_date and status = 'open';
    if not found then
      raise exception 'No open fiscal period found for date %.', v_date;
    end if;
  end if;

  if jsonb_array_length(p_lines) < 2 then
    raise exception 'A journal entry requires at least 2 lines.';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_line_debit  := coalesce((v_line->>'debit')::numeric, 0);
    v_line_credit := coalesce((v_line->>'credit')::numeric, 0);

    if not exists (
      select 1 from public.finance_accounts
      where id = (v_line->>'account_id')::uuid and allow_posting = true and is_active = true
    ) then
      raise exception 'Account % does not exist or does not allow posting.', v_line->>'account_id';
    end if;

    if (v_line_debit > 0 and v_line_credit > 0) then
      raise exception 'A line cannot have both debit and credit.';
    end if;

    if v_line_debit = 0 and v_line_credit = 0 then
      raise exception 'A line must have either debit or credit.';
    end if;

    v_total_debit  := v_total_debit + v_line_debit;
    v_total_credit := v_total_credit + v_line_credit;
  end loop;

  if v_total_debit != v_total_credit then
    raise exception 'Journal entry not balanced. Debit: %, Credit: %', v_total_debit, v_total_credit;
  end if;

  v_entry_number := public.next_document_number('journal_entry');

  insert into public.finance_journal_entries
    (entry_number, fiscal_period_id, entry_date, source_type, source_id, description, posted_by)
  values
    (v_entry_number, v_period_id, v_date, v_src_type, v_src_id, v_desc, auth.uid())
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.finance_journal_lines
      (journal_entry_id, account_id, cost_center_id, customer_id, debit, credit, currency_code, description)
    values (
      v_entry_id,
      (v_line->>'account_id')::uuid,
      case when v_line ? 'cost_center_id' and v_line->>'cost_center_id' is not null
           then (v_line->>'cost_center_id')::uuid else null end,
      case when v_line ? 'customer_id' and v_line->>'customer_id' is not null
           then (v_line->>'customer_id')::uuid else null end,
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0),
      coalesce(v_line->>'currency_code', 'EGP'),
      v_line->>'description'
    );
  end loop;

  return v_entry_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_propagate_user_uid_to_calls()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_uid is distinct from old.user_uid then
    update public.calls c
    set user_uid = new.user_uid
    where c.user_id = new.id
      and c.user_uid is distinct from new.user_uid;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_propagate_user_uid_to_customer_interactions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_uid is distinct from old.user_uid then
    update public.customer_interactions ci
    set user_uid = new.user_uid
    where ci.actor_user_id = new.id
      and ci.user_uid is distinct from new.user_uid;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.odoo_user_id is null or btrim(new.odoo_user_id) = '' then
    new.user_uid := null;
  else
    new.user_uid := nullif(btrim(split_part(new.odoo_user_id, '|', 1)), '')::integer;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.raise_logistics_error(p_code text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception '[LOGISTICS_%] %', p_code, p_message;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_visit_checkin(p_customer_id uuid, p_visit_result text, p_visit_mode visit_mode, p_note text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_customer_distance_meters numeric DEFAULT NULL::numeric, p_within_geofence boolean DEFAULT NULL::boolean, p_captured_photo_path text DEFAULT NULL::text, p_linked_order_id uuid DEFAULT NULL::uuid, p_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_dynamic_answers jsonb DEFAULT '[]'::jsonb, p_fraud_score numeric DEFAULT 0, p_fraud_status fraud_status DEFAULT 'normal'::fraud_status, p_fraud_signals jsonb DEFAULT '{}'::jsonb)
 RETURNS visits
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_visit public.visits%rowtype;
  v_customer public.customers%rowtype;
  v_answer jsonb;
  v_field_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_customer
  from public.customers
  where id = p_customer_id;

  if v_customer.id is null then
    raise exception 'Customer not found';
  end if;

  if not public.is_management_role()
     and coalesce(v_customer.assigned_user_id, auth.uid()) <> auth.uid()
     and coalesce(v_customer.created_by, auth.uid()) <> auth.uid() then
    raise exception 'You do not have access to check in for this customer';
  end if;

  insert into public.visits (
    customer_id,
    user_id,
    linked_order_id,
    visit_result,
    visit_mode,
    note,
    override_reason,
    captured_photo_path,
    started_at,
    completed_at,
    lat,
    lng,
    customer_distance_meters,
    within_geofence,
    fraud_score,
    fraud_status,
    fraud_signals
  )
  values (
    p_customer_id,
    auth.uid(),
    p_linked_order_id,
    p_visit_result,
    p_visit_mode,
    p_note,
    p_override_reason,
    p_captured_photo_path,
    p_started_at,
    p_completed_at,
    p_lat,
    p_lng,
    p_customer_distance_meters,
    p_within_geofence,
    coalesce(p_fraud_score, 0),
    coalesce(p_fraud_status, 'normal'),
    coalesce(p_fraud_signals, '{}'::jsonb)
  )
  returning * into v_visit;

  update public.customers
  set
    last_visit_at = v_visit.checked_in_at,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_customer_id;

  if jsonb_typeof(coalesce(p_dynamic_answers, '[]'::jsonb)) = 'array' then
    for v_answer in
      select value from jsonb_array_elements(coalesce(p_dynamic_answers, '[]'::jsonb))
    loop
      v_field_id := nullif(v_answer ->> 'field_id', '')::uuid;

      if v_field_id is not null then
        insert into public.visit_dynamic_answers (
          visit_id,
          field_id,
          answer_text,
          answer_json
        )
        values (
          v_visit.id,
          v_field_id,
          v_answer ->> 'answer_text',
          coalesce(v_answer -> 'answer_json', v_answer)
        );
      end if;
    end loop;
  end if;

  insert into public.customer_interactions (
    customer_id,
    interaction_type,
    title,
    description,
    visit_id,
    order_id,
    actor_user_id,
    metadata
  )
  values (
    p_customer_id,
    'visit',
    'Visit check-in',
    p_visit_result,
    v_visit.id,
    p_linked_order_id,
    auth.uid(),
    jsonb_build_object(
      'visit_mode', p_visit_mode,
      'within_geofence', p_within_geofence,
      'fraud_status', p_fraud_status
    )
  );

  perform public.log_audit_event(
    'record_visit_checkin',
    'visit',
    v_visit.id,
    'Visit check-in recorded',
    jsonb_build_object(
      'customer_id', p_customer_id,
      'linked_order_id', p_linked_order_id,
      'visit_result', p_visit_result,
      'visit_mode', p_visit_mode
    )
  );

  return v_visit;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_mv_account_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_account_balances;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_odoo_pending_action(p_action_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_current_status odoo_action_status;
BEGIN
  v_user_id := auth.uid();

  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status NOT IN ('waiting_approval', 'approved') THEN
    RAISE EXCEPTION 'Cannot reject action with status %.', v_current_status;
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'rejected',
      rejected_by = v_user_id,
      rejected_at = now(),
      rejection_reason = p_reason
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, user_id, details)
  VALUES (p_action_id, 'rejected', v_user_id, jsonb_build_object(
    'event', 'rejected',
    'reason', p_reason
  ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_fiscal_period(p_period_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period record;
BEGIN
  -- Permission check: finance.close_period required for reopen too
  IF NOT public.has_role_permission('finance.close_period') THEN
    RAISE EXCEPTION 'Permission denied: finance.close_period required';
  END IF;

  SELECT id, status INTO v_period
  FROM public.finance_fiscal_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiscal period not found.';
  END IF;

  IF v_period.status NOT IN ('closed', 'locked') THEN
    RAISE EXCEPTION 'Period is already open.';
  END IF;

  UPDATE public.finance_fiscal_periods
  SET status = 'open', closed_at = NULL, closed_by = NULL
  WHERE id = p_period_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_sla_breach(p_breach_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can resolve SLA breaches.';
  END IF;

  UPDATE public.sla_breaches
  SET resolved_at = timezone('utc', now())
  WHERE id = p_breach_id AND resolved_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.retry_delivery(p_shipment_id uuid, p_new_scheduled_date date, p_reason text DEFAULT NULL::text)
 RETURNS logistics_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_shipment public.logistics_shipments%ROWTYPE;
BEGIN
  IF NOT public.is_management_role() THEN
    RAISE EXCEPTION 'Only management can retry deliveries.';
  END IF;

  SELECT * INTO v_shipment FROM public.logistics_shipments WHERE id = p_shipment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found.'; END IF;
  IF v_shipment.delivery_phase NOT IN ('failed', 'attempted', 'cancelled') THEN
    RAISE EXCEPTION 'Only failed/attempted/cancelled shipments can be retried.';
  END IF;

  UPDATE public.logistics_shipments
  SET delivery_phase = 'pending',
      shipment_status = 'PENDING',
      shipment_state = 'draft',
      scheduled_at = p_new_scheduled_date::timestamptz,
      completed_at = NULL,
      cancelled_at = NULL,
      notes = coalesce(nullif(trim(p_reason), ''), notes),
      updated_at = timezone('utc', now())
  WHERE id = p_shipment_id
  RETURNING * INTO v_shipment;

  INSERT INTO public.logistics_shipment_events (
    shipment_id, actor_profile_id, previous_phase, next_phase, note
  ) VALUES (
    p_shipment_id, auth.uid(), 'failed', 'pending', coalesce(p_reason, 'Delivery retried')
  );

  PERFORM public.log_audit_event(
    'retry_delivery',
    'logistics_shipment',
    p_shipment_id,
    p_reason,
    jsonb_build_object('new_scheduled_date', p_new_scheduled_date)
  );

  RETURN v_shipment;
END;
$function$;

CREATE OR REPLACE FUNCTION public.retry_odoo_action(p_action_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_status odoo_action_status;
BEGIN
  SELECT status INTO v_current_status
  FROM odoo_pending_actions WHERE id = p_action_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Pending action not found.';
  END IF;

  IF v_current_status != 'failed' THEN
    RAISE EXCEPTION 'Can only retry failed actions.';
  END IF;

  UPDATE odoo_pending_actions
  SET status = 'approved',
      error_message = NULL
  WHERE id = p_action_id;

  INSERT INTO odoo_pending_action_audit_log (action_id, status, details)
  VALUES (p_action_id, 'approved', jsonb_build_object('event', 'retry'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_original   record;
  v_new_id     uuid;
  v_line       record;
  v_new_lines  jsonb := '[]';
  v_line_obj   jsonb;
BEGIN
  SELECT * INTO v_original
  FROM public.finance_journal_entries
  WHERE id = p_journal_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found.';
  END IF;

  IF v_original.status = 'reversed' THEN
    RAISE EXCEPTION 'Journal entry is already reversed.';
  END IF;

  -- Build reversal lines (swap debit/credit)
  FOR v_line IN
    SELECT * FROM public.finance_journal_lines WHERE journal_entry_id = p_journal_entry_id
  LOOP
    v_line_obj := jsonb_build_object(
      'account_id', v_line.account_id,
      'debit', v_line.credit,
      'credit', v_line.debit,
      'cost_center_id', v_line.cost_center_id,
      'customer_id', v_line.customer_id,
      'currency_code', v_line.currency_code,
      'description', v_line.description
    );
    v_new_lines := v_new_lines || jsonb_build_array(v_line_obj);
  END LOOP;

  -- Post the reversal entry
  v_new_id := public.post_journal_entry(
    v_original.entry_date,
    'reversal',
    p_journal_entry_id,
    COALESCE(p_reason, 'Reversal of ' || v_original.entry_number),
    v_new_lines
  );

  -- Mark original as reversed
  UPDATE public.finance_journal_entries
  SET status = 'reversed', reversed_by_entry_id = v_new_id
  WHERE id = p_journal_entry_id;

  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id uuid DEFAULT NULL::uuid, p_entry_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_original record;
  v_new_id   uuid;
  v_line     record;
  v_entry_id uuid;
begin
  v_entry_id := coalesce(p_journal_entry_id, p_entry_id);
  if v_entry_id is null then
    raise exception 'Must provide p_journal_entry_id or p_entry_id';
  end if;

  select * into v_original
  from public.finance_journal_entries where id = v_entry_id;

  if not found then
    raise exception 'Journal entry % not found.', v_entry_id;
  end if;

  if v_original.reversed_by_entry_id is not null then
    raise exception 'Journal entry % is already reversed.', v_entry_id;
  end if;

  insert into public.finance_journal_entries
    (entry_number, fiscal_period_id, entry_date, source_type, source_id, description, posted_by)
  values (
    public.next_document_number('journal_entry'),
    v_original.fiscal_period_id,
    current_date,
    'reversal',
    v_entry_id,
    coalesce(p_reason, 'Reversal of ' || v_original.entry_number),
    auth.uid()
  ) returning id into v_new_id;

  update public.finance_journal_entries
  set reversed_by_entry_id = v_new_id where id = v_entry_id;

  for v_line in
    select * from public.finance_journal_lines where journal_entry_id = v_entry_id
  loop
    insert into public.finance_journal_lines
      (journal_entry_id, account_id, cost_center_id, customer_id, debit, credit, currency_code, description)
    values (
      v_new_id, v_line.account_id, v_line.cost_center_id, v_line.customer_id,
      v_line.credit, v_line.debit, v_line.currency_code,
      'Reversal: ' || coalesce(v_line.description, '')
    );
  end loop;

  return v_new_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_driver_settlement(p_driver_id uuid, p_period_start date, p_period_end date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settlement_id uuid;
  v_plan_total numeric(14,2) := 0;
  v_overlapping_settlement record;
BEGIN
  IF p_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver is required.';
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'Settlement period is required.';
  END IF;

  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Settlement period start must be before or equal to end.';
  END IF;

  SELECT id, period_start, period_end, status
  INTO v_overlapping_settlement
  FROM public.finance_driver_settlements
  WHERE driver_id = p_driver_id
    AND period_start <= p_period_end
    AND period_end >= p_period_start
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'يوجد بالفعل تسوية لهذا السائق تتداخل مع الفترة المختارة: % إلى %.',
      v_overlapping_settlement.period_start,
      v_overlapping_settlement.period_end;
  END IF;

  SELECT COALESCE(SUM(plan_shipments.shipment_value), 0)::numeric(14,2)
  INTO v_plan_total
  FROM (
    SELECT
      ls.id,
      COALESCE(
        MAX(lsc.pending_delivery_amount),
        MAX(o.amount_total),
        MAX(o.total_amount),
        MAX(ls.total_gmv),
        0
      )::numeric(14,2) AS shipment_value
    FROM public.logistics_delivery_plans ldp
    JOIN public.logistics_shipments ls ON ls.plan_id = ldp.id
    LEFT JOIN public.logistics_shipment_collections lsc ON lsc.shipment_id = ls.id
    LEFT JOIN public.orders o ON o.id = ls.linked_order_id
    WHERE ldp.logistics_user_id = p_driver_id
      AND ldp.planned_date BETWEEN p_period_start AND p_period_end
      AND ldp.plan_status <> 'cancelled'
      AND COALESCE(ls.shipment_status, '') NOT IN ('CANCELLED', 'FAILED')
    GROUP BY ls.id
  ) AS plan_shipments;

  INSERT INTO public.finance_driver_settlements
    (driver_id, period_start, period_end, commission_amount, fuel_allowance, cash_collected, created_by)
  VALUES
    (p_driver_id, p_period_start, p_period_end, 0, 0, v_plan_total, auth.uid())
  RETURNING id INTO v_settlement_id;

  RETURN v_settlement_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.self_update_profile(p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null then coalesce(nullif(trim(p_full_name), ''), full_name)
      else full_name
    end,
    phone = case
      when p_phone is not null then nullif(trim(p_phone), '')
      else phone
    end,
    avatar_url = case
      when p_avatar_url is not null then nullif(trim(p_avatar_url), '')
      else avatar_url
    end
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  return v_profile;
end;
$function$;

CREATE OR REPLACE FUNCTION public.send_notification(p_audience_type notification_audience_type, p_title text, p_body text, p_channel notification_channel DEFAULT 'in_app'::notification_channel, p_audience_role app_role DEFAULT NULL::app_role, p_audience_user_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_notification_id uuid;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can send notifications';
  end if;

  insert into public.notifications (
    created_by,
    audience_type,
    audience_role,
    audience_user_id,
    channel,
    title,
    body,
    metadata
  )
  values (
    auth.uid(),
    p_audience_type,
    p_audience_role,
    p_audience_user_id,
    p_channel,
    p_title,
    p_body,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  if p_audience_type = 'all' then
    insert into public.notification_recipients (notification_id, user_id)
    select v_notification_id, p.id
    from public.profiles p
    where p.status = 'active';
  elseif p_audience_type = 'role' then
    if p_audience_role is null then
      raise exception 'Role audience requires p_audience_role';
    end if;

    insert into public.notification_recipients (notification_id, user_id)
    select v_notification_id, p.id
    from public.profiles p
    where p.status = 'active'
      and p.role = p_audience_role;
  elseif p_audience_type = 'user' then
    if p_audience_user_id is null then
      raise exception 'User audience requires p_audience_user_id';
    end if;

    insert into public.notification_recipients (notification_id, user_id)
    values (v_notification_id, p_audience_user_id);
  else
    raise exception 'Unsupported audience type';
  end if;

  if not exists (
    select 1
    from public.notification_recipients
    where notification_id = v_notification_id
  ) then
    raise exception 'Notification resolved to zero recipients';
  end if;

  perform public.log_audit_event(
    'send_notification',
    'notification',
    v_notification_id,
    'Notification sent',
    jsonb_build_object(
      'audience_type', p_audience_type,
      'audience_role', p_audience_role,
      'audience_user_id', p_audience_user_id
    )
  );

  return v_notification_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_calls_odoo_insert_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.odoo_insert_payload = public.build_calls_odoo_insert(new);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_department_roles(p_department_id uuid, p_roles app_role[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted_count integer;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update department roles';
  end if;

  delete from public.department_role_assignments
  where department_id = p_department_id;

  insert into public.department_role_assignments (
    department_id,
    role,
    created_by
  )
  select
    p_department_id,
    role_value,
    auth.uid()
  from (
    select distinct unnest(coalesce(p_roles, array[]::public.app_role[])) as role_value
  ) seeded;

  get diagnostics v_inserted_count = row_count;

  perform public.log_audit_event(
    'set_department_roles',
    'department',
    p_department_id,
    'Updated department role coverage',
    jsonb_build_object(
      'department_id', p_department_id,
      'roles', coalesce(p_roles, array[]::public.app_role[]),
      'role_count', v_inserted_count
    )
  );

  return v_inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_finance_driver_settlements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN new.updated_at = timezone('utc', now()); RETURN new; END; $function$;

CREATE OR REPLACE FUNCTION public.set_finance_invoices_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN new.updated_at = timezone('utc', now()); RETURN new; END; $function$;

CREATE OR REPLACE FUNCTION public.set_finance_payments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN new.updated_at = timezone('utc', now()); RETURN new; END; $function$;

CREATE OR REPLACE FUNCTION public.set_odoo_action_status(p_action_key text, p_is_active boolean)
 RETURNS TABLE(id uuid, action_key text, is_active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can change Odoo action status.' using errcode = '42501';
  end if;

  return query
  update public.odoo_actions
  set is_active = p_is_active
  where odoo_actions.action_key = btrim(p_action_key)
  returning odoo_actions.id, odoo_actions.action_key, odoo_actions.is_active, odoo_actions.updated_at;

  if not found then
    raise exception 'Unknown Odoo action key.' using errcode = '22023';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_odoo_pending_action_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_order_tickets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  new.updated_at = timezone('utc', now());
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_orders_odoo_insert_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.odoo_insert_payload = public.build_orders_odoo_insert(new);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_products_odoo_insert_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.odoo_insert_payload = public.build_products_odoo_insert(new);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_role_permissions(p_role app_role, p_permission_keys text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted_count integer;
begin
  if not public.is_admin_role() then
    raise exception 'Only admins can update role permissions';
  end if;

  delete from public.role_permission_assignments
  where role = p_role;

  insert into public.role_permission_assignments (
    role,
    permission_key,
    created_by
  )
  select
    p_role,
    permission_key,
    auth.uid()
  from (
    select distinct unnest(coalesce(p_permission_keys, array[]::text[])) as permission_key
  ) seeded
  where coalesce(permission_key, '') <> '';

  get diagnostics v_inserted_count = row_count;

  perform public.log_audit_event(
    'set_role_permissions',
    'role_definition',
    null,
    format('Updated permission matrix for role %s', p_role::text),
    jsonb_build_object(
      'role', p_role,
      'permission_count', v_inserted_count,
      'permission_keys', coalesce(p_permission_keys, array[]::text[])
    )
  );

  return v_inserted_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.sync_approved_collection_check_accounting(p_check_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_check public.driver_plan_collection_checks%rowtype;
  v_shipment public.logistics_shipments%rowtype;
  v_amount numeric(14, 2);
  v_ledger_payment_method text;
  v_pending_amount numeric(14, 2);
  v_collected_amount numeric(14, 2);
  v_driver_debt_amount numeric(14, 2);
  v_collection_status text;
  v_route_cash_amount numeric(14, 2);
begin
  select *
  into v_check
  from public.driver_plan_collection_checks
  where id = p_check_id
  for update;

  if not found
    or v_check.review_status <> 'approved'
    or v_check.check_status <> 'collected' then
    return;
  end if;

  select s.*
  into v_shipment
  from public.logistics_shipments s
  where s.id::text = v_check.shipment_id
  for update of s;

  if not found then
    raise exception 'Shipment % for collection check % was not found.', v_check.shipment_id, v_check.id;
  end if;

  select coalesce(
    (select o.amount_total from public.orders o where o.id = v_shipment.linked_order_id),
    v_shipment.total_gmv,
    0
  )
  into v_amount;

  v_ledger_payment_method := case
    when lower(trim(coalesce(v_check.payment_method, ''))) = 'installments' then 'credit'
    else lower(trim(coalesce(v_check.payment_method, '')))
  end;

  if v_ledger_payment_method not in ('cash', 'credit', 'cheque', 'bank_transfer') then
    raise exception 'Unsupported payment method on collection check %: %', v_check.id, v_check.payment_method;
  end if;

  if v_ledger_payment_method = 'credit' then
    v_pending_amount := 0;
    v_collected_amount := 0;
    v_collection_status := 'pending_delivery_amount';
  else
    v_pending_amount := greatest(coalesce(v_amount, 0), 0);
    v_collected_amount := v_pending_amount;
    v_collection_status := 'collected_from_customer';
  end if;

  v_driver_debt_amount := case
    when v_ledger_payment_method = 'cash' then v_collected_amount
    else 0
  end;

  insert into public.logistics_shipment_collections (
    shipment_id,
    pending_delivery_amount,
    collected_from_customer,
    collected_successfully_amount,
    currency_code,
    collection_status,
    collected_by_logistics_user_id,
    collected_by_profile_id,
    collected_from_customer_at,
    payment_method,
    driver_notes,
    payment_collected_at,
    sales_rep_id,
    driver_debt_amount,
    accounting_status
  ) values (
    v_shipment.id,
    v_pending_amount,
    v_collected_amount,
    0,
    'EGP',
    v_collection_status,
    v_shipment.logistics_user_id,
    v_check.driver_profile_id,
    case when v_collected_amount > 0 then coalesce(v_check.reviewed_at, timezone('utc', now())) end,
    v_ledger_payment_method,
    v_check.driver_notes,
    case when v_collected_amount > 0 then coalesce(v_check.reviewed_at, timezone('utc', now())) end,
    v_check.sales_rep_id,
    v_driver_debt_amount,
    'pending_accounting_review'
  )
  on conflict (shipment_id) do update set
    pending_delivery_amount = excluded.pending_delivery_amount,
    collected_from_customer = excluded.collected_from_customer,
    collection_status = excluded.collection_status,
    collected_by_logistics_user_id = excluded.collected_by_logistics_user_id,
    collected_by_profile_id = excluded.collected_by_profile_id,
    collected_from_customer_at = coalesce(
      public.logistics_shipment_collections.collected_from_customer_at,
      excluded.collected_from_customer_at
    ),
    payment_method = excluded.payment_method,
    driver_notes = excluded.driver_notes,
    payment_collected_at = coalesce(
      public.logistics_shipment_collections.payment_collected_at,
      excluded.payment_collected_at
    ),
    sales_rep_id = excluded.sales_rep_id,
    driver_debt_amount = excluded.driver_debt_amount,
    accounting_status = case
      when public.logistics_shipment_collections.accounting_status = 'confirmed' then 'confirmed'
      else 'pending_accounting_review'
    end,
    updated_at = timezone('utc', now());

  -- Serialize recalculation for this driver/route. The existing balance table
  -- has no uniqueness constraint, so update all pending rows consistently.
  perform pg_advisory_xact_lock(hashtextextended(v_check.driver_profile_id::text || ':' || v_check.plan_id::text, 0));

  select coalesce(sum(l.driver_debt_amount), 0)
  into v_route_cash_amount
  from public.logistics_shipment_collections l
  join public.driver_plan_collection_checks c
    on c.shipment_id = l.shipment_id::text
  where c.plan_id = v_check.plan_id
    and c.driver_profile_id = v_check.driver_profile_id
    and c.review_status = 'approved'
    and c.check_status = 'collected'
    and l.payment_method = 'cash'
    and l.collection_status = 'collected_from_customer';

  update public.driver_cash_balance
  set cash_amount = v_route_cash_amount,
      updated_at = timezone('utc', now())
  where driver_id = v_check.driver_profile_id
    and route_plan_id = v_check.plan_id
    and status = 'pending';

  if not found and v_route_cash_amount > 0 then
    insert into public.driver_cash_balance (
      driver_id,
      route_plan_id,
      cash_amount,
      currency_code,
      status,
      created_at,
      updated_at
    ) values (
      v_check.driver_profile_id,
      v_check.plan_id,
      v_route_cash_amount,
      'EGP',
      'pending',
      timezone('utc', now()),
      timezone('utc', now())
    );
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_logistics_shipment_items_from_order(p_shipment_id uuid, p_order_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_shipment_id IS NULL OR p_order_id IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.logistics_shipment_items
  WHERE shipment_id = p_shipment_id
    AND external_move_id LIKE 'order-line:%';

  DELETE FROM public.logistics_shipment_items lsi
  WHERE lsi.shipment_id = p_shipment_id
    AND lsi.source = 'odoo_sync'
    AND lsi.external_product_id IN (
      SELECT line.external_product_id
      FROM public.order_line_items line
      WHERE line.order_id = p_order_id
        AND line.external_product_id IS NOT NULL
    );

  INSERT INTO public.logistics_shipment_items (
    shipment_id, external_move_id, product_id, external_product_id,
    product_name, product_ref, requested_quantity, done_quantity,
    reserved_quantity, forecast_quantity, move_state, source,
    raw_payload, last_sync_at, updated_at
  )
  SELECT
    p_shipment_id,
    'order-line:' || COALESCE(NULLIF(TRIM(line.external_line_id), ''), line.id::text),
    product.id, line.external_product_id,
    COALESCE(NULLIF(TRIM(line.product_name), ''), NULLIF(TRIM(line.product_ref), ''), NULLIF(TRIM(line.product_code), ''), 'Order line'),
    COALESCE(NULLIF(TRIM(line.product_code), ''), NULLIF(TRIM(line.product_ref), ''), NULLIF(TRIM(line.product_uom), '')),
    COALESCE(line.ordered_quantity, 0), COALESCE(line.delivered_quantity, 0),
    0, 0, 'order_line', 'order_line_sync',
    jsonb_build_object('source', 'order_line_items', 'order_line_item_id', line.id, 'external_line_id', line.external_line_id, 'order_id', line.order_id),
    COALESCE(line.last_sync_at, TIMEZONE('utc', NOW())),
    TIMEZONE('utc', NOW())
  FROM public.order_line_items line
  LEFT JOIN public.products product ON product.external_product_id = line.external_product_id
  WHERE line.order_id = p_order_id
  ORDER BY line.sort_order, line.created_at
  ON CONFLICT (external_move_id) DO UPDATE SET
    shipment_id = EXCLUDED.shipment_id, product_id = EXCLUDED.product_id,
    external_product_id = EXCLUDED.external_product_id, product_name = EXCLUDED.product_name,
    product_ref = EXCLUDED.product_ref, requested_quantity = EXCLUDED.requested_quantity,
    done_quantity = EXCLUDED.done_quantity, reserved_quantity = EXCLUDED.reserved_quantity,
    forecast_quantity = EXCLUDED.forecast_quantity, move_state = EXCLUDED.move_state,
    source = EXCLUDED.source, raw_payload = EXCLUDED.raw_payload,
    last_sync_at = EXCLUDED.last_sync_at, updated_at = TIMEZONE('utc', NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_logistics_user_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Only provision logistics_users for driver profiles
  if new.role is distinct from 'driver'::app_role then
    return new;
  end if;

  -- Don't duplicate if logistics_user already exists for this profile
  if exists (
    select 1
    from public.logistics_users lu
    where lu.linked_profile_id = new.id
  ) then
    return new;
  end if;

  insert into public.logistics_users (
    linked_profile_id,
    employee_name,
    job_title,
    work_email,
    work_phone,
    mobile_phone,
    status,
    source,
    created_at,
    updated_at
  ) values (
    new.id,
    new.full_name,
    new.job_title,
    new.email,
    nullif(new.phone, '') ,
    null,
    'active'::record_status,
    'profiles_trigger'::text,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profiles_to_logistics_users()
 RETURNS TABLE(profile_id uuid, logistics_user_id uuid, action text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 1. Link unlinked logistics_users to profiles by email match
  return query
  with email_match as (
    select
      p.id as pid,
      lu.id as luid,
      row_number() over (
        partition by p.id
        order by
          case when lu.source = 'odoo_sync' then 0 else 1 end,
          lu.updated_at desc nulls last
      ) as rn
    from public.profiles p
    join public.logistics_users lu
      on lower(trim(lu.work_email::text)) = lower(trim(p.email::text))
      and lu.linked_profile_id is null
    where p.status = 'active'
  ),
  linked as (
    update public.logistics_users lu
    set
      linked_profile_id = em.pid,
      employee_name = coalesce(
        nullif(trim((select full_name from public.profiles where id = em.pid)), ''),
        lu.employee_name
      ),
      work_email = coalesce(
        (select email from public.profiles where id = em.pid),
        lu.work_email
      ),
      work_phone = coalesce(
        nullif(trim((select phone from public.profiles where id = em.pid)), ''),
        lu.work_phone
      ),
      mobile_phone = coalesce(
        nullif(trim((select phone from public.profiles where id = em.pid)), ''),
        lu.mobile_phone
      ),
      job_title = coalesce(
        lu.job_title,
        case (select role::text from public.profiles where id = em.pid)
          when 'driver' then 'Driver'
          when 'dispatcher' then 'Dispatcher'
          when 'spv' then 'SPV'
          when 'manager' then 'Logistics Manager'
          when 'supervisor' then 'Logistics Supervisor'
          when 'admin' then 'Logistics Admin'
          else 'Logistics User'
        end
      ),
      status = (select status from public.profiles where id = em.pid),
      source = case
        when lu.source = 'odoo_sync' then lu.source
        else 'admin_user_create'
      end,
      raw_payload = coalesce(lu.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'synced_from_profile', true,
        'profile_id', em.pid,
        'synced_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SSZ')
      ),
      last_sync_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    from email_match em
    where lu.id = em.luid
      and em.rn = 1
    returning lu.linked_profile_id as pid, lu.id as luid
  )
  select
    linked.pid,
    linked.luid,
    'linked'::text
  from linked;

  -- 2. Refresh already-linked logistics_users with latest profile data
  return query
  with refreshed as (
    update public.logistics_users lu
    set
      employee_name = coalesce(
        nullif(trim(p.full_name), ''),
        lu.employee_name
      ),
      work_email = coalesce(p.email, lu.work_email),
      work_phone = coalesce(
        nullif(trim(p.phone), ''),
        lu.work_phone
      ),
      mobile_phone = coalesce(
        nullif(trim(p.phone), ''),
        lu.mobile_phone
      ),
      status = p.status,
      raw_payload = coalesce(lu.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'synced_from_profile', true,
        'profile_id', p.id,
        'synced_at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SSZ')
      ),
      last_sync_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    from public.profiles p
    where lu.linked_profile_id = p.id
      and p.status = 'active'
    returning lu.linked_profile_id as pid, lu.id as luid
  )
  select
    refreshed.pid,
    refreshed.luid,
    'refreshed'::text
  from refreshed;

  -- 3. Create new logistics_users for profiles with no existing record
  return query
  with target_profiles as (
    select
      p.id as pid,
      nullif(trim(p.full_name), '') as full_name,
      p.email,
      p.role::text as role,
      p.status,
      nullif(trim(p.phone), '') as phone,
      nullif(trim(p.job_title), '') as job_title,
      p.department_id,
      nullif(trim(d.name), '') as department_name
    from public.profiles p
    left join public.departments d on d.id = p.department_id
    where p.status = 'active'
      and not exists (
        select 1 from public.logistics_users lu
        where lu.linked_profile_id = p.id
      )
      and not exists (
        select 1 from public.logistics_users lu
        where lower(trim(lu.work_email::text)) = lower(trim(p.email::text))
      )
  ),
  inserted as (
    insert into public.logistics_users (
      linked_profile_id,
      employee_name,
      job_title,
      work_email,
      work_phone,
      mobile_phone,
      department_name,
      status,
      source,
      raw_payload,
      last_sync_at,
      created_at,
      updated_at
    )
    select
      tp.pid,
      coalesce(tp.full_name, tp.email, 'Logistics User'),
      coalesce(
        tp.job_title,
        case tp.role
          when 'driver' then 'Driver'
          when 'dispatcher' then 'Dispatcher'
          when 'spv' then 'SPV'
          when 'manager' then 'Logistics Manager'
          when 'supervisor' then 'Logistics Supervisor'
          when 'admin' then 'Logistics Admin'
          else 'Logistics User'
        end
      ),
      tp.email,
      tp.phone,
      tp.phone,
      tp.department_name,
      tp.status,
      'admin_user_create',
      jsonb_build_object(
        'source', 'sync_profiles_to_logistics_users',
        'profile_id', tp.pid,
        'role', tp.role,
        'department_id', tp.department_id
      ),
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    from target_profiles tp
    returning id as luid, linked_profile_id as pid
  )
  select
    inserted.pid,
    inserted.luid,
    'created'::text
  from inserted;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_driver_cash_balance_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_logistics_route_settlements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_odoo_kpi_values(p_values jsonb, p_period_start date, p_period_end date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_inserted integer := 0;
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_values)
  LOOP
    INSERT INTO kpi.odoo_values (kpi_code, actual_value, note, period_start, period_end, computed_at)
    VALUES (
      v_item->>'code',
      (v_item->>'actual_value')::numeric,
      v_item->>'note',
      p_period_start,
      p_period_end,
      now()
    )
    ON CONFLICT (kpi_code, period_start, period_end)
    DO UPDATE SET
      actual_value = EXCLUDED.actual_value,
      note = EXCLUDED.note,
      computed_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.visits_set_user_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id is null then
    new.user_uid := null;
  else
    select p.user_uid into new.user_uid
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER app_download_links_set_updated_at BEFORE UPDATE ON public.app_download_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_calls_changes AFTER INSERT OR DELETE OR UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_customers_changes AFTER INSERT OR DELETE OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_dispatcher_activity_log_changes AFTER INSERT OR DELETE OR UPDATE ON public.dispatcher_activity_log FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_dispatcher_order_item_preparations_changes AFTER INSERT OR DELETE OR UPDATE ON public.dispatcher_order_item_preparations FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_dispatcher_order_preparations_changes AFTER INSERT OR DELETE OR UPDATE ON public.dispatcher_order_preparations FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_dispatcher_plan_item_preparations_changes AFTER INSERT OR DELETE OR UPDATE ON public.dispatcher_plan_item_preparations FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_dispatcher_plan_preparations_changes AFTER INSERT OR DELETE OR UPDATE ON public.dispatcher_plan_preparations FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_driver_cash_balance_changes AFTER INSERT OR DELETE OR UPDATE ON public.driver_cash_balance FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_driver_plan_collection_checks_changes AFTER INSERT OR DELETE OR UPDATE ON public.driver_plan_collection_checks FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_location_tracking_changes AFTER INSERT OR DELETE OR UPDATE ON public.location_tracking FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_collection_handovers_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_collection_handovers FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_collection_requests_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_collection_requests FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_delivery_plans_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_delivery_plans FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_driver_alerts_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_driver_alerts FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_order_collections_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_order_collections FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_return_shipment_items_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_return_shipment_items FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_route_settlements_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_route_settlements FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_route_tracking_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_route_tracking FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_shipment_collections_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipment_collections FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_shipment_events_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipment_events FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_shipment_items_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_shipment_status_history_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipment_status_history FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_logistics_shipments_changes AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_orders_changes AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER audit_visits_changes AFTER INSERT OR DELETE OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION fn_audit_table_changes();

CREATE TRIGGER calls_set_odoo_insert_payload BEFORE INSERT OR UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION set_calls_odoo_insert_payload();

CREATE TRIGGER calls_set_updated_at BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER competitor_intel_set_updated_at BEFORE UPDATE ON public.competitor_intel FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER create_order_intent_from_visit AFTER INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION create_order_intent_from_visit();

CREATE TRIGGER customers_refresh_logistics_shipment_route_data AFTER UPDATE OF lat, lng, customer_name, external_customer_id ON public.customers FOR EACH ROW WHEN (((old.lat IS DISTINCT FROM new.lat) OR (old.lng IS DISTINCT FROM new.lng) OR (old.customer_name IS DISTINCT FROM new.customer_name) OR (old.external_customer_id IS DISTINCT FROM new.external_customer_id))) EXECUTE FUNCTION logistics_refresh_customer_shipment_route_data();

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER departments_set_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dispatcher_order_item_preparations_set_updated_at BEFORE UPDATE ON public.dispatcher_order_item_preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dispatcher_order_preparations_set_updated_at BEFORE UPDATE ON public.dispatcher_order_preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dispatcher_plan_item_preparations_set_updated_at BEFORE UPDATE ON public.dispatcher_plan_item_preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dispatcher_plan_preparations_set_updated_at BEFORE UPDATE ON public.dispatcher_plan_preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dynamic_form_fields_set_updated_at BEFORE UPDATE ON public.dynamic_form_fields FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER finance_page_visibility_set_updated_at BEFORE UPDATE ON public.finance_page_visibility FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_collection_requests_set_updated_at BEFORE UPDATE ON public.logistics_collection_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_delivery_plans_set_updated_at BEFORE UPDATE ON public.logistics_delivery_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_departments_set_updated_at BEFORE UPDATE ON public.logistics_departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_driver_alerts_set_updated_at BEFORE UPDATE ON public.logistics_driver_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_require_items_before_plan_start BEFORE INSERT OR UPDATE OF plan_status ON public.logistics_delivery_plans FOR EACH ROW EXECUTE FUNCTION logistics_prevent_itemless_active_plan();

CREATE TRIGGER logistics_shipment_collections_set_updated_at BEFORE UPDATE ON public.logistics_shipment_collections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_shipment_items_set_updated_at BEFORE UPDATE ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_shipments_complete_plan_after_delivery AFTER INSERT OR DELETE OR UPDATE OF plan_id, shipment_status ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.logistics_shipments_complete_plan_after_delivery();

CREATE TRIGGER logistics_shipments_hydrate_route_data BEFORE INSERT OR UPDATE OF linked_order_id, customer_id, external_customer_id, warehouse_id, external_warehouse_id, warehouse_name, customer_latitude, customer_longitude, warehouse_latitude, warehouse_longitude ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION logistics_hydrate_shipment_route_data();

CREATE TRIGGER logistics_shipments_set_updated_at BEFORE UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_shipments_status_history AFTER UPDATE OF shipment_status ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION logistics_record_shipment_status_history();

CREATE TRIGGER logistics_sync_watermarks_set_updated_at BEFORE UPDATE ON public.logistics_sync_watermarks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_users_set_updated_at BEFORE UPDATE ON public.logistics_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER logistics_warehouses_set_updated_at BEFORE UPDATE ON public.logistics_warehouses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER notify_logistics_shipment_business_events AFTER INSERT OR UPDATE OF assigned_profile_id, delivery_phase, shipment_status ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION notify_logistics_shipment_business_events();

CREATE TRIGGER notify_order_intent_created AFTER INSERT ON public.order_intents FOR EACH ROW EXECUTE FUNCTION notify_order_intent_created();

CREATE TRIGGER odoo_actions_set_updated_at BEFORE UPDATE ON public.odoo_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER odoo_crm_activity_dispatches_set_updated_at BEFORE UPDATE ON public.odoo_crm_activity_dispatches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER on_profile_created_logistics_user AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_new_logistics_profile();

CREATE TRIGGER order_delivery_documents_set_updated_at BEFORE UPDATE ON public.order_delivery_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER order_intents_set_updated_at BEFORE UPDATE ON public.order_intents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER order_invoice_documents_set_updated_at BEFORE UPDATE ON public.order_invoice_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER order_line_items_set_updated_at BEFORE UPDATE ON public.order_line_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_set_odoo_insert_payload BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_orders_odoo_insert_payload();

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER permission_catalog_set_updated_at BEFORE UPDATE ON public.permission_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER product_barcodes_set_updated_at BEFORE UPDATE ON public.product_barcodes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_dataset_set_updated_at BEFORE UPDATE ON public.products_dataset FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_set_odoo_insert_payload BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_products_odoo_insert_payload();

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER quotations_set_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER role_definitions_set_updated_at BEFORE UPDATE ON public.role_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sales_product_customer_mappings_set_updated_at BEFORE UPDATE ON public.sales_product_customer_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sales_targets_set_updated_at BEFORE UPDATE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_issues_set_updated_at BEFORE UPDATE ON public.service_issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_suplyd_products_live_updated_at BEFORE UPDATE ON public.suplyd_products_live FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calls_set_user_uid BEFORE INSERT OR UPDATE OF user_id ON public.calls FOR EACH ROW EXECUTE FUNCTION calls_set_user_uid();

CREATE TRIGGER trg_customer_interactions_set_user_uid BEFORE INSERT OR UPDATE OF actor_user_id ON public.customer_interactions FOR EACH ROW EXECUTE FUNCTION customer_interactions_set_user_uid();

CREATE TRIGGER trg_finance_driver_settlements_updated_at BEFORE UPDATE ON public.finance_driver_settlements FOR EACH ROW EXECUTE FUNCTION set_finance_driver_settlements_updated_at();

CREATE TRIGGER trg_finance_invoices_updated_at BEFORE UPDATE ON public.finance_invoices FOR EACH ROW EXECUTE FUNCTION set_finance_invoices_updated_at();

CREATE TRIGGER trg_finance_payments_updated_at BEFORE UPDATE ON public.finance_payments FOR EACH ROW EXECUTE FUNCTION set_finance_payments_updated_at();

CREATE TRIGGER trg_normalize_display_type BEFORE INSERT OR UPDATE ON public.order_line_items FOR EACH ROW EXECUTE FUNCTION normalize_display_type();

CREATE TRIGGER trg_odoo_pending_actions_updated_at BEFORE UPDATE ON public.odoo_pending_actions FOR EACH ROW EXECUTE FUNCTION set_odoo_pending_action_updated_at();

CREATE TRIGGER trg_order_tickets_updated_at BEFORE UPDATE ON public.order_tickets FOR EACH ROW EXECUTE FUNCTION set_order_tickets_updated_at();

CREATE TRIGGER trg_orders_set_user_uid BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION orders_set_user_uid();

CREATE TRIGGER trg_profiles_propagate_user_uid_to_calls AFTER UPDATE OF user_uid ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_propagate_user_uid_to_calls();

CREATE TRIGGER trg_profiles_propagate_user_uid_to_customer_interactions AFTER UPDATE OF user_uid ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_propagate_user_uid_to_customer_interactions();

CREATE TRIGGER trg_profiles_set_user_uid BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_set_user_uid();

CREATE TRIGGER trg_sync_logistics_user_from_profile AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_logistics_user_from_profile();

CREATE TRIGGER trg_visits_set_user_uid BEFORE INSERT OR UPDATE OF user_id ON public.visits FOR EACH ROW EXECUTE FUNCTION visits_set_user_uid();

CREATE TRIGGER trigger_update_driver_cash_balance_updated_at BEFORE UPDATE ON public.driver_cash_balance FOR EACH ROW EXECUTE FUNCTION update_driver_cash_balance_updated_at();

CREATE TRIGGER trigger_update_logistics_route_settlements_updated_at BEFORE UPDATE ON public.logistics_route_settlements FOR EACH ROW EXECUTE FUNCTION update_logistics_route_settlements_updated_at();

CREATE TRIGGER update_driver_plan_collection_checks_updated_at BEFORE UPDATE ON public.driver_plan_collection_checks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_driver_plan_settlement_requests_updated_at BEFORE UPDATE ON public.driver_plan_settlement_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_logistics_order_collections_updated_at BEFORE UPDATE ON public.logistics_order_collections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_logistics_route_tracking_updated_at BEFORE UPDATE ON public.logistics_route_tracking FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER visit_note_translations_set_updated_at BEFORE UPDATE ON public.visit_note_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER visits_set_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "public"."calls" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_delivery_plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_collection_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipment_collections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_driver_settlements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "kpi"."odoo_values" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "kpi"."manual_values" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."location_tracking" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_collection_handovers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notification_recipients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."visits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "kpi"."kpi_tracking" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dispatcher_order_item_preparations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."competitor_intel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dispatcher_activity_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."department_role_assignments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dispatcher_order_preparations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dispatcher_plan_item_preparations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."app_download_links" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."customer_interactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dynamic_form_field_options" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."driver_cash_balance" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_credit_notes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_accounts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_cost_centers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dynamic_form_fields" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dispatcher_plan_preparations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_fiscal_periods" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_document_sequences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."driver_plan_collection_checks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."driver_plan_settlement_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."last_rows_report" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."kpi_manual_upload_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."kpi_manual_values" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_journal_entries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_order_collections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_page_visibility" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_journal_lines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_departments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_journals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_invoice_lines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_tax_rates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipment_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipment_status_history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_sync_watermarks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_route_settlements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_vehicle_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_warehouses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipment_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_pending_action_audit_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_crm_model_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_crm_activity_reports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."onboarding_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_crm_lead_actions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_sync_rules" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_pending_actions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_actions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_cancellations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_crm_activity_dispatches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."product_catalog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."product_barcodes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_tickets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_ticket_comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."products_dataset" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_delivery_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_intents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."permission_catalog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_invoice_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."order_line_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."suplyd_products_history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."service_issues" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_product_customer_mappings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_product_category_mappings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sla_definitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sla_breaches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_customer_type_mappings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."role_definitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."role_permission_assignments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_brand_mappings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."warehouse_inventory" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_device_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."visit_dynamic_answers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."suplyd_scrape_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_credit_note_lines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."suplyd_products_live" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."odoo_crm_leads" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sales_customer_speciality_mappings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."visit_note_translations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_return_shipment_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_driver_alerts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "kpi"."manual_upload_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_route_tracking" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kt_auth_all" ON "kpi"."kpi_tracking" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "kt_auth_read" ON "kpi"."kpi_tracking" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "mub_auth_read" ON "kpi"."manual_upload_batches" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "mub_auth_insert" ON "kpi"."manual_upload_batches" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK ((auth.uid() = uploaded_by));

CREATE POLICY "mv_auth_read" ON "kpi"."manual_values" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "mv_auth_insert" ON "kpi"."manual_values" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK ((auth.uid() = uploaded_by));

CREATE POLICY "odoo_values_auth_read" ON "kpi"."odoo_values" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "odoo_values_service_insert" ON "kpi"."odoo_values" AS PERMISSIVE FOR ALL TO "service_role" WITH CHECK (true);

CREATE POLICY "odoo_values_service_update" ON "kpi"."odoo_values" AS PERMISSIVE FOR ALL TO "service_role" USING (true);

CREATE POLICY "app_download_links_management_write" ON "public"."app_download_links" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "app_download_links_authenticated_read" ON "public"."app_download_links" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_active OR is_management_role()));

CREATE POLICY "audit_logs_authenticated_insert" ON "public"."audit_logs" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "audit_logs_management_read" ON "public"."audit_logs" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "calls_self_insert" ON "public"."calls" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((is_management_role() OR (user_id = auth.uid())));

CREATE POLICY "calls_admin_delete" ON "public"."calls" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "calls_scoped_read" ON "public"."calls" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = calls.customer_id) AND ((c.assigned_user_id = auth.uid()) OR (c.created_by = auth.uid())))))));

CREATE POLICY "calls_scoped_update" ON "public"."calls" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (user_id = auth.uid()))) WITH CHECK ((is_management_role() OR (user_id = auth.uid())));

CREATE POLICY "Public can manage cart items" ON "public"."cart_items" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "Allow all for authenticated" ON "public"."categories" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "competitor_intel_scoped_update" ON "public"."competitor_intel" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = competitor_intel.call_id) AND (c.user_id = auth.uid())))))) WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = competitor_intel.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "competitor_intel_scoped_read" ON "public"."competitor_intel" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = competitor_intel.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "competitor_intel_scoped_insert" ON "public"."competitor_intel" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = competitor_intel.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "customer_interactions_scoped_read" ON "public"."customer_interactions" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (actor_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_interactions.customer_id) AND ((c.assigned_user_id = auth.uid()) OR (c.created_by = auth.uid())))))));

CREATE POLICY "customer_interactions_admin_delete" ON "public"."customer_interactions" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "customer_interactions_scoped_insert" ON "public"."customer_interactions" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((is_management_role() OR (actor_user_id = auth.uid())));

CREATE POLICY "customers_scoped_read" ON "public"."customers" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (current_app_role() = 'telesales'::app_role) OR (assigned_user_id = ( SELECT auth.uid() AS uid)) OR (created_by = ( SELECT auth.uid() AS uid))));

CREATE POLICY "customers_admin_delete" ON "public"."customers" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "customers_insert_all" ON "public"."customers" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (true);

CREATE POLICY "customers_scoped_update" ON "public"."customers" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (assigned_user_id = auth.uid()) OR (created_by = auth.uid()))) WITH CHECK ((is_management_role() OR (assigned_user_id = auth.uid()) OR (created_by = auth.uid())));

CREATE POLICY "department_role_assignments_management_read" ON "public"."department_role_assignments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "department_role_assignments_admin_write" ON "public"."department_role_assignments" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "departments_admin_write" ON "public"."departments" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "departments_management_read" ON "public"."departments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "dispatcher_insert_own_activity" ON "public"."dispatcher_activity_log" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((actor_profile_id = auth.uid()));

CREATE POLICY "dispatcher_read_activity" ON "public"."dispatcher_activity_log" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "dispatcher_order_item_preparations_logistics_insert" ON "public"."dispatcher_order_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_order_item_preparations_logistics_update" ON "public"."dispatcher_order_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_order_item_preparations_logistics_read" ON "public"."dispatcher_order_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "dispatcher_order_preparations_logistics_update" ON "public"."dispatcher_order_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_order_preparations_logistics_read" ON "public"."dispatcher_order_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "dispatcher_order_preparations_logistics_insert" ON "public"."dispatcher_order_preparations" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_plan_item_preparations_driver_read" ON "public"."dispatcher_plan_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM logistics_shipments ls
  WHERE ((ls.plan_id = dispatcher_plan_item_preparations.plan_id) AND (ls.assigned_profile_id = auth.uid())))));

CREATE POLICY "dispatcher_plan_item_preparations_logistics_read" ON "public"."dispatcher_plan_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "dispatcher_plan_item_preparations_logistics_update" ON "public"."dispatcher_plan_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_plan_item_preparations_logistics_insert" ON "public"."dispatcher_plan_item_preparations" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_plan_preparations_logistics_insert" ON "public"."dispatcher_plan_preparations" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_plan_preparations_logistics_read" ON "public"."dispatcher_plan_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "dispatcher_plan_preparations_logistics_update" ON "public"."dispatcher_plan_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dispatcher_plan_preparations_driver_read" ON "public"."dispatcher_plan_preparations" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM logistics_shipments ls
  WHERE ((ls.plan_id = dispatcher_plan_preparations.plan_id) AND (ls.assigned_profile_id = auth.uid())))));

CREATE POLICY "Drivers can update own cash balance" ON "public"."driver_cash_balance" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = driver_cash_balance.driver_id)))));

CREATE POLICY "Drivers can view own cash balance" ON "public"."driver_cash_balance" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = driver_cash_balance.driver_id)))));

CREATE POLICY "Drivers can insert own cash balance" ON "public"."driver_cash_balance" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = driver_cash_balance.driver_id)))));

CREATE POLICY "driver_collection_checks_own" ON "public"."driver_plan_collection_checks" AS PERMISSIVE FOR ALL TO "public" USING ((driver_profile_id = auth.uid())) WITH CHECK ((driver_profile_id = auth.uid()));

CREATE POLICY "driver_collection_checks_mgmt" ON "public"."driver_plan_collection_checks" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "management_read_settlement_requests" ON "public"."driver_plan_settlement_requests" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "management_update_settlement_requests" ON "public"."driver_plan_settlement_requests" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "driver_read_own_settlement_requests" ON "public"."driver_plan_settlement_requests" AS PERMISSIVE FOR ALL TO "public" USING (((driver_profile_id = ((auth.uid())::text)::uuid) OR ((driver_profile_id)::text = (auth.uid())::text)));

CREATE POLICY "driver_insert_own_settlement_requests" ON "public"."driver_plan_settlement_requests" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((driver_profile_id = ((auth.uid())::text)::uuid) OR ((driver_profile_id)::text = (auth.uid())::text)));

CREATE POLICY "dynamic_field_options_management_write" ON "public"."dynamic_form_field_options" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dynamic_field_options_admin_delete" ON "public"."dynamic_form_field_options" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "dynamic_field_options_management_read" ON "public"."dynamic_form_field_options" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "dynamic_fields_management_write" ON "public"."dynamic_form_fields" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "dynamic_fields_management_read" ON "public"."dynamic_form_fields" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "dynamic_fields_admin_delete" ON "public"."dynamic_form_fields" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_accounts_admin_delete" ON "public"."finance_accounts" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_accounts_manage" ON "public"."finance_accounts" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_accounts_view" ON "public"."finance_accounts" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_cost_centers_manage" ON "public"."finance_cost_centers" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_cost_centers_view" ON "public"."finance_cost_centers" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "credit_note_lines_insert" ON "public"."finance_credit_note_lines" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (has_role_permission('finance.manage'::text));

CREATE POLICY "credit_note_lines_select" ON "public"."finance_credit_note_lines" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "credit_note_lines_delete" ON "public"."finance_credit_note_lines" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "credit_notes_select" ON "public"."finance_credit_notes" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "credit_notes_update" ON "public"."finance_credit_notes" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "credit_notes_insert" ON "public"."finance_credit_notes" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_document_sequences_manage" ON "public"."finance_document_sequences" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_document_sequences_view" ON "public"."finance_document_sequences" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_driver_settlements_manage" ON "public"."finance_driver_settlements" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_driver_settlements_view" ON "public"."finance_driver_settlements" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_driver_settlements_admin_delete" ON "public"."finance_driver_settlements" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_fiscal_periods_manage" ON "public"."finance_fiscal_periods" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_fiscal_periods_view" ON "public"."finance_fiscal_periods" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_invoice_lines_manage" ON "public"."finance_invoice_lines" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_invoice_lines_admin_delete" ON "public"."finance_invoice_lines" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_invoice_lines_view" ON "public"."finance_invoice_lines" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_invoices_manage" ON "public"."finance_invoices" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_invoices_view" ON "public"."finance_invoices" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_invoices_admin_delete" ON "public"."finance_invoices" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_journal_entries_admin_delete" ON "public"."finance_journal_entries" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_journal_entries_view" ON "public"."finance_journal_entries" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_journal_lines_admin_delete" ON "public"."finance_journal_lines" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "finance_journal_lines_view" ON "public"."finance_journal_lines" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "journals_select" ON "public"."finance_journals" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "journals_manage" ON "public"."finance_journals" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_page_visibility_insert" ON "public"."finance_page_visibility" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_page_visibility_update" ON "public"."finance_page_visibility" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text)) WITH CHECK (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_page_visibility_view" ON "public"."finance_page_visibility" AS PERMISSIVE FOR ALL TO "public" USING ((has_role_permission('finance.view'::text) OR has_role_permission('finance.manage'::text)));

CREATE POLICY "finance_payments_view" ON "public"."finance_payments" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_payments_manage" ON "public"."finance_payments" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text)) WITH CHECK (has_role_permission('finance.manage'::text));

CREATE POLICY "finance_tax_rates_view" ON "public"."finance_tax_rates" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.view'::text));

CREATE POLICY "finance_tax_rates_manage" ON "public"."finance_tax_rates" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('finance.manage'::text));

CREATE POLICY "kpi_manual_upload_batches_dashboard_read" ON "public"."kpi_manual_upload_batches" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('dashboard.view'::text));

CREATE POLICY "kpi_manual_upload_batches_management_insert" ON "public"."kpi_manual_upload_batches" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((auth.uid() = uploaded_by) AND (has_role_permission('finance.manage'::text) OR has_role_permission('logistics.manage'::text) OR has_role_permission('users.role-change'::text))));

CREATE POLICY "kpi_manual_values_management_insert" ON "public"."kpi_manual_values" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((auth.uid() = uploaded_by) AND (has_role_permission('finance.manage'::text) OR has_role_permission('logistics.manage'::text) OR has_role_permission('users.role-change'::text))));

CREATE POLICY "kpi_manual_values_dashboard_read" ON "public"."kpi_manual_values" AS PERMISSIVE FOR ALL TO "public" USING (has_role_permission('dashboard.view'::text));

CREATE POLICY "driver_read_own_location" ON "public"."location_tracking" AS PERMISSIVE FOR ALL TO "public" USING ((user_id = auth.uid()));

CREATE POLICY "management_read_all_locations" ON "public"."location_tracking" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "location_tracking_self_insert" ON "public"."location_tracking" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "location_tracking_scoped_read" ON "public"."location_tracking" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (user_id = auth.uid())));

CREATE POLICY "driver_insert_own_location" ON "public"."location_tracking" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "logistics_collection_handovers_driver_insert" ON "public"."logistics_collection_handovers" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((driver_profile_id = auth.uid()));

CREATE POLICY "logistics_collection_handovers_scoped_read" ON "public"."logistics_collection_handovers" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (driver_profile_id = auth.uid())));

CREATE POLICY "logistics_collection_requests_driver_insert" ON "public"."logistics_collection_requests" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((driver_profile_id = auth.uid()));

CREATE POLICY "logistics_collection_requests_scoped_read" ON "public"."logistics_collection_requests" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (driver_profile_id = auth.uid())));

CREATE POLICY "logistics_collection_requests_management_update" ON "public"."logistics_collection_requests" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_delivery_plans_auth_read" ON "public"."logistics_delivery_plans" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (assigned_profile_id = auth.uid())));

CREATE POLICY "logistics_delivery_plans_management_write" ON "public"."logistics_delivery_plans" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_delivery_plans_admin_delete" ON "public"."logistics_delivery_plans" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_departments_management_write" ON "public"."logistics_departments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_departments_auth_read" ON "public"."logistics_departments" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "logistics_driver_alerts_management_update" ON "public"."logistics_driver_alerts" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_driver_alerts_management_read" ON "public"."logistics_driver_alerts" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (driver_profile_id = auth.uid())));

CREATE POLICY "logistics_driver_alerts_driver_insert" ON "public"."logistics_driver_alerts" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((driver_profile_id = auth.uid()));

CREATE POLICY "management_read_order_collections" ON "public"."logistics_order_collections" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "driver_manage_own_order_collections" ON "public"."logistics_order_collections" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM logistics_shipments s
  WHERE (((s.id)::text = logistics_order_collections.shipment_id) AND (s.assigned_profile_id = auth.uid())))));

CREATE POLICY "dispatcher can manage return items" ON "public"."logistics_return_shipment_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "drivers see their return shipment items" ON "public"."logistics_return_shipment_items" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM logistics_shipments s
  WHERE ((s.id = logistics_return_shipment_items.return_shipment_id) AND (s.assigned_profile_id = auth.uid())))));

CREATE POLICY "Drivers can insert own settlements" ON "public"."logistics_route_settlements" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = logistics_route_settlements.driver_id)))));

CREATE POLICY "Drivers can view own settlements" ON "public"."logistics_route_settlements" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = logistics_route_settlements.driver_id)))));

CREATE POLICY "Drivers can update own settlements" ON "public"."logistics_route_settlements" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.id = logistics_route_settlements.driver_id)))));

CREATE POLICY "driver_manage_own_route_tracking" ON "public"."logistics_route_tracking" AS PERMISSIVE FOR ALL TO "public" USING ((driver_profile_id = (auth.uid())::text));

CREATE POLICY "management_read_route_tracking" ON "public"."logistics_route_tracking" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "logistics_shipment_collections_management_write" ON "public"."logistics_shipment_collections" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_shipment_collections_auth_read" ON "public"."logistics_shipment_collections" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM logistics_shipments s
  WHERE (((s.id)::text = (logistics_shipment_collections.shipment_id)::text) AND ((s.assigned_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM logistics_delivery_plans p
          WHERE (((p.id)::text = (s.plan_id)::text) AND (p.assigned_profile_id = auth.uid()))))))))));

CREATE POLICY "logistics_shipment_events_management_write" ON "public"."logistics_shipment_events" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_shipment_events_auth_read" ON "public"."logistics_shipment_events" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (actor_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM logistics_shipments shipment
  WHERE (((shipment.id)::text = (logistics_shipment_events.shipment_id)::text) AND ((shipment.assigned_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM logistics_delivery_plans p
          WHERE (((p.id)::text = (shipment.plan_id)::text) AND (p.assigned_profile_id = auth.uid()))))))))));

CREATE POLICY "logistics_shipment_events_admin_delete" ON "public"."logistics_shipment_events" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_shipment_items_admin_delete" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_shipment_items_auth_read" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "logistics_shipment_items_management_write" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_shipment_status_history_management_write" ON "public"."logistics_shipment_status_history" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_shipment_status_history_auth_read" ON "public"."logistics_shipment_status_history" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM logistics_shipments shipment
  WHERE ((shipment.id = logistics_shipment_status_history.shipment_id) AND (shipment.assigned_profile_id = auth.uid()))))));

CREATE POLICY "logistics_shipments_auth_read" ON "public"."logistics_shipments" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (assigned_profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM logistics_delivery_plans p
  WHERE (((p.id)::text = (logistics_shipments.plan_id)::text) AND (p.assigned_profile_id = auth.uid()))))));

CREATE POLICY "logistics_shipments_admin_delete" ON "public"."logistics_shipments" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_shipments_management_write" ON "public"."logistics_shipments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_sync_watermarks_service_all" ON "public"."logistics_sync_watermarks" AS PERMISSIVE FOR ALL TO "public" USING (true) WITH CHECK (true);

CREATE POLICY "logistics_users_management_write" ON "public"."logistics_users" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "logistics_users_admin_delete" ON "public"."logistics_users" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_users_auth_read" ON "public"."logistics_users" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "read_vehicle_profiles" ON "public"."logistics_vehicle_profiles" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "logistics_warehouses_admin_delete" ON "public"."logistics_warehouses" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "logistics_warehouses_auth_read" ON "public"."logistics_warehouses" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "logistics_warehouses_management_write" ON "public"."logistics_warehouses" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "notification_recipients_admin_delete" ON "public"."notification_recipients" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "notification_recipients_self_update" ON "public"."notification_recipients" AS PERMISSIVE FOR ALL TO "public" USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "notification_recipients_admin_write" ON "public"."notification_recipients" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "notification_recipients_scoped_read" ON "public"."notification_recipients" AS PERMISSIVE FOR ALL TO "public" USING (((user_id = auth.uid()) OR is_management_role()));

CREATE POLICY "notifications_admin_insert" ON "public"."notifications" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (is_admin_role());

CREATE POLICY "notifications_management_read" ON "public"."notifications" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM notification_recipients nr
  WHERE ((nr.notification_id = nr.id) AND (nr.user_id = auth.uid()))))));

CREATE POLICY "notifications_admin_delete" ON "public"."notifications" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "odoo_actions_management_read" ON "public"."odoo_actions" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "odoo_actions_admin_write" ON "public"."odoo_actions" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "odoo_crm_activity_dispatches_requester_or_management_read" ON "public"."odoo_crm_activity_dispatches" AS PERMISSIVE FOR ALL TO "authenticated" USING (((requester_id = auth.uid()) OR is_management_role()));

CREATE POLICY "odoo_crm_activity_reports_authenticated_read" ON "public"."odoo_crm_activity_reports" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "odoo_crm_lead_actions_authenticated_read" ON "public"."odoo_crm_lead_actions" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "odoo_crm_lead_actions_authenticated_insert" ON "public"."odoo_crm_lead_actions" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "odoo_crm_leads_authenticated_read" ON "public"."odoo_crm_leads" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "odoo_crm_model_records_authenticated_read" ON "public"."odoo_crm_model_records" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "odoo_audit_log_admin_manage" ON "public"."odoo_pending_action_audit_log" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((profiles.status IS NULL) OR (profiles.status = 'active'::record_status))))));

CREATE POLICY "odoo_audit_log_authenticated_read" ON "public"."odoo_pending_action_audit_log" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "odoo_pending_actions_admin_manage" ON "public"."odoo_pending_actions" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((profiles.status IS NULL) OR (profiles.status = 'active'::record_status))))));

CREATE POLICY "odoo_pending_actions_authenticated_insert" ON "public"."odoo_pending_actions" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "odoo_pending_actions_authenticated_read" ON "public"."odoo_pending_actions" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "odoo_sync_rules_admin_manage" ON "public"."odoo_sync_rules" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((profiles.status IS NULL) OR (profiles.status = 'active'::record_status))))));

CREATE POLICY "odoo_sync_rules_authenticated_read" ON "public"."odoo_sync_rules" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users can update their own onboarding progress" ON "public"."onboarding_progress" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own onboarding progress" ON "public"."onboarding_progress" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own onboarding progress" ON "public"."onboarding_progress" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));

CREATE POLICY "order_cancellations_scoped_read" ON "public"."order_cancellations" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "order_cancellations_management_insert" ON "public"."order_cancellations" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (is_management_role());

CREATE POLICY "order_delivery_documents_management_write" ON "public"."order_delivery_documents" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "order_delivery_documents_auth_read" ON "public"."order_delivery_documents" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "order_intents_management_update" ON "public"."order_intents" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM profiles profile
  WHERE ((profile.id = ( SELECT auth.uid() AS uid)) AND (profile.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'supervisor'::app_role]))))))) WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM profiles profile
  WHERE ((profile.id = ( SELECT auth.uid() AS uid)) AND (profile.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'supervisor'::app_role])))))));

CREATE POLICY "order_intents_scoped_read" ON "public"."order_intents" AS PERMISSIVE FOR ALL TO "authenticated" USING (((sales_profile_id = ( SELECT auth.uid() AS uid)) OR is_management_role() OR (EXISTS ( SELECT 1
   FROM profiles profile
  WHERE ((profile.id = ( SELECT auth.uid() AS uid)) AND (profile.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'supervisor'::app_role])))))));

CREATE POLICY "order_intents_sales_insert_own" ON "public"."order_intents" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (((sales_profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles profile
  WHERE ((profile.id = ( SELECT auth.uid() AS uid)) AND (profile.status = 'active'::record_status) AND (profile.role = ANY (ARRAY['sales_agent'::app_role, 'telesales'::app_role, 'manager'::app_role, 'supervisor'::app_role, 'admin'::app_role])))))));

CREATE POLICY "order_invoice_documents_auth_read" ON "public"."order_invoice_documents" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "order_invoice_documents_management_write" ON "public"."order_invoice_documents" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "order_line_items_management_write" ON "public"."order_line_items" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "order_line_items_auth_read" ON "public"."order_line_items" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public can insert order status history" ON "public"."order_status_history" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (true);

CREATE POLICY "Public can view order status history" ON "public"."order_status_history" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "order_ticket_comments_insert" ON "public"."order_ticket_comments" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((author_id = auth.uid()) AND (is_management_role() OR (EXISTS ( SELECT 1
   FROM order_tickets t
  WHERE ((t.id = order_ticket_comments.ticket_id) AND ((t.assigned_to = auth.uid()) OR (t.created_by = auth.uid()))))))));

CREATE POLICY "order_ticket_comments_management_all" ON "public"."order_ticket_comments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "order_ticket_comments_select" ON "public"."order_ticket_comments" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM order_tickets t
  WHERE ((t.id = order_ticket_comments.ticket_id) AND ((t.assigned_to = auth.uid()) OR (t.created_by = auth.uid())))))));

CREATE POLICY "order_tickets_telesales_insert" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((current_app_role() = 'telesales'::app_role) AND (created_by = auth.uid())));

CREATE POLICY "order_tickets_telesales_update" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" USING (((current_app_role() = 'telesales'::app_role) AND ((assigned_to = auth.uid()) OR (created_by = auth.uid()))));

CREATE POLICY "order_tickets_telesales_read" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" USING (((current_app_role() = 'telesales'::app_role) AND ((assigned_to = auth.uid()) OR (created_by = auth.uid()))));

CREATE POLICY "order_tickets_sales_agent_update" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" USING (((current_app_role() = 'sales_agent'::app_role) AND ((assigned_to = auth.uid()) OR (created_by = auth.uid()))));

CREATE POLICY "order_tickets_sales_agent_read" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" USING (((current_app_role() = 'sales_agent'::app_role) AND ((assigned_to = auth.uid()) OR (created_by = auth.uid()))));

CREATE POLICY "order_tickets_sales_agent_insert" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((current_app_role() = 'sales_agent'::app_role) AND (created_by = auth.uid())));

CREATE POLICY "order_tickets_management_all" ON "public"."order_tickets" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "orders_admin_delete" ON "public"."orders" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "orders_scoped_read" ON "public"."orders" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (current_app_role() = 'telesales'::app_role) OR (assigned_user_id = ( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT profiles.odoo_user_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))));

CREATE POLICY "Public can read orders" ON "public"."orders" AS PERMISSIVE FOR ALL TO "public" USING (true);

CREATE POLICY "orders_management_write" ON "public"."orders" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "Public can insert orders" ON "public"."orders" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (true);

CREATE POLICY "permission_catalog_admin_write" ON "public"."permission_catalog" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "permission_catalog_management_read" ON "public"."permission_catalog" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "product_barcodes_logistics_read" ON "public"."product_barcodes" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "product_barcodes_logistics_update" ON "public"."product_barcodes" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "product_barcodes_logistics_write" ON "public"."product_barcodes" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK (is_management_role());

CREATE POLICY "Allow all for authenticated" ON "public"."product_catalog" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Allow all for authenticated" ON "public"."product_variants" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "products_auth_read" ON "public"."products" AS PERMISSIVE FOR ALL TO "authenticated" USING (true);

CREATE POLICY "products_management_write" ON "public"."products" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "products_dataset_logistics_read" ON "public"."products_dataset" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role());

CREATE POLICY "products_dataset_logistics_update" ON "public"."products_dataset" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "profiles_admin_update" ON "public"."profiles" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "profiles_self_update_password_flag" ON "public"."profiles" AS PERMISSIVE FOR ALL TO "public" USING (((id = auth.uid()) AND (requires_password_change = true))) WITH CHECK (((id = auth.uid()) AND (requires_password_change = false)));

CREATE POLICY "profiles_self_or_management_read" ON "public"."profiles" AS PERMISSIVE FOR ALL TO "public" USING (((id = auth.uid()) OR is_management_role()));

CREATE POLICY "profiles_admin_insert" ON "public"."profiles" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (is_admin_role());

CREATE POLICY "quotation_items_scoped_insert" ON "public"."quotation_items" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (q.created_by = auth.uid()))))));

CREATE POLICY "quotation_items_admin_delete" ON "public"."quotation_items" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "quotation_items_scoped_read" ON "public"."quotation_items" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM quotations q
  WHERE ((q.id = quotation_items.quotation_id) AND (q.created_by = auth.uid()))))));

CREATE POLICY "quotations_scoped_update" ON "public"."quotations" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (created_by = auth.uid()))) WITH CHECK ((is_management_role() OR (created_by = auth.uid())));

CREATE POLICY "quotations_admin_delete" ON "public"."quotations" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "quotations_scoped_insert" ON "public"."quotations" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (((created_by = auth.uid()) OR is_management_role()));

CREATE POLICY "quotations_scoped_read" ON "public"."quotations" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (created_by = auth.uid())));

CREATE POLICY "role_definitions_management_read" ON "public"."role_definitions" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "role_definitions_admin_write" ON "public"."role_definitions" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "role_permission_assignments_admin_write" ON "public"."role_permission_assignments" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "role_permission_assignments_management_read" ON "public"."role_permission_assignments" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "sales_brand_mappings_management_write" ON "public"."sales_brand_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "sales_brand_mappings_auth_read" ON "public"."sales_brand_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_active);

CREATE POLICY "sales_customer_speciality_mappings_management_write" ON "public"."sales_customer_speciality_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "sales_customer_speciality_mappings_auth_read" ON "public"."sales_customer_speciality_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_active);

CREATE POLICY "sales_customer_type_mappings_auth_read" ON "public"."sales_customer_type_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_active);

CREATE POLICY "sales_customer_type_mappings_management_write" ON "public"."sales_customer_type_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "sales_product_category_mappings_management_write" ON "public"."sales_product_category_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "sales_product_category_mappings_auth_read" ON "public"."sales_product_category_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_active);

CREATE POLICY "sales_product_customer_mappings_management_write" ON "public"."sales_product_customer_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "sales_product_customer_mappings_auth_read" ON "public"."sales_product_customer_mappings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_active);

CREATE POLICY "sales_targets_admin_delete" ON "public"."sales_targets" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "sales_targets_self_or_management_read" ON "public"."sales_targets" AS PERMISSIVE FOR ALL TO "public" USING (((user_id = auth.uid()) OR is_management_role()));

CREATE POLICY "sales_targets_management_write" ON "public"."sales_targets" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());

CREATE POLICY "service_issues_scoped_read" ON "public"."service_issues" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = service_issues.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "service_issues_scoped_insert" ON "public"."service_issues" AS PERMISSIVE FOR ALL TO "authenticated" WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = service_issues.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "service_issues_scoped_update" ON "public"."service_issues" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = service_issues.call_id) AND (c.user_id = auth.uid())))))) WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM calls c
  WHERE ((c.id = service_issues.call_id) AND (c.user_id = auth.uid()))))));

CREATE POLICY "sla_breaches_management_insert" ON "public"."sla_breaches" AS PERMISSIVE FOR ALL TO "public" WITH CHECK (is_management_role());

CREATE POLICY "sla_breaches_management_read" ON "public"."sla_breaches" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "sla_definitions_management_read" ON "public"."sla_definitions" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "sla_definitions_admin_write" ON "public"."sla_definitions" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role()) WITH CHECK (is_admin_role());

CREATE POLICY "Service role full access on suplyd_products_history" ON "public"."suplyd_products_history" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role full access on suplyd_products_live" ON "public"."suplyd_products_live" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role full access on suplyd_scrape_batches" ON "public"."suplyd_scrape_batches" AS PERMISSIVE FOR ALL TO "public" USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Public can view active tenants" ON "public"."tenants" AS PERMISSIVE FOR ALL TO "public" USING ((status = 'active'::text));

CREATE POLICY "device_sessions_self_update" ON "public"."user_device_sessions" AS PERMISSIVE FOR ALL TO "public" USING (((user_id = auth.uid()) OR is_admin_role())) WITH CHECK (((user_id = auth.uid()) OR is_admin_role()));

CREATE POLICY "device_sessions_self_read" ON "public"."user_device_sessions" AS PERMISSIVE FOR ALL TO "public" USING (((user_id = auth.uid()) OR is_management_role()));

CREATE POLICY "device_sessions_self_insert" ON "public"."user_device_sessions" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "visit_answers_scoped_read" ON "public"."visit_dynamic_answers" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (EXISTS ( SELECT 1
   FROM visits v
  WHERE ((v.id = visit_dynamic_answers.visit_id) AND (v.user_id = auth.uid()))))));

CREATE POLICY "visit_answers_scoped_insert" ON "public"."visit_dynamic_answers" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((is_management_role() OR (EXISTS ( SELECT 1
   FROM visits v
  WHERE ((v.id = visit_dynamic_answers.visit_id) AND (v.user_id = auth.uid()))))));

CREATE POLICY "visits_scoped_update" ON "public"."visits" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (user_id = auth.uid()))) WITH CHECK ((is_management_role() OR (user_id = auth.uid())));

CREATE POLICY "visits_self_insert" ON "public"."visits" AS PERMISSIVE FOR ALL TO "public" WITH CHECK ((is_management_role() OR (user_id = auth.uid())));

CREATE POLICY "visits_scoped_read" ON "public"."visits" AS PERMISSIVE FOR ALL TO "public" USING ((is_management_role() OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = visits.customer_id) AND ((c.assigned_user_id = auth.uid()) OR (c.created_by = auth.uid())))))));

CREATE POLICY "visits_admin_delete" ON "public"."visits" AS PERMISSIVE FOR ALL TO "public" USING (is_admin_role());

CREATE POLICY "management_read_warehouse_inventory" ON "public"."warehouse_inventory" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role());

CREATE POLICY "management_write_warehouse_inventory" ON "public"."warehouse_inventory" AS PERMISSIVE FOR ALL TO "public" USING (is_management_role()) WITH CHECK (is_management_role());
