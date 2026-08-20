interface JournalLineDraft {
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: string | null;
}

interface PostingPreviewProps {
  lines: JournalLineDraft[];
  currency?: string;
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

export default function PostingPreview({
  lines,
  currency = 'EGP',
  onRemove,
  readonly = false,
}: PostingPreviewProps) {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-brand-25 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Debit</th>
            <th className="px-3 py-2 text-right">Credit</th>
            {!readonly && onRemove && <th className="px-3 py-2 w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {lines.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                No journal lines added
              </td>
            </tr>
          ) : (
            lines.map((line, i) => (
              <tr key={i} className="hover:bg-brand-25">
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-gray-500">{line.account_code}</span>
                  <span className="ml-1.5 text-sm">{line.account_name}</span>
                </td>
                <td className="px-3 py-2 text-gray-600">{line.description || '—'}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {line.debit > 0 ? (
                    <span className="text-green-700">{fmt(line.debit)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {line.credit > 0 ? (
                    <span className="text-red-700">{fmt(line.credit)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                {!readonly && onRemove && (
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="bg-brand-25 font-medium">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-right text-xs text-gray-500 uppercase">
              Totals
            </td>
            <td className="px-3 py-2 text-right font-mono text-sm">
              <span className={totalDebit > 0 ? 'text-green-700' : 'text-gray-400'}>
                {fmt(totalDebit)}
              </span>
            </td>
            <td className="px-3 py-2 text-right font-mono text-sm">
              <span className={totalCredit > 0 ? 'text-red-700' : 'text-gray-400'}>
                {fmt(totalCredit)}
              </span>
            </td>
            {!readonly && <td />}
          </tr>
          <tr>
            <td colSpan={5} className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {currency} • {lines.length} line{lines.length !== 1 ? 's' : ''}
                </span>
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Unbalanced by {fmt(Math.abs(totalDebit - totalCredit))}
                  </span>
                )}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}