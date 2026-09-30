import { useEffect, useState } from "react";
import {
  CheckIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TicketIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import { ActivitySelectCard, CardOptionGroup } from "../customer-activity/ActivitySelectCards";
import {
  createTicket,
  fetchOrdersForTicket,
  fetchAssignableUsers,
  fetchOrderLineItems,
  TICKET_PRIORITY_OPTIONS,
  TICKET_CATEGORY_OPTIONS,
  type TicketPriority,
  type TicketScope,
  type OrderLineItemOption,
} from "../../lib/customer-service";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

export const DEPARTMENT_OPTIONS = [
  "الأدارة",
  "المخزن",
  "الحركة",
  "الشركة المصنعة",
  "العميل",
  "الحسابات",
  "الموارد البشرية",
  "المشتريات",
  "المبيعات",
  "الماركتينج",
  "البيانات",
  "التطبيق",
  "السيستم",
] as const;

interface OrderOption {
  id: string;
  odoo_order_name: string | null;
  external_order_id: string | null;
  customer_name: string | null;
  total_amount: number | null;
  delivery_status: string | null;
}

export interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

export interface TicketItemDraft {
  orderLineItemId: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  unitPrice: number;
  category: string;
  priority: TicketPriority;
  description: string;
  assignedDepartments: string[];
  assignedUserIds: string[];
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentUserId: string;
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
}: CreateTicketModalProps) {
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderLineItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [scope, setScope] = useState<TicketScope>("order");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [ticketItems, setTicketItems] = useState<TicketItemDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [ordersData, usersData] = await Promise.all([
          fetchOrdersForTicket(),
          fetchAssignableUsers(),
        ]);
        if (!active) return;
        setOrders(ordersData as OrderOption[]);
        setUsers(usersData as UserOption[]);
      } catch {
        // non-critical
      } finally {
        if (active) setLoadingData(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedOrderId("");
    setOrderSearch("");
    setOrderItems([]);
    setScope("order");
    setSelectedProductIds([]);
    setSubject("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setSelectedDepartments([]);
    setSelectedUserIds([]);
    setTicketItems([]);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!selectedOrderId) {
      setOrderItems([]);
      return;
    }
    let active = true;
    setLoadingItems(true);
    fetchOrderLineItems(selectedOrderId)
      .then((items) => {
        if (active) setOrderItems(items);
      })
      .catch(() => {
        // non-critical
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [selectedOrderId]);

  useEffect(() => {
    if (scope !== "products") return;
    const existing = new Set(ticketItems.map((i) => i.orderLineItemId));
    const newItems: TicketItemDraft[] = [];
    for (const pid of selectedProductIds) {
      if (existing.has(pid)) continue;
      const item = orderItems.find((o) => o.id === pid);
      if (!item) continue;
      newItems.push({
        orderLineItemId: item.id,
        productName: item.product_name,
        productCode: item.product_code,
        quantity: item.ordered_quantity,
        unitPrice: item.unit_price,
        category: "",
        priority: "medium",
        description: "",
        assignedDepartments: [],
        assignedUserIds: [],
      });
    }
    if (newItems.length > 0) {
      setTicketItems((prev) => [...prev, ...newItems]);
    }
    setTicketItems((prev) =>
      prev.filter((i) => selectedProductIds.includes(i.orderLineItemId)),
    );
  }, [selectedProductIds, scope, orderItems]);

  const updateTicketItem = (
    orderLineItemId: string,
    field: keyof TicketItemDraft,
    value: unknown,
  ) => {
    setTicketItems((prev) =>
      prev.map((item) =>
        item.orderLineItemId === orderLineItemId
          ? { ...item, [field]: value }
          : item,
      ),
    );
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      setError("اختر طلباً لإنشاء التذكرة.");
      return;
    }
    if (!subject.trim()) {
      setError("أدخل موضوع التذكرة.");
      return;
    }
    if (scope === "products" && selectedProductIds.length === 0) {
      setError("اختر منتج واحد على الأقل.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await createTicket({
        orderId: selectedOrderId,
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
        assignedTo: null,
        createdBy: currentUserId,
        scope,
        assignedDepartments: scope === "order" ? selectedDepartments : [],
        assignedUserIds: scope === "order" ? selectedUserIds : [],
        items:
          scope === "products"
            ? ticketItems.map((item) => ({
                orderLineItemId: item.orderLineItemId,
                productName: item.productName,
                productCode: item.productCode ?? undefined,
                category: item.category || undefined,
                priority: item.priority,
                description: item.description || undefined,
                assignedDepartments: item.assignedDepartments,
                assignedUserIds: item.assignedUserIds,
              }))
            : undefined,
      });
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل إنشاء التذكرة.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatEGP = (value: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

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
            <TicketIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">خدمة العملاء</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">إنشاء تذكرة جديدة</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              أنشئ تذكرة متعلقة بطلب لمتابعة مشكلة أو استفسار العميل.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {/* Order Selection */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">الطلب المرتبط</p>
          {loadingData ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              جار تحميل الطلبات...
            </div>
          ) : (
            <>
              {orders.length > 0 && (
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="بحث برقم الطلب أو اسم العميل..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>
              )}
              <div className="grid gap-3 max-h-48 overflow-y-auto">
                {(() => {
                  const query = orderSearch.trim().toLowerCase();
                  const filtered = query
                    ? orders.filter((order) => {
                        const orderNumber = (order.odoo_order_name || order.external_order_id || "").toLowerCase();
                        const customerName = (order.customer_name || "").toLowerCase();
                        return orderNumber.includes(query) || customerName.includes(query);
                      })
                    : orders;
                  return filtered.map((order) => {
                    const orderNumber = order.odoo_order_name || order.external_order_id || order.id.slice(0, 8);
                    return (
                      <ActivitySelectCard
                        key={order.id}
                        active={selectedOrderId === order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        title={orderNumber}
                        subtitle={`${order.customer_name || "عميل"} - ${order.total_amount ? formatEGP(order.total_amount) : "--"}`}
                        icon={<TicketIcon className="h-5 w-5" aria-hidden />}
                      />
                    );
                  });
                })()}
                {orders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد طلبات متاحة.</p>
                ) : null}
              </div>
            </>
          )}
        </section>

        {/* Order Line Items + Scope Selection */}
        {selectedOrderId && (
          <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">منتجات الأوردر</p>
            {loadingItems ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                جار تحميل المنتجات...
              </div>
            ) : orderItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد منتجات في هذا الطلب.</p>
            ) : (
              <>
                <div className="mb-4 grid gap-2 max-h-56 overflow-y-auto">
                  {orderItems.map((item) => {
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
                          onChange={() => toggleProduct(item.id)}
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
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.product_name}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            الكمية: {item.ordered_quantity} | السعر: {formatEGP(item.unit_price)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {formatEGP(item.total_amount)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">نطاق المشكلة</p>
                  <div className="flex gap-3">
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                        scope === "order"
                          ? "border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:border-blue-500/30 dark:bg-blue-500/10"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === "order"}
                        onChange={() => {
                          setScope("order");
                          setSelectedProductIds([]);
                          setTicketItems([]);
                        }}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          scope === "order" ? "border-blue-600" : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {scope === "order" ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                      </span>
                      المشكلة في الأوردر كله
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                        scope === "products"
                          ? "border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:border-blue-500/30 dark:bg-blue-500/10"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scope === "products"}
                        onChange={() => setScope("products")}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          scope === "products" ? "border-blue-600" : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {scope === "products" ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                      </span>
                      المشكلة في منتجات محددة
                    </label>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Subject & Description (always shown) */}
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

        {/* Scope-specific fields */}
        {scope === "order" && (
          <>
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
          </>
        )}

        {scope === "products" && ticketItems.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              تفاصيل كل منتج ({ticketItems.length} منتج)
            </p>
            {ticketItems.map((item) => (
              <ProductItemCard
                key={item.orderLineItemId}
                item={item}
                users={users}
                onUpdate={(field, value) => updateTicketItem(item.orderLineItemId, field, value)}
                onRemove={() => {
                  setSelectedProductIds((prev) => prev.filter((p) => p !== item.orderLineItemId));
                  setTicketItems((prev) => prev.filter((i) => i.orderLineItemId !== item.orderLineItemId));
                }}
              />
            ))}
          </div>
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
          {isSaving ? "جار الإنشاء..." : "إنشاء التذكرة"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Assignment Section (shared) ────────────────────────────────────────── */

export function AssignmentSection({
  selectedDepartments,
  setSelectedDepartments,
  selectedUserIds,
  setSelectedUserIds,
  users,
}: {
  selectedDepartments: string[];
  setSelectedDepartments: (fn: (prev: string[]) => string[]) => void;
  selectedUserIds: string[];
  setSelectedUserIds: (fn: (prev: string[]) => string[]) => void;
  users: UserOption[];
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">التوجيه</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          اختر الأقسام والمستخدمين المرتبطين بمتابعة التذكرة.
        </p>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          الأقسام
        </span>
        <div role="group" aria-label="الأقسام" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_OPTIONS.map((department) => {
            const isSelected = selectedDepartments.includes(department);
            return (
              <label
                key={department}
                className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition focus-within:ring-4 focus-within:ring-blue-500/10 ${
                  isSelected
                    ? "border-blue-200 bg-white text-blue-700 ring-1 ring-blue-200 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-white/[0.04]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setSelectedDepartments((current) =>
                      current.includes(department)
                        ? current.filter((value) => value !== department)
                        : [...current, department],
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
                <span className="truncate font-medium">{department}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          المستخدمون
        </span>
        <div
          role="group"
          aria-label="المستخدمون"
          className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950"
        >
          {users.length > 0 ? (
            users.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-sm transition focus-within:ring-4 focus-within:ring-blue-500/10 last:border-b-0 dark:border-gray-800 ${
                    isSelected
                      ? "bg-blue-50/80 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedUserIds((current) =>
                        current.includes(user.id)
                          ? current.filter((value) => value !== user.id)
                          : [...current, user.id],
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.full_name}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">لا يوجد مستخدمون متاحون.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Product Item Card ──────────────────────────────────────────────────── */

export function ProductItemCard({
  item,
  users,
  onUpdate,
  onRemove,
}: {
  item: TicketItemDraft;
  users: UserOption[];
  onUpdate: (field: keyof TicketItemDraft, value: unknown) => void;
  onRemove: () => void;
}) {
  const [itemDepartments, setItemDepartments] = useState<string[]>(item.assignedDepartments);
  const [itemUsers, setItemUsers] = useState<string[]>(item.assignedUserIds);

  const syncDepartments = (fn: (prev: string[]) => string[]) => {
    const next = fn(itemDepartments);
    setItemDepartments(next);
    onUpdate("assignedDepartments", next);
  };

  const syncUsers = (fn: (prev: string[]) => string[]) => {
    const next = fn(itemUsers);
    setItemUsers(next);
    onUpdate("assignedUserIds", next);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.productName}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.productCode && `كود: ${item.productCode} | `}
            الكمية: {item.quantity} | السعر:{" "}
            {new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(
              item.unitPrice,
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="ml-2 rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <CardOptionGroup
            label="الأولوية"
            options={TICKET_PRIORITY_OPTIONS}
            value={item.priority}
            onChange={(value) => onUpdate("priority", value as TicketPriority)}
          />
        </div>

        <AdminField label="الفئة">
          <select
            value={item.category}
            onChange={(event) => onUpdate("category", event.target.value)}
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

        <div className="md:col-span-2">
          <AdminField label="الوصف (اختياري)">
            <textarea
              rows={2}
              value={item.description}
              onChange={(event) => onUpdate("description", event.target.value)}
              className={INPUT_CLASS}
              placeholder="تفاصيل مشكلة هذا المنتج..."
            />
          </AdminField>
        </div>
      </div>

      <AssignmentSection
        selectedDepartments={itemDepartments}
        setSelectedDepartments={syncDepartments}
        selectedUserIds={itemUsers}
        setSelectedUserIds={syncUsers}
        users={users}
      />
    </div>
  );
}
