CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid)
 RETURNS finance_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.finance_payments%ROWTYPE;
BEGIN
  IF NOT public.has_role_permission('finance.manage') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_payment FROM public.finance_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF v_payment.status != 'draft' THEN RAISE EXCEPTION 'Only draft payments can be confirmed.'; END IF;

  UPDATE public.finance_payments
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = timezone('utc', now())
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF v_payment.invoice_id IS NOT NULL THEN
    UPDATE public.finance_invoices
    SET status = CASE
      WHEN total <= (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.finance_payments
        WHERE invoice_id = v_payment.invoice_id AND status = 'confirmed'
      ) THEN 'paid'
      ELSE 'partially_paid'
    END,
    updated_at = timezone('utc', now())
    WHERE id = v_payment.invoice_id;
  END IF;

  PERFORM public.log_audit_event(
    'confirm_payment',
    'finance_payment',
    p_payment_id,
    'Payment confirmed',
    jsonb_build_object('amount', v_payment.amount, 'customer_id', v_payment.customer_id, 'method', v_payment.payment_method)
  );

  RETURN v_payment;
END;
$function$;
