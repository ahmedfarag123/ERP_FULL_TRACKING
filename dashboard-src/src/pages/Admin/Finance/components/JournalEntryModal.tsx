import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import type { FinanceAccount } from '../../../../types/finance';
import AccountPicker from './AccountPicker';
import PostingPreview from './PostingPreview';

interface JournalLineDraft {
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: string | null;
}

interface JournalEntryModalProps {
  mode: 'create' | 'reverse';
  fiscalPeriodId: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  reverseEntryId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JournalEntryModal({
  mode,
  fiscalPeriodId,
  sourceDocumentType,
  sourceDocumentId,
  reverseEntryId,
  onClose,
  onSuccess,
}: JournalEntryModalProps) {
  const queryClient = useQueryClient();
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalLineDraft[]>([]);
  const [currentLine, setCurrentLine] = useState<JournalLineDraft>({
    account_id: '',
    debit: 0,
    credit: 0,
    description: '',
  });
  const [error, setError] = useState('');

  const addLine = () => {
    if (!currentLine.account_id) {
      setError('Select an account');
      return;
    }
    if (currentLine.debit === 0 && currentLine.credit === 0) {
      setError('Enter debit or credit amount');
      return;
    }
    if (currentLine.debit > 0 && currentLine.credit > 0) {
      setError('Only one of debit or credit can be non-zero');
      return;
    }
    setLines((prev) => [...prev, { ...currentLine }]);
    setCurrentLine({ account_id: '', debit: 0, credit: 0, description: '' });
    setError('');
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && lines.length >= 2;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isBalanced) throw new Error('Journal entry must be balanced (total debit = total credit)');
      if (lines.length < 2) throw new Error('At least two lines required');

      if (mode === 'reverse' && reverseEntryId) {
        const { error: revErr } = await supabase.rpc('reverse_journal_entry', {
          p_entry_id: reverseEntryId,
          p_reason: notes || reference,
        });
        if (revErr) throw revErr;
        return;
      }

      const { data: entryId, error: entryErr } = await supabase.rpc('post_journal_entry', {
        p_fiscal_period_id: fiscalPeriodId,
        p_source_document_type: sourceDocumentType || null,
        p_source_document_id: sourceDocumentId || null,
        p_reference: reference || null,
        p_notes: notes || null,
        p_lines: lines.map((l) => ({
          account_id: l.account_id,
          debit: l.debit,
          credit: l.credit,
          description: l.description || null,
          cost_center_id: l.cost_center_id || null,
        })),
      });
      if (entryErr) throw entryErr;
      return entryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['finance-account-balances'] });
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'reverse' ? 'Reverse Journal Entry' : 'New Journal Entry'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === 'reverse' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              This will create a reversing entry that debits the original credits and credits the original debits.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Manual adjustment"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {mode === 'create' && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-brand-25 p-4">
              <h3 className="text-sm font-medium text-gray-700">Add Line</h3>
              <AccountPicker
                value={currentLine.account_id}
                onChange={(a: FinanceAccount | null) =>
                  setCurrentLine((prev) => ({
                    ...prev,
                    account_id: a?.id || '',
                    account_code: a?.code,
                    account_name: a?.name,
                  }))
                }
                placeholder="Select account..."
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Debit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentLine.debit || ''}
                    onChange={(e) =>
                      setCurrentLine((prev) => ({
                        ...prev,
                        debit: parseFloat(e.target.value) || 0,
                        credit: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Credit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentLine.credit || ''}
                    onChange={(e) =>
                      setCurrentLine((prev) => ({
                        ...prev,
                        credit: parseFloat(e.target.value) || 0,
                        debit: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addLine}
                    className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Add Line
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={currentLine.description || ''}
                  onChange={(e) =>
                    setCurrentLine((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Line description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <PostingPreview
            lines={lines}
            onRemove={mode === 'create' ? removeLine : undefined}
            readonly={mode === 'reverse'}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
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
            disabled={mutation.isPending || (mode === 'create' && !isBalanced)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Processing...'
              : mode === 'reverse'
                ? 'Post Reversal'
                : 'Post Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
