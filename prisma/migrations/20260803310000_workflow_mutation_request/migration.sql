CREATE TABLE "public"."workflow_mutation_request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotency_key" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_mutation_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_mutation_request_idempotency_key_key"
ON "public"."workflow_mutation_request"("idempotency_key");

CREATE INDEX "workflow_mutation_request_company_id_entity_type_entity_id_idx"
ON "public"."workflow_mutation_request"("company_id", "entity_type", "entity_id");
