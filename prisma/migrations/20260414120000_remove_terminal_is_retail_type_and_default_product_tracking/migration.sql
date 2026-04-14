ALTER TABLE "pos_terminal_info"
DROP COLUMN "is_retail_type";

ALTER TABLE "product"
ALTER COLUMN "track_inventory" SET DEFAULT false;
