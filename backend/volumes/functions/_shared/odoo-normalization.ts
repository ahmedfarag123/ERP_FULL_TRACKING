export function normalizeOdooText(value) {
  if (value === null || value === undefined || value === false) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}
