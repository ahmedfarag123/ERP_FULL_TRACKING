const currencyFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return currencyFormatter.format(value);
}

export function formatDate(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "--";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(parsed);
}

export function formatDateTime(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "--";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("ar-EG").format(value);
}
