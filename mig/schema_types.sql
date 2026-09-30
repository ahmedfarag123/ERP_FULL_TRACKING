CREATE SCHEMA IF NOT EXISTS kpi;
CREATE SCHEMA IF NOT EXISTS private;

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
