import { useEffect, useState } from "react";
import { ExclamationCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import { supabase } from "../../lib/supabase";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

const CUSTOMER_TYPES = [
  { value: "restaurant", label: "مطعم" },
  { value: "pharmacy", label: "صيدلية" },
  { value: "hotel", label: "فندق" },
  { value: "cafe", label: "كافيه" },
  { value: "supermarket", label: "سوبر ماركت" },
  { value: "bakery", label: "مخبز" },
  { value: "catering", label: "تموين منزلي" },
  { value: "wholesale", label: "جملة" },
  { value: "other", label: "أخرى" },
];

interface SalesPerson {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCustomerModal({ isOpen, onClose, onCreated }: CreateCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [area, setArea] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [odooUrl, setOdooUrl] = useState("");
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadPersons = async () => {
      setLoadingPersons(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("role", ["sales_agent", "telesales", "supervisor", "manager", "spv", "admin"])
          .eq("status", "active")
          .order("full_name");

        if (!active) return;
        if (error) throw error;
        setSalesPersons((data ?? []) as SalesPerson[]);
      } catch {
        // non-critical
      } finally {
        if (active) setLoadingPersons(false);
      }
    };

    void loadPersons();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setPhone("");
    setAssignedUserId("");
    setArea("");
    setCustomerType("");
    setOdooUrl("");
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("أدخل اسم العميل.");
      return;
    }
    if (!phone.trim()) {
      setError("أدخل رقم موبايل العميل.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const insertPayload: Record<string, unknown> = {
        customer_name: name.trim(),
        phone_number: phone.trim(),
        status: "active",
        priority: "medium",
        product_interests: [],
      };

      if (assignedUserId) insertPayload.assigned_user_id = assignedUserId;
      if (area.trim()) insertPayload.place = area.trim();
      if (customerType) insertPayload.customer_type = customerType;
      if (odooUrl.trim()) insertPayload.external_customer_id = odooUrl.trim();

      const { data: inserted, error: insertError } = await supabase
        .from("customers")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (inserted?.id) {
        const odooPayload: Record<string, unknown> = {
          name: name.trim(),
          is_company: false,
          customer_rank: 1,
        };
        if (phone.trim()) odooPayload.phone = phone.trim();
        if (area.trim()) odooPayload.city = area.trim();

        await supabase.rpc("create_odoo_pending_action", {
          p_entity_type: "customer",
          p_action_type: "create",
          p_odoo_model: "res.partner",
          p_odoo_method: "create",
          p_entity_id: inserted.id,
          p_payload_json: odooPayload,
          p_validation_result: null,
        });
      }

      onCreated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل إنشاء العميل.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-h-[90vh] max-w-2xl overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <UserPlusIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">عميل جديد</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">إضافة عميل</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              أضف عميلاً جديداً ليتم التعامل معه كعميل عادي من هذه النقطة.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(90vh-176px)] space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <AdminField label="اسم العميل">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASS}
                placeholder="اسم العميل أو اسم المحل"
              />
            </AdminField>
          </div>

          <AdminField label="رقم الموبايل">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT_CLASS}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </AdminField>

          <AdminField label="المنطقة">
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={INPUT_CLASS}
              placeholder="مثال: القاهرة، المعادي"
            />
          </AdminField>

          <AdminField label="نوع العميل">
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">اختر نوع العميل...</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="المندوب المسؤول">
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className={INPUT_CLASS}
              disabled={loadingPersons}
            >
              <option value="">{loadingPersons ? "جار التحميل..." : "بدون تعيين"}</option>
              {salesPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </AdminField>

          <div className="md:col-span-2">
            <AdminField label="Odoo ID أو رابط العميل" helper="لتحديد هوية العميل في نظام Odoo.">
              <input
                type="text"
                value={odooUrl}
                onChange={(e) => setOdooUrl(e.target.value)}
                className={INPUT_CLASS}
                placeholder="مثال: https://... أو customer-id"
              />
            </AdminField>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
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
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "جار الإنشاء..." : "إضافة العميل"}
        </button>
      </div>
    </Modal>
  );
}
