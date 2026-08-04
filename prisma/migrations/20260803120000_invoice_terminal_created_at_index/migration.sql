-- Speed up terminal-scoped report counts, aggregates, and newest-page reads.

CREATE INDEX IF NOT EXISTS "invoice_pos_terminal_created_at_idx"
  ON "public"."invoice" ("uuid_pos_terminal", "created_at");
