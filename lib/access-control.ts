/**
 * access-control.ts
 *
 * Single source of truth for roles, permissions, routes, and navigation.
 * Middleware and nav components both import from here.
 */

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  BaggageClaimIcon,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileClock,
  HelpCircle,
  ListX,
  MonitorCog,
  Package,
  Printer,
  Receipt,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StoreIcon,
  Terminal,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  appRoutes,
  getFirstAccessibleRoute,
  getPermissionsForRole,
  hasPermissionForRoute,
  isValidUserRole,
  rolePermissions,
  type Permission,
  type UserRole,
} from "@/lib/access-control-core";

export {
  getFirstAccessibleRoute,
  getPermissionsForRole,
  hasPermissionForRoute,
  isValidUserRole,
  rolePermissions,
};
export type { Permission, UserRole };

export interface RouteConfig {
  href: string;
  permission: Permission;
  label: string;
  icon: LucideIcon;
  showInNav: boolean;
}

export const routes: RouteConfig[] = appRoutes.map((route) => ({
  ...route,
  icon:
    route.href === "/dashboard"
      ? LayoutDashboard
      : route.href === "/pos"
        ? ShoppingCart
        : route.href === "/product"
          ? Package
          : route.href === "/reports"
            ? BarChart3
            : route.href === "/reports/ai"
              ? Sparkles
            : route.href === "/accounts"
              ? Users
              : route.href === "/companies" ||
                  route.href === "/companies/[companyId]"
                ? Building2
                : route.href === "/companies/[companyId]/terminals" ||
                    route.href === "/terminals"
                  ? Terminal
                  : route.href === "/companies/[companyId]/subscription" ||
                      route.href === "/subscriptions"
                    ? CreditCard
                    : route.href === "/approvals"
                      ? FileClock
                      : route.href === "/admin/settings"
                        ? Settings
                      : route.href === "/accounts/[profileId]"
                        ? UserRound
                        : route.href === "/admin"
                          ? Users
                          : Settings,
}));

export interface SidebarNavContext {
  companyId?: string | null;
  profileId?: string | null;
  posStatus?: "available" | "in_use";
  billingRestricted?: boolean;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
  badge?: string;
  badgeTone?: "neutral" | "success" | "active";
  priority?: boolean;
  children?: SidebarNavItem[];
}

export interface SidebarNavSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "list" | "accordion" | "dropdown";
  placement?: "content" | "footer";
  items: SidebarNavItem[];
}

interface SidebarNavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: Permission;
  roles?: UserRole[];
  disabled?: boolean;
  badge?: string;
  priority?: boolean;
  keepVisibleWithoutHref?: boolean;
  children?: SidebarNavItemConfig[];
}

interface SidebarNavSectionConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "list" | "accordion" | "dropdown";
  placement?: "content" | "footer";
  items: SidebarNavItemConfig[];
}

const sidebarNavConfig: SidebarNavSectionConfig[] = [
  {
    id: "main",
    label: "Main",
    placement: "content",
    items: [
      {
        id: "pos",
        label: "Point of Sale",
        icon: ShoppingCart,
        href: "/pos",
        permission: "view.pos",
        priority: true,
      },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        permission: "view.dashboard",
      },
      {
        id: "products-inventory",
        label: "Products & Inventory",
        icon: Boxes,
        href: "/product",
        permission: "view.product",
      },
      {
        id: "customers",
        label: "Customers",
        icon: UserRound,
        href: "/customers",
        permission: "manage.customers",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: ClipboardList,
    variant: "accordion",
    placement: "content",
    items: [
      {
        id: "inventory-ledger",
        label: "Inventory Health",
        icon: Boxes,
        href: "/inventory-ledger",
        permission: "manage.inventory",
        roles: ["manager", "cashier"],
      },
      {
        id: "expenses",
        label: "Expenses",
        icon: Receipt,
        href: "/expenses",
        permission: "manage.expenses",
        roles: ["manager", "cashier"],
      },
      {
        id: "suppliers",
        label: "Suppliers",
        icon: StoreIcon,
        href: "/suppliers",
        permission: "manage.suppliers",
        roles: ["manager", "cashier"],
      },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        icon: ClipboardList,
        href: "/purchase-orders",
        permission: "manage.purchase-orders",
        roles: ["manager", "cashier"],
      },
      {
        id: "branch-transfers",
        label: "Branch Transfers",
        icon: RotateCcw,
        href: "/transfers",
        permission: "manage.transfers",
        roles: ["manager", "cashier"],
      },
      {
        id: "promotions",
        label: "Promotions",
        icon: BaggageClaimIcon,
        href: "/promotions",
        permission: "manage.promotions",
        roles: ["manager", "cashier"],
      },
      {
        id: "kitchen",
        label: "Kitchen",
        icon: MonitorCog,
        href: "/kitchen",
        permission: "manage.kitchen",
        roles: ["manager", "cashier"],
      },
      {
        id: "sync-center",
        label: "Sync Center",
        icon: FileClock,
        href: "/sync",
        permission: "view.sync-center",
        roles: ["manager", "cashier"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    variant: "accordion",
    placement: "content",
    items: [
      {
        id: "reports-companies",
        label: "Companies",
        icon: BarChart3,
        roles: ["admin"],
        href: "/reports",
        permission: "view.reports",
      },
      {
        id: "reports-overview",
        label: "Overview",
        icon: FileBarChart2,
        href: "/reports",
        permission: "view.reports",
        roles: ["manager", "cashier"],
      },
      {
        id: "reports-ai",
        label: "AI Assistant",
        icon: Sparkles,
        href: "/reports/ai",
        permission: "view.ai.reports",
        roles: ["admin", "manager"],
      },
      {
        id: "reports-daily-transactions",
        label: "Daily Transactions",
        icon: CalendarDays,
        roles: ["manager"],
        href: "/reports/daily-transactions",
        permission: "view.reports",
      },
      {
        id: "reports-transaction-list",
        label: "Transaction List",
        icon: ClipboardList,
        roles: ["manager"],
        href: "/reports/transaction-list",
        permission: "view.reports",
      },
      {
        id: "reports-z-reading",
        label: "Z-Reading",
        icon: Receipt,
        roles: ["manager"],
        href: "/reports/z-reading",
        permission: "view.reports",
      },
      {
        id: "reports-x-reading",
        label: "X-Reading",
        icon: ScanSearch,
        roles: ["manager"],
        href: "/reports/x-reading",
        permission: "view.reports",
      },
      {
        id: "reports-sales",
        label: "Sales Reports",
        icon: BarChart3,
        roles: ["manager"],
        href: "/reports/sales",
        permission: "view.reports",
      },
      {
        id: "reports-sales-book",
        label: "Sales Book",
        icon: Receipt,
        roles: ["manager"],
        href: "/reports/sales-book",
        permission: "view.reports",
      },
      {
        id: "reports-voided-list",
        label: "Voided List",
        icon: ListX,
        roles: ["manager"],
        href: "/reports/voided",
        permission: "view.reports",
      },
      {
        id: "reports-pwd-list",
        label: "PWD List",
        icon: ShieldAlert,
        roles: ["manager"],
        href: "/reports/discounts",
        permission: "view.reports",
      },
      {
        id: "reports-senior-list",
        label: "Senior List",
        icon: ShieldAlert,
        roles: ["manager"],
        href: "/reports/discounts",
        permission: "view.reports",
      },
      {
        id: "reports-refund-invoices",
        label: "Refund Invoices",
        icon: RotateCcw,
        roles: ["manager"],
        href: "/reports/refunds",
        permission: "view.reports",
      },
      {
        id: "reports-returned-items",
        label: "Returned Items",
        icon: RotateCcw,
        roles: ["manager"],
        href: "/reports/returned-items",
        permission: "view.reports",
      },
      {
        id: "reports-returned-records",
        label: "Returned Records",
        icon: FileClock,
        roles: ["manager"],
        href: "/reports/returned-records",
        permission: "view.reports",
      },
      {
        id: "reports-documents",
        label: "Invoice Documents",
        icon: FileClock,
        roles: ["manager"],
        href: "/reports/documents",
        permission: "view.reports",
      },
      {
        id: "reports-audit",
        label: "Audit Trail",
        icon: FileClock,
        roles: ["manager"],
        href: "/reports/audit-trail",
        permission: "view.reports",
      },
      {
        id: "reports-transactions",
        label: "Transaction History",
        icon: ClipboardList,
        roles: ["manager", "cashier"],
        href: "/reports/sales",
        permission: "view.reports",
      },
    ],
  },
  {
    id: "terminal-configuration",
    label: "Terminal & Configuration",
    placement: "content",
    items: [
      {
        id: "terminal-list",
        label: "Terminal List",
        icon: Terminal,
        href: "/companies/[companyId]/terminals?view=list",
        permission: "view.company.terminals",
      },
      {
        id: "terminal-configuration",
        label: "Terminal Settings",
        icon: MonitorCog,
        href: "/companies/[companyId]/terminals?view=terminal",
        permission: "view.company.terminals",
      },
      {
        id: "business-info",
        label: "Business Info",
        icon: Settings,
        href: "/companies/[companyId]/settings?view=business",
        permission: "view.company.settings",
      },
      {
        id: "vat-discount",
        label: "VAT / Discount",
        icon: BaggageClaimIcon,
        href: "/companies/[companyId]/settings?view=vat",
        permission: "view.company.settings",
      },
      {
        id: "sales-accounts",
        label: "Sales Accounts",
        icon: CreditCard,
        href: "/companies/[companyId]/settings/sales-accounts",
        permission: "view.company.settings",
      },
      {
        id: "printer",
        label: "Printer Setup",
        icon: Printer,
        href: "/companies/[companyId]/terminals?view=printer",
        permission: "view.company.terminals",
      },
      {
        id: "company-subscription",
        label: "Subscription",
        icon: CreditCard,
        href: "/companies/[companyId]/subscription",
        permission: "view.company.subscription",
      },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    placement: "content",
    items: [
      {
        id: "company",
        label: "Company",
        icon: Building2,
        href: "/companies/[companyId]",
        permission: "view.company",
        roles: ["manager"],
      },
      {
        id: "branches",
        label: "Branches",
        icon: StoreIcon,
        href: "/companies/[companyId]/branches",
        permission: "view.company",
        roles: ["manager"],
      },
      // {
      //   id: "cost-center",
      //   label: "Cost Center",
      //   icon: ChevronRight,
      //   roles: ["manager"],
      //   disabled: true,
      //   badge: "Soon",
      // },
      // {
      //   id: "branch-center",
      //   label: "Branch Center",
      //   icon: ChevronRight,
      //   roles: ["manager"],
      //   disabled: true,
      //   badge: "Soon",
      // },
      // {
      //   id: "use-center",
      //   label: "Use Center",
      //   icon: ChevronRight,
      //   roles: ["manager"],
      //   disabled: true,
      //   badge: "Soon",
      // },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    placement: "content",
    items: [
      {
        id: "companies",
        label: "Companies",
        icon: StoreIcon,
        href: "/companies",
        permission: "view.company",
        roles: ["admin"],
      },
      {
        id: "terminals",
        label: "Terminals",
        icon: Terminal,
        href: "/terminals",
        permission: "view.admin.terminals",
        roles: ["admin"],
      },
      {
        id: "subscriptions",
        label: "Subscriptions",
        icon: CreditCard,
        href: "/subscriptions",
        permission: "view.admin.subscriptions",
        roles: ["admin"],
      },
      {
        id: "pending-approvals",
        label: "Approvals",
        icon: FileClock,
        href: "/approvals",
        permission: "view.admin.approvals",
        roles: ["admin", "manager"],
      },
      {
        id: "permission-matrix",
        label: "Permissions",
        icon: ShieldCheck,
        href: "/admin/permissions",
        permission: "view.admin.settings",
        roles: ["admin"],
      },
      {
        id: "system-settings",
        label: "System Settings",
        icon: Settings,
        href: "/admin/settings",
        permission: "view.admin.settings",
        roles: ["admin"],
      },
      {
        id: "user-management",
        label: "User Management",
        icon: Users,
        href: "/accounts",
        permission: "view.accounts",
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    placement: "footer",
    items: [
      {
        id: "profile",
        label: "Profile",
        icon: UserRound,
        href: "/accounts/[profileId]",
        permission: "view.profile",
        keepVisibleWithoutHref: true,
      },
      {
        id: "help",
        label: "Help Center",
        icon: HelpCircle,
        href: "/help",
        permission: "view.help",
        keepVisibleWithoutHref: true,
      },
    ],
  },
];

export function getNavByRole(role: UserRole) {
  const userPermissions = rolePermissions[role] ?? [];
  return routes.filter(
    (route) => route.showInNav && userPermissions.includes(route.permission),
  );
}

function resolveContextHref(
  href: string | undefined,
  context: SidebarNavContext,
): string | undefined {
  if (!href) return undefined;

  const replacements: Record<string, string | null | undefined> = {
    companyId: context.companyId,
    profileId: context.profileId,
  };

  let resolvedHref = href;

  for (const [key, value] of Object.entries(replacements)) {
    const token = `[${key}]`;

    if (!resolvedHref.includes(token)) {
      continue;
    }

    if (!value) {
      return undefined;
    }

    resolvedHref = resolvedHref.replace(token, value);
  }

  return resolvedHref;
}

function buildSidebarItem(
  role: UserRole,
  item: SidebarNavItemConfig,
  userPermissions: Permission[],
  context: SidebarNavContext,
): SidebarNavItem | null {
  if (item.roles && !item.roles.includes(role)) {
    return null;
  }

  if (item.permission && !userPermissions.includes(item.permission)) {
    return null;
  }

  const children = item.children
    ?.map((child) => buildSidebarItem(role, child, userPermissions, context))
    .filter((child): child is SidebarNavItem => child !== null);

  const href = resolveContextHref(item.href, context);
  const shouldHideForMissingHref =
    item.href && !href && !item.disabled && !item.keepVisibleWithoutHref;

  if (shouldHideForMissingHref && (!children || children.length === 0)) {
    return null;
  }

  if (!href && !item.disabled && (!children || children.length === 0)) {
    return null;
  }

  return {
    id: item.id,
    label: item.label,
    icon: item.icon,
    href,
    disabled: item.disabled || (Boolean(item.href) && !href),
    badge:
      item.id === "pos"
        ? context.posStatus === "in_use"
          ? "In use"
          : "Available"
        : item.badge,
    badgeTone:
      item.id === "pos"
        ? context.posStatus === "in_use"
          ? "active"
          : "success"
        : "neutral",
    priority: item.priority,
    children,
  };
}

export function getSidebarSections(
  role: UserRole,
  context: SidebarNavContext = {},
): SidebarNavSection[] {
  const userPermissions = rolePermissions[role] ?? [];

  return sidebarNavConfig
    .map((section) => {
      const items = section.items
        .map((item) => buildSidebarItem(role, item, userPermissions, context))
        .filter((item): item is SidebarNavItem => item !== null);

      return {
        id: section.id,
        label: section.label,
        icon: section.icon,
        variant: section.variant ?? "list",
        placement: section.placement ?? "content",
        items,
      } satisfies SidebarNavSection;
    })
    .filter((section) => section.items.length > 0);
}
