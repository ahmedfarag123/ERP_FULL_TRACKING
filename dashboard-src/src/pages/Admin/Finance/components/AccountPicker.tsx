import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import type { AccountType, FinanceAccount } from '../../../../types/finance';

interface FinanceAccountRow {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  type: AccountType;
  parent_id: string | null;
  is_active: boolean;
  allow_posting: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

function mapAccount(row: FinanceAccountRow): FinanceAccount {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameAr: row.name_ar,
    type: row.type,
    parentId: row.parent_id,
    isActive: row.is_active,
    allowPosting: row.allow_posting,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

interface AccountPickerProps {
  value: string | null;
  onChange: (account: FinanceAccount | null) => void;
  accountType?: AccountType;
  allowPending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function AccountPicker({
  value,
  onChange,
  accountType,
  allowPending = false,
  disabled = false,
  placeholder = 'Search accounts...',
}: AccountPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('id, code, name, name_ar, type, parent_id, is_active, allow_posting, sort_order, created_at, created_by')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return ((data ?? []) as FinanceAccountRow[]).map(mapAccount);
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = accounts;
    if (accountType) list = list.filter((a) => a.type === accountType);
    if (!allowPending) list = list.filter((a) => a.allowPosting);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.nameAr && a.nameAr.includes(search)),
      );
    }
    return list;
  }, [accounts, accountType, allowPending, search]);

  const selected = accounts.find((a) => a.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {selected ? (
          <span className="truncate">
            <span className="font-mono text-xs text-gray-500">{selected.code}</span>{' '}
            {selected.name}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No accounts found</div>
            ) : (
              filtered.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    onChange(account);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    account.id === value ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500 w-16 shrink-0">
                      {account.code}
                    </span>
                    <span className="truncate">{account.name}</span>
                    <span className="ml-auto text-xs text-gray-400 capitalize">
                      {account.type.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
