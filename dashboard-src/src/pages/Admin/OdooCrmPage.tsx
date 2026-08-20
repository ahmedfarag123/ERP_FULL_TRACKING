import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  Star,
  Target,
  UserRound,
  XCircle,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminMetricGrid,
  AdminPageFrame,
  AdminPageHero,
  AdminSection,
} from "../../components/admin/AdminPageElements";
import StatCard from "../../components/ui/StatCard";
import StatusBadge, { type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { supabase } from "../../lib/supabase";

type LeadFilter = "all" | "active" | "needs_action" | "won" | "lost";

type CrmLeadRow = {
  id: string;
  external_lead_id: string;
  opportunity_name: string;
  lead_type: string | null;
  partner_id: string | null;
  customer_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  street: string | null;
  city: string | null;
  state_name: string | null;
  country_name: string | null;
  salesperson_id: string | null;
  salesperson_name: string | null;
  sales_team_id: string | null;
  sales_team_name: string | null;
  priority: string | null;
  activity_ids: string[] | null;
  activity_by_name: string | null;
  my_deadline: string | null;
  campaign_name: string | null;
  medium_name: string | null;
  source_name: string | null;
  expected_revenue: number | string | null;
  expected_closing: string | null;
  stage_id: string | null;
  stage_name: string | null;
  notes: string | null;
  probability: number | string | null;
  lost_reason_id: string | null;
  lost_reason_name: string | null;
  tag_names: string[] | null;
  active: boolean | null;
  raw_payload: Record<string, unknown> | null;
  last_sync_at: string | null;
  odoo_created_at: string | null;
  odoo_updated_at: string | null;
};

type ModelRecordRow = {
  odoo_model: string;
  external_id: string;
  display_name: string | null;
  raw_payload: Record<string, unknown> | null;
};

type CrmActionRow = {
  id: string;
  external_lead_id: string;
  action_type: string;
  action_label: string;
  note: string | null;
  created_at: string;
};

type StageOption = {
  id: string;
  name: string;
  sequence: number;
};

type LostReasonOption = {
  id: string;
  name: string;
};

const LEAD_SELECT = [
  "id",
  "external_lead_id",
  "opportunity_name",
  "lead_type",
  "partner_id",
  "customer_name",
  "contact_name",
  "email",
  "phone",
  "mobile",
  "street",
  "city",
  "state_name",
  "country_name",
  "salesperson_id",
  "salesperson_name",
  "sales_team_id",
  "sales_team_name",
  "priority",
  "activity_ids",
  "activity_by_name",
  "my_deadline",
  "campaign_name",
  "medium_name",
  "source_name",
  "expected_revenue",
  "expected_closing",
  "stage_id",
  "stage_name",
  "notes",
  "probability",
  "lost_reason_id",
  "lost_reason_name",
  "tag_names",
  "active",
  "raw_payload",
  "last_sync_at",
  "odoo_created_at",
  "odoo_updated_at",
].join(", ");

function clean(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw || "";
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(parsed);
}

function formatDateTime(value: string | null) {
  if (!value) return "غير محدد";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function relativeSynced(value: string | null) {
  if (!value) return "لم تتم المزامنة";
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 60) return "الآن";
  if (seconds < 3600) return `منذ ${formatNumber(Math.floor(seconds / 60))} دقيقة`;
  if (seconds < 86400) return `منذ ${formatNumber(Math.floor(seconds / 3600))} ساعة`;
  return `منذ ${formatNumber(Math.floor(seconds / 86400))} يوم`;
}

function priorityLabel(priority: string | null) {
  const normalized = clean(priority);
  if (normalized === "3") return "عالية";
  if (normalized === "2") return "متوسطة";
  if (normalized === "1") return "منخفضة";
  return "غير محددة";
}

function priorityTone(priority: string | null): StatusBadgeTone {
  const normalized = clean(priority);
  if (normalized === "3") return "red";
  if (normalized === "2") return "yellow";
  if (normalized === "1") return "gray";
  return "gray";
}

function isWonLead(row: CrmLeadRow) {
  const stage = clean(row.stage_name).toLowerCase();
  return stage.includes("won") || stage.includes("فوز") || stage.includes("ناجح") || toNumber(row.probability) >= 100;
}

function isLostLead(row: CrmLeadRow) {
  const stage = clean(row.stage_name).toLowerCase();
  return row.active === false || Boolean(row.lost_reason_name) || stage.includes("lost") || stage.includes("خسارة");
}

function isDeadlineLate(row: CrmLeadRow) {
  if (!row.my_deadline && !row.expected_closing) return false;
  const raw = row.my_deadline || row.expected_closing;
  if (!raw) return false;
  const deadline = new Date(`${raw}T23:59:59`);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now() && !isWonLead(row) && !isLostLead(row);
}

function needsAction(row: CrmLeadRow) {
  return row.active !== false && !isWonLead(row) && (isDeadlineLate(row) || (row.activity_ids ?? []).length === 0);
}

function stageTone(row: CrmLeadRow): StatusBadgeTone {
  if (isLostLead(row)) return "red";
  if (isWonLead(row)) return "green";
  if (needsAction(row)) return "yellow";
  const stage = clean(row.stage_name).toLowerCase();
  if (stage.includes("active")) return "blue";
  return "indigo";
}

function phoneDigits(value: string | null) {
  return clean(value).replace(/[^\d+]/g, "");
}

function whatsappHref(phone: string | null, lead: CrmLeadRow) {
  const digits = phoneDigits(phone);
  if (!digits) return "";
  const text = encodeURIComponent(`أهلاً، معك فريق هوريكا سمارت بخصوص ${lead.opportunity_name}.`);
  return `https://wa.me/${digits.replace(/^\+/, "")}?text=${text}`;
}

function mailHref(lead: CrmLeadRow) {
  if (!lead.email) return "";
  const subject = encodeURIComponent(`متابعة ${lead.opportunity_name}`);
  const body = encodeURIComponent(`أهلاً،\n\nنتابع معكم بخصوص ${lead.opportunity_name}.\n\nتحياتنا،`);
  return `mailto:${lead.email}?subject=${subject}&body=${body}`;
}

function leadSearchDocument(row: CrmLeadRow) {
  return [
    row.opportunity_name,
    row.customer_name,
    row.contact_name,
    row.email,
    row.phone,
    row.mobile,
    row.salesperson_name,
    row.sales_team_name,
    row.stage_name,
    row.notes,
    row.lost_reason_name,
    ...(row.tag_names ?? []),
  ]
    .map((value) => clean(value).toLowerCase())
    .join(" ");
}

function exportLeadsCsv(rows: CrmLeadRow[]) {
  const headers = ["الفرصة", "العميل", "الهاتف", "البريد", "المسؤول", "المرحلة", "القيمة المتوقعة", "الملاحظات"];
  const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((row) =>
    [
      row.opportunity_name,
      row.customer_name ?? "",
      row.phone ?? row.mobile ?? "",
      row.email ?? "",
      row.salesperson_name ?? "",
      row.stage_name ?? "",
      formatCurrency(row.expected_revenue),
      row.notes ?? "",
    ]
      .map(escapeCell)
      .join(","),
  );

  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `فرص-odoo-crm-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildLeadSummary(lead: CrmLeadRow) {
  return [
    `الفرصة: ${lead.opportunity_name}`,
    `العميل: ${lead.customer_name || "غير محدد"}`,
    `الهاتف: ${lead.phone || lead.mobile || "غير محدد"}`,
    `المسؤول: ${lead.salesperson_name || "غير محدد"}`,
    `المرحلة: ${lead.stage_name || "غير محددة"}`,
    `القيمة المتوقعة: ${formatCurrency(lead.expected_revenue)}`,
    `الملاحظات: ${lead.notes || "لا توجد ملاحظات"}`,
  ].join("\n");
}

function buildStageOptions(modelRows: ModelRecordRow[], leads: CrmLeadRow[]): StageOption[] {
  const fromModels = modelRows
    .filter((row) => row.odoo_model === "crm.stage")
    .map((row) => ({
      id: row.external_id,
      name: clean(row.display_name) || clean(row.raw_payload?.name) || `مرحلة ${row.external_id}`,
      sequence: toNumber(row.raw_payload?.sequence),
    }))
    .filter((row) => row.id && row.name);

  if (fromModels.length > 0) {
    return fromModels.sort((left, right) => left.sequence - right.sequence || left.name.localeCompare(right.name));
  }

  const fallback = new Map<string, StageOption>();
  leads.forEach((lead) => {
    if (!lead.stage_id || !lead.stage_name) return;
    fallback.set(lead.stage_id, { id: lead.stage_id, name: lead.stage_name, sequence: fallback.size + 1 });
  });
  return Array.from(fallback.values());
}

function buildLostReasonOptions(modelRows: ModelRecordRow[], leads: CrmLeadRow[]): LostReasonOption[] {
  const reasons = modelRows
    .filter((row) => row.odoo_model === "crm.lost.reason")
    .map((row) => ({
      id: row.external_id,
      name: clean(row.display_name) || clean(row.raw_payload?.name) || `سبب ${row.external_id}`,
    }))
    .filter((row) => row.id && row.name);

  if (reasons.length > 0) return reasons;

  const fallback = new Map<string, LostReasonOption>();
  leads.forEach((lead) => {
    if (!lead.lost_reason_id || !lead.lost_reason_name) return;
    fallback.set(lead.lost_reason_id, { id: lead.lost_reason_id, name: lead.lost_reason_name });
  });
  return Array.from(fallback.values());
}

function MetricIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-10 w-10 items-center justify-center rounded-xl">{children}</span>;
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger" | "success";
}) {
  const toneClass = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary:
      "border border-gray-200 bg-white text-gray-700 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white" dir="auto">
        {value || "غير محدد"}
      </dd>
    </div>
  );
}

export default function OdooCrmPage() {
  const [rows, setRows] = useState<CrmLeadRow[]>([]);
  const [modelRows, setModelRows] = useState<ModelRecordRow[]>([]);
  const [actions, setActions] = useState<CrmActionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionWorking, setActionWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [salespersonFilter, setSalespersonFilter] = useState("all");
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [lostReasonId, setLostReasonId] = useState("");
  const [editRevenue, setEditRevenue] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editExpectedClosing, setEditExpectedClosing] = useState("");
  const [editPriority, setEditPriority] = useState("");

  const loadCrm = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [{ data: leadData, error: leadError }, { data: modelData, error: modelError }] = await Promise.all([
        supabase
          .from("odoo_crm_leads")
          .select(LEAD_SELECT)
          .order("odoo_updated_at", { ascending: false, nullsFirst: false })
          .order("last_sync_at", { ascending: false, nullsFirst: false })
          .limit(1000),
        supabase
          .from("odoo_crm_model_records")
          .select("odoo_model, external_id, display_name, raw_payload")
          .in("odoo_model", ["crm.stage", "crm.lost.reason"])
          .order("odoo_model", { ascending: true }),
      ]);

      if (leadError) throw leadError;
      if (modelError) throw modelError;

      const nextRows = (leadData ?? []) as unknown as CrmLeadRow[];
      setRows(nextRows);
      setModelRows((modelData ?? []) as unknown as ModelRecordRow[]);
      setSelectedLeadId((current) => current ?? nextRows[0]?.id ?? null);
    } catch (loadError) {
      setRows([]);
      setModelRows([]);
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل فرص أودو.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActions = useCallback(async (externalLeadId: string | null) => {
    if (!externalLeadId) {
      setActions([]);
      return;
    }

    try {
      const { data, error: actionError } = await supabase
        .from("odoo_crm_lead_actions")
        .select("id, external_lead_id, action_type, action_label, note, created_at")
        .eq("external_lead_id", externalLeadId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (actionError) throw actionError;
      setActions((data ?? []) as unknown as CrmActionRow[]);
    } catch {
      setActions([]);
    }
  }, []);

  useEffect(() => {
    void loadCrm();
  }, [loadCrm]);

  const stages = useMemo(() => buildStageOptions(modelRows, rows), [modelRows, rows]);
  const lostReasons = useMemo(() => buildLostReasonOptions(modelRows, rows), [modelRows, rows]);

  const salespeople = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => clean(row.salesperson_name)).filter(Boolean)));
    return ["all", ...unique];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (stageFilter !== "all" && row.stage_id !== stageFilter && clean(row.stage_name) !== stageFilter) return false;
      if (salespersonFilter !== "all" && clean(row.salesperson_name) !== salespersonFilter) return false;
      if (leadFilter === "active" && (row.active === false || isWonLead(row) || isLostLead(row))) return false;
      if (leadFilter === "needs_action" && !needsAction(row)) return false;
      if (leadFilter === "won" && !isWonLead(row)) return false;
      if (leadFilter === "lost" && !isLostLead(row)) return false;
      return !term || leadSearchDocument(row).includes(term);
    });
  }, [leadFilter, rows, salespersonFilter, search, stageFilter]);

  const selectedLead = useMemo(
    () => rows.find((row) => row.id === selectedLeadId) ?? filteredRows[0] ?? rows[0] ?? null,
    [filteredRows, rows, selectedLeadId],
  );

  useEffect(() => {
    if (!selectedLead) return;
    setEditRevenue(String(toNumber(selectedLead.expected_revenue) || ""));
    setEditProbability(selectedLead.probability == null ? "" : String(selectedLead.probability));
    setEditExpectedClosing(selectedLead.expected_closing ?? "");
    setEditPriority(clean(selectedLead.priority));
    setLostReasonId(selectedLead.lost_reason_id ?? lostReasons[0]?.id ?? "");
    setNoteDraft("");
    void loadActions(selectedLead.external_lead_id);
  }, [loadActions, lostReasons, selectedLead]);

  const metrics = useMemo(() => {
    const won = rows.filter(isWonLead).length;
    const lost = rows.filter(isLostLead).length;
    const actionNeeded = rows.filter(needsAction).length;
    const highPriority = rows.filter((row) => clean(row.priority) === "3").length;
    return { won, lost, actionNeeded, highPriority };
  }, [rows]);

  const lastSyncLabel = relativeSynced(rows[0]?.last_sync_at ?? null);

  async function syncNow() {
    try {
      setIsSyncing(true);
      setError(null);
      setNotice(null);

      const { data, error: syncError } = await supabase.functions.invoke("crm-odoo", {
        body: { trigger: "admin", maxRows: 1000 },
      });

      if (syncError) throw syncError;
      if ((data as { success?: boolean } | null)?.success === false) {
        throw new Error(String((data as { error?: string } | null)?.error ?? "تعذرت مزامنة أودو."));
      }

      const leadCount = Number((data as { leads?: { count?: number } } | null)?.leads?.count ?? 0);
      setNotice(`تمت المزامنة. تم تحديث ${formatNumber(leadCount)} فرصة.`);
      await loadCrm();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذر تشغيل مزامنة أودو.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function logLeadAction(
    lead: CrmLeadRow,
    actionType: string,
    actionLabel: string,
    note?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await supabase.from("odoo_crm_lead_actions").insert({
        lead_id: lead.id,
        external_lead_id: lead.external_lead_id,
        action_type: actionType,
        action_label: actionLabel,
        note: note || null,
        metadata: metadata ?? {},
      });
      if (selectedLead?.external_lead_id === lead.external_lead_id) {
        await loadActions(lead.external_lead_id);
      }
    } catch {
      // The action log table may not exist until the migration is applied; the UI action should still work.
    }
  }

  async function logLocalAction(actionType: string, actionLabel: string, note?: string, metadata?: Record<string, unknown>) {
    if (!selectedLead) return;
    await logLeadAction(selectedLead, actionType, actionLabel, note, metadata);
  }

  async function runRemoteAction(
    action: string,
    successMessage: string,
    payload: { note?: string; values?: Record<string, unknown>; metadata?: Record<string, unknown> } = {},
  ) {
    if (!selectedLead) return;

    try {
      setActionWorking(action);
      setError(null);
      setNotice(null);

      const { data, error: actionError } = await supabase.functions.invoke("crm-odoo", {
        body: {
          action,
          externalLeadId: selectedLead.external_lead_id,
          leadId: selectedLead.id,
          ...payload,
        },
      });

      if (actionError) throw actionError;
      if ((data as { success?: boolean } | null)?.success === false) {
        throw new Error(String((data as { error?: string } | null)?.error ?? "تعذر تنفيذ الإجراء."));
      }

      setNotice(successMessage);
      await loadCrm();
      await loadActions(selectedLead.external_lead_id);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذر تنفيذ الإجراء.");
    } finally {
      setActionWorking(null);
    }
  }

  async function saveLeadEdits() {
    const values: Record<string, unknown> = {};
    if (editRevenue.trim()) values.expected_revenue = toNumber(editRevenue);
    if (editProbability.trim()) values.probability = Math.max(0, Math.min(100, toNumber(editProbability)));
    if (editExpectedClosing) values.date_deadline = editExpectedClosing;
    values.priority = editPriority || "0";

    await runRemoteAction("update_lead", "تم تحديث بيانات الفرصة في أودو.", {
      values,
      metadata: { actionLabel: "تحديث بيانات الفرصة" },
    });
  }

  async function changeStage(stage: StageOption) {
    await runRemoteAction("update_lead", `تم نقل الفرصة إلى مرحلة ${stage.name}.`, {
      values: { stage_id: Number(stage.id) },
      metadata: { stageName: stage.name, actionLabel: "تغيير مرحلة الفرصة" },
    });
  }

  async function submitNote() {
    const note = noteDraft.trim();
    if (!note) return;
    await runRemoteAction("log_note", "تم تسجيل الملاحظة على الفرصة.", {
      note,
      metadata: { actionLabel: "ملاحظة إدارية" },
    });
    setNoteDraft("");
  }

  async function requestQuotation() {
    if (!selectedLead) return;
    const note = [
      "طلب عرض سعر من لوحة الإدارة.",
      `الفرصة: ${selectedLead.opportunity_name}`,
      `العميل: ${selectedLead.customer_name || "غير محدد"}`,
      `الهاتف: ${selectedLead.phone || selectedLead.mobile || "غير محدد"}`,
      noteDraft.trim() ? `ملاحظة الإدارة: ${noteDraft.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await runRemoteAction("quotation_request", "تم تسجيل طلب عرض السعر على الفرصة.", {
      note,
      metadata: { actionLabel: "طلب عرض سعر" },
    });
    setNoteDraft("");
  }

  async function markWon() {
    await runRemoteAction("mark_won", "تم تعليم الفرصة كفوز في أودو.", {
      note: noteDraft.trim() || "تم تعليم الفرصة كفوز من لوحة الإدارة.",
      metadata: { actionLabel: "تم الفوز" },
    });
    setNoteDraft("");
  }

  async function markLost() {
    const reason = lostReasons.find((item) => item.id === lostReasonId);
    await runRemoteAction("mark_lost", "تم تعليم الفرصة كخسارة في أودو.", {
      note: noteDraft.trim() || `تم تعليم الفرصة كخسارة${reason ? `: ${reason.name}` : ""}.`,
      values: lostReasonId ? { lost_reason_id: Number(lostReasonId) } : {},
      metadata: { actionLabel: "خسارة الفرصة", lostReasonName: reason?.name ?? null },
    });
    setNoteDraft("");
  }

  async function copySummary() {
    if (!selectedLead) return;
    await navigator.clipboard?.writeText(buildLeadSummary(selectedLead));
    await logLocalAction("copy_summary", "نسخ ملخص الفرصة");
    setNotice("تم نسخ ملخص الفرصة.");
  }

  const visibleRows = filteredRows.slice(0, 80);

  return (
    <>
      <PageMeta title="فرص أودو | الإدارة" description="متابعة فرص أودو وإجراءاتها من لوحة الإدارة." />
      <div dir="rtl">
        <AdminPageFrame>
          <AdminPageHero
            eyebrow="أودو - إدارة العملاء"
            title="مركز متابعة فرص المبيعات"
            description="هذه الشاشة مخصصة لإنهاء العمل على فرصة البيع: تواصل، ملاحظة، مرحلة، متابعة، طلب عرض سعر، فوز أو خسارة."
            meta={
              <>
                <StatusBadge label={`${formatNumber(rows.length)} فرصة`} tone="blue" />
                <StatusBadge label={`${formatNumber(filteredRows.length)} في النطاق`} tone="gray" />
                <StatusBadge label={`آخر مزامنة ${lastSyncLabel}`} tone="green" />
              </>
            }
            actions={
              <>
                <ActionButton tone="secondary" onClick={() => exportLeadsCsv(filteredRows)} disabled={filteredRows.length === 0}>
                  <Download className="h-4 w-4" aria-hidden />
                  تصدير ملف
                </ActionButton>
                <ActionButton onClick={syncNow} disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
                  {isSyncing ? "جار المزامنة" : "مزامنة أودو"}
                </ActionButton>
              </>
            }
          />

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              {notice}
            </div>
          ) : null}

          <AdminMetricGrid>
            <StatCard
              label="تحتاج متابعة"
              value={formatNumber(metrics.actionNeeded)}
              helper="متأخرة أو بلا نشاط"
              tone="yellow"
              icon={<MetricIcon><AlertTriangle className="h-6 w-6" /></MetricIcon>}
            />
            <StatCard
              label="أولوية عالية"
              value={formatNumber(metrics.highPriority)}
              helper="تستحق اتصالاً سريعاً"
              tone="red"
              icon={<MetricIcon><Star className="h-6 w-6" /></MetricIcon>}
            />
            <StatCard
              label="تم الفوز"
              value={formatNumber(metrics.won)}
              helper="فرص جاهزة للتحويل التجاري"
              tone="green"
              icon={<MetricIcon><CheckCircle2 className="h-6 w-6" /></MetricIcon>}
            />
            <StatCard
              label="خسارة"
              value={formatNumber(metrics.lost)}
              helper="تحتاج سبب واضح ومراجعة"
              tone="neutral"
              icon={<MetricIcon><XCircle className="h-6 w-6" /></MetricIcon>}
            />
          </AdminMetricGrid>

          <AdminFilterBar>
            <div className="grid gap-3 xl:grid-cols-[1fr_190px_190px_170px]">
              <label className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالعميل أو الهاتف أو المسؤول أو الملاحظة"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </label>
              <select
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
                aria-label="تصفية المرحلة"
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">كل المراحل</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <select
                value={salespersonFilter}
                onChange={(event) => setSalespersonFilter(event.target.value)}
                aria-label="تصفية المسؤول"
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {salespeople.map((person) => (
                  <option key={person} value={person}>
                    {person === "all" ? "كل المسؤولين" : person}
                  </option>
                ))}
              </select>
              <select
                value={leadFilter}
                onChange={(event) => setLeadFilter(event.target.value as LeadFilter)}
                aria-label="تصفية حالة العمل"
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">كل الفرص</option>
                <option value="active">نشطة فقط</option>
                <option value="needs_action">تحتاج متابعة</option>
                <option value="won">تم الفوز</option>
                <option value="lost">خسارة</option>
              </select>
            </div>
          </AdminFilterBar>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <AdminSection title="قائمة الفرص" description="اختيار الصف يفتح ملف عمل الفرصة على اليمين.">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-brand-25 dark:bg-white/[0.02]" />
                  ))}
                </div>
              ) : visibleRows.length === 0 ? (
                <AdminEmptyState
                  icon={<Target className="h-8 w-8" />}
                  title="لا توجد فرص مطابقة"
                  description="غيّر البحث أو شغّل مزامنة أودو بعد التأكد من نشر دالة الفرص."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] text-right text-sm" dir="rtl">
                    <thead className="border-b border-gray-200 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-right">الفرصة</th>
                        <th className="px-3 py-3 text-right">المسؤول</th>
                        <th className="px-3 py-3 text-right">المرحلة</th>
                        <th className="px-3 py-3 text-right">المتابعة</th>
                        <th className="px-3 py-3 text-right">القيمة</th>
                        <th className="px-3 py-3 text-right">تواصل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => {
                        const phone = row.phone || row.mobile || "";
                        const selected = selectedLead?.id === row.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedLeadId(row.id)}
                            className={`cursor-pointer border-b border-gray-100 transition dark:border-gray-800 ${
                              selected ? "bg-brand-50/70 dark:bg-brand-500/10" : "hover:bg-brand-25 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <td className="px-3 py-4">
                              <div className="max-w-[320px]">
                                <p className="font-semibold text-gray-900 dark:text-white" dir="auto">{row.opportunity_name}</p>
                                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" dir="auto">
                                  {row.customer_name || row.contact_name || "عميل غير محدد"}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-25 text-xs font-semibold text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
                                  {(row.salesperson_name || "؟").charAt(0)}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-gray-300" dir="auto">{row.salesperson_name || "غير محدد"}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <StatusBadge label={row.stage_name || (row.active === false ? "غير نشطة" : "غير محددة")} tone={stageTone(row)} dir="auto" dot />
                            </td>
                            <td className="px-3 py-4">
                              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <p>{row.my_deadline ? `نشاط ${formatDate(row.my_deadline)}` : "لا يوجد نشاط"}</p>
                                {needsAction(row) ? <p className="font-semibold text-amber-600 dark:text-amber-300">تحتاج إجراء</p> : null}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-right font-semibold text-gray-900 dark:text-white" dir="ltr">
                              {formatCurrency(row.expected_revenue)}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2">
                                <a
                                  href={phone ? `tel:${phoneDigits(phone)}` : undefined}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (!phone) event.preventDefault();
                                    else void logLeadAction(row, "call", "اتصال بالعميل");
                                  }}
                                  className={`rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:text-brand-600 dark:border-gray-800 ${phone ? "" : "pointer-events-none opacity-40"}`}
                                  aria-label="اتصال"
                                >
                                  <Phone className="h-4 w-4" />
                                </a>
                                <a
                                  href={whatsappHref(phone, row)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (!phone) event.preventDefault();
                                    else void logLeadAction(row, "whatsapp", "فتح واتساب");
                                  }}
                                  className={`rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:text-emerald-600 dark:border-gray-800 ${phone ? "" : "pointer-events-none opacity-40"}`}
                                  aria-label="واتساب"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredRows.length > visibleRows.length ? (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      يظهر أول {formatNumber(visibleRows.length)} نتيجة من {formatNumber(filteredRows.length)}. ضيّق البحث للوصول أسرع.
                    </p>
                  ) : null}
                </div>
              )}
            </AdminSection>

            <div className="space-y-6">
              {!selectedLead ? (
                <AdminSection>
                  <AdminEmptyState
                    icon={<ClipboardList className="h-8 w-8" />}
                    title="اختر فرصة"
                    description="اختيار فرصة يفتح تفاصيل العميل والإجراءات المطلوبة."
                  />
                </AdminSection>
              ) : (
                <>
                  <AdminSection
                    title={selectedLead.opportunity_name}
                    description={selectedLead.customer_name || selectedLead.contact_name || "عميل غير محدد"}
                    actions={<StatusBadge label={selectedLead.stage_name || "مرحلة غير محددة"} tone={stageTone(selectedLead)} dir="auto" dot />}
                  >
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="القيمة المتوقعة" value={formatCurrency(selectedLead.expected_revenue)} />
                        <DetailRow label="نسبة النجاح" value={`${formatNumber(toNumber(selectedLead.probability))}%`} />
                        <DetailRow label="الأولوية" value={<StatusBadge label={priorityLabel(selectedLead.priority)} tone={priorityTone(selectedLead.priority)} />} />
                        <DetailRow label="آخر تحديث" value={formatDateTime(selectedLead.odoo_updated_at)} />
                      </div>

                      <dl className="grid grid-cols-1 gap-4 rounded-xl bg-brand-25 p-4 dark:bg-white/[0.04]">
                        <DetailRow label="المسؤول" value={selectedLead.salesperson_name || "غير محدد"} />
                        <DetailRow label="الفريق" value={selectedLead.sales_team_name || "غير محدد"} />
                        <DetailRow label="الهاتف" value={selectedLead.phone || selectedLead.mobile || "غير محدد"} />
                        <DetailRow label="البريد" value={selectedLead.email || "غير محدد"} />
                        <DetailRow label="الموقع" value={[selectedLead.city, selectedLead.state_name, selectedLead.country_name].filter(Boolean).join(" - ") || "غير محدد"} />
                      </dl>

                      {selectedLead.tag_names?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.tag_names.map((tag) => (
                            <StatusBadge key={tag} label={tag} tone="gray" dir="auto" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </AdminSection>

                  <AdminSection title="الإجراءات السريعة" description="كل إجراء مهم يسجل أثراً في سجل الفرصة.">
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={selectedLead.phone || selectedLead.mobile ? `tel:${phoneDigits(selectedLead.phone || selectedLead.mobile)}` : undefined}
                        onClick={() => void logLocalAction("call", "اتصال بالعميل")}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] ${
                          selectedLead.phone || selectedLead.mobile ? "" : "pointer-events-none opacity-50"
                        }`}
                      >
                        <Phone className="h-4 w-4" />
                        اتصال
                      </a>
                      <a
                        href={whatsappHref(selectedLead.phone || selectedLead.mobile, selectedLead)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => void logLocalAction("whatsapp", "فتح واتساب")}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] ${
                          selectedLead.phone || selectedLead.mobile ? "" : "pointer-events-none opacity-50"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        واتساب
                      </a>
                      <a
                        href={mailHref(selectedLead)}
                        onClick={() => void logLocalAction("email", "فتح البريد")}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] ${
                          selectedLead.email ? "" : "pointer-events-none opacity-50"
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                        بريد
                      </a>
                      <ActionButton tone="secondary" onClick={copySummary}>
                        <Copy className="h-4 w-4" />
                        نسخ الملخص
                      </ActionButton>
                    </div>
                  </AdminSection>

                  <AdminSection title="خط سير الفرصة" description="انقل الفرصة بين مراحل أودو بدون فتح شاشة أودو.">
                    <div className="flex flex-wrap gap-2">
                      {stages.map((stage) => {
                        const active = stage.id === selectedLead.stage_id || stage.name === selectedLead.stage_name;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => void changeStage(stage)}
                            disabled={actionWorking === "update_lead" || active}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              active
                                ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                                : "border-gray-200 text-gray-600 hover:bg-brand-25 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            {stage.name}
                          </button>
                        );
                      })}
                    </div>
                  </AdminSection>

                  <AdminSection title="تحديث الفرصة" description="القيمة والاحتمال وتاريخ الإغلاق والأولوية ترجع إلى أودو.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminField label="القيمة المتوقعة">
                        <input
                          value={editRevenue}
                          onChange={(event) => setEditRevenue(event.target.value)}
                          inputMode="decimal"
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </AdminField>
                      <AdminField label="نسبة النجاح">
                        <input
                          value={editProbability}
                          onChange={(event) => setEditProbability(event.target.value)}
                          inputMode="decimal"
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </AdminField>
                      <AdminField label="تاريخ الإغلاق المتوقع">
                        <input
                          type="date"
                          value={editExpectedClosing}
                          onChange={(event) => setEditExpectedClosing(event.target.value)}
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                      </AdminField>
                      <AdminField label="الأولوية">
                        <select
                          value={editPriority}
                          onChange={(event) => setEditPriority(event.target.value)}
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          <option value="0">غير محددة</option>
                          <option value="1">منخفضة</option>
                          <option value="2">متوسطة</option>
                          <option value="3">عالية</option>
                        </select>
                      </AdminField>
                    </div>
                    <div className="mt-4">
                      <ActionButton onClick={() => void saveLeadEdits()} disabled={Boolean(actionWorking)}>
                        <Send className="h-4 w-4" />
                        حفظ في أودو
                      </ActionButton>
                    </div>
                  </AdminSection>

                  <AdminSection title="ملاحظة وقرار" description="اكتب ما حدث ثم سجل ملاحظة أو اطلب عرض سعر أو أغلق الفرصة.">
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      rows={4}
                      placeholder="اكتب نتيجة الاتصال أو المطلوب من فريق البيع..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton tone="secondary" onClick={() => void submitNote()} disabled={Boolean(actionWorking) || !noteDraft.trim()}>
                        <ClipboardList className="h-4 w-4" />
                        تسجيل ملاحظة
                      </ActionButton>
                      <ActionButton onClick={() => void requestQuotation()} disabled={Boolean(actionWorking)}>
                        <Target className="h-4 w-4" />
                        طلب عرض سعر
                      </ActionButton>
                      <ActionButton tone="success" onClick={() => void markWon()} disabled={Boolean(actionWorking)}>
                        <CheckCircle2 className="h-4 w-4" />
                        تم الفوز
                      </ActionButton>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <select
                        value={lostReasonId}
                        onChange={(event) => setLostReasonId(event.target.value)}
                        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">سبب الخسارة غير محدد</option>
                        {lostReasons.map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.name}
                          </option>
                        ))}
                      </select>
                      <ActionButton tone="danger" onClick={() => void markLost()} disabled={Boolean(actionWorking)}>
                        <XCircle className="h-4 w-4" />
                        خسارة
                      </ActionButton>
                    </div>
                  </AdminSection>

                  <AdminSection title="ملاحظات أودو" description="آخر وصف متزامن من الفرصة.">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300" dir="auto">
                      {selectedLead.notes || "لا توجد ملاحظات مسجلة."}
                    </p>
                  </AdminSection>

                  <AdminSection title="سجل الإجراءات" description="آخر إجراءات تمت من لوحة الإدارة لهذه الفرصة.">
                    {actions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        لا توجد إجراءات مسجلة بعد.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actions.map((action) => (
                          <article key={action.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{action.action_label}</p>
                                {action.note ? (
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300" dir="auto">{action.note}</p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-xs text-gray-400">{formatDateTime(action.created_at)}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </AdminSection>

                  <AdminSection title="مؤشرات المتابعة">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-brand-25 p-4 dark:bg-white/[0.04]">
                        <CalendarClock className="mb-3 h-5 w-5 text-amber-500" />
                        <DetailRow label="نشاطي القادم" value={selectedLead.my_deadline ? formatDate(selectedLead.my_deadline) : "لا يوجد نشاط"} />
                      </div>
                      <div className="rounded-xl bg-brand-25 p-4 dark:bg-white/[0.04]">
                        <UserRound className="mb-3 h-5 w-5 text-brand-500" />
                        <DetailRow label="مصدر الفرصة" value={[selectedLead.source_name, selectedLead.medium_name, selectedLead.campaign_name].filter(Boolean).join(" - ") || "غير محدد"} />
                      </div>
                    </div>
                  </AdminSection>
                </>
              )}
            </div>
          </div>
        </AdminPageFrame>
      </div>
    </>
  );
}
