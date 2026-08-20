interface VisitFeedPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
}

export default function VisitFeedPagination({
  page,
  totalPages,
  totalItems,
  start,
  end,
  onPageChange,
}: VisitFeedPaginationProps) {
  return (
    <nav
      aria-label="تنقل صفحات الزيارات"
      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-gray-500 dark:text-gray-400">
        عرض <span dir="ltr">{start}–{end}</span> من <span dir="ltr">{totalItems}</span> زيارة
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
        >
          السابق
        </button>
        <span className="min-w-20 text-center text-xs text-gray-500 dark:text-gray-400" dir="ltr">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.02]"
        >
          التالي
        </button>
      </div>
    </nav>
  );
}
