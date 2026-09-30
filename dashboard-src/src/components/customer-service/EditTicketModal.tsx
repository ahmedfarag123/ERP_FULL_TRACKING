import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import { CardOptionGroup } from "../customer-activity/ActivitySelectCards";
import {
  fetchAssignableUsers,
  fetchOrderLineItems,
  fetchTicketItems,
  updateTicket,
  TICKET_PRIORITY_OPTIONS,
  TICKET_CATEGORY_OPTIONS,
  type TicketPriority,
  type TicketStatus,
} from "../../lib/customer-service";
import {
  AssignmentSection,
  ProductItemCard,
  type TicketItemDraft,
  type UserOption,
} from "./CreateTicketModal";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

export interface EditTicketSource {
  id: string;
  order_id?: string | null;
  subject: string;
  description?: string | null;
  status: string;
  priority?: string;
  category?: string | null;
  scope?: string | null;
  assigned_departments?: string[] | null;
  assigned_user_ids?: string[] | null;
}

interface TicketItemView {
  id?: string;
  orderLineItemId: string | null;
  productName: string;
  productCode: string | null;
  category: string;
  priority: TicketPriority;
  description: string;
  assignedDepartments: string[];
  assignedUserIds: string[];
  status: TicketStatus;
}

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  ticket: EditTicketSource;
  currentUserId: string;
}

export default function EditTicketModal({
  isOpen,
  onClose,
  onUpdated,
  ticket,
}: EditTicketModalProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [ticketItems, setTicketItems] = useState<TicketItemView[]>([]);

  const [orderItems, setOrderItems] = useState<Array<{ id: string; product_name: string; product_code: string | null }>>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProductsScope = ticket.scope === "products";

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchAssignableUsers()
      .then((rows) => {
        if (active) setUsers((rows ?? []) as unknown as UserOption[]);
      })
      .catch(() => {
        // non-critical
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setSubject(ticket.subject ?? "");
    setDescription(ticket.description ?? "");
    setPriority((ticket.priority as TicketPriority) || "medium");
    setCategory(ticket.category ?? "");
    setSelectedDepartments(ticket.assigned_departments ?? []);
    setSelectedUserIds(ticket.assigned_user_ids ?? []);
    setTicketItems([]);
    setOrderItems([]);
    setOrderSearch("");
    setSelectedProductIds([]);
    setError(null);

    const loadItems = async () => {
      try {
        const [items, candidates] = await Promise.all([
          fetchTicketItems(ticket.id),
          ticket.order_id ? fetchOrderLineItems(ticket.order_id) : Promise.resolve([]),
        ]);
        if (!active) return;
        setTicketItems(
          (items ?? []).map((item) => ({
            id: item.id,
            orderLineItemId: item.order_line_item_id,
            productName: item.product_name,
            productCode: item.product_code,
            category: item.category ?? "",
            priority: item.priority,
            description: item.description ?? "",
            assignedDepartments: item.assigned_departments ?? [],
            assignedUserIds: item.assigned_user_ids ?? [],
            status: item.status,
          })),
        );
        setOrderItems(candidates as Array<{ id: string; product_name: string; product_code: string | null }>);
      } catch {
        // non-critical
      }
    };
    void loadItems();
    return () => {
      active = false;
    };
  }, [isOpen, ticket]);

  const updateItem = useCallback((id: string, field: string, value: unknown) => {
    setTicketItems((prev) =>
      prev.map((item) =>
        item.id === id ? ({ ...item, [field]: value } as TicketItemView) : item,
      ),
    );
  }, []);

  const addProductItems = useCallback(() => {
    if (selectedProductIds.length === 0) return;
    const existing = new Set(ticketItems.map((i) => i.orderLineItemId));
    const additions: TicketItemView[] = [];
    for (const pid of selectedProductIds) {
      const line = orderItems.find((o) => o.id === pid);
      if (!line || existing.has(pid)) continue;
      additions.push({
        id: undefined,
        orderLineItemId: pid,
        productName: line.product_name,
        productCode: line.product_code,
        category: "",
        priority: "medium",
        description: "",
        assignedDepartments: [],
        assignedUserIds: [],
        status: "open",
      });
    }
    if (additions.length > 0) setTicketItems((prev) => [...prev, ...additions]);
    setSelectedProductIds([]);
  }, [orderItems, selectedProductIds, ticketItems]);

  const filteredOrderItems = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    const alreadyAdded = new Set(ticketItems.map((i) => i.orderLineItemId));
    const rows = orderItems.filter((o) => !alreadyAdded.has(o.id));
    if (!query) return rows;
    return rows.filter(
      (o) =>
        o.product_name.toLowerCase().includes(query) ||
        (o.product_code ?? "").toLowerCase().includes(query),
    );
  }, [orderItems, orderSearch, ticketItems]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError("أدخل موضوع التذكرة.");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      await updateTicket(ticket.id, {
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
        assignedDepartments: selectedDepartments,
        assignedUserIds: selectedUserIds,
        items:
          isProductsScope && ticketItems.length > 0
            ? ticketItems.map((item) => ({
                id: item.id,
                orderLineItemId: item.orderLineItemId,
                productName: item.productName,
                productCode: item.productCode ?? null,
                category: item.category || null,
                priority: item.priority,
                description: item.description || null,
                assignedDepartments: item.assignedDepartments,
                assignedUserIds: item.assignedUserIds,
                status: item.status,
              }))
            : undefined,
      });
      onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل حفظ التعديلات.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col"
      contentClassName="flex flex-col min-h-0"
    >
      <div className="shrink-0 border-b border-gray-200 px-4 py-5 dark:border-gray-800 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <PencilSquareIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">خدمة العملاء</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">تعديل التذكرة</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              عدّل بيانات التذكرة وتوجيهها ومنتجاتها.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {/* Subject & Description */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <AdminField label="موضوع التذكرة">
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className={INPUT_CLASS}
                placeholder="مثال: مشكلة في التسليم، طلب تغيير الكمية..."
              />
            </AdminField>
          </div>

          <div className="md:col-span-2">
            <AdminField label="الوصف (اختياري)" helper="أضف تفاصيل إضافية حول المشكلة أو الاستفسار.">
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={INPUT_CLASS}
                placeholder="اكتب تفاصيل التذكرة هنا..."
              />
            </AdminField>
          </div>
        </div>

        {/* Priority & Category */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <CardOptionGroup
              label="الأولوية"
              options={TICKET_PRIORITY_OPTIONS}
              value={priority}
              onChange={(value) => setPriority(value as TicketPriority)}
            />
          </div>

          <div className="md:col-span-2">
            <AdminField label="الفئة">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">اختر فئة...</option>
                {TICKET_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
        </div>

        {/* Assignment */}
        <AssignmentSection
          selectedDepartments={selectedDepartments}
          setSelectedDepartments={setSelectedDepartments}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          users={users}
        />

        {/* Product-level items */}
        {isProductsScope && (
          <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  المنتجات المتأثرة ({ticketItems.length})
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  عدّل تفاصيل كل منتج أو أضف منتجات من الأوردر.
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="بحث في منتجات الأوردر لإضافة منتج..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
              {filteredOrderItems.length > 0 && (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {filteredOrderItems.map((item) => {
                    const isSelected = selectedProductIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                          isSelected
                            ? "border-blue-200 bg-white text-blue-700 ring-1 ring-blue-200 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedProductIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((p) => p !== item.id)
                                : [...prev, item.id],
                            )
                          }
                          className="sr-only"
                        />
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
                          }`}
                        >
                          {isSelected ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{item.product_name}</span>
                        {item.product_code ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                            {item.product_code}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={addProductItems}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  إضافة المنتجات المحددة ({selectedProductIds.length})
                </button>
              )}
            </div>

            <div className="space-y-4">
              {ticketItems.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد منتجات في هذه التذكرة.</p>
              ) : (
                ticketItems.map((item) => (
                  <ProductItemCard
                    key={item.id ?? item.orderLineItemId ?? item.productName}
                    item={
                      {
                        orderLineItemId: item.orderLineItemId ?? item.id ?? "",
                        productName: item.productName,
                        productCode: item.productCode,
                        quantity: 1,
                        unitPrice: 0,
                        category: item.category,
                        priority: item.priority,
                        description: item.description,
                        assignedDepartments: item.assignedDepartments,
                        assignedUserIds: item.assignedUserIds,
                      } as TicketItemDraft
                    }
                    users={users}
                    onUpdate={(field, value) => {
                      const id = item.id;
                      if (id) {
                        updateItem(id, field, value);
                      } else {
                        setTicketItems((prev) =>
                          prev.map((it) =>
                            it === item ? ({ ...it, [field]: value } as TicketItemView) : it,
                          ),
                        );
                      }
                    }}
                    onRemove={() => setTicketItems((prev) => prev.filter((it) => it !== item))}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.03]"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSaving}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "جار الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </Modal>
  );
}