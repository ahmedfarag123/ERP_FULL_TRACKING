import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from "react-router";
import { AppErrorBoundary } from "../lib/AppErrorBoundary";
import ForcePasswordChangeRoute from "./components/auth/ForcePasswordChangeRoute";
import PermissionRoute from "./components/auth/PermissionRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteFallback from "./components/common/RouteFallback";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import { DRIVER_APP_URL, DISPATCHER_APP_URL } from "./lib/external-apps";

const AccessControlPage = lazy(() => import("./pages/Admin/AccessControlPage"));
const OdooActionsPage = lazy(() => import("./pages/Admin/OdooActionsPage"));
const OdooPendingActionsPage = lazy(() => import("./pages/Admin/OdooPendingActionsPage"));
const OdooPendingActionDetailPage = lazy(() => import("./pages/Admin/OdooPendingActionDetailPage"));
const CustomersManagement = lazy(() => import("./pages/Admin/CustomersManagement"));
const CustomerDetail = lazy(() => import("./pages/Admin/CustomerDetail"));
const CallsPage = lazy(() => import("./pages/Admin/CallsPage"));
const ActivityDetailPage = lazy(() => import("./pages/Admin/ActivityDetailPage"));
const OdooCrmPage = lazy(() => import("./pages/Admin/OdooCrmPage"));
const CrmEmbedPage = lazy(() => import("./pages/Admin/CrmEmbedPage"));
const OrderDetailPage = lazy(() => import("./pages/Admin/OrderDetailPage"));
const ProfilePage = lazy(() => import("./pages/Admin/ProfilePage"));
const OrdersManagement = lazy(() => import("./pages/Admin/OrdersManagement"));
const OrderIntentsPage = lazy(() => import("./pages/Admin/OrderIntentsPage"));
const UserDetailPage = lazy(() => import("./pages/Admin/UserDetailPage"));
const UserCreatePage = lazy(() => import("./pages/Admin/UserCreatePage"));
const AnalyticsPage = lazy(() => import("./pages/Admin/Analytics/AnalyticsPage"));
const ProcurementPage = lazy(() => import("./pages/Admin/Procurement/ProcurementPage"));
const UsersManagement = lazy(() => import("./pages/Admin/UsersManagement"));
const VisitsPage = lazy(() => import("./pages/Admin/VisitsPage"));
const VisitDetailPage = lazy(() => import("./pages/Admin/VisitDetailPage"));
const CustomerServicePage = lazy(() => import("./pages/Admin/CustomerServicePage"));
const TicketDetailPage = lazy(() => import("./pages/Admin/TicketDetailPage"));
const CustomerServiceAnalytics = lazy(() => import("./pages/Admin/CustomerServiceAnalytics"));
const LogisticsOverviewPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsOverviewPage,
  })),
);
const LogisticsShipmentsPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsShipmentsPage,
  })),
);
const LogisticsPlansPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsPlansPage,
  })),
);
const LogisticsNewPlanPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsNewPlanPage,
  })),
);
const LogisticsDraftPlanPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsDraftPlanPage,
  })),
);
const LogisticsReturnsPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsReturnsPage,
  })),
);
const LogisticsShipmentDetailPage = lazy(() =>
  import("./pages/Admin/Logistics/LogisticsPages").then((module) => ({
    default: module.LogisticsShipmentDetailPage,
  })),
);
const FinanceDashboardPage = lazy(() => import("./pages/Admin/Finance/FinanceDashboardPage"));
const ChartOfAccountsPage = lazy(() => import("./pages/Admin/Finance/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("./pages/Admin/Finance/JournalEntriesPage"));
const InvoicesPage = lazy(() => import("./pages/Admin/Finance/InvoicesPage"));
const InvoiceDetailPage = lazy(() => import("./pages/Admin/Finance/InvoiceDetailPage"));
const CreditNotesPage = lazy(() => import("./pages/Admin/Finance/CreditNotesPage"));
const ReceivablesPage = lazy(() => import("./pages/Admin/Finance/ReceivablesPage"));
const DriverSettlementsPage = lazy(() => import("./pages/Admin/Finance/DriverSettlementsPage"));
const CostCentersPage = lazy(() => import("./pages/Admin/Finance/CostCentersPage"));
const FinancialReportsPage = lazy(() => import("./pages/Admin/Finance/FinancialReportsPage"));
const FinanceSettingsPage = lazy(() => import("./pages/Admin/Finance/FinanceSettingsPage"));
const FinanceAuditLogPage = lazy(() => import("./pages/Admin/Finance/FinanceAuditLogPage"));
const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ForcePasswordChange = lazy(() => import("./pages/AuthPages/ForcePasswordChange"));
const DashboardPage = lazy(() => import("./pages/Dashboard/DashboardPage"));
const KpiDashboardPage = lazy(() => import("./pages/Admin/KPIs/KpiDashboardPage"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));

function SuspendedOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

function ExternalRedirect({ to }: { to: string }) {
  window.location.replace(to);
  return null;
}

export default function App() {
  return (
      <Router>
      <ScrollToTop />
      <AppErrorBoundary>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<SuspendedOutlet />}>
              <Route element={<PermissionRoute anyOf={["dashboard.view"]} />}>
                <Route index path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/kpis" element={<KpiDashboardPage />} />
              </Route>
              <Route element={<PermissionRoute anyOf={["orders.view", "orders.manage"]} />}>
                <Route path="/orders" element={<OrdersManagement />} />
                <Route path="/orders/intents" element={<OrderIntentsPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
              </Route>

              <Route
                element={
                  <PermissionRoute
                    anyOf={["customers.view", "customers.assign", "customers.manage"]}
                  />
                }
              >
                <Route path="/customers" element={<CustomersManagement />} />
                <Route path="/customers/:customerId" element={<CustomerDetail />} />
                <Route path="/crm/odoo" element={<OdooCrmPage />} />
                <Route path="/crm" element={<CrmEmbedPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/procurement" element={<ProcurementPage />} />
  
              </Route>
              <Route element={<PermissionRoute anyOf={["visits.view", "visits.audit"]} />}>
                <Route path="/visits" element={<VisitsPage />} />
                <Route path="/visits/:visitId" element={<VisitDetailPage />} />
              </Route>
              <Route element={<PermissionRoute anyOf={["calls.view", "calls.audit"]} />}>
                <Route path="/calls" element={<CallsPage />} />
                <Route path="/calls/activity/:callId" element={<ActivityDetailPage />} />
              </Route>
              <Route element={<PermissionRoute anyOf={["tickets.view", "tickets.manage"]} />}>
                <Route path="/tickets" element={<CustomerServicePage />} />
                <Route path="/tickets/analytics" element={<CustomerServiceAnalytics />} />
                <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
              </Route>
              <Route element={<PermissionRoute anyOf={["logistics.view", "logistics.manage"]} />}>
                <Route path="/logistics" element={<LogisticsOverviewPage />} />
                <Route path="/logistics/shipments" element={<LogisticsShipmentsPage />} />
                <Route path="/logistics/plans" element={<LogisticsPlansPage />} />
                <Route path="/logistics/plans/new" element={<LogisticsNewPlanPage />} />
                <Route path="/logistics/plans/draft/:planId" element={<LogisticsDraftPlanPage />} />
                <Route path="/logistics/returns" element={<LogisticsReturnsPage />} />
                <Route path="/logistics/shipments/:shipmentId" element={<LogisticsShipmentDetailPage />} />
              </Route>
              <Route element={<PermissionRoute anyOf={["finance.view", "finance.manage"]} />}>
                <Route path="/finance" element={<FinanceDashboardPage />} />
                <Route path="/finance/accounts" element={<ChartOfAccountsPage />} />
                <Route path="/finance/journal" element={<JournalEntriesPage />} />
                <Route path="/finance/invoices" element={<InvoicesPage />} />
                <Route path="/finance/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/finance/credit-notes" element={<CreditNotesPage />} />
                <Route path="/finance/receivables" element={<ReceivablesPage />} />
                <Route path="/finance/driver-settlements" element={<DriverSettlementsPage />} />
                <Route path="/finance/cost-centers" element={<CostCentersPage />} />
                <Route path="/finance/reports" element={<FinancialReportsPage />} />
                <Route path="/finance/settings" element={<FinanceSettingsPage />} />
                <Route path="/finance/audit-log" element={<FinanceAuditLogPage />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                element={
                  <PermissionRoute
                    anyOf={["users.view", "users.invite", "users.role-change", "users.auth-controls"]}
                  />
                }
              >
                <Route element={<SuperAdminRoute />}>
                  <Route path="/admin/users" element={<UsersManagement />} />
                  <Route element={<PermissionRoute anyOf={["users.invite"]} />}>
                    <Route path="/admin/users/new" element={<UserCreatePage />} />
                  </Route>
                  <Route path="/admin/users/:userId" element={<UserDetailPage />} />
                </Route>
                <Route element={<PermissionRoute anyOf={["users.role-change"]} />}>
                <Route path="/admin/access-control" element={<AccessControlPage />} />
                <Route path="/admin/odoo-actions" element={<OdooActionsPage />} />
                <Route path="/admin/odoo-pending" element={<OdooPendingActionsPage />} />
                <Route path="/admin/odoo-pending/:actionId" element={<OdooPendingActionDetailPage />} />
                  <Route
                    path="/roles-permissions/*"
                    element={<Navigate to="/admin/access-control" replace />}
                  />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route
          path="/sales-app"
          element={
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
              <div className="text-center">
                <h1 className="mb-4 text-4xl font-bold text-white">Sales App</h1>
                <p className="mb-8 text-blue-100">
                  Redirecting to Sales Application...
                </p>
                <a
                  href="/sales/"
                  target="_self"
                  className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 hover:bg-blue-50"
                >
                  {"Open Sales App ->"}
                </a>
              </div>
            </div>
          }
        />

        <Route
          path="/driver-app"
          element={<ExternalRedirect to={DRIVER_APP_URL} />}
        />

        <Route
          path="/dispatcher-app"
          element={<ExternalRedirect to={DISPATCHER_APP_URL} />}
        />

        <Route element={<PublicOnlyRoute />}>
          <Route element={<SuspendedOutlet />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>
        </Route>
        <Route
          path="/force-password-change"
          element={
            <ForcePasswordChangeRoute>
              <Suspense fallback={<RouteFallback />}>
                <ForcePasswordChange />
              </Suspense>
            </ForcePasswordChangeRoute>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
      </AppErrorBoundary>
    </Router>
  );
}
