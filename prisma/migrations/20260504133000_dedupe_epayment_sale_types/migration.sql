WITH ranked_sale_types AS (
  SELECT
    "uuid_sale_type",
    lower(trim(coalesce("name", ''))) AS normalized_name,
    first_value("uuid_sale_type") OVER (
      PARTITION BY lower(trim(coalesce("name", '')))
      ORDER BY "created_at" ASC, "uuid_sale_type" ASC
    ) AS canonical_id
  FROM "public"."sale_type"
  WHERE "type" = 'EPAYMENT'
    AND trim(coalesce("name", '')) <> ''
),
duplicate_sale_types AS (
  SELECT "uuid_sale_type", canonical_id
  FROM ranked_sale_types
  WHERE "uuid_sale_type" <> canonical_id
)
UPDATE "public"."e_payment" AS payment
SET "uuid_sale_type" = duplicate_sale_types.canonical_id
FROM duplicate_sale_types
WHERE payment."uuid_sale_type" = duplicate_sale_types."uuid_sale_type";

WITH ranked_sale_types AS (
  SELECT
    "uuid_sale_type",
    first_value("uuid_sale_type") OVER (
      PARTITION BY lower(trim(coalesce("name", '')))
      ORDER BY "created_at" ASC, "uuid_sale_type" ASC
    ) AS canonical_id
  FROM "public"."sale_type"
  WHERE "type" = 'EPAYMENT'
    AND trim(coalesce("name", '')) <> ''
)
DELETE FROM "public"."sale_type" AS sale_type
USING ranked_sale_types
WHERE sale_type."uuid_sale_type" = ranked_sale_types."uuid_sale_type"
  AND ranked_sale_types."uuid_sale_type" <> ranked_sale_types.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS "sale_type_epayment_normalized_name_key"
ON "public"."sale_type" (lower(trim(coalesce("name", ''))))
WHERE "type" = 'EPAYMENT'
  AND trim(coalesce("name", '')) <> '';
