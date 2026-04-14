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
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileClock,
  ListX,
  MonitorCog,
  Package,
  Printer,
  Receipt,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  StoreIcon,
  Terminal,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "admin" | "manager" | "cashier";

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

export type Permission =
  | "view.dashboard"
  | "view.pos"
  | "view.inventory"
  | "view.orders"
  | "view.transactions"
  | "view.accounts"
  | "view.reports"
  | "view.profile"
  | "view.company"
  | "view.company.settings"
  | "view.company.terminals"
  | "view.company.subscription"
  | "view.product"
  | "view.admin";

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view.dashboard",
    "view.accounts",
    "view.reports",
    "view.profile",
    "view.admin",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
  ],
  manager: [
    "view.dashboard",
    "view.accounts",
    "view.pos",
    "view.orders",
    "view.inventory",
    "view.product",
    "view.reports",
    "view.profile",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
  ],
  cashier: ["view.dashboard", "view.pos", "view.transactions", "view.profile"],
};

export interface RouteConfig {
  href: string;
  permission: Permission;
  label: string;
  icon: LucideIcon;
  showInNav: boolean;
}

export const routes: RouteConfig[] = [
  {
    href: "/dashboard",
    permission: "view.dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    showInNav: true,
  },
  {
    href: "/pos",
    permission: "view.pos",
    label: "POS",
    icon: ShoppingCart,
    showInNav: true,
  },
  {
    href: "/product",
    permission: "view.product",
    label: "Products & Inventory",
    icon: Package,
    showInNav: true,
  },
  {
    href: "/report",
    permission: "view.reports",
    label: "Reports",
    icon: BarChart3,
    showInNav: true,
  },
  {
    href: "/accounts",
    permission: "view.accounts",
    label: "User Management",
    icon: Users,
    showInNav: true,
  },
  {
    href: "/companies",
    permission: "view.company",
    label: "Manage Companies",
    icon: Building2,
    showInNav: true,
  },
  {
    href: "/companies/[companyId]",
    permission: "view.company",
    label: "Company",
    icon: Building2,
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/terminals",
    permission: "view.company.terminals",
    label: "Terminal List",
    icon: Terminal,
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/subscription",
    permission: "view.company.subscription",
    label: "Subscriptions",
    icon: CreditCard,
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/settings",
    permission: "view.company.settings",
    label: "Business Info",
    icon: Settings,
    showInNav: false,
  },
  {
    href: "/profile",
    permission: "view.profile",
    label: "Profile",
    icon: Settings,
    showInNav: false,
  },
  {
    href: "/accounts/[profileId]",
    permission: "view.profile",
    label: "Profile",
    icon: UserRound,
    showInNav: false,
  },
  {
    href: "/settings",
    permission: "view.company.settings",
    label: "Settings",
    icon: Settings,
    showInNav: false,
  },
  {
    href: "/admin",
    permission: "view.admin",
    label: "Administration",
    icon: Users,
    showInNav: false,
  },
];

export interface SidebarNavContext {
  companyId?: string | null;
  profileId?: string | null;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
  badge?: string;
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
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        permission: "view.dashboard",
      },
      {
        id: "pos",
        label: "POS",
        icon: ShoppingCart,
        href: "/pos",
        permission: "view.pos",
      },
      {
        id: "orders-sales",
        label: "Orders / Sales",
        icon: Receipt,
        roles: ["manager", "cashier"],
        disabled: true,
        badge: "Soon",
      },
      {
        id: "products-inventory",
        label: "Products & Inventory",
        icon: Boxes,
        href: "/product",
        permission: "view.product",
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
        id: "reports-overview",
        label: "Overview",
        icon: FileBarChart2,
        href: "/report?view=overview",
        permission: "view.reports",
      },
      {
        id: "reports-daily-transactions",
        label: "Daily Transactions",
        icon: CalendarDays,
        roles: ["admin", "manager"],
        href: "/report?view=daily-transactions",
        permission: "view.reports",
      },
      {
        id: "reports-transaction-list",
        label: "Transaction List",
        icon: ClipboardList,
        roles: ["admin", "manager"],
        href: "/report?view=transaction-list",
        permission: "view.reports",
      },
      {
        id: "reports-z-reading",
        label: "Z-Reading",
        icon: Receipt,
        roles: ["admin", "manager"],
        href: "/report?view=z-reading",
        permission: "view.reports",
      },
      {
        id: "reports-x-reading",
        label: "X-Reading",
        icon: ScanSearch,
        roles: ["admin", "manager"],
        href: "/report?view=x-reading",
        permission: "view.reports",
      },
      {
        id: "reports-sales",
        label: "Sales Reports",
        icon: BarChart3,
        roles: ["admin", "manager"],
        href: "/report?view=sales",
        permission: "view.reports",
      },
      {
        id: "reports-sales-book",
        label: "Sales Book",
        icon: Receipt,
        roles: ["admin", "manager"],
        href: "/report?view=sales-book",
        permission: "view.reports",
      },
      {
        id: "reports-voided-list",
        label: "Voided List",
        icon: ListX,
        roles: ["admin", "manager"],
        href: "/report?view=voided-list",
        permission: "view.reports",
      },
      {
        id: "reports-pwd-list",
        label: "PWD List",
        icon: ShieldAlert,
        roles: ["admin", "manager"],
        href: "/report?view=pwd-list",
        permission: "view.reports",
      },
      {
        id: "reports-senior-list",
        label: "Senior List",
        icon: ShieldAlert,
        roles: ["admin", "manager"],
        href: "/report?view=senior-list",
        permission: "view.reports",
      },
      {
        id: "reports-refund-invoices",
        label: "Refund Invoices",
        icon: RotateCcw,
        roles: ["admin", "manager"],
        href: "/report?view=refund-invoices",
        permission: "view.reports",
      },
      {
        id: "reports-returned-items",
        label: "Returned Items",
        icon: RotateCcw,
        roles: ["admin", "manager"],
        href: "/report?view=returned-items",
        permission: "view.reports",
      },
      {
        id: "reports-returned-records",
        label: "Returned Records",
        icon: FileClock,
        roles: ["admin", "manager"],
        href: "/report?view=returned-records",
        permission: "view.reports",
      },
      {
        id: "reports-audit",
        label: "Audit Trail",
        icon: FileClock,
        roles: ["admin", "manager"],
        href: "/report?view=audit",
        permission: "view.reports",
      },
      {
        id: "reports-transactions",
        label: "Transaction History",
        icon: ClipboardList,
        roles: ["admin", "manager", "cashier"],
        href: "/report?view=transactions",
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
        href: "/companies/[companyId]/terminals",
        permission: "view.company.terminals",
      },
      {
        id: "terminal-configuration",
        label: "Terminal Settings",
        icon: MonitorCog,
        href: "/companies/[companyId]/terminals",
        permission: "view.company.terminals",
      },
      {
        id: "business-info",
        label: "Business Info",
        icon: Settings,
        href: "/companies/[companyId]/settings",
        permission: "view.company.settings",
      },
      {
        id: "vat-discount",
        label: "VAT / Discount",
        icon: BaggageClaimIcon,
        href: "/companies/[companyId]/settings",
        permission: "view.company.settings",
      },
      {
        id: "printer",
        label: "Printer Setup",
        icon: Printer,
        href: "/companies/[companyId]/terminals",
        permission: "view.company.terminals",
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
        id: "branches-centers",
        label: "Branches / Centers",
        icon: ChevronRight,
        roles: ["manager"],
        disabled: true,
        badge: "Soon",
      },
      {
        id: "cost-center",
        label: "Cost Center",
        icon: ChevronRight,
        roles: ["manager"],
        disabled: true,
        badge: "Soon",
      },
      {
        id: "branch-center",
        label: "Branch Center",
        icon: ChevronRight,
        roles: ["manager"],
        disabled: true,
        badge: "Soon",
      },
      {
        id: "use-center",
        label: "Use Center",
        icon: ChevronRight,
        roles: ["manager"],
        disabled: true,
        badge: "Soon",
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Users,
    variant: "dropdown",
    placement: "content",
    items: [
      {
        id: "manage-companies",
        label: "Manage Companies",
        icon: StoreIcon,
        href: "/companies",
        permission: "view.company",
        roles: ["admin"],
      },
      {
        id: "manage-terminals",
        label: "Manage Terminals",
        icon: Terminal,
        roles: ["admin"],
        disabled: true,
        badge: "Soon",
      },
      {
        id: "subscriptions",
        label: "Subscriptions",
        icon: CreditCard,
        href: "/companies/[companyId]/subscription",
        permission: "view.company.subscription",
        roles: ["admin"],
        keepVisibleWithoutHref: true,
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
    ],
  },
];

function routeToRegExp(href: string) {
  const pattern = href.replace(/\[.+?\]/g, "[^/]+");
  return new RegExp(`^${pattern}(?:/.*)?$`);
}

function getMatchingRoute(pathname: string) {
  const sortedRoutes = [...routes].sort((a, b) => b.href.length - a.href.length);
  return sortedRoutes.find((route) => routeToRegExp(route.href).test(pathname));
}

function isConcreteHref(href: string) {
  return !href.includes("[");
}

export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isValidUserRole(role)) return [];
  return rolePermissions[role];
}

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
    badge: item.badge,
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

export function hasPermissionForRoute(
  role: string | null,
  pathname: string,
): boolean {
  const userPermissions = getPermissionsForRole(role);
  const route = getMatchingRoute(pathname);

  if (!route) {
    return true;
  }

  return userPermissions.includes(route.permission);
}

export function getFirstAccessibleRoute(role: string | null): string {
  const userPermissions = getPermissionsForRole(role);
  const first = routes.find(
    (route) => isConcreteHref(route.href) && userPermissions.includes(route.permission),
  );
  return first?.href ?? "/auth/login";
}
