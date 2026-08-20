import { useEffect, useState } from "react";
import { CalendarDaysIcon, ExclamationCircleIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import { CardOptionGroup, CustomerProfileCardSelector, CustomerSearchList } from "./ActivitySelectCards";
import {
  VISIT_NEXT_ACTION_OPTIONS,
  VISIT_OUTCOME_OPTIONS,
  VISIT_STATUS_OPTIONS,
  VISIT_TYPE_OPTIONS,
  saveCustomerVisitActivity,
  toDateTimeLocalValue,
  type VisitStatusKey,
} from "../../lib/customer-activity";
import type { SelectedCustomerProfile } from "../../lib/customerProfileSelection";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

interface CustomerReference {
  id: string;
  customer_name: string;
  phone_number?: string | null;
}

type CustomerSearchResult = { id: string; customer_name: string; phone_number: string | null };

const EMPTY_CUSTOMER_OPTIONS: CustomerReference[] = [];

interface VisitActivityModalProps {
  isOpen: boolean;
  customer: CustomerReference | null;
  customerOptions?: CustomerReference[];
  customerOptionsLoading?: boolean;
  customerOptionsError?: string | null;
  actorUserId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function VisitActivityModal({
  isOpen,
  customer,
  customerOptions = EMPTY_CUSTOMER_OPTIONS,
  actorUserId,
  onClose,
  onSaved,
}: VisitActivityModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchSelectedCustomer, setSearchSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [status, setStatus] = useState<VisitStatusKey>("planned");
  const [scheduledAt, setScheduledAt] = useState("");
  const [visitType, setVisitType] = useState("follow_up");
  const [visitReason, setVisitReason] = useState("");
  const [visitOutcome, setVisitOutcome] = useState("visit_scheduled");
  const [nextAction, setNextAction] = useState("confirm_visit");
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<SelectedCustomerProfile | null>(null);
  const [locationDetails, setLocationDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(customer?.id ?? customerOptions[0]?.id ?? "");
    setSearchSelectedCustomer(null);
    setStatus("planned");
    setScheduledAt(toDateTimeLocalValue());
    setVisitType("follow_up");
    setVisitReason("");
    setVisitOutcome("visit_scheduled");
    setNextAction("confirm_visit");
    setSelectedCustomerProfile(null);
    setLocationDetails("");
    setNotes("");
    setError(null);
  }, [customer, customerOptions, isOpen]);

  const selectedCustomer =
    customer ?? searchSelectedCustomer ?? customerOptions.find((option) => option.id === selectedCustomerId) ?? null;

  const handleSubmit = async () => {
    if (!actorUserId) {
      setError("Your session is missing the current user. Sign in again.");
      return;
    }
    if (!selectedCustomer) {
      setError("اختر عميلا قبل حفظ الزيارة.");
      return;
    }
    if (!scheduledAt || !visitType || !visitReason || !nextAction) {
      setError("أكمل حقول الزيارة المطلوبة قبل الحفظ.");
      return;
    }
    if (!selectedCustomerProfile) {
      setError("أكمل تصنيف العميل والمنتج قبل حفظ الزيارة.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await saveCustomerVisitActivity({
        customerId: selectedCustomer.id,
        userId: actorUserId,
        scheduledAt,
        status,
        visitType,
        visitReason,
        visitOutcome,
        nextAction,
        locationDetails,
        notes,
        selectedCustomerProfile,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل حفظ نشاط الزيارة.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-h-[90vh] max-w-3xl overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CalendarDaysIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">نشاط العميل</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">جدولة زيارة</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              أضف سجل زيارة بتفاصيل تجارية كافية لملف العميل وصفحة الزيارات.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(90vh-176px)] space-y-5 overflow-y-auto px-6 py-5">
        {customer ? (
          <div className="rounded-2xl border border-gray-200 bg-brand-25/70 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">العميل</p>
            <p dir="auto" className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {customer.customer_name}
            </p>
            <p dir="ltr" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {customer.phone_number || "--"}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-brand-25/70 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">العميل</p>
            <CustomerSearchList
              selectedId={selectedCustomerId}
              onSelect={(c) => {
                setSelectedCustomerId(c.id);
                setSearchSelectedCustomer(c);
              }}
            />
            {selectedCustomer ? (
              <p dir="ltr" className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedCustomer.phone_number || "--"}
              </p>
            ) : null}
          </div>
        )}

        <CustomerProfileCardSelector value={selectedCustomerProfile} onChange={setSelectedCustomerProfile} />

        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label={status === "done" ? "وقت الزيارة" : "مجدولة في"}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className={INPUT_CLASS}
            />
          </AdminField>

          <div className="md:col-span-2">
            <CardOptionGroup
              label="حالة الزيارة"
              options={VISIT_STATUS_OPTIONS}
              value={status}
              onChange={(value) => setStatus(value as VisitStatusKey)}
            />
          </div>

          <div className="md:col-span-2">
            <CardOptionGroup label="نوع الزيارة" options={VISIT_TYPE_OPTIONS} value={visitType} onChange={setVisitType} />
          </div>

          <div className="md:col-span-2">
            <CardOptionGroup label="النتيجة" options={VISIT_OUTCOME_OPTIONS} value={visitOutcome} onChange={setVisitOutcome} />
          </div>

          <div className="md:col-span-2">
            <AdminField label="غرض الزيارة">
              <input
                type="text"
                value={visitReason}
                onChange={(event) => setVisitReason(event.target.value)}
                className={INPUT_CLASS}
                placeholder="ما الهدف التجاري من هذه الزيارة؟"
              />
            </AdminField>
          </div>

          <div className="md:col-span-2">
            <CardOptionGroup label="الإجراء التالي" options={VISIT_NEXT_ACTION_OPTIONS} value={nextAction} onChange={setNextAction} />
          </div>

          <AdminField label="تفاصيل الموقع">
            <div className="relative">
              <MapPinIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" aria-hidden />
              <input
                type="text"
                value={locationDetails}
                onChange={(event) => setLocationDetails(event.target.value)}
                className={`${INPUT_CLASS} pl-10`}
                placeholder="الفرع أو المنطقة أو نقطة الاجتماع"
              />
            </div>
          </AdminField>

          <div className="md:col-span-2">
            <AdminField label="الملاحظات">
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={INPUT_CLASS}
                placeholder="سجل السياق والعوائق والأطراف المعنية وما يجب أن يستعد له الممثل."
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
          {isSaving ? "جار الحفظ..." : "حفظ نشاط الزيارة"}
        </button>
      </div>
    </Modal>
  );
}
