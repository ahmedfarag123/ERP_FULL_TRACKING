import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExclamationCircleIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "../ui/modal";
import { AdminField } from "../admin/AdminPageElements";
import {
  CardMultiOptionGroup,
  CardOptionGroup,
  ConversationStep,
  CustomerProfileCardSelector,
  CustomerSearchList,
} from "./ActivitySelectCards";
import {
  CALL_CONNECTIVITY_STATUS_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CALL_REASON_OPTIONS,
  CUSTOMER_DISPOSITION_OPTIONS,
  CUSTOMER_OBJECTION_OPTIONS,
  REQUESTED_ACTION_OPTIONS,
  NEXT_ACTION_OPTIONS,
  SERVICE_ISSUE_TYPE_OPTIONS,
  getOptionFields,
  parseDurationMinutesToSeconds,
  saveCustomerCallActivity,
  toDateTimeLocalValue,
  type ActivityFieldDefinition,
} from "../../lib/customer-activity";
import type { SelectedCustomerProfile } from "../../lib/customerProfileSelection";
import { createOdooCrmActivity } from "../../lib/odoo-crm-activity";
import { supabase } from "../../lib/supabase";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

interface CustomerReference {
  id: string;
  customer_name: string;
  phone_number?: string | null;
}

type CustomerSearchResult = { id: string; customer_name: string; phone_number: string | null };

const EMPTY_CUSTOMER_OPTIONS: CustomerReference[] = [];

const DISPOSITION_NEXT_ACTION_SUGGESTIONS: Record<string, string> = {
  already_active_customer: "no_further_action",
  order_confirmed: "create_order",
  interested_ready_to_order: "create_order",
  will_order_when_needed: "send_information",
  app_installed_not_ordered: "send_information",
  interested_needs_info: "send_information",
  neutral_undecided: "send_information",
  not_interested: "no_further_action",
  rejected_offer: "no_further_action",
  rejected_platform: "no_further_action",
  no_clear_answer: "schedule_follow_up_call",
};

interface CallActivityModalProps {
  isOpen: boolean;
  customer: CustomerReference | null;
  customerOptions?: CustomerReference[];
  customerOptionsLoading?: boolean;
  customerOptionsError?: string | null;
  actorUserId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function CallActivityModal({
  isOpen,
  customer,
  customerOptions = EMPTY_CUSTOMER_OPTIONS,
  actorUserId,
  onClose,
  onSaved,
}: CallActivityModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchSelectedCustomer, setSearchSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [occurredAt, setOccurredAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("3");

  const [connectivityStatus, setConnectivityStatus] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactStatusDetails, setContactStatusDetails] = useState<Record<string, string>>({});

  const [callReason, setCallReason] = useState("");
  const [disposition, setDisposition] = useState("");
  const [objection, setObjection] = useState("");
  const [objectionDetails, setObjectionDetails] = useState<Record<string, string>>({});
  const [requestedActions, setRequestedActions] = useState<string[]>([]);
  const [requestedActionDetails, setRequestedActionDetails] = useState<Record<string, Record<string, string>>>({});

  const [nextAction, setNextAction] = useState("");
  const [nextActionAutoSuggested, setNextActionAutoSuggested] = useState(false);

  const [serviceIssueFlagged, setServiceIssueFlagged] = useState(false);
  const [serviceIssueType, setServiceIssueType] = useState("");

  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<SelectedCustomerProfile | null>(null);
  const [notes, setNotes] = useState("");
  const [requiresUrgentAction, setRequiresUrgentAction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [hasProductClassification, setHasProductClassification] = useState(false);
  const [savedCallId, setSavedCallId] = useState<string | null>(null);
  const [activityRequestId, setActivityRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(customer?.id ?? customerOptions[0]?.id ?? "");
    setSearchSelectedCustomer(null);
    setDirection("outbound");
    setOccurredAt(toDateTimeLocalValue());
    setDurationMinutes("3");
    setConnectivityStatus("");
    setContactStatus("");
    setContactStatusDetails({});
    setCallReason("");
    setDisposition("");
    setObjection("");
    setObjectionDetails({});
    setRequestedActions([]);
    setRequestedActionDetails({});
    setNextAction("");
    setNextActionAutoSuggested(false);
    setServiceIssueFlagged(false);
    setServiceIssueType("");
    setSelectedCustomerProfile(null);
    setNotes("");
    setRequiresUrgentAction(false);
    setError(null);
    setShowNotes(false);
    setSavedCallId(null);
    setActivityRequestId(null);
  }, [customer, customerOptions, isOpen]);

  const selectedCustomer =
    customer ?? searchSelectedCustomer ?? customerOptions.find((option) => option.id === selectedCustomerId) ?? null;

  const hasProfileSelection = hasProductClassification || Boolean(selectedCustomerProfile);

  const isConnected = connectivityStatus === "connected";

  const activeObjectionFields: ActivityFieldDefinition[] = useMemo(
    () => getOptionFields(CUSTOMER_OBJECTION_OPTIONS, objection),
    [objection],
  );

  const activeContactStatusFields: ActivityFieldDefinition[] = useMemo(
    () => getOptionFields(CONTACT_STATUS_OPTIONS, contactStatus),
    [contactStatus],
  );

  const callbackRequired = requestedActions.includes("callback");

  const callbackDetails = requestedActionDetails.callback ?? {};
  const hasCallbackDate = Boolean(callbackDetails.callbackDate);

  const handleDispositionChange = (value: string) => {
    setDisposition(value);
    const suggestedNext = DISPOSITION_NEXT_ACTION_SUGGESTIONS[value];
    if (suggestedNext) {
      setNextAction(suggestedNext);
      setNextActionAutoSuggested(true);
    } else {
      setNextAction("");
      setNextActionAutoSuggested(false);
    }
  };

  const handleConnectivityChange = (value: string) => {
    setConnectivityStatus(value);
    if (value !== "connected") {
      setContactStatus("");
      setContactStatusDetails({});
      setCallReason("");
      setDisposition("");
      setObjection("");
      setObjectionDetails({});
      setRequestedActions([]);
      setRequestedActionDetails({});
      setNextAction("");
      setNextActionAutoSuggested(false);
    }
  };

  const handleRequestedActionsChange = (values: string[]) => {
    setRequestedActions(values);
    setRequestedActionDetails((prev) => {
      const cleaned: Record<string, Record<string, string>> = {};
      for (const key of values) {
        if (prev[key]) cleaned[key] = prev[key];
      }
      return cleaned;
    });
  };

  const updateRequestedActionDetail = (actionKey: string, fieldKey: string, value: string) => {
    setRequestedActionDetails((prev) => ({
      ...prev,
      [actionKey]: { ...(prev[actionKey] ?? {}), [fieldKey]: value },
    }));
  };

  const fetchCustomerClassificationStatus = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("has_product_classification")
        .eq("id", customerId)
        .single();
      
      if (error) throw error;
      setHasProductClassification(data?.has_product_classification ?? false);
    } catch {
      setHasProductClassification(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerClassificationStatus(selectedCustomer.id);
    } else {
      setHasProductClassification(false);
    }
  }, [selectedCustomer?.id, fetchCustomerClassificationStatus]);

  const reasonComplete = Boolean(callReason);
  const dispositionComplete = Boolean(disposition);
  const nextStepComplete = Boolean(nextAction);

  const handleSubmit = async () => {
    if (!actorUserId) {
      setError("لا توجد جلسة مستخدم حالية. سجل الدخول مرة أخرى.");
      return;
    }
    if (!selectedCustomer) {
      setError("اختر عميلا قبل حفظ المكالمة.");
      return;
    }
    if (!hasProfileSelection) {
      setError("أكمل تصنيف العميل والمنتج قبل حفظ المكالمة.");
      return;
    }
    if (!connectivityStatus) {
      setError("اختر حالة الاتصال.");
      return;
    }
    if (isConnected) {
      if (!callReason) {
        setError("اختر سبب المكالمة.");
        return;
      }
      if (!disposition) {
        setError("اختر شعور العميل.");
        return;
      }
      if (objection && activeObjectionFields.some((field) => field.key && !String(objectionDetails[field.key] ?? "").trim())) {
        setError("أكمل تفاصيل اعتراض العميل قبل الحفظ.");
        return;
      }
      if (!nextAction) {
        setError("اختر الإجراء التالي.");
        return;
      }
      if (callbackRequired && !hasCallbackDate) {
        setError("أضف وقت معاودة الاتصال.");
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);

      let callId = savedCallId;
      if (!callId) {
        const savedCall = await saveCustomerCallActivity({
          customerId: selectedCustomer.id,
          userId: actorUserId,
          direction,
          occurredAt,
          durationSeconds: parseDurationMinutesToSeconds(durationMinutes),
          connectivityStatus,
          contactStatus: isConnected ? contactStatus : "valid",
          contactStatusDetails: isConnected ? contactStatusDetails : {},
          callReason: isConnected ? callReason : "other",
          disposition: isConnected ? disposition : "no_clear_answer",
          objection: isConnected && objection ? objection : null,
          objectionDetails: isConnected ? objectionDetails : {},
          requestedActions: isConnected ? requestedActions : [],
          requestedActionDetails: isConnected ? requestedActionDetails : {},
          nextAction: isConnected ? nextAction : "no_further_action",
          nextActionDetails: {},
          callbackAt: callbackRequired ? (callbackDetails.callbackDate ?? null) : null,
          serviceIssueFlagged,
          serviceIssueType: serviceIssueFlagged ? serviceIssueType : null,
          notes,
          requiresUrgentAction,
          selectedCustomerProfile,
          selectedCustomerProfiles: selectedCustomerProfile ? [selectedCustomerProfile] : [],
        });
        callId = String(savedCall.id ?? "").trim();
        if (!callId || !navigator.onLine) {
          throw new Error("The call was saved locally. Connect to the internet, then retry to create its Odoo CRM activity.");
        }
        setSavedCallId(callId);

        if (!hasProductClassification && selectedCustomerProfile) {
          await supabase
            .from("customers")
            .update({ has_product_classification: true })
            .eq("id", selectedCustomer.id);
        }
      }

      const requestId = activityRequestId ?? crypto.randomUUID();
      setActivityRequestId(requestId);
      await createOdooCrmActivity({ requestId, callId, activityTypeId: "2" });

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "فشل حفظ نشاط المكالمة.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-h-[90vh] max-w-3xl overflow-visible" showCloseButton={false}>
      {/* Compact Header */}
      <div className="relative z-10 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <PhoneIcon className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">نشاط العميل</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">تسجيل مكالمة</h2>
          </div>
        </div>

        {/* Compact metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {selectedCustomer ? (
            <span className="rounded-xl bg-brand-25 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
              {selectedCustomer.customer_name}
            </span>
          ) : null}

          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-1.5 dark:border-gray-700">
            <CalendarDaysIcon className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="w-36 border-none bg-transparent text-xs font-semibold text-gray-700 outline-none dark:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Scrollable conversation body */}
      <div className="max-h-[calc(90vh-180px)] space-y-4 overflow-y-auto px-6 py-5">
        {/* Step 0: Customer Selection */}
        {customer ? null : (
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

        {/* Step 1: Customer Profile Classification */}
        {hasProductClassification ? (
          <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 dark:border-green-800/30 dark:bg-green-500/5">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              تم تصنيف المنتجات مسبقاً لهذا العميل
            </p>
          </div>
        ) : (
          <CustomerProfileCardSelector value={selectedCustomerProfile} onChange={setSelectedCustomerProfile} />
        )}

        {hasProfileSelection ? (
          <>
            {/* Step 2: Connectivity Status — pure telephony fact */}
            <ConversationStep
              status={connectivityStatus ? "complete" : "active"}
              question="حالة الاتصال"
            >
              <CardOptionGroup
                label=""
                options={CALL_CONNECTIVITY_STATUS_OPTIONS}
                value={connectivityStatus}
                onChange={handleConnectivityChange}
              />
            </ConversationStep>

            {isConnected ? (
              <>
                {/* Step 3: Contact Status — data hygiene on the number */}
                <ConversationStep
                  status={contactStatus ? "complete" : "active"}
                  question="بيانات التواصل"
                >
                  <div className="space-y-3">
                    <CardOptionGroup
                      label=""
                      options={CONTACT_STATUS_OPTIONS}
                      value={contactStatus}
                      onChange={(value) => {
                        setContactStatus(value);
                        setContactStatusDetails({});
                      }}
                    />
                    {activeContactStatusFields.length > 0 && contactStatus ? (
                      <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-500/5">
                        {activeContactStatusFields.map((field) => (
                          <AdminField key={field.key} label={field.label}>
                            <input
                              type={field.type}
                              value={contactStatusDetails[field.key] ?? ""}
                              onChange={(event) =>
                                setContactStatusDetails((current) => ({ ...current, [field.key]: event.target.value }))
                              }
                              className={INPUT_CLASS}
                              placeholder={field.placeholder}
                            />
                          </AdminField>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ConversationStep>

                {/* Step 4: Why did you call? */}
                <ConversationStep
                  status={reasonComplete ? "complete" : "active"}
                  question="لماذا اتصلت؟"
                >
                  <CardOptionGroup
                    label=""
                    options={CALL_REASON_OPTIONS}
                    value={callReason}
                    onChange={setCallReason}
                  />
                </ConversationStep>

                {/* Step 5a: Customer Disposition — sentiment only */}
                <ConversationStep
                  status={!reasonComplete ? "upcoming" : dispositionComplete ? "complete" : "active"}
                  question="شعور العميل"
                >
                  {reasonComplete ? (
                    <CardOptionGroup
                      label=""
                      options={CUSTOMER_DISPOSITION_OPTIONS}
                      value={disposition}
                      onChange={handleDispositionChange}
                    />
                  ) : null}
                </ConversationStep>

                {/* Step 5b: Customer Objection — only if negative disposition */}
                {disposition && ["rejected_offer", "rejected_platform", "neutral_undecided", "not_interested", "no_clear_answer"].includes(disposition) ? (
                  <ConversationStep
                    status={objection ? "complete" : "active"}
                    question="ليه؟ (اختياري)"
                  >
                    <div className="space-y-3">
                      <CardOptionGroup
                        label=""
                        options={CUSTOMER_OBJECTION_OPTIONS}
                        value={objection}
                        onChange={(value) => {
                          setObjection(value);
                          setObjectionDetails({});
                        }}
                      />
                      {activeObjectionFields.length > 0 && objection ? (
                        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-500/5">
                          {activeObjectionFields.map((field) => (
                            <AdminField key={field.key} label={field.label}>
                              {field.type === "textarea" ? (
                                <textarea
                                  rows={3}
                                  value={objectionDetails[field.key] ?? ""}
                                  onChange={(event) =>
                                    setObjectionDetails((current) => ({ ...current, [field.key]: event.target.value }))
                                  }
                                  className={INPUT_CLASS}
                                  placeholder={field.placeholder}
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  value={objectionDetails[field.key] ?? ""}
                                  onChange={(event) =>
                                    setObjectionDetails((current) => ({ ...current, [field.key]: event.target.value }))
                                  }
                                  className={INPUT_CLASS}
                                  placeholder={field.placeholder}
                                />
                              )}
                            </AdminField>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </ConversationStep>
                ) : null}

                {/* Step 5c: Requested Actions — multi-select */}
                <ConversationStep
                  status={!disposition ? "upcoming" : requestedActions.length > 0 ? "complete" : "active"}
                  question="طلب منك حاجة معينة؟"
                >
                  {disposition ? (
                    <div className="space-y-3">
                      <CardMultiOptionGroup
                        label=""
                        options={REQUESTED_ACTION_OPTIONS}
                        values={requestedActions}
                        onChange={handleRequestedActionsChange}
                      />
                      {/* Dynamic fields for each selected action */}
                      {requestedActions.map((actionKey) => {
                        const actionFields = getOptionFields(REQUESTED_ACTION_OPTIONS, actionKey);
                        if (actionFields.length === 0) return null;
                        const details = requestedActionDetails[actionKey] ?? {};
                        return (
                          <div key={actionKey} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-500/5">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              تفاصيل: {REQUESTED_ACTION_OPTIONS.find((o) => o.value === actionKey)?.label}
                            </p>
                            {actionFields.map((field) => (
                              <AdminField key={field.key} label={field.label}>
                                {field.type === "textarea" ? (
                                  <textarea
                                    rows={3}
                                    value={details[field.key] ?? ""}
                                    onChange={(event) =>
                                      updateRequestedActionDetail(actionKey, field.key, event.target.value)
                                    }
                                    className={INPUT_CLASS}
                                    placeholder={field.placeholder}
                                  />
                                ) : (
                                  <input
                                    type={field.type}
                                    value={details[field.key] ?? ""}
                                    onChange={(event) =>
                                      updateRequestedActionDetail(actionKey, field.key, event.target.value)
                                    }
                                    className={INPUT_CLASS}
                                    placeholder={field.placeholder}
                                  />
                                )}
                              </AdminField>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </ConversationStep>

                {/* Step 6: What happens next? (auto-suggested from disposition) */}
                <ConversationStep
                  status={!disposition ? "upcoming" : nextStepComplete ? "complete" : "active"}
                  question="ماذا يحدث بعد ذلك؟"
                >
                  {disposition ? (
                    <div className="space-y-3">
                      {nextActionAutoSuggested && nextAction ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          <span>مقترح تلقائياً بناءً على شعور العميل</span>
                        </div>
                      ) : null}
                      <CardOptionGroup
                        label=""
                        options={NEXT_ACTION_OPTIONS}
                        value={nextAction}
                        onChange={(value) => {
                          setNextAction(value);
                          setNextActionAutoSuggested(false);
                        }}
                      />

                      {/* Inline callback date */}
                      {callbackRequired ? (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-500/5">
                          <AdminField label="وقت معاودة الاتصال">
                            <input
                              type="datetime-local"
                              value={callbackDetails.callbackDate ?? ""}
                              onChange={(event) =>
                                updateRequestedActionDetail("callback", "callbackDate", event.target.value)
                              }
                              className={INPUT_CLASS}
                            />
                          </AdminField>
                          <AdminField label="سبب معاودة الاتصال">
                            <input
                              type="text"
                              value={callbackDetails.callbackReason ?? ""}
                              onChange={(event) =>
                                updateRequestedActionDetail("callback", "callbackReason", event.target.value)
                              }
                              className={INPUT_CLASS}
                              placeholder="لماذا يجب أن يتصل الفريق مرة أخرى؟"
                            />
                          </AdminField>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </ConversationStep>

                {/* Step 7: Service Issue (optional) */}
                <ConversationStep
                  status={!nextAction ? "upcoming" : "active"}
                  question="هل هناك مشكلة خدمة عملاء؟ (اختياري)"
                >
                  {nextAction ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={serviceIssueFlagged}
                          onChange={(event) => {
                            setServiceIssueFlagged(event.target.checked);
                            if (!event.target.checked) setServiceIssueType("");
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        سجّل مشكلة خدمة عملاء
                      </label>
                      {serviceIssueFlagged ? (
                        <CardOptionGroup
                          label=""
                          options={SERVICE_ISSUE_TYPE_OPTIONS}
                          value={serviceIssueType}
                          onChange={setServiceIssueType}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </ConversationStep>

                {/* Step 8: Optional note (collapsed by default) */}
                <ConversationStep
                  status={!nextAction ? "upcoming" : "active"}
                  question="ملاحظات إضافية"
                >
                  {nextAction ? (
                    <div className="space-y-3">
                      {!showNotes ? (
                        <button
                          type="button"
                          onClick={() => setShowNotes(true)}
                          className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-500/50 dark:hover:text-blue-400"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          أضف ملاحظة
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNotes(false);
                                setNotes("");
                                setRequiresUrgentAction(false);
                              }}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                              إخفاء الملاحظات
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            className={INPUT_CLASS}
                            placeholder="سجل السياق التجاري والاعتراضات وأي شيء يجب أن يعرفه الممثل التالي."
                          />
                          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={requiresUrgentAction}
                              onChange={(event) => setRequiresUrgentAction(event.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            وضع علامة متابعة عاجلة لهذه المكالمة
                          </label>
                        </div>
                      )}
                    </div>
                  ) : null}
                </ConversationStep>
              </>
            ) : null}
          </>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* Footer with summary checklist + save */}
      <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        {hasProfileSelection && isConnected ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className={`flex items-center gap-1.5 ${reasonComplete ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {reasonComplete ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <svg className="h-2.5 w-2.5 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              السبب
            </span>
            <span className={`flex items-center gap-1.5 ${dispositionComplete ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {dispositionComplete ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <svg className="h-2.5 w-2.5 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              الشعور
            </span>
            <span className={`flex items-center gap-1.5 ${nextStepComplete ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {nextStepComplete ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <svg className="h-2.5 w-2.5 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              الخطوة التالية
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
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
            disabled={isSaving || !hasProfileSelection}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "جار الحفظ..." : "حفظ نشاط المكالمة"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
