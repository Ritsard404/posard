CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

DO $$
DECLARE
  max_invoice_number BIGINT;
BEGIN
  SELECT COALESCE(MAX(invoice_number), 0)
    INTO max_invoice_number
    FROM invoice;

  IF max_invoice_number > 0 THEN
    PERFORM setval('invoice_number_seq', max_invoice_number, true);
  ELSE
    PERFORM setval('invoice_number_seq', 1, false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION reserve_invoice_numbers(batch_size INT)
RETURNS TABLE(from_num BIGINT, to_num BIGINT) AS $$
DECLARE
  v_from BIGINT;
  v_to BIGINT;
BEGIN
  IF batch_size IS NULL OR batch_size < 1 OR batch_size > 500 THEN
    RAISE EXCEPTION 'batch_size must be between 1 and 500';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invoice_number_seq'));

  v_from := nextval('invoice_number_seq');
  v_to := v_from + batch_size - 1;
  PERFORM setval('invoice_number_seq', v_to, true);

  RETURN QUERY SELECT v_from, v_to;
END;
$$ LANGUAGE plpgsql;

