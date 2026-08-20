/**
 * Finance Event Mapping (§4 of canonical spec)
 *
 * Each function maps a business event to its required journal entry lines.
 * Return type: { account_id, debit, credit, description }[]
 *
 * All account IDs are looked up by account_code at call time via resolveAccount().
 */

import { supabase } from './supabase';

async function resolveAccount(code: string): Promise<string> {
  const { data, error } = await supabase
    .from('finance_accounts')
    .select('id')
    .eq('code', code)
    .single();
  if (error || !data) throw new Error(`Account not found: ${code}`);
  return data.id;
}

interface JournalLineDraft {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
  cost_center_id?: string | null;
}

/**
 * Order confirmed (§4 row 1)
 * Dr. Accounts Receivable (1200)
 * Cr. Revenue (4000)
 * Cr. VAT Output (2200)
 */
export async function mapOrderConfirmed(order: {
  amount_total: number;
  currency_code: string;
  customer_id: string;
  order_number?: string;
}): Promise<JournalLineDraft[]> {
  const [arId, revId, vatId] = await Promise.all([
    resolveAccount('1200'),
    resolveAccount('4000'),
    resolveAccount('2200'),
  ]);

  const vatAmount = order.amount_total * 0.14;
  const netRevenue = order.amount_total - vatAmount;

  return [
    {
      account_id: arId,
      debit: order.amount_total,
      credit: 0,
      description: `Invoice ${order.order_number || ''} — ${order.customer_id}`,
    },
    {
      account_id: revId,
      debit: 0,
      credit: netRevenue,
      description: `Revenue for order ${order.order_number || ''}`,
    },
    {
      account_id: vatId,
      debit: 0,
      credit: vatAmount,
      description: `VAT 14% on order ${order.order_number || ''}`,
    },
  ];
}

/**
 * Payment received (§4 row 2)
 * Dr. Cash/Bank (1100)
 * Cr. Accounts Receivable (1200)
 */
export async function mapPaymentReceived(payment: {
  amount: number;
  invoice_id: string;
  reference?: string;
}): Promise<JournalLineDraft[]> {
  const [cashId, arId] = await Promise.all([
    resolveAccount('1100'),
    resolveAccount('1200'),
  ]);

  return [
    {
      account_id: cashId,
      debit: payment.amount,
      credit: 0,
      description: `Payment received — ${payment.reference || payment.invoice_id}`,
    },
    {
      account_id: arId,
      debit: 0,
      credit: payment.amount,
      description: `AR reduction — invoice ${payment.invoice_id}`,
    },
  ];
}

/**
 * Credit note issued (§4 row 3)
 * Dr. Revenue (4000)
 * Dr. VAT Output (2200)
 * Cr. Accounts Receivable (1200)
 */
export async function mapCreditNoteIssued(creditNote: {
  amount_total: number;
  original_invoice_id: string;
  reference?: string;
}): Promise<JournalLineDraft[]> {
  const [revId, vatId, arId] = await Promise.all([
    resolveAccount('4000'),
    resolveAccount('2200'),
    resolveAccount('1200'),
  ]);

  const vatAmount = creditNote.amount_total * 0.14;
  const netAmount = creditNote.amount_total - vatAmount;

  return [
    {
      account_id: revId,
      debit: netAmount,
      credit: 0,
      description: `Revenue reversal — CN ${creditNote.reference || ''}`,
    },
    {
      account_id: vatId,
      debit: vatAmount,
      credit: 0,
      description: `VAT reversal — CN ${creditNote.reference || ''}`,
    },
    {
      account_id: arId,
      debit: 0,
      credit: creditNote.amount_total,
      description: `AR reduction — CN on invoice ${creditNote.original_invoice_id}`,
    },
  ];
}

/**
 * Driver commission accrued (§4 row 4)
 * Dr. Commission Expense (6100)
 * Cr. Commission Payable (2110)
 */
export async function mapDriverCommissionAccrued(settlement: {
  commission_amount: number;
  driver_id: string;
  period?: string;
}): Promise<JournalLineDraft[]> {
  const [expId, payId] = await Promise.all([
    resolveAccount('6100'),
    resolveAccount('2110'),
  ]);

  return [
    {
      account_id: expId,
      debit: settlement.commission_amount,
      credit: 0,
      description: `Commission expense — driver ${settlement.driver_id}`,
    },
    {
      account_id: payId,
      debit: 0,
      credit: settlement.commission_amount,
      description: `Commission payable — driver ${settlement.driver_id}`,
    },
  ];
}

/**
 * Cost incurred (§4 row 5)
 * Dr. Expense (6xxx — based on cost center / category)
 * Cr. Cash/Bank (1100) or Accounts Payable (2000)
 */
export async function mapCostIncurred(cost: {
  amount: number;
  expense_account_code: string;
  payment_method: 'cash' | 'credit';
  description: string;
}): Promise<JournalLineDraft[]> {
  const [expId, counterId] = await Promise.all([
    resolveAccount(cost.expense_account_code),
    resolveAccount(cost.payment_method === 'cash' ? '1100' : '2000'),
  ]);

  return [
    {
      account_id: expId,
      debit: cost.amount,
      credit: 0,
      description: cost.description,
    },
    {
      account_id: counterId,
      debit: 0,
      credit: cost.amount,
      description: cost.description,
    },
  ];
}

/**
 * Payroll processed (§4 row 6)
 * Dr. Salary Expense (6200)
 * Dr. Social Insurance Expense (6210)
 * Cr. Salary Payable (2120)
 * Cr. Social Insurance Payable (2130)
 */
export async function mapPayrollProcessed(payroll: {
  gross_salary: number;
  social_insurance: number;
  employee_id: string;
}): Promise<JournalLineDraft[]> {
  const [salExpId, siExpId, salPayId, siPayId] = await Promise.all([
    resolveAccount('6200'),
    resolveAccount('6210'),
    resolveAccount('2120'),
    resolveAccount('2130'),
  ]);

  return [
    {
      account_id: salExpId,
      debit: payroll.gross_salary,
      credit: 0,
      description: `Salary expense — ${payroll.employee_id}`,
    },
    {
      account_id: siExpId,
      debit: payroll.social_insurance,
      credit: 0,
      description: `Social insurance expense — ${payroll.employee_id}`,
    },
    {
      account_id: salPayId,
      debit: 0,
      credit: payroll.gross_salary,
      description: `Salary payable — ${payroll.employee_id}`,
    },
    {
      account_id: siPayId,
      debit: 0,
      credit: payroll.social_insurance,
      description: `Social insurance payable — ${payroll.employee_id}`,
    },
  ];
}

/**
 * Tax payment remitted (§4 row 7)
 * Dr. VAT Input (1310)
 * Dr. Tax Payable (2300)
 * Cr. Cash/Bank (1100)
 */
export async function mapTaxPaymentRemitted(payment: {
  amount: number;
  tax_type: string;
  reference?: string;
}): Promise<JournalLineDraft[]> {
  const [vatId, taxPayId, cashId] = await Promise.all([
    resolveAccount('1310'),
    resolveAccount('2300'),
    resolveAccount('1100'),
  ]);

  return [
    {
      account_id: vatId,
      debit: 0,
      credit: payment.amount,
      description: `Tax payment — ${payment.tax_type} — ${payment.reference || ''}`,
    },
    {
      account_id: taxPayId,
      debit: payment.amount,
      credit: 0,
      description: `Tax liability settled — ${payment.tax_type}`,
    },
    {
      account_id: cashId,
      debit: 0,
      credit: payment.amount,
      description: `Cash outflow — tax payment ${payment.reference || ''}`,
    },
  ];
}

/**
 * Period close (§4 row 8)
 * Dr. Revenue (4xxx)
 * Dr. Expense (6xxx)
 * Cr. Income Summary (9000)
 * Then: Dr. Income Summary (9000)
 *       Cr. Retained Earnings (3100)
 */
export async function mapPeriodClose(revenue: number, expenses: number): Promise<JournalLineDraft[]> {
  const [revId, expId, incSumId, retId] = await Promise.all([
    resolveAccount('4000'),
    resolveAccount('6100'),
    resolveAccount('9000'),
    resolveAccount('3100'),
  ]);

  const netIncome = revenue - expenses;

  return [
    {
      account_id: revId,
      debit: revenue,
      credit: 0,
      description: 'Close revenue to income summary',
    },
    {
      account_id: expId,
      debit: 0,
      credit: expenses,
      description: 'Close expenses to income summary',
    },
    {
      account_id: incSumId,
      debit: netIncome,
      credit: 0,
      description: `Net income ${netIncome >= 0 ? 'profit' : 'loss'} transfer`,
    },
    {
      account_id: retId,
      debit: 0,
      credit: netIncome,
      description: 'Transfer to retained earnings',
    },
  ];
}

/**
 * Driver settlement posted (§4 row 9 — simplified)
 * Dr. Commission Payable (2110)
 * Dr. Cash/Bank (1100) — cash remitted
 * Dr. Bonus Expense (6120) — if any
 * Cr. Driver Settlement (2140)
 * Cr. Cash/Bank (1100) — net payable
 */
export async function mapDriverSettlementPosted(settlement: {
  commission_amount: number;
  bonuses: number;
  penalties: number;
  cash_remitted: number;
  net_payable: number;
  driver_id: string;
}): Promise<JournalLineDraft[]> {
  const [commPayId, cashId, bonusExpId, settleId] = await Promise.all([
    resolveAccount('2110'),
    resolveAccount('1100'),
    resolveAccount('6120'),
    resolveAccount('2140'),
  ]);

  const lines: JournalLineDraft[] = [
    {
      account_id: commPayId,
      debit: settlement.commission_amount,
      credit: 0,
      description: `Commission settled — driver ${settlement.driver_id}`,
    },
  ];

  if (settlement.cash_remitted > 0) {
    lines.push({
      account_id: cashId,
      debit: settlement.cash_remitted,
      credit: 0,
      description: `Cash received from driver ${settlement.driver_id}`,
    });
  }

  if (settlement.bonuses > 0) {
    lines.push({
      account_id: bonusExpId,
      debit: settlement.bonuses,
      credit: 0,
      description: `Bonus expense — driver ${settlement.driver_id}`,
    });
  }

  if (settlement.net_payable > 0) {
    lines.push({
      account_id: settleId,
      debit: 0,
      credit: settlement.net_payable,
      description: `Net payable to driver ${settlement.driver_id}`,
    });
  }

  return lines;
}

/**
 * Sales return (§4 row 10)
 * Dr. Sales Returns (4010)
 * Dr. VAT Output (2200)
 * Cr. Accounts Receivable (1200)
 */
export async function mapSalesReturn(returnData: {
  amount: number;
  invoice_id: string;
  reference?: string;
}): Promise<JournalLineDraft[]> {
  const [retId, vatId, arId] = await Promise.all([
    resolveAccount('4010'),
    resolveAccount('2200'),
    resolveAccount('1200'),
  ]);

  const vatAmount = returnData.amount * 0.14;
  const netAmount = returnData.amount - vatAmount;

  return [
    {
      account_id: retId,
      debit: netAmount,
      credit: 0,
      description: `Sales return — ${returnData.reference || returnData.invoice_id}`,
    },
    {
      account_id: vatId,
      debit: vatAmount,
      credit: 0,
      description: `VAT reversal on return`,
    },
    {
      account_id: arId,
      debit: 0,
      credit: returnData.amount,
      description: `AR reduction — return on invoice ${returnData.invoice_id}`,
    },
  ];
}
