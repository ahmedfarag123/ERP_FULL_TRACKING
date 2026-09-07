import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import { KNOWN_BRANDS, KNOWN_PRODUCTS } from "../../../data/coding-known";
import {
  AdminPageFrame,
  AdminSection,
  AdminTableSkeleton,
  AdminField,
  AdminMetricGrid,
  AdminMetricCard,
  AdminEmptyState,
} from "../../../components/admin/AdminPageElements";
import Alert from "../../../components/ui/alert/Alert";
import {
  fetchCodingTree,
  fetchAllCodedProducts,
  fetchProductBrands,
  upsertCodingProduct,
  deleteCodingProduct,
  applyCodingBatch,
  addProductBrand,
  addMainCategory,
  addSubCategory,
  buildProductName,
  parseProductName,
  normalizeArName,
  suggestCounterpart,
  buildEnglishName,
  translateViaGoogle,
  englishSizeUnit,
  validateProductContent,
  SIZE_UNITS,
  computeNextCode,
  getCodePrefix,
  type CodingTreeRow,
  type ProductCodingRow,
  type ProductBrand,
  type UpsertCodingInput,
} from "../../../lib/product-coding";
import * as XLSX from "xlsx";

type TabId = "products" | "entry" | "tree" | "import";

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<string, string> = {
  valid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
};

type ExtraState = {
  barcode: string;
  hs_code: string;
  product_type: string;
  track_method: string;
  is_storable: boolean;
  sale_ok: boolean;
  purchase_ok: boolean;
  weight: string;
  volume: string;
  uom_sale: string;
  uom_purchase: string;
  country_of_origin: string;
  use_expiration: boolean;
  expiry_days: string;
  best_before_days: string;
  tags: string;
  taxes_sale: string;
  taxes_purchase: string;
  note: string;
  description_sale: string;
  description_purchase: string;
  sale_delay: string;
  purchase_method: string;
  invoice_policy: string;
  alert_time: string;
  removal_time: string;
  reordering_min_qty: string;
  reordering_max_qty: string;
  warehouse: string;
  location: string;
};

const EMPTY_EXTRA: ExtraState = {
  barcode: "",
  hs_code: "",
  product_type: "",
  track_method: "",
  is_storable: false,
  sale_ok: true,
  purchase_ok: true,
  weight: "",
  volume: "",
  uom_sale: "",
  uom_purchase: "",
  country_of_origin: "",
  use_expiration: false,
  expiry_days: "",
  best_before_days: "",
  tags: "",
  taxes_sale: "",
  taxes_purchase: "",
  note: "",
  description_sale: "",
  description_purchase: "",
  sale_delay: "",
  purchase_method: "",
  invoice_policy: "",
  alert_time: "",
  removal_time: "",
  reordering_min_qty: "",
  reordering_max_qty: "",
  warehouse: "",
  location: "",
};

type ExtraFieldDef = {
  key: keyof ExtraState;
  label: string;
  kind: "text" | "number" | "bool" | "select" | "textarea";
  options?: { value: string; label: string }[];
  dir?: "ltr";
  helper?: string;
  readonly?: boolean;
};

const UOM_OPTIONS = [
  { value: "unit", label: "وحدة (unit)" },
  { value: "kg", label: "كجم (kg)" },
  { value: "g", label: "جرام (g)" },
  { value: "L", label: "لتر (L)" },
  { value: "ml", label: "مل (ml)" },
  { value: "box", label: "كارتون (box)" },
  { value: "pack", label: "عبوة (pack)" },
  { value: "pcs", label: "قطعة (pcs)" },
  { value: "ton", label: "طن (ton)" },
];

const EXTRA_GROUP_DEFS: { title: string; readonly?: boolean; fields: ExtraFieldDef[] }[] = [
  {
    title: "المبيعات والشراء",
    fields: [
      { key: "sale_ok", label: "متاح للبيع", kind: "bool" },
      { key: "purchase_ok", label: "متاح للشراء", kind: "bool" },
      { key: "uom_sale", label: "وحدة البيع", kind: "select", options: UOM_OPTIONS },
      { key: "uom_purchase", label: "وحدة الشراء", kind: "select", options: UOM_OPTIONS },
      { key: "taxes_sale", label: "ضرائب البيع", kind: "text", dir: "ltr", helper: "أكواد مفصولة بفواصل" },
      { key: "taxes_purchase", label: "ضرائب الشراء", kind: "text", dir: "ltr" },
      {
        key: "sale_delay", label: "مهلة التسليم (أيام)", kind: "number", dir: "ltr", readonly: true,
      },
      {
        key: "purchase_method", label: "طريقة الشراء", kind: "select", readonly: true, options: [
          { value: "purchase", label: "شراء / تصنيع" },
          { value: "receive", label: "استلام فقط (Receive in Advance)" },
        ],
      },
      {
        key: "invoice_policy", label: "سياسة الفوترة", kind: "select", readonly: true, options: [
          { value: "order", label: "عند الطلب (Order)" },
          { value: "delivery", label: "عند التسليم (Delivery)" },
        ],
      },
    ],
  },
  {
    title: "المخزون والصلاحية",
    readonly: true,
    fields: [
      { key: "is_storable", label: "منتج مخزني", kind: "bool", readonly: true },
      { key: "use_expiration", label: "تفعيل تاريخ الانتهاء", kind: "bool", readonly: true },
      { key: "weight", label: "الوزن (كجم)", kind: "number", dir: "ltr", readonly: true },
      { key: "volume", label: "الحجم (م³)", kind: "number", dir: "ltr", readonly: true },
      { key: "expiry_days", label: "أيام حتى الانتهاء (Expiry)", kind: "number", dir: "ltr", readonly: true },
      { key: "best_before_days", label: "أيام أفضل قبل (Best Before)", kind: "number", dir: "ltr", readonly: true },
      { key: "alert_time", label: "مهلة التنبيه قبل الانتهاء (أيام)", kind: "number", dir: "ltr", readonly: true },
      { key: "removal_time", label: "مهلة الإزالة بعد الانتهاء (أيام)", kind: "number", dir: "ltr", readonly: true },
      { key: "reordering_min_qty", label: "كمية إعادة الطلب (حد أدنى)", kind: "number", dir: "ltr", readonly: true },
      { key: "reordering_max_qty", label: "كمية إعادة الطلب (حد أقصى)", kind: "number", dir: "ltr", readonly: true },
    ],
  },
  {
    title: "الأوصاف والملاحظات",
    readonly: true,
    fields: [
      { key: "note", label: "ملاحظات عامة", kind: "textarea", readonly: true },
      { key: "description_sale", label: "وصف البيع", kind: "textarea", readonly: true },
      { key: "description_purchase", label: "وصف الشراء", kind: "textarea", readonly: true },
    ],
  },
];

function CollapsibleGroup(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={props.onToggle}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-brand-25 dark:text-gray-100 dark:hover:bg-gray-800 ${props.open ? "border-b border-gray-200 dark:border-gray-700" : ""}`}
      >
        <span>{props.title}</span>
        {props.open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {props.open ? (
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">{props.children}</div>
      ) : null}
    </div>
  );
}

export default function ProductCodingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("products");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [editing, setEditing] = useState<ProductCodingRow | null>(null);

  const { data: tree = [], isLoading: treeLoading } = useQuery({
    queryKey: ["coding", "tree"],
    queryFn: fetchCodingTree,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["coding", "products"],
    queryFn: fetchAllCodedProducts,
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["coding", "brands"],
    queryFn: fetchProductBrands,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["coding", "products"] });
    queryClient.invalidateQueries({ queryKey: ["coding", "tree"] });
    queryClient.invalidateQueries({ queryKey: ["coding", "brands"] });
  };

  const upsertMutation = useMutation({
    mutationFn: upsertCodingProduct,
    onSuccess: (code) => {
      invalidate();
      setEditing(null);
      setStatusMessage({
        variant: "success",
        title: "تم الحفظ",
        message: `تم حفظ التكويد بنجاح (${code})`,
      });
    },
    onError: (e) => {
      setStatusMessage({
        variant: "error",
        title: "فشل الحفظ",
        message: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCodingProduct,
    onSuccess: () => {
      invalidate();
      setStatusMessage({ variant: "success", title: "تم الحذف", message: "تم حذف التكويد بنجاح" });
    },
    onError: (e) => {
      setStatusMessage({
        variant: "error",
        title: "فشل الحذف",
        message: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const batchMutation = useMutation({
    mutationFn: applyCodingBatch,
    onSuccess: (result) => {
      invalidate();
      const applied = result.applied ?? 0;
      const errCount = (result.errors ?? []).length;
      setStatusMessage({
        variant: errCount > 0 ? "warning" : "success",
        title: "نتيجة الاستيراد",
        message: `تم تطبيق ${applied} صف${
          errCount > 0 ? `، بها ${errCount} سطر مرفوض` : ""
        }`,
      });
    },
    onError: (e) => {
      setStatusMessage({
        variant: "error",
        title: "فشل الاستيراد",
        message: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return products;
    const like = q.toLowerCase();
    return products.filter((p) =>
      [p.new_code, p.old_code ?? "", p.barcode ?? "", p.hs_code ?? "", p.tags ?? "", p.original_name, p.normalized_name, p.english_name, p.main_category, p.sub_category, p.external_product_id ?? ""]
        .some((v) => v.toLowerCase().includes(like))
    );
  }, [products, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const duplicateCodes = useMemo(() => {
    const set = new Set<string>();
    const seen = new Map<string, string>();
    for (const p of products) {
      const n = p.normalized_name?.trim();
      if (!n) continue;
      if (seen.has(n)) {
        set.add(seen.get(n)!);
        set.add(p.new_code);
      } else {
        seen.set(n, p.new_code);
      }
    }
    return set;
  }, [products]);

  const counts = useMemo(() => {
    let warnings = 0;
    let inactive = 0;
    for (const p of products) {
      if (p.validation_status === "warning") warnings++;
      if (!p.is_active) inactive++;
    }
    return {
      total: products.length,
      warnings,
      inactive,
      dupCodePairs: Math.round(duplicateCodes.size / 2),
    };
  }, [products, duplicateCodes]);

  const grouped = useMemo(() => {
    const map = new Map<string, CodingTreeRow[]>();
    for (const t of tree) {
      const arr = map.get(t.main_category) ?? [];
      arr.push(t);
      map.set(t.main_category, arr);
    }
    return [...map.entries()].sort(
      (a, b) =>
        (a[1][0]?.dept_digit ?? Number.MAX_SAFE_INTEGER) -
        (b[1][0]?.dept_digit ?? Number.MAX_SAFE_INTEGER)
    );
  }, [tree]);

  const subOptions = useMemo(() => {
    const map = new Map<string, CodingTreeRow[]>();
    for (const t of tree) {
      const arr = map.get(t.main_category) ?? [];
      arr.push(t);
      map.set(t.main_category, arr);
    }
    return map;
  }, [tree]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "products", label: "المنتجات المكودة" },
    { id: "entry", label: "إضافة / تعديل" },
    { id: "tree", label: "شجرة التكويد" },
    { id: "import", label: "استيراد ملف" },
  ];

  const productCountByPrefix = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const prefix = p.new_code.slice(0, 3);
      map.set(prefix, (map.get(prefix) ?? 0) + 1);
    }
    return map;
  }, [products]);

  return (
    <>
      <PageMeta title="التكويد — تكويد المنتجات" description="نظام التكويد الموحد للمنتجات" />
      <AdminPageFrame>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">التكويد</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              تكويد منتجات Horeca Smart وفق شجرة التكويد الموحدة
            </p>
          </div>
        </div>

        {statusMessage ? (
          <Alert
            variant={statusMessage.variant}
            title={statusMessage.title}
            message={statusMessage.message}
          />
        ) : null}

        <AdminMetricGrid>
          <AdminMetricCard label="إجمالي المنتجات" value={counts.total.toLocaleString("ar-EG")} helper="منتجات مكودة" />
          <AdminMetricCard label="أقسام رئيسية" value={grouped.length.toLocaleString("ar-EG")} tone="violet" />
          <AdminMetricCard
            label="تحذيرات"
            value={counts.warnings.toLocaleString("ar-EG")}
            helper="كود قديم مكرر أو ملاحظات"
            tone="amber"
          />
          <AdminMetricCard
            label="صفوف مكررة"
            value={counts.dupCodePairs.toLocaleString("ar-EG")}
            helper="نفس الاسم الموحد في أكثر من كود — تُعرض بعلامة «مكرر» في الجدول"
            tone="amber"
          />
          <AdminMetricCard label="غير نشط" value={counts.inactive.toLocaleString("ar-EG")} tone="rose" />
        </AdminMetricGrid>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusMessage(null);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <ProductsTab
            search={search}
            setSearch={setSearch}
            pageRows={pageRows}
            page={page}
            pageCount={pageCount}
            setPage={setPage}
            total={filtered.length}
            loading={productsLoading}
            duplicateCodes={duplicateCodes}
            onEdit={(code) => {
              const product = products.find((p) => p.new_code === code) ?? null;
              setEditing(product);
              setActiveTab("entry");
            }}
            onDelete={(code) => {
              if (window.confirm(`حذف تكويد المنتج ${code}؟`)) {
                deleteMutation.mutate(code);
              }
            }}
          />
        )}

        {activeTab === "entry" && (
          <EntryTab
            tree={tree}
            subOptions={subOptions}
            products={products}
            brands={brands}
            editing={editing}
            loading={upsertMutation.isPending}
            onSaved={() => setEditing(null)}
            onSubmit={(input) => upsertMutation.mutate(input)}
          />
        )}

        {activeTab === "tree" && (
          <TreeTab
            grouped={grouped}
            productCounts={productCountByPrefix}
            nextCodes={products}
            tree={tree}
            loading={treeLoading}
          />
        )}

        {activeTab === "import" && (
          <ImportTab
            tree={tree}
            subOptions={subOptions}
            existing={products}
            loading={batchMutation.isPending}
            onSubmit={(rows) => {
              setPage(0);
              batchMutation.mutate(rows);
            }}
          />
        )}
      </AdminPageFrame>
    </>
  );
}

function Badge({ status, notes }: { status: string; notes?: string }) {
  const text = status === "valid" ? "سليم" : status === "warning" ? "تحذير" : status;
  const showNote = status !== "valid" && notes;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[status] ?? STATUS_BADGE.valid}`}>
      {text}
      {showNote && (
        <span className="group relative ml-1.5 inline-flex items-center">
          <span className="ml-1 cursor-help">?</span>
          <span className="pointer-events-none absolute right-full top-1/2 z-30 mr-2 w-48 -translate-y-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-normal leading-relaxed text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" dir="rtl">
            {notes}
          </span>
        </span>
      )}
    </span>
  );
}

function ProductsTab(props: {
  search: string;
  setSearch: (v: string) => void;
  pageRows: ProductCodingRow[];
  page: number;
  pageCount: number;
  setPage: (v: number) => void;
  total: number;
  loading: boolean;
  duplicateCodes: Set<string>;
  onEdit: (code: string) => void;
  onDelete: (code: string) => void;
}) {
  return (
    <AdminSection
      title="المنتجات المكودة"
      description={`عدد النتائج: ${props.total}`}
      actions={
        <input
          value={props.search}
          onChange={(e) => {
            props.setSearch(e.target.value);
            props.setPage(0);
          }}
          placeholder="بحث بالاسم أو الكود..."
          className="w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-right text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold">الكود الجديد</th>
              <th className="px-4 py-3 font-semibold">الكود القديم</th>
              <th className="px-4 py-3 font-semibold">الاسم الأصلي</th>
              <th className="px-4 py-3 font-semibold">الاسم الموحد</th>
              <th className="px-4 py-3 font-semibold">القسم / الفرع</th>
              <th className="px-4 py-3 font-semibold">السعر</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={8}>
                  <AdminTableSkeleton columns={8} rows={6} />
                </td>
              </tr>
            ) : props.pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10">
                  <AdminEmptyState
                    title="لا توجد نتائج"
                    description="جرب تعديل البحث أو أضف تكويد جديد من تبويب إضافة / تعديل"
                  />
                </td>
              </tr>
            ) : (
props.pageRows.map((p) => {
              const isDup = props.duplicateCodes.has(p.new_code);
              return (
                <tr key={p.new_code} className={`border-b border-gray-100 hover:bg-brand-25 dark:border-gray-800 ${isDup ? "bg-amber-50/70 dark:bg-amber-500/5" : ""}`}>
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-white" dir="ltr">{p.new_code}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400" dir="ltr">{p.old_code ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{p.original_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.normalized_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {p.main_category} / {p.sub_category}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-white" dir="ltr">
                    {Number(p.sale_price).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isDup ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40">
                          مكرر
                        </span>
                      ) : null}
                      <Badge status={p.validation_status} notes={p.validation_notes} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => props.onEdit(p.new_code)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => props.onDelete(p.new_code)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          صفحة {props.page + 1} من {props.pageCount}
        </span>
        <div className="flex gap-2">
          <button
            disabled={props.page === 0}
            onClick={() => props.setPage(props.page - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-brand-25 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            السابق
          </button>
          <button
            disabled={props.page >= props.pageCount - 1}
            onClick={() => props.setPage(props.page + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-brand-25 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            التالي
          </button>
        </div>
      </div>
    </AdminSection>
  );
}

function EntryTab(props: {
  tree: CodingTreeRow[];
  subOptions: Map<string, CodingTreeRow[]>;
  products: ProductCodingRow[];
  brands: ProductBrand[];
  editing: ProductCodingRow | null;
  loading: boolean;
  onSaved: () => void;
  onSubmit: (input: UpsertCodingInput) => void;
}) {
  const queryClient = useQueryClient();
  const [main, setMain] = useState("");
  const [sub, setSub] = useState("");
  const [manualCode, setManualCode] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [externalId, setExternalId] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [cost, setCost] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [extra, setExtra] = useState<ExtraState>(EMPTY_EXTRA);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
  });

  const setField = (key: keyof ExtraState, value: string | boolean) =>
    setExtra((prev) => ({ ...prev, [key]: value }));

  const [brandQuery, setBrandQuery] = useState("");
  const [brandSelected, setBrandSelected] = useState<ProductBrand | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [product, setProduct] = useState("");
  const [sizeAmount, setSizeAmount] = useState("");
  const [sizeUnit, setSizeUnit] = useState("");
  const [packQty, setPackQty] = useState("");

  const selectedTree = props.tree.find((t) => t.main_category === main && t.sub_category === sub) ?? null;
  const autoCode = selectedTree ? computeNextCode(selectedTree, props.products) : "";
  const effectiveCode = manualCode && newCode ? newCode : autoCode;

  const parts = {
    brand: brandSelected?.name ?? brandQuery.trim(),
    product,
    size_amount: sizeAmount,
    size_unit: sizeUnit,
    pack_qty: packQty,
  };
  const built = buildProductName(parts);
  const builtClean = useMemo(() => {
    const check = validateProductContent(product);
    if (!check.valid) return built;
    return buildProductName({ ...parts, product: check.cleaned ?? product });
  }, [built, parts, product]);
  const productValidation = useMemo<Awaited<ReturnType<typeof validateProductContent>>>(() => {
    if (!product.trim()) return { valid: true, reason: undefined, cleaned: product.trim() };
    return validateProductContent(product);
  }, [product]);
  const hasContent = product.trim().length > 0 || sizeAmount.trim().length > 0;
  const suggested = useMemo(() => {
    const brandName = brandSelected?.name ?? brandQuery.trim();
    if (!brandName && !product.trim()) return null;
    return suggestCounterpart(brandName, product.trim(), sizeAmount, sizeUnit, packQty);
  }, [brandSelected, brandQuery, product, sizeAmount, sizeUnit, packQty]);
  const englishSuggestion = useMemo(() => {
    if (!suggested) return "";
    const brandEn = brandSelected?.name_en || suggested.brand || "";
    return buildEnglishName({
      brand: brandEn,
      product: suggested.product,
      size_amount: sizeAmount,
      size_unit: suggested.size_unit,
      pack_qty: packQty,
    });
  }, [suggested, brandSelected, sizeAmount, packQty]);
  const englishIsSuggestion = useMemo(() => {
    if (!englishSuggestion || !englishName) return false;
    return englishSuggestion === englishName.trim();
  }, [englishName, englishSuggestion]);
  const productNotKnown = useMemo(() => {
    if (!product.trim()) return false;
    return suggested ? !suggested.product_known : false;
  }, [product, suggested]);

  const [liveTranslated, setLiveTranslated] = useState<string | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  useEffect(() => {
    const brandName = brandSelected?.name ?? brandQuery.trim();
    const needTranslate =
      (!!brandName && !KNOWN_BRANDS[brandName]) ||
      (!!product.trim() && !KNOWN_PRODUCTS[product.trim()]) ||
      false;
    if (!needTranslate) {
      setLiveTranslated(null);
      setTranslationLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setTranslationLoading(true);
      translateViaGoogle({
        brand: brandName,
        product: product.trim(),
        fromScript: "arabic",
      }).then((res) => {
        if (cancelled) return;
        setTranslationLoading(false);
        if (res && (res.brand || res.product)) {
          const brandFallback = brandSelected?.name_en || res.brand || "";
          setLiveTranslated(
            buildEnglishName({
              brand: brandFallback,
              product: res.product || "",
              size_amount: sizeAmount,
              size_unit: englishSizeUnit(sizeUnit),
              pack_qty: packQty,
            })
          );
        } else {
          setLiveTranslated(null);
        }
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [brandSelected, brandQuery, product, sizeAmount, sizeUnit, packQty]);

  const effectiveSuggestion = liveTranslated || englishSuggestion;
  const effectiveMatches = !!liveTranslated
    ? liveTranslated === englishName.trim()
    : englishIsSuggestion;

  const brandMatches = useMemo(() => {
    const q = brandQuery.trim();
    if (!q) return props.brands;
    const nq = normalizeArName(q);
    return props.brands.filter((b) => b.name.includes(q) || b.name_normalized.includes(nq));
  }, [props.brands, brandQuery]);
  const brandIsExact = brandSelected ?? props.brands.find((b) => b.name_normalized === normalizeArName(brandQuery.trim()));

  const addBrandMutation = useMutation({
    mutationFn: (name: string) => addProductBrand(name),
    onSuccess: (b) => {
      setBrandSelected(b);
      setBrandQuery(b.name);
      setBrandOpen(false);
      queryClient.invalidateQueries({ queryKey: ["coding", "brands"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "فشل إضافة البراند"),
  });

  const reset = () => {
    setMain("");
    setSub("");
    setManualCode(false);
    setNewCode("");
    setOldCode("");
    setExternalId("");
    setEnglishName("");
    setSalePrice("");
    setCost("");
    setIsActive(true);
    setError(null);
    setHydratedFor(null);
    setBrandOpen(false);
    setBrandSelected(null);
    setBrandQuery("");
    setProduct("");
    setSizeAmount("");
    setSizeUnit("");
    setPackQty("");
    setLiveTranslated(null);
    setTranslationLoading(false);
    setExtra(EMPTY_EXTRA);
  };

  if (props.editing && hydratedFor !== props.editing.new_code) {
    const e = props.editing;
    const parsed = parseProductName(e.normalized_name || e.original_name, props.brands);
    const b =
      (e.brand_normalized ? props.brands.find((x) => x.name_normalized === e.brand_normalized) : undefined) ??
      (e.brand ? props.brands.find((x) => x.name === e.brand) : undefined);
    const brandName = b?.name ?? parsed.brand ?? e.brand ?? "";
    const fallbackBrand: ProductBrand | null = brandName
      ? {
          id: "",
          name: brandName,
          name_normalized: normalizeArName(brandName),
          name_en: "",
          sort_order: 0,
          created_by: null,
          created_at: "",
        }
      : null;
    setMain(e.main_category);
    setSub(e.sub_category ?? "");
    setBrandSelected(b ?? fallbackBrand);
    setBrandQuery(brandName);
    setProduct(parsed.product);
    setSizeAmount(parsed.size_amount);
    setSizeUnit(parsed.size_unit);
    setPackQty(parsed.pack_qty);
    setEnglishName(e.english_name ?? "");
    setOldCode(e.old_code ?? "");
    setExternalId(e.external_product_id ?? "");
    setSalePrice(e.sale_price ? String(e.sale_price) : "");
    setCost(e.cost ? String(e.cost) : "");
    setIsActive(e.is_active);
    setManualCode(true);
    setNewCode(e.new_code);
    setError(null);
    setHydratedFor(e.new_code);
    setExtra({
      barcode: e.barcode ?? "",
      hs_code: e.hs_code ?? "",
      product_type: e.product_type ?? "",
      track_method: e.track_method ?? "",
      is_storable: e.is_storable ?? false,
      sale_ok: e.sale_ok ?? true,
      purchase_ok: e.purchase_ok ?? true,
      weight: e.weight != null ? String(e.weight) : "",
      volume: e.volume != null ? String(e.volume) : "",
      uom_sale: e.uom_sale ?? "",
      uom_purchase: e.uom_purchase ?? "",
      country_of_origin: e.country_of_origin ?? "",
      use_expiration: e.use_expiration ?? false,
      expiry_days: e.expiry_days != null ? String(e.expiry_days) : "",
      best_before_days: e.best_before_days != null ? String(e.best_before_days) : "",
      tags: e.tags ?? "",
      taxes_sale: e.taxes_sale ?? "",
      taxes_purchase: e.taxes_purchase ?? "",
      note: e.note ?? "",
      description_sale: e.description_sale ?? "",
      description_purchase: e.description_purchase ?? "",
      sale_delay: e.sale_delay != null ? String(e.sale_delay) : "",
      purchase_method: e.purchase_method ?? "",
      invoice_policy: e.invoice_policy ?? "",
      alert_time: e.alert_time != null ? String(e.alert_time) : "",
      removal_time: e.removal_time != null ? String(e.removal_time) : "",
      reordering_min_qty: e.reordering_min_qty != null ? String(e.reordering_min_qty) : "",
      reordering_max_qty: e.reordering_max_qty != null ? String(e.reordering_max_qty) : "",
      warehouse: e.warehouse ?? "",
      location: e.location ?? "",
    });
  }

  const handleSubmit = () => {
    setError(null);
    const brandName = (brandSelected?.name ?? brandQuery.trim()).trim();
    if (!brandName) return setError("البراند مطلوب — اختر من القائمة أو اكتب اسمًا ثم اضغط «إضافة براند جديد»");
    if (!main) return setError("اختر القسم الرئيسي");
    if (!sub) return setError("اختر الفرع");
    if (!selectedTree) return setError("القسم/الفرع غير موجود في الشجرة");
    if (!product.trim() && !sizeAmount.trim()) return setError("أدخل اسم المنتج أو المحتوى بعد البراند");

    const contentCheck = productValidation;
    const normalizedProduct = contentCheck.cleaned ?? product.trim();
    if (!contentCheck.valid) {
      setError(contentCheck.reason ?? "قيمة غير مفهومة");
      return;
    }

    const prefix = getCodePrefix(selectedTree);
    let code = "";
    if (manualCode) {
      code = newCode.trim();
      if (!/^[0-9]{7}$/.test(code)) return setError("الكود اليدوي يجب أن يكون 7 أرقام");
      if (!code.startsWith(prefix))
        return setError(`الكود يجب أن يبدأ بـ ${prefix} حسب القسم/الفرع المحدد`);
    }

    const price = salePrice === "" ? 0 : Number(salePrice);
    const costV = cost === "" ? 0 : Number(cost);
    if (!Number.isFinite(price) || price < 0) return setError("سعر البيع غير صحيح");
    if (!Number.isFinite(costV) || costV < 0) return setError("التكلفة غير صحيحة");

    const numOrNull = (s: string): number | null => {
      const t = s.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const strOrNull = (s: string): string | null => {
      const t = s.trim();
      return t ? t : null;
    };

    props.onSubmit({
      original_name: builtClean.original_name,
      main_category: main,
      sub_category: sub,
      new_code: manualCode ? code : undefined,
      old_code: oldCode.trim() || null,
      external_product_id: externalId.trim() || null,
      normalized_name: builtClean.normalized_name,
      english_name: englishName.trim(),
      sale_price: price,
      cost: costV,
      is_active: isActive,
      brand: brandName,
      brand_normalized: normalizeArName(brandName),
      barcode: strOrNull(extra.barcode),
      hs_code: strOrNull(extra.hs_code),
      product_type: strOrNull(extra.product_type as string),
      track_method: strOrNull(extra.track_method as string),
      is_storable: extra.is_storable,
      sale_ok: extra.sale_ok,
      purchase_ok: extra.purchase_ok,
      weight: numOrNull(extra.weight as string),
      volume: numOrNull(extra.volume as string),
      uom_sale: strOrNull(extra.uom_sale as string),
      uom_purchase: strOrNull(extra.uom_purchase as string),
      country_of_origin: strOrNull(extra.country_of_origin as string),
      use_expiration: extra.use_expiration,
      expiry_days: numOrNull(extra.expiry_days as string),
      best_before_days: numOrNull(extra.best_before_days as string),
      tags: strOrNull(extra.tags as string),
      taxes_sale: strOrNull(extra.taxes_sale as string),
      taxes_purchase: strOrNull(extra.taxes_purchase as string),
      note: strOrNull(extra.note as string),
      description_sale: strOrNull(extra.description_sale as string),
      description_purchase: strOrNull(extra.description_purchase as string),
      sale_delay: numOrNull(extra.sale_delay as string),
      purchase_method: strOrNull(extra.purchase_method as string),
      invoice_policy: strOrNull(extra.invoice_policy as string),
      alert_time: numOrNull(extra.alert_time as string),
      removal_time: numOrNull(extra.removal_time as string),
      reordering_min_qty: numOrNull(extra.reordering_min_qty as string),
      reordering_max_qty: numOrNull(extra.reordering_max_qty as string),
      warehouse: strOrNull(extra.warehouse as string),
      location: strOrNull(extra.location as string),
    });
  };

  return (
    <AdminSection
      title="إضافة / تعديل تكويد منتج"
      description="اختر البراند والقسم والفرع، اكتب المنتج والحجم، ويُجمَّع الاسم تلقائيًا بصيغة موحدة ويُولّد الكود"
    >
      {error ? <div className="mb-4"><Alert variant="error" title="بيانات غير صحيحة" message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminField label="البراند" helper='لا تجد البراند؟ اكتب اسمه ثم اضغط «إضافة براند جديد»'>
          <div className="relative">
            <input
              value={brandQuery}
              onChange={(e) => {
                setBrandQuery(e.target.value);
                setBrandSelected(null);
                setBrandOpen(true);
              }}
              onFocus={() => setBrandOpen(true)}
              onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
              placeholder="اكتب للبحث أو لإضافة براند..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {brandOpen && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {brandMatches.slice(0, 8).map((b) => (
                  <button
                    key={b.id}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      setBrandSelected(b);
                      setBrandQuery(b.name);
                      setBrandOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-right text-sm text-gray-800 hover:bg-brand-25 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {b.name}
                    {b.name_en ? <span className="mr-2 text-xs text-gray-400" dir="ltr">{b.name_en}</span> : null}
                  </button>
                ))}
                {brandQuery.trim() && !brandIsExact ? (
                  <button
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      addBrandMutation.mutate(brandQuery.trim());
                    }}
                    disabled={addBrandMutation.isPending}
                    className="block w-full border-t border-gray-200 px-3 py-2 text-right text-sm font-semibold text-blue-600 hover:bg-brand-25 disabled:opacity-50 dark:border-gray-700 dark:text-blue-400"
                  >
                    {addBrandMutation.isPending ? "جارٍ الإضافة..." : `إضافة براند جديد «${brandQuery.trim()}»`}
                  </button>
                ) : null}
                {!brandQuery.trim() && props.brands.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">لا توجد براندات بعد</div>
                )}
              </div>
            )}
          </div>
        </AdminField>

        <AdminField label="المنتج / المحتوى" helper="مثال: سيرب فراولة، بطاطس مقلي، طماطم مصفاة">
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-white ${
              product.trim() && !productValidation.valid
                ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400 dark:border-red-500"
                : "border-gray-300 dark:border-gray-700"
            }`}
          />
          {product.trim() && !productValidation.valid ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <span>⚠</span>
              <span>{productValidation.reason}</span>
            </p>
          ) : null}
        </AdminField>

        <AdminField label="القسم الرئيسي">
          <select
            value={main}
            onChange={(e) => {
              setMain(e.target.value);
              setSub("");
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">اختر القسم</option>
            {[...props.subOptions.keys()].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </AdminField>

        <AdminField label="الفرع">
          <select
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            disabled={!main}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">اختر الفرع</option>
            {(props.subOptions.get(main) ?? []).filter((t) => (t.sub_digits ?? 0) > 0).map((t) => (
              <option key={t.sub_digits} value={t.sub_category ?? ""}>{t.sub_category}</option>
            ))}
          </select>
        </AdminField>

        <AdminField label="الاسم الجاهز (معاينة)">
          <div className="rounded-lg border border-dashed border-brand-300 bg-brand-25 px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
            <div>{built.original_name ? built.original_name : "اكتب البراند والمنتج لعرض الاسم..."}</div>
            {built.normalized_name ? (
              <div className="mt-1 text-xs text-gray-400" dir="ltr">{built.normalized_name}</div>
            ) : null}
          </div>
        </AdminField>

        <AdminField label="الحجم" helper="مثال: 2.5 كجم (اتركه فارغًا لو بدون حجم)">
          <div className="flex gap-2">
            <input
              value={sizeAmount}
              onChange={(e) => setSizeAmount(e.target.value)}
              type="number"
              min={0}
              dir="ltr"
              placeholder="2.5"
              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <select
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">الوحدة</option>
              {SIZE_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </AdminField>

        <AdminField label="عدد العبوات (الكارتون)" helper="يظهر في الاسم عند إدخال رقم أكبر من 1">
          <input
            value={packQty}
            onChange={(e) => setPackQty(e.target.value)}
            type="number"
            min={1}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </AdminField>

        <AdminField
          label="الكود الجديد"
          helper={selectedTree ? `بادئة الفرع: ${getCodePrefix(selectedTree)} — يُحسب تلقائيًا` : "اختر القسم والفرع أولًا"}
        >
          <div className="flex items-center gap-3">
            <input
              value={effectiveCode}
              readOnly={!manualCode}
              onChange={(e) => setNewCode(e.target.value)}
              dir="ltr"
              disabled={!selectedTree}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 read-only:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={manualCode}
                onChange={(e) => setManualCode(e.target.checked)}
                className="h-4 w-4"
              />
              كود يدوي
            </label>
          </div>
        </AdminField>

        <AdminField label="الكود القديم (أودو)" helper="internal reference — يُحفظ فقط، لا يُكتب على أودو">
          <input
            value={oldCode}
            onChange={(e) => setOldCode(e.target.value)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </AdminField>

        <AdminField label="معرّف أودو (Odoo ID)">
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </AdminField>

        <AdminField label="الاسم بالإنجليزية">
          <div className="space-y-2">
            <input
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {translationLoading ? (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                جارٍ الترجمة من Google...
              </div>
            ) : effectiveSuggestion ? (
              <div className="flex items-center justify-between gap-2">
                {effectiveMatches ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {liveTranslated ? "مترجم تلقائيًا من Google (نفس أسلوب CRM)" : "مقترح تلقائي حسب أسلوب CRM"}
                  </span>
                ) : (
                  <span className="truncate text-xs text-gray-400">
                    {liveTranslated ? `ترجمة حقيقية من Google: ${effectiveSuggestion}` : `نفس أسلوب CRM: ${effectiveSuggestion}`}
                  </span>
                )}
                {!effectiveMatches && (
                  <button
                    type="button"
                    onClick={() => setEnglishName(effectiveSuggestion)}
                    className="shrink-0 rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                  >
                    اعتماد الاقتراح
                  </button>
                )}
              </div>
            ) : (
              productNotKnown &&
              !englishName.trim() && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  هذا المنتج غير موجود في قاموس الأسماء — اكتب الاسم الإنجليزي يدويًا أو انتظر الترجمة التلقائية.
                </p>
              )
            )}
          </div>
        </AdminField>

        <AdminField label="سعر البيع">
          <input
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            type="number"
            dir="ltr"
            min={0}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </AdminField>

        <AdminField label="التكلفة">
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            type="number"
            dir="ltr"
            min={0}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </AdminField>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          المنتج نشط
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {EXTRA_GROUP_DEFS.map((group, gi) => (
          <CollapsibleGroup
            key={group.title}
            title={`${group.title} (${group.fields.length})`}
            open={openGroups[gi]}
            onToggle={() => setOpenGroups((prev) => ({ ...prev, [gi]: !prev[gi] }))}
          >
            {group.fields.map((field) => {
              const value = extra[field.key];
              const disabled = group.readonly || field.readonly;
              const baseCls =
                "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
              const disabledCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400";
              if (field.kind === "bool") {
                return (
                  <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setField(field.key, e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }
              if (field.kind === "select") {
                return (
                  <AdminField key={field.key} label={field.label} helper={field.helper}>
                    <select
                      value={String(value)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={disabled}
                      className={disabled ? disabledCls : baseCls}
                    >
                      <option value="">—</option>
                      {(field.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </AdminField>
                );
              }
              if (field.kind === "textarea") {
                return (
                  <AdminField key={field.key} label={field.label}>
                    <textarea
                      value={String(value)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      rows={2}
                      dir={field.dir ?? "rtl"}
                      disabled={disabled}
                      className={`${disabled ? disabledCls : baseCls} min-h-[60px]`}
                    />
                  </AdminField>
                );
              }
              return (
                <AdminField key={field.key} label={field.label} helper={field.helper}>
                  <input
                    value={String(value)}
                    onChange={(e) => setField(field.key, e.target.value)}
                    type={field.kind === "number" ? "number" : "text"}
                    dir={field.dir ?? "rtl"}
                    disabled={disabled}
                    className={disabled ? disabledCls : baseCls}
                  />
                </AdminField>
              );
            })}
          </CollapsibleGroup>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleSubmit}
          disabled={props.loading || (!!product.trim() && !productValidation.valid)}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {props.loading ? "جارٍ الحفظ..." : "حفظ التكويد"}
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
        >
          تفريغ الحقول
        </button>
      </div>
    </AdminSection>
  );
}

function TreeTab(props: {
  grouped: [string, CodingTreeRow[]][];
  productCounts: Map<string, number>;
  nextCodes: ProductCodingRow[];
  tree: CodingTreeRow[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [showAddMain, setShowAddMain] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [mainName, setMainName] = useState("");
  const [subMain, setSubMain] = useState("");
  const [subName, setSubName] = useState("");
  const [catError, setCatError] = useState<string | null>(null);

  const addMainMutation = useMutation({
    mutationFn: addMainCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coding", "tree"] });
      setShowAddMain(false);
      setMainName("");
      setCatError(null);
    },
    onError: (e) => setCatError(e instanceof Error ? e.message : "فشل إضافة القسم"),
  });

  const addSubMutation = useMutation({
    mutationFn: ({ main, name }: { main: string; name: string }) => addSubCategory(main, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coding", "tree"] });
      setShowAddSub(false);
      setSubName("");
      setCatError(null);
    },
    onError: (e) => setCatError(e instanceof Error ? e.message : "فشل إضافة الفرع"),
  });

  const mains = useMemo(() => [...new Set(props.tree.map((t) => t.main_category))], [props.tree]);

  return (
    <AdminSection
      title="شجرة التكويد"
      description="القسم الرئيسي + الفرع + بادئة الكود + عدد المكود حاليًا والكود التالي المتاح"
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCatError(null);
              setShowAddMain(true);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
          >
            + قسم رئيسي
          </button>
          <button
            onClick={() => {
              setCatError(null);
              setSubMain(mains[0] ?? "");
              setShowAddSub(true);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
          >
            + فرع
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-right text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold">القسم الرئيسي</th>
              <th className="px-4 py-3 font-semibold">الفرع</th>
              <th className="px-4 py-3 font-semibold">بادئة الكود</th>
              <th className="px-4 py-3 font-semibold">مكود حاليًا</th>
              <th className="px-4 py-3 font-semibold">الكود التالي</th>
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={5}><AdminTableSkeleton columns={5} rows={6} /></td>
              </tr>
            ) : (
              props.grouped.flatMap(([main, subs]) =>
                subs.map((t, idx) => {
                  const isMainOnly = t.sub_digits == null;
                  const prefix = isMainOnly ? null : getCodePrefix(t);
                  const next = isMainOnly ? "—" : computeNextCode(t, props.nextCodes);
                  const count = prefix ? props.productCounts.get(prefix) ?? 0 : 0;
                  return (
                    <tr key={`${main}-${t.sub_digits ?? "main"}`} className={`border-b border-gray-100 dark:border-gray-800 ${idx === 0 ? "bg-brand-25/60" : ""}`}>
                      {idx === 0 ? (
                        <td rowSpan={subs.length} className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white">
                          {main}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {isMainOnly ? <span className="text-gray-400">— (لا توجد فروع بعد)</span> : t.sub_category}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-white" dir="ltr">
                        {isMainOnly ? `${t.dept_digit}xxxxxx` : t.dept_digit + String(t.sub_digits).padStart(2, "0") + "xxxx"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{count}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400" dir="ltr">{next}</td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      {showAddMain ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAddMain(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">إضافة قسم رئيسي</h3>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">اسم القسم (بالعربية)</label>
            <input
              value={mainName}
              onChange={(e) => setMainName(e.target.value)}
              autoFocus
              placeholder="مثال: مواد تنظيف"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {catError ? <p className="mt-2 text-xs text-red-600">{catError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddMain(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => addMainMutation.mutate(mainName.trim())}
                disabled={!mainName.trim() || addMainMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addMainMutation.isPending ? "جارٍ الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddSub ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAddSub(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">إضافة فرع لقسم رئيسي</h3>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">القسم الرئيسي</label>
            <select
              value={subMain}
              onChange={(e) => setSubMain(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {mains.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">اسم الفرع (بالعربية)</label>
            <input
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              autoFocus
              placeholder="مثال: شاي"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {catError ? <p className="mt-2 text-xs text-red-600">{catError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddSub(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => addSubMutation.mutate({ main: subMain, name: subName.trim() })}
                disabled={!subMain || !subName.trim() || addSubMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addSubMutation.isPending ? "جارٍ الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminSection>
  );
}

function ImportTab(props: {
  tree: CodingTreeRow[];
  subOptions: Map<string, CodingTreeRow[]>;
  existing: ProductCodingRow[];
  loading: boolean;
  onSubmit: (rows: UpsertCodingInput[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<UpsertCodingInput[]>([]);
  const [previewTitle, setPreviewTitle] = useState("");

  const prefixOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of props.tree) {
      if (t.sub_category && t.sub_digits != null)
        map.set(`${t.main_category}::${t.sub_category}`, getCodePrefix(t));
    }
    return map;
  }, [props.tree]);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    const clean = (v: unknown) => String(v ?? "").trim();
    const cleanOld = (v: unknown) => {
      const s = clean(v);
      if (!s || s === "0" || s.toLowerCase() === "none" || s.toLowerCase() === "null") return null;
      return s;
    };

    const built: UpsertCodingInput[] = [];
    for (const r of rows) {
      const main = clean(r["Main Category"]);
      const sub = clean(r["Sub Category"]);
      const prefix = prefixOf.get(`${main}::${sub}`);
      const code = clean(r["New Code"]);
      const finalCode = prefix && (!code || !code.startsWith(prefix)) ? "" : code;
      built.push({
        original_name: clean(r["Product Name (Original)"]),
        main_category: main,
        sub_category: sub,
        new_code: finalCode && /^[0-9]{7}$/.test(finalCode) ? finalCode : null,
        old_code: cleanOld(r["Old Code"]),
        external_product_id: clean(r["Odoo ID"]) || null,
        normalized_name: clean(r["Product Name (Normalized)"]),
        english_name: clean(r["English Name"]),
        sale_price: Number(r["Sale Price"]) || 0,
        cost: Number(r["Cost"]) || 0,
        is_active: clean(r["Active"]).toLowerCase() === "yes",
      });
    }
    setParsed(built);
    setPreviewTitle(`${built.length} صف تمت قراءته من ${file.name}`);
  };

  const validCount = parsed.filter((p) => p.original_name && p.main_category && p.sub_category && prefixOf.has(`${p.main_category}::${p.sub_category}`)).length;

  return (
    <AdminSection
      title="استيراد من ملف Excel"
      description="نفس أعمدة ملف شجرة التكويد: New Code, Old Code, Product Name (Original), Product Name (Normalized), English Name, Main Category, Sub Category, Sale Price, Cost, Active, Odoo ID"
      actions={
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
        >
          اختيار ملف
        </button>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {previewTitle && parsed.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{previewTitle}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            صفوف مطابقة للشجرة وجاهزة: <span className="font-semibold text-emerald-600">{validCount}</span> من {parsed.length}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => props.onSubmit(parsed)}
              disabled={props.loading || validCount === 0}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {props.loading ? "جارٍ الاستيراد..." : "تطبيق الاستيراد"}
            </button>
            <button
              onClick={() => {
                setParsed([]);
                setPreviewTitle("");
              }}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          اختر ملف Excel لعرض عدد الصفوف قبل التطبيق. الأكواد التي لا تطابق بادئة الشجرة تُرفض، والأكواد غير الموجودة تُولد تلقائيًا.
        </p>
      )}
    </AdminSection>
  );
}