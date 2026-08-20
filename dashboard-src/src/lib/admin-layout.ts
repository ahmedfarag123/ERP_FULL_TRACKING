export const ADMIN_DESKTOP_BREAKPOINT = 1024;

export function isAdminMobileViewport(viewportWidth: number): boolean {
  return viewportWidth < ADMIN_DESKTOP_BREAKPOINT;
}
