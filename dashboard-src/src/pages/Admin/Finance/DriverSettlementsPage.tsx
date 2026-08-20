import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../../../components/common/PageMeta";
import {
  AdminMetricGrid,
  AdminPageFrame,
  AdminSection,
} from "../../../components/admin/AdminPageElements";
import StatCard from "../../../components/ui/StatCard";
import PageHeader from "../../../components/ui/PageHeader";
import StatusBadge, { type StatusBadgeTone } from "../../../components/ui/StatusBadge";
import Button from "../../../components/ui/button/Button";
import { Modal } from "../../../components/ui/modal";
import DateRangePicker from "../../../components/form/date-range-picker";
import { supabase } from "../../../lib/supabase";
import { formatMoney, formatDate, formatDateTime } from "../../../lib/format";
import type { DateRangeValue } from "../../../lib/date-range";
import {
  runDriverSettlement,
  approveDriverSettlement,
  postDriverSettlement,
} from "../../../lib/finance-settings";
import type { SettlementStatus } from "../../../types/finance";

// ── Helpers ──────────────────────────────────────────────────

async function getSignedProofUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from("delivery-proofs")
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.warn("Failed to create signed URL for proof:", error.message);
    return null;
  }
  return data.signedUrl ?? null;
}

// ── Types ────────────────────────────────────────────────────

type CollectionRequestRow = {
  id: string;
  driver_profile_id: string;
  plan_id: string | null;
  collected_amount: number;
  currency_code: string;
  proof_photo_url: string | null;
  driver_notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  driver_name?: string;
  driver_email?: string;
  plan_reference?: string;
};

type DriverDebtRow = {
  driver_profile_id: string;
  driver_name: string;
  driver_email: string;
  total_debt: number;
  currency_code: string;
  oldest_debt_at: string | null;
  hours_since_oldest: number;
  overdue: boolean;
  pending_requests: number;
  approved_today: number;
  total_collected_today: number;
  total_approved_amount: number;
};

type SettlementRow = {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  commission_amount: number;
  fuel_allowance: number;
  bonuses: number;
  penalties: number;
  cash_collected: number;
  cash_remitted: number;
  net_payable: number;
  status: SettlementStatus;
  journal_entry_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  driver_name?: string;
  driver_email?: string;
  plan_count?: number;
  plan_references?: string[];
  has_period_overlap?: boolean;
};

type SettlementPreview = {
  isLoading: boolean;
  planCount: number;
  shipmentCount: number;
  totalAmount: number;
  planReferences: string[];
  conflictMessage: string | null;
};

type StatusTab = "all" | "pending" | "approved" | "rejected";

const COLLECTION_STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "موافق عليه" },
  { key: "rejected", label: "مرفوض" },
];

const SETTLEMENT_STATUS_TABS: { key: SettlementStatus | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "approved", label: "معتمد" },
  { key: "posted", label: "مرحل" },
  { key: "paid", label: "مدفوع" },
];

const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, { label: string; tone: StatusBadgeTone }> = {
  draft: { label: "مسودة", tone: "yellow" },
  approved: { label: "معتمد", tone: "blue" },
  posted: { label: "مرحل", tone: "green" },
  paid: { label: "مدفوع", tone: "green" },
};

function collectionStatusTone(status: string): StatusBadgeTone {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "yellow";
}

function collectionStatusLabel(status: string) {
  if (status === "approved") return "موافق عليه";
  if (status === "rejected") return "مرفوض";
  return "قيد المراجعة";
}

// ── Component ────────────────────────────────────────────────

function toLocalDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toAmount(value: unknown) {
  const amount = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(amount) ? amount : 0;
}

export default function DriverSettlementsPage() {
  // ── Collection requests state ──
  const [requests, setRequests] = useState<CollectionRequestRow[]>([]);
  const [driverDebts, setDriverDebts] = useState<DriverDebtRow[]>([]);
  const [collectionStatusFilter, setCollectionStatusFilter] = useState<StatusTab>("all");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Settlements state ──
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<SettlementStatus | "all">("all");
  const [settlementSearchValue, setSettlementSearchValue] = useState("");
  const [settlementDriverFilter, setSettlementDriverFilter] = useState("all");
  const [settlementsLoading, setSettlementsLoading] = useState(true);

  // ── Plan Settlement Requests state ──
  const [planSettlementRequests, setPlanSettlementRequests] = useState<{
    id: string;
    driver_profile_id: string;
    plan_id: string;
    total_debt_amount: number;
    currency_code: string;
    status: string;
    driver_notes: string | null;
    admin_notes: string | null;
    reviewed_at: string | null;
    paid_at: string | null;
    created_at: string;
    driver_name?: string;
    plan_reference?: string;
  }[]>([]);
  const [planSettlementsLoading, setPlanSettlementsLoading] = useState(true);
  const [selectedPlanSettlement, setSelectedPlanSettlement] = useState<typeof planSettlementRequests[0] | null>(null);
  const [planSettlementDetailOpen, setPlanSettlementDetailOpen] = useState(false);
  const [planSettlementNotes, setPlanSettlementNotes] = useState("");

  // ── Collection Checks state ──
  const [collectionChecks, setCollectionChecks] = useState<{
    id: string;
    shipment_id: string;
    plan_id: string;
    driver_profile_id: string;
    driver_name: string;
    odoo_order_name: string | null;
    customer_name: string | null;
    check_status: string;
    payment_method: string | null;
    reason: string | null;
    driver_notes: string | null;
    review_status: string;
    admin_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
  }[]>([]);
  const [collectionChecksLoading, setCollectionChecksLoading] = useState(true);
  const [selectedCollectionCheck, setSelectedCollectionCheck] = useState<typeof collectionChecks[0] | null>(null);
  const [collectionCheckDetailOpen, setCollectionCheckDetailOpen] = useState(false);
  const [collectionCheckNotes, setCollectionCheckNotes] = useState("");
  const [collectionCheckFilter, setCollectionCheckFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // ── Modals ──
  const [selectedRequest, setSelectedRequest] = useState<CollectionRequestRow | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);

  // ── Create settlement modal ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [settlementDateRange, setSettlementDateRange] = useState<DateRangeValue>([null, null]);
  const [settlementPreview, setSettlementPreview] = useState<SettlementPreview>({
    isLoading: false,
    planCount: 0,
    shipmentCount: 0,
    totalAmount: 0,
    planReferences: [],
    conflictMessage: null,
  });
  const [isCreating, setIsCreating] = useState(false);

  // ── Settlement detail modal ──
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRow | null>(null);
  const [settlementDetailOpen, setSettlementDetailOpen] = useState(false);

  // ── Drivers list for create modal ──
  const [allDrivers, setAllDrivers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("logistics_users")
      .select("id, employee_name")
      .eq("status", "active")
      .order("employee_name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load logistics drivers:", error.message);
          setAllDrivers([]);
          return;
        }
        if (data) setAllDrivers(data.map((d) => ({ id: d.id, name: d.employee_name ?? "—" })));
      });
  }, []);

  // ── Load collection requests + debts ──
  const loadCollectionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const requestsRes = await supabase
        .from("logistics_collection_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsRes.error) throw requestsRes.error;

      const requestRows = (requestsRes.data ?? []) as CollectionRequestRow[];

      const profileIds = [...new Set(requestRows.map((r) => r.driver_profile_id))];
      let profileMap = new Map<string, { full_name: string; email: string }>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds);
        if (profiles) {
          profileMap = new Map(
            profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }])
          );
        }
      }

      const planIds = [...new Set(requestRows.map((r) => r.plan_id).filter(Boolean))] as string[];
      let planMap = new Map<string, string>();
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from("logistics_delivery_plans")
          .select("id, plan_reference")
          .in("id", planIds);
        if (plans) {
          planMap = new Map(plans.map((p) => [p.id, p.plan_reference]));
        }
      }

      const enriched = requestRows.map((row) => ({
        ...row,
        driver_name: profileMap.get(row.driver_profile_id)?.full_name ?? "غير معروف",
        driver_email: profileMap.get(row.driver_profile_id)?.email ?? "",
        plan_reference: row.plan_id ? planMap.get(row.plan_id) ?? row.plan_id : "--",
      }));

      setRequests(enriched);

      // Compute driver debts client-side from collection requests
      const now = new Date();
      const todayStr = now.toDateString();
      const debtMap = new Map<string, DriverDebtRow>();
      for (const row of enriched) {
        const did = row.driver_profile_id;
        if (!debtMap.has(did)) {
          debtMap.set(did, {
            driver_profile_id: did,
            driver_name: row.driver_name ?? "غير معروف",
            driver_email: row.driver_email ?? "",
            total_debt: 0,
            currency_code: "EGP",
            oldest_debt_at: null,
            hours_since_oldest: 0,
            overdue: false,
            pending_requests: 0,
            approved_today: 0,
            total_collected_today: 0,
            total_approved_amount: 0,
          });
        }
        const d = debtMap.get(did)!;
        if (row.status === "pending") {
          d.pending_requests++;
          d.total_debt += row.collected_amount;
          const created = new Date(row.created_at);
          if (!d.oldest_debt_at || created < new Date(d.oldest_debt_at)) {
            d.oldest_debt_at = row.created_at;
          }
        }
        if (row.status === "approved") {
          d.total_approved_amount += row.collected_amount;
          if (row.reviewed_at && new Date(row.reviewed_at).toDateString() === todayStr) {
            d.approved_today++;
            d.total_collected_today += row.collected_amount;
          }
        }
      }
      // Compute hours_since_oldest and overdue
      for (const d of debtMap.values()) {
        if (d.oldest_debt_at) {
          const hours = (now.getTime() - new Date(d.oldest_debt_at).getTime()) / 3600000;
          d.hours_since_oldest = Math.round(hours * 10) / 10;
          d.overdue = hours > 24;
        }
      }
      setDriverDebts(Array.from(debtMap.values()).filter((d) => d.total_debt > 0).sort((a, b) => b.total_debt - a.total_debt));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل بيانات التحصيل.");
      setRequests([]);
      setDriverDebts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load settlements ──
  const loadSettlements = useCallback(async () => {
    try {
      setSettlementsLoading(true);

      let query = supabase
        .from("finance_driver_settlements")
        .select("*")
        .order("created_at", { ascending: false });

      if (settlementStatusFilter !== "all") {
        query = query.eq("status", settlementStatusFilter);
      }

      const { data, error: settleErr } = await query;
      if (settleErr) throw settleErr;

      const rows = (data ?? []) as SettlementRow[];

      const driverIds = [...new Set(rows.map((s) => s.driver_id))];
      let driverMap = new Map<string, { full_name: string; email: string }>();
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from("logistics_users")
          .select("id, employee_name, work_email, linked_profile_id")
          .in("id", driverIds);

        const profileIds = [
          ...new Set((drivers ?? []).map((driver) => driver.linked_profile_id).filter(Boolean)),
        ] as string[];
        let profileMap = new Map<string, { full_name: string | null; email: string | null }>();

        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", profileIds);
          profileMap = new Map(
            (profiles ?? []).map((profile) => [
              profile.id,
              { full_name: profile.full_name, email: profile.email },
            ])
          );
        }

        driverMap = new Map(
          (drivers ?? []).map((driver) => {
            const linkedProfile = driver.linked_profile_id
              ? profileMap.get(driver.linked_profile_id)
              : undefined;

            return [
              driver.id,
              {
                full_name: driver.employee_name || linkedProfile?.full_name || "غير معروف",
                email: driver.work_email || linkedProfile?.email || "",
              },
            ];
          })
        );
      }

      const settlementStartDates = rows.map((row) => row.period_start).filter(Boolean).sort();
      const settlementEndDates = rows.map((row) => row.period_end).filter(Boolean).sort();
      const planMap = new Map<string, { count: number; references: string[] }>();

      if (driverIds.length > 0 && settlementStartDates.length > 0 && settlementEndDates.length > 0) {
        const { data: plans } = await supabase
          .from("logistics_delivery_plans")
          .select("id, logistics_user_id, planned_date, plan_reference")
          .in("logistics_user_id", driverIds)
          .gte("planned_date", settlementStartDates[0])
          .lte("planned_date", settlementEndDates[settlementEndDates.length - 1]);

        for (const row of rows) {
          const matchingPlans = (plans ?? []).filter((plan) =>
            plan.logistics_user_id === row.driver_id &&
            plan.planned_date >= row.period_start &&
            plan.planned_date <= row.period_end
          );

          planMap.set(row.id, {
            count: matchingPlans.length,
            references: matchingPlans
              .map((plan) => plan.plan_reference)
              .filter((reference): reference is string => Boolean(reference)),
          });
        }
      }

      const enriched = rows.map((row) => ({
        ...row,
        driver_name: driverMap.get(row.driver_id)?.full_name ?? "غير معروف",
        driver_email: driverMap.get(row.driver_id)?.email ?? "",
        plan_count: planMap.get(row.id)?.count ?? 0,
        plan_references: planMap.get(row.id)?.references ?? [],
        has_period_overlap: rows.some((other) =>
          other.id !== row.id &&
          other.driver_id === row.driver_id &&
          other.period_start <= row.period_end &&
          other.period_end >= row.period_start
        ),
      }));

      setSettlements(enriched);
    } catch (loadError) {
      console.error("Failed to load settlements:", loadError);
      setSettlements([]);
    } finally {
      setSettlementsLoading(false);
    }
  }, [settlementStatusFilter]);

  useEffect(() => {
    void loadCollectionData();
  }, [loadCollectionData]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  // ── Load plan settlement requests ──
  const loadPlanSettlementRequests = useCallback(async () => {
    try {
      setPlanSettlementsLoading(true);
      const { data, error } = await supabase
        .from("driver_plan_settlement_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      const driverIds = [...new Set(rows.map((r) => r.driver_profile_id))];
      const planIds = [...new Set(rows.map((r) => r.plan_id))];

      let driverMap = new Map<string, string>();
      let planMap = new Map<string, string>();

      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        driverMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "غير معروف"]));
      }

      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from("logistics_delivery_plans")
          .select("id, plan_reference")
          .in("id", planIds);
        planMap = new Map((plans ?? []).map((p) => [p.id, p.plan_reference ?? ""]));
      }

      setPlanSettlementRequests(
        rows.map((row) => ({
          ...row,
          driver_name: driverMap.get(row.driver_profile_id) ?? "غير معروف",
          plan_reference: planMap.get(row.plan_id) ?? "",
        }))
      );
    } catch (err) {
      console.error("Failed to load plan settlement requests:", err);
      setPlanSettlementRequests([]);
    } finally {
      setPlanSettlementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanSettlementRequests();
  }, [loadPlanSettlementRequests]);

  // ── Load collection checks ──
  const loadCollectionChecks = useCallback(async () => {
    try {
      setCollectionChecksLoading(true);
      const { data, error } = await supabase.rpc("admin_get_collection_checks", {
        p_status: collectionCheckFilter === "all" ? null : collectionCheckFilter,
      });
      if (error) throw error;
      setCollectionChecks(data ?? []);
    } catch (err) {
      console.error("Failed to load collection checks:", err);
      setCollectionChecks([]);
    } finally {
      setCollectionChecksLoading(false);
    }
  }, [collectionCheckFilter]);

  useEffect(() => {
    void loadCollectionChecks();
  }, [loadCollectionChecks]);

  const handleReviewCollectionCheck = async (checkId: string, status: "approved" | "rejected") => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.rpc("admin_review_collection_check", {
        p_check_id: checkId,
        p_review_status: status,
        p_admin_notes: collectionCheckNotes.trim() || null,
      });
      if (error) throw error;
      setCollectionCheckDetailOpen(false);
      setSelectedCollectionCheck(null);
      setCollectionCheckNotes("");
      await loadCollectionChecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر مراجعة التحصيل.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewPlanSettlement = async (requestId: string, status: "approved" | "rejected") => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.rpc("admin_review_settlement_request", {
        p_request_id: requestId,
        p_status: status,
        p_admin_notes: planSettlementNotes.trim() || null,
      });
      if (error) throw error;
      setPlanSettlementDetailOpen(false);
      setSelectedPlanSettlement(null);
      setPlanSettlementNotes("");
      await loadPlanSettlementRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر مراجعة طلب التسويه.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPlanSettlementPaid = async (requestId: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.rpc("admin_mark_settlement_paid", {
        p_request_id: requestId,
      });
      if (error) throw error;
      await loadPlanSettlementRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة الدفع.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Filtered collection requests ──
  const filteredRequests = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return requests.filter((row) => {
      if (collectionStatusFilter !== "all" && row.status !== collectionStatusFilter) return false;
      if (query) {
        const haystack = [row.driver_name, row.driver_email, row.plan_reference, row.driver_notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [requests, collectionStatusFilter, searchValue]);

  const filteredSettlements = useMemo(() => {
    const query = settlementSearchValue.trim().toLowerCase();

    return settlements.filter((row) => {
      if (settlementDriverFilter !== "all" && row.driver_id !== settlementDriverFilter) return false;

      if (query) {
        const haystack = [
          row.driver_name,
          row.driver_email,
          row.period_start,
          row.period_end,
          ...(row.plan_references ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [settlementDriverFilter, settlementSearchValue, settlements]);

  // ── KPIs ──
  const collectionKpis = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending");
    const approvedToday = requests.filter(
      (r) => r.status === "approved" && r.reviewed_at && new Date(r.reviewed_at).toDateString() === new Date().toDateString()
    );
    const totalDebt = driverDebts.reduce((sum, d) => sum + d.total_debt, 0);
    const overdueDrivers = driverDebts.filter((d) => d.overdue);

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.collected_amount, 0),
      approvedTodayCount: approvedToday.length,
      approvedTodayAmount: approvedToday.reduce((sum, r) => sum + r.collected_amount, 0),
      totalDebt,
      overdueDriverCount: overdueDrivers.length,
      totalDriversWithDebt: driverDebts.length,
    };
  }, [requests, driverDebts]);

  const settlementKpis = useMemo(() => {
    const totalSettlements = settlements.length;
    const draftCount = settlements.filter((s) => s.status === "draft").length;
    const totalPlanValue = settlements.reduce((sum, s) => sum + s.cash_collected, 0);
    const totalNet = settlements.reduce((sum, s) => sum + s.net_payable, 0);

    return {
      totalSettlements,
      draftCount,
      totalPlanValue,
      totalNet,
    };
  }, [settlements]);

  // ── Handlers: Collection requests ──
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const { error: rpcError } = await supabase.rpc("admin_approve_collection_request", {
        p_request_id: selectedRequest.id,
        p_admin_notes: approvalNotes.trim() || null,
      });
      if (rpcError) throw rpcError;
      setDetailModalOpen(false);
      setSelectedRequest(null);
      setApprovalNotes("");
      await loadCollectionData();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "تعذر الموافقة على الطلب.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const { error: rpcError } = await supabase.rpc("admin_reject_collection_request", {
        p_request_id: selectedRequest.id,
        p_admin_notes: approvalNotes.trim() || null,
      });
      if (rpcError) throw rpcError;
      setDetailModalOpen(false);
      setSelectedRequest(null);
      setApprovalNotes("");
      await loadCollectionData();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "تعذر رفض الطلب.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRequestDetail = (request: CollectionRequestRow) => {
    setSelectedRequest(request);
    setApprovalNotes("");
    setDetailModalOpen(true);
  };

  const openPhoto = (url: string) => {
    setPhotoModalUrl(url);
    setShowPhotoModal(true);
  };

  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedProofUrl(selectedRequest?.proof_photo_url ?? null).then((url) => {
      if (active) setProofPhotoUrl(url);
    });
    return () => { active = false; };
  }, [selectedRequest?.proof_photo_url]);

  // ── Handlers: Settlements ──
  const resetCreateSettlementForm = useCallback(() => {
    setCreateModalOpen(false);
    setSelectedDriverId("");
    setPeriodStart("");
    setPeriodEnd("");
    setSettlementDateRange([null, null]);
    setSettlementPreview({
      isLoading: false,
      planCount: 0,
      shipmentCount: 0,
      totalAmount: 0,
      planReferences: [],
      conflictMessage: null,
    });
  }, []);

  const handleSettlementDateRangeChange = useCallback((nextRange: DateRangeValue) => {
    setSettlementDateRange(nextRange);
    setPeriodStart(nextRange[0] ? toLocalDateString(nextRange[0]) : "");
    setPeriodEnd(nextRange[1] ? toLocalDateString(nextRange[1]) : "");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSettlementPreview() {
      const overlappingSettlement = settlements.find((settlement) =>
        settlement.driver_id === selectedDriverId &&
        settlement.period_start <= periodEnd &&
        settlement.period_end >= periodStart
      );

      const conflictMessage = overlappingSettlement
        ? `الفترة تتداخل مع تسوية موجودة: ${formatDate(overlappingSettlement.period_start)} → ${formatDate(overlappingSettlement.period_end)}`
        : null;

      if (!selectedDriverId || !periodStart || !periodEnd) {
        setSettlementPreview({
          isLoading: false,
          planCount: 0,
          shipmentCount: 0,
          totalAmount: 0,
          planReferences: [],
          conflictMessage,
        });
        return;
      }

      setSettlementPreview((current) => ({ ...current, isLoading: true, conflictMessage }));

      try {
        const { data: plans, error: plansError } = await supabase
          .from("logistics_delivery_plans")
          .select("id, plan_reference, planned_date")
          .eq("logistics_user_id", selectedDriverId)
          .gte("planned_date", periodStart)
          .lte("planned_date", periodEnd)
          .neq("plan_status", "cancelled");

        if (plansError) throw plansError;

        const planRows = plans ?? [];
        const planIds = planRows.map((plan) => plan.id);

        if (planIds.length === 0) {
          if (active) {
            setSettlementPreview({
              isLoading: false,
              planCount: 0,
              shipmentCount: 0,
              totalAmount: 0,
              planReferences: [],
              conflictMessage,
            });
          }
          return;
        }

        const { data: shipments, error: shipmentsError } = await supabase
          .from("logistics_shipments")
          .select("id, plan_id, shipment_status, total_gmv, linked_order_id")
          .in("plan_id", planIds);

        if (shipmentsError) throw shipmentsError;

        const shipmentRows = (shipments ?? []).filter(
          (shipment) => !["CANCELLED", "FAILED"].includes(String(shipment.shipment_status ?? ""))
        );
        const shipmentIds = shipmentRows.map((shipment) => shipment.id);
        const orderIds = [
          ...new Set(shipmentRows.map((shipment) => shipment.linked_order_id).filter(Boolean)),
        ] as string[];

        let collectionMap = new Map<string, number>();
        if (shipmentIds.length > 0) {
          const { data: collections, error: collectionsError } = await supabase
            .from("logistics_shipment_collections")
            .select("shipment_id, pending_delivery_amount")
            .in("shipment_id", shipmentIds);

          if (collectionsError) throw collectionsError;

          collectionMap = new Map(
            (collections ?? []).map((collection) => [
              collection.shipment_id,
              toAmount(collection.pending_delivery_amount),
            ])
          );
        }

        let orderMap = new Map<string, number>();
        if (orderIds.length > 0) {
          const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select("id, amount_total, total_amount")
            .in("id", orderIds);

          if (ordersError) throw ordersError;

          orderMap = new Map(
            (orders ?? []).map((order) => [
              order.id,
              toAmount(order.amount_total) || toAmount(order.total_amount),
            ])
          );
        }

        const totalAmount = shipmentRows.reduce((sum, shipment) => {
          const collectionAmount = collectionMap.get(shipment.id) ?? 0;
          const orderAmount = shipment.linked_order_id ? orderMap.get(shipment.linked_order_id) ?? 0 : 0;
          return sum + (collectionAmount || orderAmount || toAmount(shipment.total_gmv));
        }, 0);

        if (active) {
          setSettlementPreview({
            isLoading: false,
            planCount: planRows.length,
            shipmentCount: shipmentRows.length,
            totalAmount,
            planReferences: planRows
              .map((plan) => plan.plan_reference)
              .filter((reference): reference is string => Boolean(reference)),
            conflictMessage,
          });
        }
      } catch (previewError) {
        if (active) {
          setSettlementPreview({
            isLoading: false,
            planCount: 0,
            shipmentCount: 0,
            totalAmount: 0,
            planReferences: [],
            conflictMessage: previewError instanceof Error ? previewError.message : "تعذر حساب معاينة التسوية.",
          });
        }
      }
    }

    void loadSettlementPreview();

    return () => {
      active = false;
    };
  }, [periodEnd, periodStart, selectedDriverId, settlements]);

  const handleCreateSettlement = async () => {
    if (!selectedDriverId || !periodStart || !periodEnd) return;

    const overlappingSettlement = settlements.find((settlement) =>
      settlement.driver_id === selectedDriverId &&
      settlement.period_start <= periodEnd &&
      settlement.period_end >= periodStart
    );

    if (overlappingSettlement) {
      setError(
        `يوجد بالفعل تسوية لهذا السائق تتداخل مع الفترة المختارة: ${formatDate(overlappingSettlement.period_start)} → ${formatDate(overlappingSettlement.period_end)}.`
      );
      return;
    }

    if (settlementPreview.planCount === 0 || settlementPreview.shipmentCount === 0) {
      setError("لا توجد خطط أو شحنات داخل الفترة المختارة لهذا السائق.");
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      await runDriverSettlement(selectedDriverId, periodStart, periodEnd);
      resetCreateSettlementForm();
      await loadSettlements();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "تعذر إنشاء التسوية.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveSettlement = async (settlementId: string) => {
    try {
      await approveDriverSettlement(settlementId);
      await loadSettlements();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "تعذر اعتماد التسوية.");
    }
  };

  const handlePostSettlement = async (settlementId: string) => {
    try {
      await postDriverSettlement(settlementId);
      await loadSettlements();
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "تعذر ترحيل التسوية.");
    }
  };

  const handleDeleteDraftSettlement = async (settlement: SettlementRow) => {
    const confirmed = window.confirm(
      `حذف مسودة تسوية ${settlement.driver_name ?? ""} للفترة ${formatDate(settlement.period_start)} → ${formatDate(settlement.period_end)}؟`
    );

    if (!confirmed) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from("finance_driver_settlements")
        .delete()
        .eq("id", settlement.id)
        .eq("status", "draft");

      if (deleteError) throw deleteError;

      await loadSettlements();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف مسودة التسوية.");
    }
  };

  const openSettlementDetail = (settlement: SettlementRow) => {
    setSelectedSettlement(settlement);
    setSettlementDetailOpen(true);
  };

  return (
    <>
      <PageMeta title="المالية — تسويات السائقين" description="إدارة تسويات السائقين" />
      <AdminPageFrame>
        <PageHeader
          variant="list"
          title="تسويات السائقين"
          subtitle="إدارة طلبات التحصيل والتسويات المالية للسائقين"
        />

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        {/* ── KPIs ── */}
        <AdminMetricGrid>
          <StatCard
            label="طلبات قيد المراجعة"
            value={collectionKpis.pendingCount}
            helper={formatMoney(collectionKpis.pendingAmount)}
            icon={<ClockIcon className="h-5 w-5" />}
            tone="yellow"
          />
          <StatCard
            label="تمت الموافقة اليوم"
            value={collectionKpis.approvedTodayCount}
            helper={formatMoney(collectionKpis.approvedTodayAmount)}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="إجمالي الديون"
            value={formatMoney(collectionKpis.totalDebt)}
            helper={`${collectionKpis.totalDriversWithDebt} سائق`}
            icon={<BanknotesIcon className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="ديون متأخرة (+24 ساعة)"
            value={collectionKpis.overdueDriverCount}
            helper={collectionKpis.overdueDriverCount > 0 ? "يجب التحصيل فوراً" : "لا توجد ديون متأخرة"}
            icon={<ExclamationTriangleIcon className="h-5 w-5" />}
            tone={collectionKpis.overdueDriverCount > 0 ? "red" : "neutral"}
          />
        </AdminMetricGrid>

        <AdminMetricGrid>
          <StatCard
            label="إجمالي التسويات"
            value={settlementKpis.totalSettlements}
            helper={`${settlementKpis.draftCount} مسودة`}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="إجمالي قيمة الخطط"
            value={formatMoney(settlementKpis.totalPlanValue)}
            helper="خطط السائقين في فترات التسوية"
            icon={<BanknotesIcon className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="قيمة التسويات"
            value={formatMoney(settlementKpis.totalNet)}
            helper="تساوي إجمالي الخطط"
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            tone="blue"
          />
        </AdminMetricGrid>

        {/* ── Driver Debts ── */}
        {driverDebts.length > 0 && (
          <AdminSection title="ديون السائقين" description="أرصدة التحصيل المعلقة لكل سائق">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">السائق</th>
                    <th className="px-4 py-3">إجمالي الدين</th>
                    <th className="px-4 py-3">منذ</th>
                    <th className="px-4 py-3">طلبات معلقة</th>
                    <th className="px-4 py-3">تمت الموافقة اليوم</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {driverDebts.map((debt) => (
                    <tr key={debt.driver_profile_id} className="hover:bg-brand-25">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{debt.driver_name}</p>
                          <p className="text-xs text-gray-500">{debt.driver_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600">
                        {formatMoney(debt.total_debt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {debt.oldest_debt_at ? formatDate(debt.oldest_debt_at) : "--"}
                        {debt.hours_since_oldest > 0 && (
                          <span className="mr-1 text-xs text-gray-400">
                            ({Math.round(debt.hours_since_oldest)}س)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {debt.pending_requests}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        {formatMoney(debt.total_collected_today)}
                      </td>
                      <td className="px-4 py-3">
                        {debt.overdue ? (
                          <StatusBadge label="متأخر" tone="red" dot />
                        ) : (
                          <StatusBadge label="عادي" tone="green" dot />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSection>
        )}

        {/* ── Plan Settlement Requests ── */}
        <AdminSection title="طلبات تسويه الخطط" description="طلبات التسويه المرسلة من السائقين عند إنهاء الخطط">
          {planSettlementsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">جار تحميل الطلبات...</div>
          ) : planSettlementRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">لا توجد طلبات تسويه بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">السائق</th>
                    <th className="px-4 py-3">الخطة</th>
                    <th className="px-4 py-3">المديونية</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">تاريخ الإنشاء</th>
                    <th className="px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {planSettlementRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-brand-25">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{req.driver_name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{req.plan_reference || req.plan_id}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{formatMoney(req.total_debt_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={req.status === "pending" ? "قيد المراجعة" : req.status === "approved" ? "معتمد" : req.status === "paid" ? "مدفوع" : "مرفوض"}
                          tone={req.status === "pending" ? "yellow" : req.status === "approved" ? "blue" : req.status === "paid" ? "green" : "red"}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDateTime(req.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedPlanSettlement(req); setPlanSettlementNotes(""); setPlanSettlementDetailOpen(true); }}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                            عرض
                          </button>
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleReviewPlanSettlement(req.id, "approved")}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                اعتماد
                              </button>
                              <button
                                onClick={() => handleReviewPlanSettlement(req.id, "rejected")}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 text-xs"
                              >
                                <XCircleIcon className="h-3.5 w-3.5" />
                                رفض
                              </button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <button
                              onClick={() => handleMarkPlanSettlementPaid(req.id)}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs"
                            >
                              <BanknotesIcon className="h-3.5 w-3.5" />
                              مدفوع
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        {/* ── Collection Checks ── */}
        <AdminSection
          title="فحص التحصيل"
          description="فحوصات التحصيل المرسلة من السائقين لكل شحنة"
          actions={
            <select
              value={collectionCheckFilter}
              onChange={(e) => setCollectionCheckFilter(e.target.value as typeof collectionCheckFilter)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="all">الكل</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">معتمد</option>
              <option value="rejected">مرفوض</option>
            </select>
          }
        >
          {collectionChecksLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : collectionChecks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">لا توجد فحوصات تحصيل</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-brand-25 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-right">السائق</th>
                    <th className="px-4 py-3 text-right">رقم الطلب</th>
                    <th className="px-4 py-3 text-right">العميل</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">طريقة الدفع</th>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {collectionChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-brand-25">
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{check.driver_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{check.odoo_order_name || check.shipment_id.slice(0, 8) + '...'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{check.customer_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          check.check_status === "collected"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {check.check_status === "collected" ? "تحصيل" : "غير محصل"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {check.payment_method === "cash" ? "نقدي" :
                         check.payment_method === "bank_transfer" ? "تحويل بنكي" :
                         check.payment_method === "installments" ? "أقساط" :
                         check.payment_method === "cheque" ? "شيك" :
                         check.reason ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(check.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedCollectionCheck(check); setCollectionCheckNotes(""); setCollectionCheckDetailOpen(true); }}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                            عرض
                          </button>
                          {check.review_status === "pending" && (
                            <>
                              <button
                                onClick={() => handleReviewCollectionCheck(check.id, "approved")}
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                اعتماد
                              </button>
                              <button
                                onClick={() => handleReviewCollectionCheck(check.id, "rejected")}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-xs"
                              >
                                <XCircleIcon className="h-3.5 w-3.5" />
                                رفض
                              </button>
                            </>
                          )}
                          {check.review_status !== "pending" && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              check.review_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {check.review_status === "approved" ? "معتمد" : "مرفوض"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        {/* Collection Check Detail Modal */}
        {collectionCheckDetailOpen && selectedCollectionCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تفاصيل فحص التحصيل</h3>
                <button onClick={() => { setCollectionCheckDetailOpen(false); setSelectedCollectionCheck(null); }} className="text-gray-400 hover:text-gray-600">
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">السائق:</span><span className="font-medium">{selectedCollectionCheck.driver_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">رقم الطلب:</span><span className="font-medium">{selectedCollectionCheck.odoo_order_name || selectedCollectionCheck.shipment_id}</span></div>
                {selectedCollectionCheck.customer_name && (
                  <div className="flex justify-between"><span className="text-gray-500">العميل:</span><span className="font-medium">{selectedCollectionCheck.customer_name}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">الحالة:</span>
                  <span className={`font-semibold ${selectedCollectionCheck.check_status === "collected" ? "text-green-600" : "text-red-600"}`}>
                    {selectedCollectionCheck.check_status === "collected" ? "محصل" : "غير محصل"}
                  </span>
                </div>
                {selectedCollectionCheck.payment_method && (
                  <div className="flex justify-between"><span className="text-gray-500">طريقة الدفع:</span><span className="font-medium">
                    {selectedCollectionCheck.payment_method === "cash" ? "نقدي" :
                     selectedCollectionCheck.payment_method === "bank_transfer" ? "تحويل بنكي" :
                     selectedCollectionCheck.payment_method === "credit" || selectedCollectionCheck.payment_method === "installments" ? "أقساط" : "شيك"}
                  </span></div>
                )}
                {selectedCollectionCheck.reason && (
                  <div className="flex justify-between"><span className="text-gray-500">السبب:</span><span className="font-medium">{selectedCollectionCheck.reason}</span></div>
                )}
                {selectedCollectionCheck.driver_notes && (
                  <div className="flex justify-between"><span className="text-gray-500">ملاحظة السائق:</span><span className="font-medium">{selectedCollectionCheck.driver_notes}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span className="font-medium">{formatDateTime(selectedCollectionCheck.created_at)}</span></div>
              </div>
              {selectedCollectionCheck.review_status === "pending" && (
                <div>
                  <label className="text-xs font-medium text-gray-500">ملاحظة المدير (اختياري)</label>
                  <input
                    type="text"
                    value={collectionCheckNotes}
                    onChange={(e) => setCollectionCheckNotes(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="أضف ملاحظة..."
                  />
                </div>
              )}
              {selectedCollectionCheck.review_status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReviewCollectionCheck(selectedCollectionCheck.id, "approved")}
                    disabled={isProcessing}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    اعتماد
                  </button>
                  <button
                    onClick={() => handleReviewCollectionCheck(selectedCollectionCheck.id, "rejected")}
                    disabled={isProcessing}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    رفض
                  </button>
                </div>
              )}
              {selectedCollectionCheck.admin_notes && (
                <div className="rounded-lg bg-brand-25 p-3 text-xs text-gray-600">
                  <span className="font-semibold">ملاحظة المدير:</span> {selectedCollectionCheck.admin_notes}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── Settlements ── */}
        <AdminSection
          title="التسويات المالية"
          description="تسويات السائقين المالية مع القيود المحاسبية"
          actions={
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4 ml-1" />
              إنشاء تسوية
            </Button>
          }
        >
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px]">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={settlementSearchValue}
                onChange={(event) => setSettlementSearchValue(event.target.value)}
                placeholder="ابحث باسم السائق أو رقم الخطة أو الفترة..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <select
              value={settlementDriverFilter}
              onChange={(event) => setSettlementDriverFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">كل السائقين</option>
              {allDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {SETTLEMENT_STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSettlementStatusFilter(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  settlementStatusFilter === tab.key
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-brand-25 text-gray-600 hover:bg-brand-25 dark:bg-white/[0.02] dark:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {settlementsLoading ? (
            <div className="py-16 text-center text-sm text-gray-500">جار تحميل التسويات...</div>
          ) : settlements.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">لا توجد تسويات بعد</div>
          ) : filteredSettlements.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">لا توجد تسويات مطابقة للفلاتر الحالية</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">السائق</th>
                    <th className="px-4 py-3">الفترة</th>
                    <th className="px-4 py-3">الخطط</th>
                    <th className="px-4 py-3">إجمالي الخطط</th>
                    <th className="px-4 py-3">قيمة التسوية</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSettlements.map((s) => {
                    const statusInfo = SETTLEMENT_STATUS_LABELS[s.status] ?? SETTLEMENT_STATUS_LABELS.draft;
                    return (
                      <tr key={s.id} className="hover:bg-brand-25">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{s.driver_name}</p>
                            <p className="text-xs text-gray-500">{s.driver_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div className="space-y-1">
                            <p>{formatDate(s.period_start)} → {formatDate(s.period_end)}</p>
                            {s.has_period_overlap ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                فترة متداخلة
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{s.plan_count ?? 0}</div>
                          {(s.plan_references?.length ?? 0) > 0 ? (
                            <div className="mt-1 max-w-40 truncate text-xs text-gray-500" title={s.plan_references?.join(", ")}>
                              {s.plan_references?.slice(0, 2).join(", ")}
                              {(s.plan_references?.length ?? 0) > 2 ? "..." : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{formatMoney(s.cash_collected)}</td>
                        <td className="px-4 py-3 font-semibold">{formatMoney(s.net_payable)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openSettlementDetail(s)}
                              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              عرض
                            </button>
                            {s.status === "draft" && (
                              <>
                                <button
                                  onClick={() => handleApproveSettlement(s.id)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  <CheckCircleIcon className="h-3.5 w-3.5" />
                                  اعتماد
                                </button>
                                <button
                                  onClick={() => handleDeleteDraftSettlement(s)}
                                  className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 text-xs"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  حذف
                                </button>
                              </>
                            )}
                            {s.status === "approved" && (
                              <button
                                onClick={() => handlePostSettlement(s.id)}
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs"
                              >
                                <PaperAirplaneIcon className="h-3.5 w-3.5" />
                                ترحيل
                              </button>
                            )}
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

      {/* ── Collection Request Detail Modal ── */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedRequest(null); }}
        className="mx-4 max-w-2xl overflow-hidden"
      >
        {selectedRequest && (
          <>
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <BanknotesIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    تفاصيل طلب التحصيل
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedRequest.driver_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge
                      label={collectionStatusLabel(selectedRequest.status)}
                      tone={collectionStatusTone(selectedRequest.status)}
                    />
                    <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-gray-700">
                      {formatMoney(selectedRequest.collected_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">الخطة</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedRequest.plan_reference}</p>
                </div>
                <div>
                  <span className="text-gray-500">تاريخ الإنشاء</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDateTime(selectedRequest.created_at)}</p>
                </div>
                {selectedRequest.driver_notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">ملاحظات السائق</span>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedRequest.driver_notes}</p>
                  </div>
                )}
                {selectedRequest.admin_notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">ملاحظات الإدارة</span>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedRequest.admin_notes}</p>
                  </div>
                )}
                {selectedRequest.reviewed_at && (
                  <div className="col-span-2">
                    <span className="text-gray-500">تاريخ المراجعة</span>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDateTime(selectedRequest.reviewed_at)}</p>
                  </div>
                )}
              </div>

              {proofPhotoUrl && (
                <div>
                  <span className="text-sm text-gray-500">صورة الإيصال</span>
                  <div
                    className="mt-2 cursor-pointer overflow-hidden rounded-xl border border-gray-200"
                    onClick={() => openPhoto(proofPhotoUrl)}
                  >
                    <img
                      src={proofPhotoUrl}
                      alt="صورة الإيصال"
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700">ملاحظات المراجعة</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="أضف ملاحظات (اختياري)..."
                    className="mt-2 w-full h-20 rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => { setDetailModalOpen(false); setSelectedRequest(null); }}
                disabled={isProcessing}
              >
                إغلاق
              </Button>
              {selectedRequest.status === "pending" && (
                <>
                  <Button
                    onClick={handleRejectRequest}
                    disabled={isProcessing}
                    className="!bg-rose-600 hover:!bg-rose-700 disabled:!bg-rose-300"
                  >
                    {isProcessing ? "جار التنفيذ..." : "رفض"}
                  </Button>
                  <Button
                    onClick={handleApproveRequest}
                    disabled={isProcessing}
                    className="!bg-emerald-600 hover:!bg-emerald-700 disabled:!bg-emerald-300"
                  >
                    {isProcessing ? "جار التنفيذ..." : "موافقة"}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ── Full Photo Modal ── */}
      <Modal
        isOpen={showPhotoModal}
        onClose={() => { setShowPhotoModal(false); setPhotoModalUrl(null); }}
        className="mx-4 max-w-3xl overflow-hidden"
      >
        {photoModalUrl && (
          <div className="p-4">
            <img
              src={photoModalUrl}
              alt="صورة الإيصال"
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
          </div>
        )}
      </Modal>

      {/* ── Create Settlement Modal ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={resetCreateSettlementForm}
        className="mx-4 max-w-lg overflow-hidden"
      >
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">إنشاء تسوية جديدة</h2>
          <p className="mt-1 text-sm text-gray-500">احسب تسوية السائق بناءً على بيانات الفترة</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">السائق</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
            >
              <option value="">اختر سائق...</option>
              {allDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <DateRangePicker
            id="driver-settlement-period"
            label="الفترة"
            placeholder="اختر فترة التسوية"
            value={settlementDateRange}
            onChange={handleSettlementDateRangeChange}
          />

          <div className="rounded-lg border border-gray-200 bg-brand-25 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">معاينة التسوية</p>
                <p className="text-xs text-gray-500">تحسب الخطط والشحنات قبل إنشاء المسودة</p>
              </div>
              {settlementPreview.isLoading ? (
                <span className="text-xs font-medium text-gray-500">جار الحساب...</span>
              ) : null}
            </div>

            {settlementPreview.conflictMessage ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {settlementPreview.conflictMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500">الخطط</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{settlementPreview.planCount}</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500">الشحنات</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{settlementPreview.shipmentCount}</p>
              </div>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-950">
                <p className="text-xs text-gray-500">القيمة</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatMoney(settlementPreview.totalAmount)}</p>
              </div>
            </div>

            {settlementPreview.planReferences.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-500">الخطط الداخلة</p>
                <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto">
                  {settlementPreview.planReferences.map((reference) => (
                    <span key={reference} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      {reference}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">اختر سائقًا وفترة بها خطط لعرض تفاصيل التسوية.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <Button
            variant="outline"
            onClick={resetCreateSettlementForm}
            disabled={isCreating}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleCreateSettlement}
            disabled={
              isCreating ||
              settlementPreview.isLoading ||
              !selectedDriverId ||
              !periodStart ||
              !periodEnd ||
              settlementPreview.planCount === 0 ||
              settlementPreview.shipmentCount === 0 ||
              Boolean(settlementPreview.conflictMessage)
            }
            className="!bg-emerald-600 hover:!bg-emerald-700 disabled:!bg-emerald-300"
          >
            {isCreating ? "جار الحساب..." : "حساب وإنشاء"}
          </Button>
        </div>
      </Modal>

      {/* ── Settlement Detail Modal ── */}
      <Modal
        isOpen={settlementDetailOpen}
        onClose={() => { setSettlementDetailOpen(false); setSelectedSettlement(null); }}
        className="mx-4 max-w-2xl overflow-hidden"
      >
        {selectedSettlement && (
          <>
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    تفاصيل التسوية المالية
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedSettlement.driver_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge
                      label={SETTLEMENT_STATUS_LABELS[selectedSettlement.status]?.label ?? selectedSettlement.status}
                      tone={SETTLEMENT_STATUS_LABELS[selectedSettlement.status]?.tone ?? "yellow"}
                    />
                    <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-gray-700">
                      {formatDate(selectedSettlement.period_start)} → {formatDate(selectedSettlement.period_end)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Financial breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <span className="text-xs text-gray-500">إجمالي الخطط</span>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{formatMoney(selectedSettlement.cash_collected)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <span className="text-xs text-gray-500">قيمة التسوية</span>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{formatMoney(selectedSettlement.net_payable)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-brand-25 p-4 dark:bg-white/[0.02]/50">
                <span className="text-xs text-gray-500">إجمالي التسوية</span>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(selectedSettlement.net_payable)}</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">الخطط الداخلة في التسوية</span>
                  <span className="text-xs font-semibold text-gray-700">{selectedSettlement.plan_count ?? 0} خطة</span>
                </div>
                {(selectedSettlement.plan_references?.length ?? 0) > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedSettlement.plan_references?.map((reference) => (
                      <span key={reference} className="rounded-full bg-brand-25 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {reference}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">لا توجد خطط مطابقة للفترة الحالية.</p>
                )}
              </div>

              {selectedSettlement.journal_entry_id && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      تم الترحيل — قيد محاسبي مرتبط
                    </span>
                  </div>
                </div>
              )}

              {selectedSettlement.notes && (
                <div>
                  <span className="text-sm text-gray-500">ملاحظات</span>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedSettlement.notes}</p>
                </div>
              )}

              {selectedSettlement.approved_at && (
                <div className="text-xs text-gray-500">
                  اعتمد في {formatDateTime(selectedSettlement.approved_at)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => { setSettlementDetailOpen(false); setSelectedSettlement(null); }}
              >
                إغلاق
              </Button>
              {selectedSettlement.status === "draft" && (
                <Button
                  onClick={() => {
                    handleApproveSettlement(selectedSettlement.id);
                    setSettlementDetailOpen(false);
                    setSelectedSettlement(null);
                  }}
                  className="!bg-blue-600 hover:!bg-blue-700"
                >
                  <CheckCircleIcon className="h-4 w-4 ml-1" />
                  اعتماد
                </Button>
              )}
              {selectedSettlement.status === "approved" && (
                <Button
                  onClick={() => {
                    handlePostSettlement(selectedSettlement.id);
                    setSettlementDetailOpen(false);
                    setSelectedSettlement(null);
                  }}
                  className="!bg-emerald-600 hover:!bg-emerald-700"
                >
                  <PaperAirplaneIcon className="h-4 w-4 ml-1" />
                  ترحيل
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ── Plan Settlement Request Detail Modal ── */}
      <Modal
        isOpen={planSettlementDetailOpen}
        onClose={() => { setPlanSettlementDetailOpen(false); setSelectedPlanSettlement(null); setPlanSettlementNotes(""); }}
        className="mx-4 max-w-lg overflow-hidden"
      >
        {selectedPlanSettlement && (
          <>
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    تفاصيل طلب التسويه
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedPlanSettlement.driver_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge
                      label={selectedPlanSettlement.status === "pending" ? "قيد المراجعة" : selectedPlanSettlement.status === "approved" ? "معتمد" : selectedPlanSettlement.status === "paid" ? "مدفوع" : "مرفوض"}
                      tone={selectedPlanSettlement.status === "pending" ? "yellow" : selectedPlanSettlement.status === "approved" ? "blue" : selectedPlanSettlement.status === "paid" ? "green" : "red"}
                    />
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      {formatMoney(selectedPlanSettlement.total_debt_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">الخطة</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedPlanSettlement.plan_reference || selectedPlanSettlement.plan_id}</p>
                </div>
                <div>
                  <span className="text-gray-500">تاريخ الإنشاء</span>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPlanSettlement.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">المديونية</span>
                  <p className="mt-1 font-semibold text-red-600">{formatMoney(selectedPlanSettlement.total_debt_amount)}</p>
                </div>
                {selectedPlanSettlement.reviewed_at && (
                  <div>
                    <span className="text-gray-500">تاريخ المراجعة</span>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPlanSettlement.reviewed_at)}</p>
                  </div>
                )}
                {selectedPlanSettlement.paid_at && (
                  <div>
                    <span className="text-gray-500">تاريخ الدفع</span>
                    <p className="mt-1 font-medium text-green-600">{formatDateTime(selectedPlanSettlement.paid_at)}</p>
                  </div>
                )}
                {selectedPlanSettlement.driver_notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">ملاحظات السائق</span>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedPlanSettlement.driver_notes}</p>
                  </div>
                )}
                {selectedPlanSettlement.admin_notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">ملاحظات الإدارة</span>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedPlanSettlement.admin_notes}</p>
                  </div>
                )}
              </div>

              {selectedPlanSettlement.status === "pending" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">ملاحظات المراجعة</label>
                  <textarea
                    value={planSettlementNotes}
                    onChange={(e) => setPlanSettlementNotes(e.target.value)}
                    placeholder="أضف ملاحظات..."
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => { setPlanSettlementDetailOpen(false); setSelectedPlanSettlement(null); setPlanSettlementNotes(""); }}
              >
                إغلاق
              </Button>
              {selectedPlanSettlement.status === "pending" && (
                <>
                  <Button
                    onClick={() => handleReviewPlanSettlement(selectedPlanSettlement.id, "approved")}
                    className="!bg-blue-600 hover:!bg-blue-700"
                    disabled={isProcessing}
                  >
                    <CheckCircleIcon className="h-4 w-4 ml-1" />
                    اعتماد
                  </Button>
                  <Button
                    onClick={() => handleReviewPlanSettlement(selectedPlanSettlement.id, "rejected")}
                    className="!bg-red-600 hover:!bg-red-700"
                    disabled={isProcessing}
                  >
                    <XCircleIcon className="h-4 w-4 ml-1" />
                    رفض
                  </Button>
                </>
              )}
              {selectedPlanSettlement.status === "approved" && (
                <Button
                  onClick={() => {
                    handleMarkPlanSettlementPaid(selectedPlanSettlement.id);
                    setPlanSettlementDetailOpen(false);
                    setSelectedPlanSettlement(null);
                  }}
                  className="!bg-emerald-600 hover:!bg-emerald-700"
                  disabled={isProcessing}
                >
                  <BanknotesIcon className="h-4 w-4 ml-1" />
                  مدفوع
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
