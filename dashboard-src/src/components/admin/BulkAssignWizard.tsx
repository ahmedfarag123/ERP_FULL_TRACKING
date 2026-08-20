// BulkAssignWizard.tsx
// A 3-step wizard for bulk-assigning customers to sales reps.
//   Step 1 — Choose method: CSV upload OR filter by area/city
//   Step 2 — Preview & validate
//   Step 3 — Confirm & apply

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabase";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import CustomerAvatar from "../ui/CustomerAvatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface CustomerPreviewRow {
  id: string;
  customer_name: string;
  governorate: string | null;
  district: string | null;
  current_rep: string | null;
  target_rep_id: string | null;
  target_rep: string | null;
  valid: boolean;
  error?: string;
}

type WizardStep = 1 | 2 | 3;
type AssignMethod = "csv" | "area";

interface ParsedCsvRow {
  customer_id: string;
  customer_name: string;
  user_name: string;
  valid: boolean;
  error?: string;
  governorate?: string | null;
  district?: string | null;
  current_rep?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASSIGNABLE_CUSTOMER_ROLES = [
  "sales_agent",
  "telesales",
  "supervisor",
  "manager",
  "spv",
  "admin",
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  spv: "SPV",
  supervisor: "Supervisor",
  sales_agent: "Sales Agent",
  telesales: "Telesales",
};

const ROLE_SORT_ORDER = new Map<string, number>(ASSIGNABLE_CUSTOMER_ROLES.map((role, index) => [role, index]));

function normalizeLookupValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function profileDisplayName(profile: Profile) {
  const name = profile.full_name?.trim() || profile.email?.trim() || profile.id;
  const role = ROLE_LABELS[String(profile.role ?? "")] ?? String(profile.role ?? "User");
  return profile.email && profile.full_name
    ? `${name} - ${role} - ${profile.email}`
    : `${name} - ${role}`;
}

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Array<{ customer_id: string; customer_name: string; user_name: string }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^\ufeff/, ""));
  const cidIdx = header.findIndex((h) => h === "customer_id" || h === "id");
  const nameIdx = header.findIndex((h) => h === "customer_name" || h === "name");
  const userNameIdx = header.findIndex((h) => h === "user_name" || h === "assigned_user_name" || h === "assignee");
  if (cidIdx === -1 || userNameIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      customer_id: cols[cidIdx] ?? "",
      customer_name: nameIdx >= 0 ? cols[nameIdx] ?? "" : "",
      user_name: userNameIdx >= 0 ? cols[userNameIdx] ?? "" : "",
    };
  }).filter((r) => r.customer_id);
}

async function downloadTemplate() {
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, customer_name, assigned_user_id")
    .order("customer_name", { ascending: true })
    .range(0, 9999);

  if (customersError) throw customersError;

  const assignedIds = Array.from(
    new Set(
      (customers ?? [])
        .map((customer: { assigned_user_id: string | null }) => customer.assigned_user_id)
        .filter(Boolean),
    ),
  ) as string[];

  const profileMap = new Map<string, string>();
  if (assignedIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", assignedIds);
    if (profilesError) throw profilesError;
    (profiles ?? []).forEach((profile: { id: string; full_name: string | null; email: string | null }) => {
      profileMap.set(profile.id, profile.full_name?.trim() || profile.email?.trim() || profile.id);
    });
  }

  const rows = [
    ["customer_id", "customer_name", "user_name"],
    ...(customers ?? []).map((customer: { id: string; customer_name: string | null; assigned_user_id: string | null }) => [
      customer.id,
      customer.customer_name ?? "",
      customer.assigned_user_id ? profileMap.get(customer.assigned_user_id) ?? customer.assigned_user_id : "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk-assign-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkAssignWizard({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [method, setMethod] = useState<AssignMethod>("area");

  // Reps
  const [reps, setReps] = useState<Profile[]>([]);
  const [selectedRepId, setSelectedRepId] = useState("");
  const [repLoadError, setRepLoadError] = useState<string | null>(null);

  // Area method
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [selectedGovernorates, setSelectedGovernorates] = useState<string[]>([]);
  const [distinctDistricts, setDistinctDistricts] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  // CSV method
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 preview
  const [previewRows, setPreviewRows] = useState<CustomerPreviewRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Step 3 apply
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ updated: number; failed: number } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Load reps + governorates on open
  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      setRepLoadError(null);
      const [repsRes, govRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("role", [...ASSIGNABLE_CUSTOMER_ROLES])
          .eq("status", "active")
          .order("full_name"),
        supabase
          .from("customers")
          .select("governorate")
          .not("governorate", "is", null)
          .limit(1000),
      ]);
      if (repsRes.error) {
        setReps([]);
        setSelectedRepId("");
        setRepLoadError(repsRes.error.message);
      } else {
        const loadedReps = ((repsRes.data ?? []) as Profile[]).sort((left, right) => {
          const roleDiff =
            (ROLE_SORT_ORDER.get(String(left.role ?? "")) ?? 99) -
            (ROLE_SORT_ORDER.get(String(right.role ?? "")) ?? 99);
          if (roleDiff !== 0) return roleDiff;
          return profileDisplayName(left).localeCompare(profileDisplayName(right), "en", {
            sensitivity: "base",
          });
        });
        setReps(loadedReps);
        setSelectedRepId((current) =>
          loadedReps.some((rep) => rep.id === current) ? current : loadedReps[0]?.id ?? "",
        );
      }
      if (govRes.data) {
        const unique = [...new Set((govRes.data as { governorate: string | null }[]).map((r) => r.governorate).filter(Boolean))] as string[];
        setGovernorates(unique.sort());
      }
    })();
  }, [isOpen]);

  // Load districts when governorates change
  useEffect(() => {
    if (selectedGovernorates.length === 0) {
      setDistinctDistricts([]);
      setSelectedDistricts([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select("district")
        .in("governorate", selectedGovernorates)
        .not("district", "is", null)
        .limit(1000);
      if (data) {
        const unique = [...new Set((data as { district: string | null }[]).map((r) => r.district).filter(Boolean))] as string[];
        setDistinctDistricts(unique.sort());
      }
    })();
  }, [selectedGovernorates]);

  // Reset wizard state when closed
  const handleClose = useCallback(() => {
    setStep(1);
    setMethod("area");
    setSelectedRepId("");
    setRepLoadError(null);
    setSelectedGovernorates([]);
    setSelectedDistricts([]);
    setCsvRows([]);
    setCsvError(null);
    setTemplateError(null);
    setPreviewRows([]);
    setApplyResult(null);
    setApplyError(null);
    onClose();
  }, [onClose]);

  // ── Step 1 → 2: build preview list ──────────────────────────────────────
  const buildPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      let customerIds: string[] = [];

      if (method === "csv") {
        customerIds = Array.from(new Set(csvRows.map((r) => r.customer_id)));
      } else {
        // Area method
        let query = supabase
          .from("customers")
          .select("id, customer_name, governorate, district, assigned_user_id")
          .in("governorate", selectedGovernorates);
        if (selectedDistricts.length > 0) {
          query = query.in("district", selectedDistricts);
        }
        const { data, error } = await query.limit(2000);
        if (error) throw error;
        customerIds = (data ?? []).map((r: { id: string }) => r.id);
      }

      if (customerIds.length === 0) {
        setPreviewRows([]);
        setStep(2);
        setPreviewLoading(false);
        return;
      }

      // Fetch customers in batch
      const BATCH_SIZE = 50;
      const customerChunks: string[][] = [];
      for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
        customerChunks.push(customerIds.slice(i, i + BATCH_SIZE));
      }
      const customerResults = await Promise.all(
        customerChunks.map((chunk) =>
          supabase
            .from("customers")
            .select("id, customer_name, governorate, district, assigned_user_id")
            .in("id", chunk)
            .limit(2000),
        ),
      );
      for (const res of customerResults) {
        if (res.error) throw res.error;
      }
      const data = customerResults.flatMap((res) => res.data ?? []);

      const customerMap = new Map((data ?? []).map((customer: {
        id: string;
        customer_name: string;
        governorate: string | null;
        district: string | null;
        assigned_user_id: string | null;
      }) => [customer.id, customer]));

      // Fetch all assigned rep names
      const repIds = [...new Set((data ?? []).map((r: { assigned_user_id: string | null }) => r.assigned_user_id).filter(Boolean))] as string[];
      const repMap = new Map<string, string>();
      repMap.set("", "Unassigned");
      if (repIds.length > 0) {
        const { data: repData } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", repIds);
        (repData ?? []).forEach((r: Profile) => repMap.set(r.id, r.full_name ?? r.email ?? r.id));
      }

      const profileLookup = new Map<string, Profile[]>();
      const addProfileLookup = (key: string | null | undefined, profile: Profile) => {
        const normalized = normalizeLookupValue(key);
        if (!normalized) return;
        const existing = profileLookup.get(normalized) ?? [];
        existing.push(profile);
        profileLookup.set(normalized, existing);
      };
      reps.forEach((profile) => {
        addProfileLookup(profile.id, profile);
        addProfileLookup(profile.full_name, profile);
        addProfileLookup(profile.email, profile);
      });

      const resolveCsvAssignee = (rawUserName: string) => {
        const normalized = normalizeLookupValue(rawUserName);
        if (!normalized) {
          return { targetId: null, targetName: "Unassigned", error: undefined };
        }
        const matches = profileLookup.get(normalized) ?? [];
        if (matches.length === 1) {
          return { targetId: matches[0].id, targetName: profileDisplayName(matches[0]), error: undefined };
        }
        if (matches.length > 1) {
          return { targetId: null, targetName: rawUserName, error: "Ambiguous user_name. Use the user's email or id." };
        }
        return { targetId: null, targetName: rawUserName, error: "No active assignable user matches user_name." };
      };

      const selectedTargetRep = reps.find((rep) => rep.id === selectedRepId);
      const rows: CustomerPreviewRow[] =
        method === "csv"
          ? csvRows.map((csvRow) => {
              const customer = customerMap.get(csvRow.customer_id);
              const assignee = resolveCsvAssignee(csvRow.user_name);
              const error = customer ? assignee.error : "Customer id was not found.";
              return {
                id: csvRow.customer_id,
                customer_name: customer?.customer_name ?? csvRow.customer_name ?? csvRow.customer_id,
                governorate: customer?.governorate ?? null,
                district: customer?.district ?? null,
                current_rep: customer?.assigned_user_id
                  ? repMap.get(customer.assigned_user_id) ?? customer.assigned_user_id.slice(0, 8)
                  : null,
                target_rep_id: assignee.targetId,
                target_rep: assignee.targetName,
                valid: !error,
                error,
              };
            })
          : (data ?? []).map((r: {
              id: string;
              customer_name: string;
              governorate: string | null;
              district: string | null;
              assigned_user_id: string | null;
            }) => ({
              id: r.id,
              customer_name: r.customer_name,
              governorate: r.governorate,
              district: r.district,
              current_rep: r.assigned_user_id ? (repMap.get(r.assigned_user_id) ?? r.assigned_user_id.slice(0, 8)) : null,
              target_rep_id: selectedRepId,
              target_rep: selectedTargetRep ? profileDisplayName(selectedTargetRep) : null,
              valid: true,
            }));

      setPreviewRows(rows);
      setStep(2);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to fetch preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, [csvRows, method, reps, selectedDistricts, selectedGovernorates, selectedRepId]);

  // ── Step 2 → 3: apply assignment ─────────────────────────────────────────
  const applyAssignment = useCallback(async () => {
    if (previewRows.length === 0) return;
    if (method === "area" && !selectedRepId) return;
    const invalidRows = previewRows.filter((row) => !row.valid);
    if (invalidRows.length > 0) {
      setApplyError("Fix invalid CSV rows before applying the assignment.");
      return;
    }
    setApplying(true);
    setApplyError(null);
    setApplyResult(null);

    const CHUNK = 200;
    let updated = 0;
    let failed = 0;

    if (method === "csv") {
      const rowsByAssignee = new Map<string, CustomerPreviewRow[]>();
      previewRows.forEach((row) => {
        const key = row.target_rep_id ?? "";
        const existing = rowsByAssignee.get(key) ?? [];
        existing.push(row);
        rowsByAssignee.set(key, existing);
      });

      for (const [targetRepId, rows] of rowsByAssignee) {
        const ids = rows.map((row) => row.id);
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          const { error } = await supabase
            .from("customers")
            .update({ assigned_user_id: targetRepId || null, updated_at: new Date().toISOString() })
            .in("id", chunk);
          if (error) {
            failed += chunk.length;
          } else {
            updated += chunk.length;
          }
        }
      }
    } else {
      const ids = previewRows.map((row) => row.id);
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("customers")
          .update({ assigned_user_id: selectedRepId, updated_at: new Date().toISOString() })
          .in("id", chunk);
        if (error) {
          failed += chunk.length;
        } else {
          updated += chunk.length;
        }
      }
    }

    setApplyResult({ updated, failed });
    setApplying(false);
    if (failed === 0) onSuccess();
  }, [method, onSuccess, previewRows, selectedRepId]);

  // ── CSV file handler ──────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      setCsvError("Could not read assignment rows. Make sure the CSV has customer_id and user_name header columns.");
      setCsvRows([]);
      return;
    }
    if (parsed.length > 5000) {
      setCsvError("File has too many rows (max 5,000). Please split into smaller files.");
      setCsvRows([]);
      return;
    }

    // Mark all as valid initially — full validation happens in Step 2 via DB lookup
    setCsvRows(parsed.map((r) => ({ ...r, valid: true })));
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      setTemplateLoading(true);
      setTemplateError(null);
      await downloadTemplate();
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : "Failed to download the customer assignment template.");
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const selectedRep = reps.find((r) => r.id === selectedRepId);
  const invalidPreviewCount = previewRows.filter((row) => !row.valid).length;
  const step1Ready =
    method === "area" ? Boolean(selectedRepId && selectedGovernorates.length > 0) : csvRows.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="mx-4 max-w-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">إسناد جماعي</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            إسناد العملاء لممثل مبيعات
          </h2>
        </div>
        <button onClick={handleClose} className="mt-0.5 rounded-lg p-1.5 text-gray-400 hover:bg-brand-25/70 dark:hover:bg-white/[0.02]">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex gap-0 border-b border-gray-100 dark:border-gray-800">
        {(["١. اختيار", "٢. معاينة", "٣. تأكيد"] as const).map((label, idx) => {
          const stepNum = (idx + 1) as WizardStep;
          return (
            <div
              key={label}
              className={`flex-1 py-3 text-center text-xs font-semibold transition ${
                step === stepNum
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : step > stepNum
                  ? "text-emerald-600"
                  : "text-gray-400"
              }`}
            >
              {step > stepNum ? "✓ " : ""}{label}
            </div>
          );
        })}
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Target rep */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                إسناد إلى ممثل مبيعات <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                disabled={Boolean(repLoadError) || reps.length === 0}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="">اختر ممثل مبيعات...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {profileDisplayName(rep)}
                  </option>
                ))}
              </select>
              {repLoadError ? (
                <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {repLoadError}
                </p>
              ) : reps.length === 0 ? (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  No active assignable users were found.
                </p>
              ) : null}
            </div>

            {/* Method selector */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                طريقة الاختيار
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod("area")}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-right transition ${
                    method === "area"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/10">
                    <MapPinIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">حسب المنطقة</p>
                    <p className="text-xs text-gray-500">تصفية حسب المحافظة والمنطقة</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("csv")}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-right transition ${
                    method === "csv"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10">
                    <ArrowUpTrayIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">رفع CSV</p>
                    <p className="text-xs text-gray-500">ارفع قائمة بمعرفات العملاء</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Area selector */}
            {method === "area" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                    {governorates.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400">لا توجد محافظات مسجلة</p>
                    ) : (
                      governorates.map((gov) => (
                        <label key={gov} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                          <input
                            type="checkbox"
                            checked={selectedGovernorates.includes(gov)}
                            onChange={(e) =>
                              setSelectedGovernorates((prev) =>
                                e.target.checked ? [...prev, gov] : prev.filter((g) => g !== gov)
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{gov}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {distinctDistricts.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      المنطقة <span className="text-gray-400 font-normal">(اختياري، اتركه فارغا لتضمين الكل)</span>
                    </label>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                      {distinctDistricts.map((dist) => (
                        <label key={dist} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-25 dark:hover:bg-white/[0.02]">
                          <input
                            type="checkbox"
                            checked={selectedDistricts.includes(dist)}
                            onChange={(e) =>
                              setSelectedDistricts((prev) =>
                                e.target.checked ? [...prev, dist] : prev.filter((d) => d !== dist)
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{dist}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CSV upload */}
            {method === "csv" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    رفع ملف CSV <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleDownloadTemplate()}
                    disabled={templateLoading}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {templateLoading ? "Downloading..." : "تنزيل القالب"}
                  </button>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition ${
                    csvRows.length > 0
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-500/5"
                  }`}
                >
                  <ArrowUpTrayIcon className={`h-8 w-8 ${csvRows.length > 0 ? "text-emerald-500" : "text-gray-400"}`} />
                  {csvRows.length > 0 ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-600">تم تحميل {csvRows.length.toLocaleString("ar-EG")} معرف عميل</p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">اضغط لرفع ملف CSV</p>
                      <p className="text-xs text-gray-400">Required columns: <code className="font-mono">customer_id, user_name</code></p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                {csvError && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {csvError}
                  </p>
                )}
                {templateError && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {templateError}
                  </p>
                )}
              </div>
            )}

            {previewError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {previewError}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {method === "csv" ? (
                  <>
                    سيتم تحديث إسناد <span className="font-semibold text-gray-900 dark:text-white">{previewRows.length.toLocaleString("ar-EG")}</span> عميل من ملف CSV
                  </>
                ) : (
                  <>
                    سيتم إسناد <span className="font-semibold text-gray-900 dark:text-white">{previewRows.length.toLocaleString("ar-EG")}</span> عميل إلى{" "}
                    <span className="font-semibold text-blue-600">{selectedRep ? profileDisplayName(selectedRep) : "—"}</span>
                  </>
                )}
              </p>
              {invalidPreviewCount > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {invalidPreviewCount.toLocaleString("ar-EG")} invalid rows
                </span>
              )}
              {previewRows.length > 0 && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  سيتم استبدال الممثل الحالي
                </span>
              )}
            </div>

            {previewRows.length === 0 ? (
              <div className="py-10 text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">لا يوجد عملاء مطابقون للمعايير المحددة.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="min-w-full text-right text-sm" dir="rtl">
                  <thead className="bg-brand-25 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-white/[0.04]">
                    <tr>
                      {["العميل", "المنطقة", "الممثل الحالي", "الممثل الجديد", "الحالة"].map((h) => (
                        <th key={h} className="px-4 py-3 text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 100).map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-brand-25/80 dark:border-gray-800 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CustomerAvatar name={row.customer_name} size="xs" />
                            <span className="font-medium text-gray-900 dark:text-white" dir="auto">{row.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400" dir="auto">
                          {[row.governorate, row.district].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.current_rep ? (
                            <span className="text-gray-600 dark:text-gray-400">{row.current_rep}</span>
                          ) : (
                            <span className="rounded-full bg-brand-25 px-2 py-0.5 text-xs text-gray-400 dark:bg-white/[0.02]">غير مسند</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.target_rep ? (
                            <span className="text-gray-600 dark:text-gray-400">{row.target_rep}</span>
                          ) : (
                            <span className="rounded-full bg-brand-25 px-2 py-0.5 text-xs text-gray-400 dark:bg-white/[0.02]">غير مسند</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.valid ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              Ready
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 100 && (
                  <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400 dark:border-gray-800">
                    يتم عرض أول ١٠٠ من {previewRows.length.toLocaleString("ar-EG")} عميل. سيتم تحديث كل {previewRows.length.toLocaleString("ar-EG")}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {applyResult ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                {applyResult.failed === 0 ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircleIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">اكتمل الإسناد</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {method === "csv" ? (
                          <>تم تحديث إسناد {applyResult.updated.toLocaleString("ar-EG")} عميل من ملف CSV</>
                        ) : (
                          <>
                            تم إسناد {applyResult.updated.toLocaleString("ar-EG")} عميل إلى{" "}
                            <strong>{selectedRep ? profileDisplayName(selectedRep) : ""}</strong>
                          </>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <ExclamationTriangleIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">نجاح جزئي</p>
                      <p className="mt-1 text-sm text-gray-500">
                        تم إسناد {applyResult.updated.toLocaleString("ar-EG")} · فشل {applyResult.failed.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">أنت على وشك إعادة إسناد {previewRows.length.toLocaleString("ar-EG")} عميل</p>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      {method === "csv" ? (
                        <>سيتم تحديث ممثل المبيعات لكل عميل حسب قيمة user_name في ملف CSV. سيستبدل ذلك أي إسناد سابق.</>
                      ) : (
                        <>
                          سيتم تغيير ممثل المبيعات لكل العملاء المحددين إلى{" "}
                          <strong>{selectedRep ? profileDisplayName(selectedRep) : ""}</strong>. سيستبدل ذلك أي إسناد سابق.
                        </>
                      )}
                      يمكن عكس هذا الإجراء بتشغيل إسناد جماعي آخر.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {applyError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10">
                {applyError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          {step > 1 && !applyResult && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as WizardStep)} disabled={applying || previewLoading}>
              رجوع
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} disabled={applying}>
            {applyResult ? "إغلاق" : "إلغاء"}
          </Button>

          {step === 1 && (
            <Button
              onClick={() => void buildPreview()}
              disabled={!step1Ready || previewLoading}
            >
              {previewLoading ? "جار التحميل..." : "معاينة ←"}
            </Button>
          )}

          {step === 2 && !applyResult && (
            <Button
              onClick={() => setStep(3)}
              disabled={previewRows.length === 0 || invalidPreviewCount > 0}
            >
              متابعة ←
            </Button>
          )}

          {step === 3 && !applyResult && (
            <Button
              onClick={() => void applyAssignment()}
              disabled={applying}
              className="!bg-blue-600 hover:!bg-blue-700"
            >
              {applying ? `جار إسناد ${previewRows.length.toLocaleString("ar-EG")}...` : `إسناد ${previewRows.length.toLocaleString("ar-EG")} عميل`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
