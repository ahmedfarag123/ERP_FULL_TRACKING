const DRIVER_BASE_URL = import.meta.env.BASE_URL || "/driver/";

export function driverAsset(path: string): string {
  const base = DRIVER_BASE_URL.endsWith("/") ? DRIVER_BASE_URL : `${DRIVER_BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

export const DRIVER_LOGO_SRC = driverAsset("manifest-icon.png");
export const DRIVER_ICON_192_SRC = driverAsset("manifest-icon-192.maskable.png");
