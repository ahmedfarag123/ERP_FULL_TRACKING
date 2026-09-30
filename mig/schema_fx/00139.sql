CREATE OR REPLACE FUNCTION public.next_payment_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seq RECORD;
  v_next text;
BEGIN
  SELECT * INTO v_seq
  FROM public.finance_document_sequences
  WHERE document_type = 'payment'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.finance_document_sequences (document_type, prefix, current_number, year_reset)
    VALUES ('payment', 'PAY', 0, true)
    RETURNING * INTO v_seq;
  END IF;

  v_seq.current_number := v_seq.current_number + 1;

  UPDATE public.finance_document_sequences
  SET current_number = v_seq.current_number
  WHERE id = v_seq.id;

  v_next := v_seq.prefix || '-' || to_char(current_date, 'YYYY') || '-' || lpad(v_seq.current_number::text, 6, '0');
  RETURN v_next;
END;
$function$;
