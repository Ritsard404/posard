ALTER TABLE "public"."branch_transfer"
ADD COLUMN "idempotency_key" UUID;

CREATE UNIQUE INDEX "branch_transfer_idempotency_key_key"
ON "public"."branch_transfer"("idempotency_key");
