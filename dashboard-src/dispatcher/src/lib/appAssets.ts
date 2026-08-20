const DISPATCHER_BASE_URL = import.meta.env.BASE_URL || "/dispatcher/";

export function dispatcherAsset(path: string): string {
  const base = DISPATCHER_BASE_URL.endsWith("/") ? DISPATCHER_BASE_URL : `${DISPATCHER_BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

export const DISPATCHER_LOGO_SRC = dispatcherAsset("manifest-icon.png");
