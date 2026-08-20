import { lazy, Suspense } from "react";
import PageMeta from "../../components/common/PageMeta";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import RouteFallback from "../../components/common/RouteFallback";
import { useUrlEnumParam } from "../../hooks/useUrlState";

const OverviewTab = lazy(() => import("./OverviewTab"));
const LogisticsDashboard = lazy(() => import("../Admin/Dashboards/LogisticsDashboard"));
const TelesalesDashboard = lazy(() => import("../Admin/Dashboards/TelesalesDashboard"));
const FinanceDashboardPage = lazy(() => import("../Admin/Finance/FinanceDashboardPage"));
const DispatcherTab = lazy(() => import("./DispatcherTab"));
const ApprovalsTab = lazy(() => import("./ApprovalsTab"));
const SalesTeamTab = lazy(() => import("./SalesTeamTab"));

const TAB_KEYS = [
  "overview",
  "logistics",
  "telesales",
  "approvals",
  "sales",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "logistics", label: "اللوجستيات" },
  { key: "telesales", label: "المكالمات وخدمة العملاء" },
  { key: "approvals", label: "موافقات التحصيل" },
  { key: "sales", label: "فريق المبيعات" },
];

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useUrlEnumParam("tab", TAB_KEYS, "overview");

  return (
    <>
      <PageMeta
        title="لوحة المعلومات | إدارة المبيعات"
        description="نظرة شاملة على عمليات المبيعات، اللوجستيات، المكالمات، والمالية."
      />

      <AdminPageFrame>
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-px -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              label={tab.label}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        <Suspense fallback={<RouteFallback />}>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "logistics" && <LogisticsDashboard />}
          {activeTab === "telesales" && <TelesalesDashboard />}
          {activeTab === "approvals" && <ApprovalsTab />}
          {activeTab === "sales" && <SalesTeamTab />}
        </Suspense>
      </AdminPageFrame>
    </>
  );
}
