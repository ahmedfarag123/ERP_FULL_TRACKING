import { useEffect, useState } from "react";
import { CheckIcon, ExclamationCircleIcon, MagnifyingGlassIcon, TicketIcon } from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import { ActivitySelectCard, CardOptionGroup } from "../customer-activity/ActivitySelectCards";
import {
  createTicket,
  fetchOrdersForTicket,
  fetchAssignableUsers,
  TICKET_PRIORITY_OPTIONS,
  TICKET_CATEGORY_OPTIONS,
  type TicketPriority,
} from "../../lib/customer-service";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const DEPARTMENT_OPTIONS = [
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

interface UserOption {
  id: string;
  full_name: string;
  email: string;
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
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
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
    setSubject("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setSelectedDepartments([]);
    setSelectedUserIds([]);
    setDueDate("");
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      setError("اختر طلباً لإنشاء التذكرة.");
      return;
    }
    if (!subject.trim()) {
      setError("أدخل موضوع التذكرة.");
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
        dueDate: dueDate || null,
      });
      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل إنشاء التذكرة.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
<Modal isOpen={isOpen} onClose={onClose} className="mx-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col" contentClassName="flex flex-col min-h-0">
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
        <section className="rounded-2xl border border-gray-200 bg-brand-25/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
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
                        subtitle={`${order.customer_name || "عميل"} - ${order.total_amount ? new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(order.total_amount) : "--"}`}
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

          <div className="md:col-span-2">
            <AdminField label="تاريخ الاستحقاق (اختياري)">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={INPUT_CLASS}
                dir="ltr"
              />
            </AdminField>
          </div>
        </div>

        {/* Assignment */}
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-brand-25/70 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              التوجيه
            </p>
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
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-brand-25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-white/[0.04]"
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
                          : "text-gray-700 hover:bg-brand-25 dark:text-gray-100 dark:hover:bg-white/[0.04]"
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
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.03]"
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
