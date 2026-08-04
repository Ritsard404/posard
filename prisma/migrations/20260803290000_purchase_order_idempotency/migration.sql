ALTER TABLE "public"."purchase_order"
ADD COLUMN "idempotency_key" UUID;

CREATE UNIQUE INDEX "purchase_order_idempotency_key_key"
ON "public"."purchase_order"("idempotency_key");
