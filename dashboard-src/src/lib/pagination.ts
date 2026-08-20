export interface PaginationResult<T> {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  items: T[];
}

export function paginateItems<T>(items: readonly T[], requestedPage: number, pageSize: number): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return {
    page,
    totalPages,
    totalItems,
    start: totalItems === 0 ? 0 : startIndex + 1,
    end: startIndex + pageItems.length,
    items: pageItems,
  };
}
