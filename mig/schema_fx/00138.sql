CREATE OR REPLACE FUNCTION public.next_document_number(p_document_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seq record;
  v_year_prefix text;
  v_next integer;
  v_result text;
BEGIN
  SELECT * INTO v_seq
  FROM public.finance_document_sequences
  WHERE document_type = p_document_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document sequence for "%" not found.', p_document_type;
  END IF;

  IF v_seq.year_reset THEN
    v_year_prefix := to_char(now(), 'YYYY') || '-';
  ELSE
    v_year_prefix := '';
  END IF;

  v_next := v_seq.current_number + 1;

  UPDATE public.finance_document_sequences
  SET current_number = v_next
  WHERE document_type = p_document_type;

  v_result := v_seq.prefix || '-' || v_year_prefix || lpad(v_next::text, 6, '0');
  RETURN v_result;
END;
$function$;
