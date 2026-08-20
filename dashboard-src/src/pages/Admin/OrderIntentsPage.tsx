import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardDocumentListIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import PageMeta from "../../components/common/PageMeta";
import { AdminEmptyState, AdminPageFrame, AdminSection, AdminTableSkeleton } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import {
  fetchOrderIntents,
  updateOrderIntentStatus,
  type OrderIntentRow,
  type OrderIntentStatus,
} from "../../lib/order-intents";

type StatusFilter = OrderIntentStatus | "all";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  pending: "Pending",
  reviewing: "Reviewing",
  converted: "Converted",
  dismissed: "Dismissed",
  cancelled: "Cancelled",
};

const statusTone: Record<OrderIntentStatus, StatusBadgeTone> = {
  pending: "orange",
  reviewing: "blue",
  converted: "green",
  dismissed: "gray",
  cancelled: "red",
};

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function formatMoney(value: number | string | null) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? currencyFormatter.format(parsed) : "--";
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function stockSummary(intent: OrderIntentRow) {
  const profiles = Array.isArray(intent.selected_customer_profiles) ? intent.selected_customer_profiles : [];
  const matched = profiles.reduce((sum, profile) => sum + numberValue(profile.matched_product_count), 0);
  const inStock = profiles.reduce((sum, profile) => sum + numberValue(profile.in_stock_product_count), 0);
  const quantity = profiles.reduce((sum, profile) => sum + numberValue(profile.total_quantity_on_hand), 0);
  if (profiles.length === 0 || matched === 0) return null;
  return { matched, inStock, quantity };
}

export default function OrderIntentsPage() {
  const [intents, setIntents] = useState<OrderIntentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIntents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIntents(await fetchOrderIntents(statusFilter));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setIntents([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadIntents();
  }, [loadIntents]);

  const pendingCount = useMemo(
    () => intents.filter((intent) => intent.status === "pending").length,
    [intents],
  );

  const handleStatusChange = async (intent: OrderIntentRow, status: OrderIntentStatus) => {
    try {
      setUpdatingId(intent.id);
      setError(null);
      await updateOrderIntentStatus({ id: intent.id, status, adminNotes: intent.admin_notes });
      await loadIntents();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <PageMeta title="Order Intents | Sales Admin" description="Review sales visit order requests." />

      <AdminPageFrame>
        <PageHeader
          variant="list"
          eyebrow="SALES FOLLOW-UP"
          title="Order Intents"
          subtitle="Review order requests created by sales visits before they become warehouse or delivery work."
          meta={
            <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
              {pendingCount} pending in current view
            </span>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <AdminSection
          title="Intent Queue"
          description="Keep this list clear so customer interest does not stay hidden in visit notes."
          actions={
            <div className="flex flex-wrap gap-2">
              {(["pending", "reviewing", "converted", "dismissed", "cancelled", "all"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => startTransition(() => setStatusFilter(status))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    statusFilter === status
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          }
        >
          {isLoading ? (
            <table className="min-w-full text-left text-sm">
              <tbody>
                <AdminTableSkeleton columns={6} rows={6} />
              </tbody>
            </table>
          ) : intents.length === 0 ? (
            <AdminEmptyState
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              title="No order intents"
              description="New sales visit order requests will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                  <tr>
                    {["Customer", "Sales Rep", "Intent", "Value", "Status", "Actions"].map((header) => (
                      <th key={header} className="px-4 py-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {intents.map((intent) => {
                    const inventory = stockSummary(intent);
                    return (
                    <tr key={intent.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white" dir="auto">
                          {intent.customer_name ?? intent.customer_id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(intent.created_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300" dir="auto">
                        {intent.sales_rep_name ?? intent.sales_profile_id.slice(0, 8)}
                      </td>
                      <td className="max-w-md px-4 py-4">
                        <p className="line-clamp-2 font-medium text-gray-900 dark:text-white" dir="auto">
                          {intent.summary}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Requested delivery: {intent.requested_delivery_date ?? "--"}
                        </p>
                        {inventory ? (
                          <p
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              inventory.quantity
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            }`}
                          >
                            Stock: {inventory.inStock}/{inventory.matched} matched,{" "}
                            {inventory.quantity.toLocaleString("en-US")} on hand
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white" dir="ltr">
                        {formatMoney(intent.estimated_value)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={statusLabels[intent.status]} tone={statusTone[intent.status]} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[230px] flex-wrap gap-2">
                          {intent.status === "pending" ? (
                            <button
                              type="button"
                              disabled={updatingId === intent.id}
                              onClick={() => void handleStatusChange(intent, "reviewing")}
                              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            >
                              Review
                            </button>
                          ) : null}
                          {intent.status !== "converted" ? (
                            <button
                              type="button"
                              disabled={updatingId === intent.id}
                              onClick={() => void handleStatusChange(intent, "converted")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <ShoppingCartIcon className="h-3.5 w-3.5" />
                              Converted
                            </button>
                          ) : null}
                          {intent.status !== "dismissed" ? (
                            <button
                              type="button"
                              disabled={updatingId === intent.id}
                              onClick={() => void handleStatusChange(intent, "dismissed")}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-25 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </AdminPageFrame>
    </>
  );
}
