ALTER TABLE "profiles" ALTER COLUMN "pin" TYPE VARCHAR(128);

WITH pin_salts AS (
  SELECT "id", encode(gen_random_bytes(16), 'hex') AS salt
  FROM "profiles"
  WHERE "pin" IS NOT NULL
    AND "pin" !~ '^scrypt\$'
    AND "pin" !~ '^sha256\$'
)
UPDATE "profiles" AS p
SET "pin" = 'sha256$' || pin_salts.salt || '$' || encode(digest(p."pin" || pin_salts.salt, 'sha256'), 'hex')
FROM pin_salts
WHERE p."id" = pin_salts.id;
