export function formatMoney(value: number | null, currencyCode: string | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currencyCode || 'EGP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('ar-EG').format(value);
}

export function formatCompact(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat('ar-EG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
