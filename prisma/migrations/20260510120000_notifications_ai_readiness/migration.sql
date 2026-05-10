CREATE TYPE "public"."notification_category" AS ENUM ('REGISTRATION', 'TERMINAL_REQUEST', 'APPROVAL', 'SYSTEM', 'REPORT');

CREATE TYPE "public"."notification_delivery_channel" AS ENUM ('IN_APP', 'EMAIL');

CREATE TYPE "public"."notification_delivery_status" AS ENUM ('pending', 'sent', 'skipped', 'failed');

CREATE TABLE "public"."user_notification" (
    "uuid_user_notification" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "company_id" UUID,
    "category" "public"."notification_category" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "metadata" JSONB,
    "delivery_channel" "public"."notification_delivery_channel" NOT NULL DEFAULT 'IN_APP',
    "delivery_status" "public"."notification_delivery_status" NOT NULL DEFAULT 'sent',
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_notification_pkey" PRIMARY KEY ("uuid_user_notification")
);

CREATE TABLE "public"."ai_report_conversation" (
    "uuid_ai_report_conversation" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "company_id" UUID,
    "terminal_id" UUID,
    "title" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_report_conversation_pkey" PRIMARY KEY ("uuid_ai_report_conversation")
);

CREATE TABLE "public"."ai_report_message" (
    "uuid_ai_report_message" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mode" TEXT,
    "facts_used" JSONB,
    "warnings" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_report_message_pkey" PRIMARY KEY ("uuid_ai_report_message")
);

CREATE INDEX "user_notification_profile_id_read_at_created_at_idx" ON "public"."user_notification"("profile_id", "read_at", "created_at");
CREATE INDEX "user_notification_company_id_created_at_idx" ON "public"."user_notification"("company_id", "created_at");
CREATE INDEX "user_notification_category_created_at_idx" ON "public"."user_notification"("category", "created_at");
CREATE INDEX "ai_report_conversation_profile_id_created_at_idx" ON "public"."ai_report_conversation"("profile_id", "created_at");
CREATE INDEX "ai_report_conversation_company_id_created_at_idx" ON "public"."ai_report_conversation"("company_id", "created_at");
CREATE INDEX "ai_report_message_conversation_id_created_at_idx" ON "public"."ai_report_message"("conversation_id", "created_at");

ALTER TABLE "public"."user_notification"
ADD CONSTRAINT "user_notification_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ai_report_conversation"
ADD CONSTRAINT "ai_report_conversation_profile_id_fkey"
FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ai_report_message"
ADD CONSTRAINT "ai_report_message_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_report_conversation"("uuid_ai_report_conversation") ON DELETE CASCADE ON UPDATE CASCADE;
