CREATE TYPE "public"."permission_key" AS ENUM (
  'VIEW_DASHBOARD',
  'VIEW_POS',
  'VIEW_INVENTORY',
  'VIEW_TRANSACTIONS',
  'VIEW_ACCOUNTS',
  'VIEW_REPORTS',
  'VIEW_AI_REPORTS',
  'VIEW_PROFILE',
  'VIEW_HELP',
  'VIEW_COMPANY',
  'VIEW_COMPANY_SETTINGS',
  'VIEW_COMPANY_TERMINALS',
  'VIEW_COMPANY_SUBSCRIPTION',
  'VIEW_PRODUCT',
  'VIEW_ADMIN',
  'VIEW_ADMIN_SETTINGS',
  'VIEW_ADMIN_TERMINALS',
  'VIEW_ADMIN_SUBSCRIPTIONS',
  'VIEW_ADMIN_APPROVALS',
  'VIEW_NOTIFICATIONS',
  'MANAGE_PRODUCTS',
  'MANAGE_INVENTORY',
  'MANAGE_SUPPLIERS',
  'MANAGE_PURCHASE_ORDERS',
  'MANAGE_RECEIVING',
  'MANAGE_TRANSFERS',
  'MANAGE_EXPENSES',
  'MANAGE_CUSTOMERS',
  'MANAGE_LOYALTY',
  'MANAGE_PROMOTIONS',
  'MANAGE_KITCHEN',
  'APPROVE_REQUESTS',
  'APPROVE_DISCOUNTS',
  'APPROVE_REFUNDS',
  'APPROVE_STOCK_ADJUSTMENTS',
  'APPROVE_EXPENSES',
  'APPROVE_TRANSFERS',
  'MANAGE_USERS',
  'MANAGE_TERMINALS',
  'VIEW_AUDIT_TRAIL',
  'MANAGE_NOTIFICATIONS',
  'VIEW_SYNC_CENTER',
  'RESOLVE_SYNC_CONFLICTS'
);

CREATE TYPE "public"."permission_effect" AS ENUM ('allow', 'deny');
CREATE TYPE "public"."approval_request_status" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'executed');
CREATE TYPE "public"."approval_decision_status" AS ENUM ('approved', 'rejected', 'cancelled');

CREATE TABLE "public"."permission" (
  "key" "public"."permission_key" NOT NULL,
  "group" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permission_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "public"."role_permission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "role" "public"."user_role" NOT NULL,
  "permission_key" "public"."permission_key" NOT NULL,
  "effect" "public"."permission_effect" NOT NULL DEFAULT 'allow',
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."user_permission_override" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" UUID NOT NULL,
  "company_id" UUID,
  "permission_key" "public"."permission_key" NOT NULL,
  "effect" "public"."permission_effect" NOT NULL,
  "reason" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_permission_override_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."approval_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "requested_by_id" UUID NOT NULL,
  "action_type" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "before_snapshot" JSONB,
  "after_snapshot" JSONB,
  "idempotency_key" TEXT,
  "status" "public"."approval_request_status" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ,
  "executed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."approval_decision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "approval_request_id" UUID NOT NULL,
  "decided_by_id" UUID NOT NULL,
  "decision" "public"."approval_decision_status" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_decision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_permission_company_id_role_permission_key_key" ON "public"."role_permission"("company_id", "role", "permission_key");
CREATE INDEX "role_permission_role_permission_key_idx" ON "public"."role_permission"("role", "permission_key");
CREATE INDEX "role_permission_company_id_idx" ON "public"."role_permission"("company_id");

CREATE UNIQUE INDEX "user_permission_override_profile_id_company_id_permission_key_key" ON "public"."user_permission_override"("profile_id", "company_id", "permission_key");
CREATE INDEX "user_permission_override_profile_id_idx" ON "public"."user_permission_override"("profile_id");
CREATE INDEX "user_permission_override_company_id_idx" ON "public"."user_permission_override"("company_id");

CREATE UNIQUE INDEX "approval_request_reference_number_key" ON "public"."approval_request"("reference_number");
CREATE UNIQUE INDEX "approval_request_idempotency_key_key" ON "public"."approval_request"("idempotency_key");
CREATE INDEX "approval_request_company_id_status_created_at_idx" ON "public"."approval_request"("company_id", "status", "created_at");
CREATE INDEX "approval_request_terminal_id_idx" ON "public"."approval_request"("terminal_id");
CREATE INDEX "approval_request_requested_by_id_idx" ON "public"."approval_request"("requested_by_id");
CREATE INDEX "approval_request_target_type_target_id_idx" ON "public"."approval_request"("target_type", "target_id");

CREATE INDEX "approval_decision_approval_request_id_idx" ON "public"."approval_decision"("approval_request_id");
CREATE INDEX "approval_decision_decided_by_id_idx" ON "public"."approval_decision"("decided_by_id");

ALTER TABLE "public"."role_permission" ADD CONSTRAINT "role_permission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."role_permission" ADD CONSTRAINT "role_permission_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."role_permission" ADD CONSTRAINT "role_permission_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."user_permission_override" ADD CONSTRAINT "user_permission_override_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_permission_override" ADD CONSTRAINT "user_permission_override_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_permission_override" ADD CONSTRAINT "user_permission_override_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_permission_override" ADD CONSTRAINT "user_permission_override_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."approval_request" ADD CONSTRAINT "approval_request_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."approval_request" ADD CONSTRAINT "approval_request_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."approval_request" ADD CONSTRAINT "approval_request_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."approval_decision" ADD CONSTRAINT "approval_decision_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."approval_decision" ADD CONSTRAINT "approval_decision_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
