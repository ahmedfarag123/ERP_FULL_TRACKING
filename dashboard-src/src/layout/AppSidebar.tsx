import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  ListIcon,
  BoxCubeIcon,
  GroupIcon,
  ChevronDownIcon,
  HorizontaLDots,
  TableIcon,
  DollarLineIcon,
  PieChartIcon,
  BoltIcon,
} from "../icons";
import AppLogo from "../components/common/AppLogo";
import { useSidebar } from "../context/SidebarContext";
import { useCurrentAccess } from "../hooks/useCurrentAccess";
import { useAuth } from "../context/AuthContext";
import { useFinancePageVisibility } from "../hooks/useFinancePageVisibility";
import type { AdminPermissionKey } from "../lib/admin-access";
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  requiredPermissions?: AdminPermissionKey[];
  subItems?: {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    requiredPermissions?: AdminPermissionKey[];
  }[];
};

const navItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "لوحة المعلومات",
    path: "/dashboard",
    requiredPermissions: ["dashboard.view"],
  },
  {
    name: "الطلبات",
    icon: <ListIcon />,
    path: "/orders",
    requiredPermissions: ["orders.view", "orders.manage"],
  },

  {
    name: "العملاء",
    icon: <ListIcon />,
    path: "/customers",
    requiredPermissions: ["customers.view", "customers.assign", "customers.manage"],
  },
  {
    name: "فرص أودو",
    icon: <TableIcon />,
    path: "/crm/odoo",
    requiredPermissions: ["customers.view", "customers.assign", "customers.manage"],
  },
  {
    name: "التحليلات",
    icon: <PieChartIcon />,
    path: "/analytics",
    requiredPermissions: ["customers.view", "customers.assign", "customers.manage"],
  },
  {
    name: "المشتريات",
    icon: <BoxCubeIcon />,
    path: "/procurement",
    requiredPermissions: ["customers.view", "customers.assign", "customers.manage"],
  },
  {
    name: "نظام الطلبات (التكويد)",
    icon: <BoltIcon />,
    path: "/crm",
  },
  {
    name: "الزيارات",
    icon: <ListIcon />,
    path: "/visits",
    requiredPermissions: ["visits.view", "visits.audit"],
  },
  {
    name: "المكالمات",
    icon: <ListIcon />,
    path: "/calls",
    requiredPermissions: ["calls.view", "calls.audit"],
  },
  {
    name: "خدمة العملاء",
    icon: <ListIcon />,
    requiredPermissions: ["tickets.view", "tickets.manage"],
    subItems: [
      { name: "التذاكر", path: "/tickets", requiredPermissions: ["tickets.view"] },
      { name: "التحليلات", path: "/tickets/analytics", requiredPermissions: ["tickets.view"] },
    ],
  },
  {
    name: "اللوجستيات",
    icon: <BoxCubeIcon />,
    requiredPermissions: ["logistics.view", "logistics.manage"],
    subItems: [
      { name: "لوحة اللوجستيات", path: "/logistics", requiredPermissions: ["logistics.view"] },
      { name: "الشحنات", path: "/logistics/shipments", requiredPermissions: ["logistics.view"] },
      { name: "الخطط", path: "/logistics/plans", requiredPermissions: ["logistics.view"] },
      { name: "خطة جديدة", path: "/logistics/plans/new", requiredPermissions: ["logistics.manage"] },
    ],
  },
  {
    name: "المالية",
    icon: <DollarLineIcon />,
    requiredPermissions: ["finance.view", "finance.manage"],
    subItems: [
      { name: "لوحة التحكم", path: "/finance", requiredPermissions: ["finance.view"] },
      { name: "دليل الحسابات", path: "/finance/accounts", requiredPermissions: ["finance.manage"] },
      { name: "القيود اليومية", path: "/finance/journal", requiredPermissions: ["finance.view"] },
      { name: "الفواتير", path: "/finance/invoices", requiredPermissions: ["finance.view"] },
      { name: "إشعارات الدائن", path: "/finance/credit-notes", requiredPermissions: ["finance.view"] },
      { name: "الذمم المدينة", path: "/finance/receivables", requiredPermissions: ["finance.view"] },
      { name: "تسويات السائقين", path: "/finance/driver-settlements", requiredPermissions: ["finance.view"] },
      { name: "مراكز التكلفة", path: "/finance/cost-centers", requiredPermissions: ["finance.manage"] },
      { name: "التقارير المالية", path: "/finance/reports", requiredPermissions: ["finance.view"] },
      { name: "الإعدادات", path: "/finance/settings", requiredPermissions: ["finance.manage"] },
      { name: "سجل التدقيق", path: "/finance/audit-log", requiredPermissions: ["finance.view"] },
    ],
  },
      {
        name: "إدارة المستخدمين",
        icon: <GroupIcon />,
        subItems: [
          {
            name: "دليل المستخدمين",
            path: "/admin/users",
            requiredPermissions: ["users.view", "users.role-change", "users.auth-controls"],
          },
          { name: "مستخدم جديد", path: "/admin/users/new", requiredPermissions: ["users.invite"] },
          {
            name: "إدارة الصلاحيات",
            path: "/admin/access-control",
            requiredPermissions: ["users.role-change"],
          },
          {
            name: "إدارة أودو",
            path: "/admin/odoo-actions",
            requiredPermissions: ["users.role-change"],
          },
          {
            name: "إجراءات أودو المعلقة",
            path: "/admin/odoo-pending",
            requiredPermissions: ["users.role-change"],
          },
        ],
      },
];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { hasAnyPermission } = useCurrentAccess();
  const { authUser } = useAuth();
  const { isPageEnabled } = useFinancePageVisibility();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getVisibleSubItems = useCallback(
    (item: NavItem) => {
      // Map finance subItem paths to page visibility keys
      const financePathToPageKey: Record<string, string> = {
        "/finance": "dashboard",
        "/finance/accounts": "accounts",
        "/finance/journal": "journal",
        "/finance/invoices": "invoices",
        "/finance/credit-notes": "credit-notes",
        "/finance/receivables": "receivables",
        "/finance/driver-settlements": "driver-settlements",
        "/finance/cost-centers": "cost-centers",
        "/finance/reports": "reports",
        "/finance/settings": "settings",
        "/finance/audit-log": "audit-log",
      };

      return (item.subItems ?? []).filter(
        (subItem) => {
          // Check permissions
          if (subItem.requiredPermissions?.length && !hasAnyPermission(subItem.requiredPermissions)) {
            return false;
          }
          // Check finance page visibility
          if (item.name === "المالية") {
            const pageKey = financePathToPageKey[subItem.path];
            if (pageKey && !isPageEnabled(pageKey as Parameters<typeof isPageEnabled>[0])) {
              return false;
            }
          }
          return true;
        },
      );
    },
    [hasAnyPermission, isPageEnabled],
  );

  const visibleItems = useCallback(
    (items: NavItem[]) =>
      items.filter((item) => {
        if (item.name === "إدارة المستخدمين" && authUser?.email !== "ahmed-farag@hs.com") return false;

        if (item.subItems?.length) {
          return getVisibleSubItems(item).length > 0;
        }

        if (!item.requiredPermissions?.length) {
          return true;
        }

        return hasAnyPermission(item.requiredPermissions);
      }),
    [getVisibleSubItems, hasAnyPermission, authUser],
  );

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) =>
      path === "/"
        ? location.pathname === path
        : location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = visibleItems(menuType === "main" ? navItems : othersItems);
      items.forEach((nav, index) => {
        if (nav.subItems) {
          getVisibleSubItems(nav).forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [getVisibleSubItems, isActive, location, visibleItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {visibleItems(items).map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`mr-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 mr-9 space-y-1">
                {getVisibleSubItems(nav).map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="mr-auto flex items-center gap-1">
                        {subItem.new && (
                          <span
                            className={`mr-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`mr-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed right-0 top-0 z-50 mt-16 flex h-screen flex-col border-l border-brand-100/60 bg-white/75 px-5 text-gray-900 backdrop-blur-2xl transition-all duration-300 ease-in-out dark:border-gray-800/70 dark:bg-gray-900/70 lg:mt-0 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="flex items-center">
          {isExpanded  || isMobileOpen ? (
            <AppLogo className="h-14 w-32 rounded-xl" />
          ) : (
            <AppLogo className="h-11 w-11 rounded-2xl" />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "القائمة"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "أخرى"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
