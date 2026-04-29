DO $$ BEGIN
    CREATE TYPE "public"."discount_cap_type" AS ENUM ('percent', 'amount');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."pos_terminal_info"
ADD COLUMN "discount_cap_type" "public"."discount_cap_type" NOT NULL DEFAULT 'percent';
