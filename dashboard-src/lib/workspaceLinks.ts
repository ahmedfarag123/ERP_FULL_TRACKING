type WorkspaceTarget = "sales" | "driver";

const WORKSPACE_PATHS: Record<WorkspaceTarget, string> = {
  sales: "/sales/",
  driver: "/driver/",
};

const DEV_PORTS: Record<WorkspaceTarget, string> = {
  sales: "4174",
  driver: "4175",
};

export function buildWorkspaceUrl(target: WorkspaceTarget): string {
  if (typeof window === "undefined") {
    return WORKSPACE_PATHS[target];
  }

  const url = new URL(WORKSPACE_PATHS[target], window.location.origin);
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (isLocalhost) {
    url.port = DEV_PORTS[target];
  }

  return url.toString();
}
