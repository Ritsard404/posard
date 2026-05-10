CREATE TABLE "public"."system_configuration" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "direct_registration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("id")
);

INSERT INTO "public"."system_configuration" ("id", "direct_registration_enabled")
VALUES ('default', false)
ON CONFLICT ("id") DO NOTHING;
