export type OdooProfileRow = {
  id: string;
  odoo_user_id: string | null;
};

export type OrderWithUser = {
  assigned_user_id: string | null;
  user_id: string | null;
};

export function buildOdooToProfileMap(profiles: OdooProfileRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of profiles) {
    if (p.odoo_user_id) {
      map.set(p.odoo_user_id, p.id);
    }
  }
  return map;
}

export function resolveOrderUserId(
  order: OrderWithUser,
  odooMap: Map<string, string>,
): string | null {
  return (
    order.assigned_user_id ??
    (order.user_id ? odooMap.get(order.user_id) ?? null : null)
  );
}
