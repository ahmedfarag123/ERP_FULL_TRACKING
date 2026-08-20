import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import type { FinanceTaxRate } from '../../../../types/finance';
import PostingPreview from './PostingPreview';

interface CustomerOption {
  id: string;
  customer_name: string;
  customer_name_ar: string | null;
}

interface ProductOption {
  id: string;
  product_name: string;
  product_name_ar: string | null;
  selling_price: number | null;
}

interface JournalOption {
  id: string;
  name: string;
}

interface FinanceTaxRateRow {
  id: string;
  name: string;
  rate: number;
  account_id: string;
  is_active: boolean;
  created_at: string;
}

function mapTaxRate(row: FinanceTaxRateRow): FinanceTaxRate {
  return {
    id: row.id,
    name: row.name,
    rate: Number(row.rate ?? 0),
    accountId: row.account_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

interface InvoiceLineDraft {
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate_id: string | null;
  tax_rate_percent: number;
  tax_amount: number;
  line_total: number;
  expense_account_id: string | null;
}

interface InvoiceBuilderProps {
  invoiceId?: string;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceBuilder({ invoiceId, mode, onClose, onSuccess }: InvoiceBuilderProps) {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [journalId, setJournalId] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLineDraft[]>([]);
  const [activeTab, setActiveTab] = useState<'lines' | 'journal'>('lines');
  const [error, setError] = useState('');

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, customer_name_ar')
        .order('customer_name');
      if (error) throw error;
      return (data ?? []) as CustomerOption[];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, product_name_ar, selling_price')
        .eq('is_active', true)
        .order('product_name');
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
  });

  // Fetch tax rates
  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_tax_rates')
        .select('id, name, rate, account_id, is_active, created_at')
        .eq('is_active', true)
        .order('rate');
      if (error) throw error;
      return ((data ?? []) as FinanceTaxRateRow[]).map(mapTaxRate);
    },
  });

  // Fetch journals
  const { data: journals = [] } = useQuery({
    queryKey: ['finance-journals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_journals')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as JournalOption[];
    },
  });

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        product_id: '',
        product_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_rate_id: null,
        tax_rate_percent: 0,
        tax_amount: 0,
        line_total: 0,
        expense_account_id: null,
      },
    ]);
  };

  const updateLine = (index: number, field: keyof InvoiceLineDraft, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index] };

      if (field === 'product_id') {
        const product = products.find((p) => p.id === value);
        if (product) {
          line.product_id = product.id;
          line.product_name = product.product_name;
          line.description = product.product_name;
          line.unit_price = product.selling_price || 0;
        }
      } else if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
        (line as Record<string, string | number>)[field] = value;
      } else if (field === 'tax_rate_id') {
        const tax = taxRates.find((t) => t.id === value);
        line.tax_rate_id = tax?.id || null;
        line.tax_rate_percent = tax?.rate || 0;
      } else if (field === 'description') {
        line.description = value as string;
      }

      // Recalculate
      const subtotal = line.quantity * line.unit_price;
      const discount = subtotal * (line.discount_percent / 100);
      line.tax_amount = (subtotal - discount) * (line.tax_rate_percent / 100);
      line.line_total = subtotal - discount + line.tax_amount;

      updated[index] = line;
      return updated;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const totalDiscount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unit_price * (l.discount_percent / 100),
    0,
  );
  const totalTax = lines.reduce((sum, l) => sum + l.tax_amount, 0);
  const total = lines.reduce((sum, l) => sum + l.line_total, 0);

  const journalLines = lines.flatMap((line) => {
    const lines2 = [];
    if (line.line_total > 0) {
      lines2.push({
        account_id: line.expense_account_id || '',
        debit: line.line_total,
        credit: 0,
        description: line.description,
      });
    }
    if (line.tax_amount > 0) {
      lines2.push({
        account_id: '',
        debit: 0,
        credit: line.tax_amount,
        description: `Tax: ${line.tax_rate_percent}%`,
      });
    }
    return lines2;
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('Select a customer');
      if (lines.length === 0) throw new Error('Add at least one invoice line');
      if (!journalId) throw new Error('Select a journal');

      // Get fiscal period for invoice date
      const { data: period } = await supabase
        .from('finance_fiscal_periods')
        .select('id')
        .lte('start_date', invoiceDate)
        .gte('end_date', invoiceDate)
        .eq('status', 'open')
        .single();

      if (!period) throw new Error('No open fiscal period for this invoice date');

      // Generate document number
      const { data: docNum } = await supabase.rpc('next_document_number', {
        p_doc_type: 'invoice',
      });

      // Create invoice header
      const { data: invoice, error: invErr } = await supabase
        .from('finance_invoices')
        .insert({
          invoice_number: docNum || `INV-${Date.now()}`,
          customer_id: customerId,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          journal_id: journalId,
          currency_code: currency,
          customer_reference: customerRef || null,
          notes: notes || null,
          subtotal: subtotal,
          discount_total: totalDiscount,
          tax_total: totalTax,
          total: total,
          status: 'draft',
        })
        .select()
        .single();

      if (invErr) throw invErr;

      // Create invoice lines
      if (lines.length > 0) {
        const { error: linesErr } = await supabase.from('finance_invoice_lines').insert(
          lines.map((l, i) => ({
            invoice_id: invoice.id,
            product_id: l.product_id || null,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            tax_rate_id: l.tax_rate_id,
            tax_amount: l.tax_amount,
            line_total: l.line_total,
            sort_order: i,
          })),
        );
        if (linesErr) throw linesErr;
      }

      return invoice.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'edit' ? `Edit Invoice ${invoiceId}` : 'New Customer Invoice'}
            </h2>
            <p className="text-sm text-gray-500">Draft — no accounting impact until confirmed</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Invoice Meta — Odoo style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Journal</label>
              <select
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select journal...</option>
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="EGP">EGP — Egyptian Pound</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Ref</label>
              <input
                type="text"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                placeholder="Optional reference"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tabs — Odoo style */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('lines')}
                className={`border-b-2 pb-2 text-sm font-medium ${
                  activeTab === 'lines'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Invoice Lines
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('journal')}
                className={`border-b-2 pb-2 text-sm font-medium ${
                  activeTab === 'journal'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Journal Items
              </button>
            </nav>
          </div>

          {/* Invoice Lines Tab */}
          {activeTab === 'lines' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Invoice Lines
                  <span className="ml-2 text-gray-400">({lines.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  + Add Line
                </button>
              </div>

              {lines.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No lines yet. Click "Add Line" to start.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-brand-25 text-left text-xs font-medium text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Disc%</th>
                        <th className="px-3 py-2">Tax</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, i) => (
                        <tr key={i} className="hover:bg-brand-25">
                          <td className="px-3 py-2">
                            <select
                              value={line.product_id}
                              onChange={(e) => updateLine(i, 'product_id', e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500"
                            >
                              <option value="">Select...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.product_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(i, 'description', e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm font-mono focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm font-mono focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={line.discount_percent}
                              onChange={(e) => updateLine(i, 'discount_percent', parseFloat(e.target.value) || 0)}
                              className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm font-mono focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={line.tax_rate_id || ''}
                              onChange={(e) => updateLine(i, 'tax_rate_id', e.target.value)}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500"
                            >
                              <option value="">None</option>
                              {taxRates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.rate}%)
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sm">{fmt(line.line_total)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals — Odoo style */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 rounded-lg bg-brand-25 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-mono">{fmt(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-mono text-red-600">-{fmt(totalDiscount)}</span>
                    </div>
                  )}
                  {totalTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-mono">{fmt(totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span className="font-mono">{fmt(total)}</span>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {currency} • Due {dueDate || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Journal Items Tab */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                These are the accounting entries that will be generated when this invoice is confirmed.
              </p>
              <PostingPreview lines={journalLines} currency={currency} readonly />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="text-sm text-gray-500">
            {lines.length} line{lines.length !== 1 ? 's' : ''} • {currency} {fmt(total)}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
