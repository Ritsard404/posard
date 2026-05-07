-- Create globally unique invoice number sequences.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS invoice_number_train_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

-- Seed sequences from existing data so next value continues correctly.
DO $$
DECLARE
  max_invoice_number BIGINT;
BEGIN
  SELECT MAX("invoice_number")
    INTO max_invoice_number
    FROM "invoice"
   WHERE "is_train_mode" = false
     AND "invoice_number" < 9000000;

  IF max_invoice_number IS NOT NULL THEN
    PERFORM setval('invoice_number_seq', max_invoice_number, true);
  END IF;
END $$;

DO $$
DECLARE
  max_train_invoice_number BIGINT;
BEGIN
  SELECT MAX("invoice_number") - 9000000
    INTO max_train_invoice_number
    FROM "invoice"
   WHERE "is_train_mode" = true
     AND "invoice_number" > 9000000;

  IF max_train_invoice_number IS NOT NULL THEN
    PERFORM setval(
      'invoice_number_train_seq',
      max_train_invoice_number,
      true
    );
  END IF;
END $$;
