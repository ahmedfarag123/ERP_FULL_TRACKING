const SALES_BASE_URL = import.meta.env.BASE_URL || "/sales/";

export function salesAsset(path: string): string {
  const base = SALES_BASE_URL.endsWith("/") ? SALES_BASE_URL : `${SALES_BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

export const SALES_LOGO_SRC = salesAsset("favicon.png");
export const SALES_ICON_192_SRC = salesAsset("sales-icon-192.png");
