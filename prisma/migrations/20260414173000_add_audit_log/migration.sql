CREATE TABLE "public"."audit_log" (
  "uuid_audit_log" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "actor_profile_id" UUID NOT NULL,
  "pos_terminal_id" UUID,
  "action_type" TEXT NOT NULL,
  "reference_id" UUID,
  "changes" TEXT,
  "amount" DECIMAL(15, 2),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("uuid_audit_log")
);

CREATE INDEX "audit_log_company_id_idx"
  ON "public"."audit_log"("company_id");

CREATE INDEX "audit_log_actor_profile_id_idx"
  ON "public"."audit_log"("actor_profile_id");

CREATE INDEX "audit_log_pos_terminal_id_idx"
  ON "public"."audit_log"("pos_terminal_id");

CREATE INDEX "audit_log_created_at_idx"
  ON "public"."audit_log"("created_at");

ALTER TABLE "public"."audit_log"
ADD CONSTRAINT "audit_log_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."audit_log"
ADD CONSTRAINT "audit_log_actor_profile_id_fkey"
FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."audit_log"
ADD CONSTRAINT "audit_log_pos_terminal_id_fkey"
FOREIGN KEY ("pos_terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
ON DELETE SET NULL ON UPDATE CASCADE;
