/**
 * Lightweight access-control primitives for server/proxy code.
 * Keep icon-heavy sidebar config out of request-critical modules.
 */

export type UserRole = "admin" | "manager" | "cashier";

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

export const publicRoutes = [
  "/",
  "/about",
  "/features",
  "/solutions",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/manifest.webmanifest",
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/error",
  "/auth/forgot-password",
  "/auth/post-login",
  "/auth/sign-up",
  "/auth/sign-up-success",
  "/auth/update-password",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export const authRoutes = ["/auth/login", "/auth/sign-up"] as const;

export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => route === pathname);
}

export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route));
}

export type Permission =
  | "view.dashboard"
  | "view.pos"
  | "view.inventory"
  | "view.transactions"
  | "view.accounts"
  | "view.reports"
  | "view.ai.reports"
  | "view.profile"
  | "view.help"
  | "view.company"
  | "view.company.settings"
  | "view.company.terminals"
  | "view.company.subscription"
  | "view.product"
  | "view.admin"
  | "view.admin.settings"
  | "view.admin.terminals"
  | "view.admin.subscriptions"
  | "view.admin.approvals"
  | "view.notifications"
  | "manage.products"
  | "manage.inventory"
  | "manage.suppliers"
  | "manage.purchase-orders"
  | "manage.receiving"
  | "manage.transfers"
  | "manage.expenses"
  | "manage.customers"
  | "manage.loyalty"
  | "manage.promotions"
  | "manage.kitchen"
  | "approve.requests"
  | "approve.discounts"
  | "approve.refunds"
  | "approve.stock-adjustments"
  | "approve.expenses"
  | "approve.transfers"
  | "manage.users"
  | "manage.terminals"
  | "view.audit-trail"
  | "manage.notifications"
  | "view.sync-center"
  | "resolve.sync-conflicts";

export const permissionCatalog: Array<{
  key: Permission;
  prismaKey: string;
  group: string;
  label: string;
  description?: string;
  isSensitive?: boolean;
}> = [
  { key: "view.dashboard", prismaKey: "VIEW_DASHBOARD", group: "Navigation", label: "View dashboard" },
  { key: "view.pos", prismaKey: "VIEW_POS", group: "POS sales operations", label: "Use point of sale", isSensitive: true },
  { key: "view.inventory", prismaKey: "VIEW_INVENTORY", group: "Inventory", label: "View inventory" },
  { key: "view.transactions", prismaKey: "VIEW_TRANSACTIONS", group: "Reports", label: "View transactions" },
  { key: "view.accounts", prismaKey: "VIEW_ACCOUNTS", group: "Users", label: "View accounts", isSensitive: true },
  { key: "view.reports", prismaKey: "VIEW_REPORTS", group: "Reports", label: "View reports" },
  { key: "view.ai.reports", prismaKey: "VIEW_AI_REPORTS", group: "Reports", label: "Use AI reports" },
  { key: "view.profile", prismaKey: "VIEW_PROFILE", group: "Users", label: "View own profile" },
  { key: "view.help", prismaKey: "VIEW_HELP", group: "Help", label: "View help center" },
  { key: "view.company", prismaKey: "VIEW_COMPANY", group: "Company", label: "View company" },
  { key: "view.company.settings", prismaKey: "VIEW_COMPANY_SETTINGS", group: "Company", label: "View company settings" },
  { key: "view.company.terminals", prismaKey: "VIEW_COMPANY_TERMINALS", group: "Terminals", label: "View company terminals" },
  { key: "view.company.subscription", prismaKey: "VIEW_COMPANY_SUBSCRIPTION", group: "Billing", label: "View company subscription" },
  { key: "view.product", prismaKey: "VIEW_PRODUCT", group: "Inventory", label: "View products" },
  { key: "view.admin", prismaKey: "VIEW_ADMIN", group: "Administration", label: "View administration", isSensitive: true },
  { key: "view.admin.settings", prismaKey: "VIEW_ADMIN_SETTINGS", group: "Administration", label: "View system settings", isSensitive: true },
  { key: "view.admin.terminals", prismaKey: "VIEW_ADMIN_TERMINALS", group: "Administration", label: "View all terminals", isSensitive: true },
  { key: "view.admin.subscriptions", prismaKey: "VIEW_ADMIN_SUBSCRIPTIONS", group: "Administration", label: "View all subscriptions", isSensitive: true },
  { key: "view.admin.approvals", prismaKey: "VIEW_ADMIN_APPROVALS", group: "Approvals", label: "View approval inbox", isSensitive: true },
  { key: "view.notifications", prismaKey: "VIEW_NOTIFICATIONS", group: "Notifications", label: "View notifications" },
  { key: "manage.products", prismaKey: "MANAGE_PRODUCTS", group: "Inventory", label: "Manage products" },
  { key: "manage.inventory", prismaKey: "MANAGE_INVENTORY", group: "Inventory", label: "Manage inventory", isSensitive: true },
  { key: "manage.suppliers", prismaKey: "MANAGE_SUPPLIERS", group: "Purchasing", label: "Manage suppliers" },
  { key: "manage.purchase-orders", prismaKey: "MANAGE_PURCHASE_ORDERS", group: "Purchasing", label: "Manage purchase orders" },
  { key: "manage.receiving", prismaKey: "MANAGE_RECEIVING", group: "Purchasing", label: "Manage receiving" },
  { key: "manage.transfers", prismaKey: "MANAGE_TRANSFERS", group: "Branch transfers", label: "Manage transfers" },
  { key: "manage.expenses", prismaKey: "MANAGE_EXPENSES", group: "Expenses", label: "Manage expenses" },
  { key: "manage.customers", prismaKey: "MANAGE_CUSTOMERS", group: "Customers", label: "Manage customers" },
  { key: "manage.loyalty", prismaKey: "MANAGE_LOYALTY", group: "Customers", label: "Manage loyalty" },
  { key: "manage.promotions", prismaKey: "MANAGE_PROMOTIONS", group: "Promotions", label: "Manage promotions" },
  { key: "manage.kitchen", prismaKey: "MANAGE_KITCHEN", group: "Kitchen", label: "Manage kitchen workflow" },
  { key: "approve.requests", prismaKey: "APPROVE_REQUESTS", group: "Approvals", label: "Approve requests", isSensitive: true },
  { key: "approve.discounts", prismaKey: "APPROVE_DISCOUNTS", group: "Approvals", label: "Approve discount overrides", isSensitive: true },
  { key: "approve.refunds", prismaKey: "APPROVE_REFUNDS", group: "Approvals", label: "Approve refunds", isSensitive: true },
  { key: "approve.stock-adjustments", prismaKey: "APPROVE_STOCK_ADJUSTMENTS", group: "Approvals", label: "Approve stock adjustments", isSensitive: true },
  { key: "approve.expenses", prismaKey: "APPROVE_EXPENSES", group: "Approvals", label: "Approve expenses", isSensitive: true },
  { key: "approve.transfers", prismaKey: "APPROVE_TRANSFERS", group: "Approvals", label: "Approve transfers", isSensitive: true },
  { key: "manage.users", prismaKey: "MANAGE_USERS", group: "Users", label: "Manage users", isSensitive: true },
  { key: "manage.terminals", prismaKey: "MANAGE_TERMINALS", group: "Terminals", label: "Manage terminals", isSensitive: true },
  { key: "view.audit-trail", prismaKey: "VIEW_AUDIT_TRAIL", group: "Audit trail", label: "View audit trail", isSensitive: true },
  { key: "manage.notifications", prismaKey: "MANAGE_NOTIFICATIONS", group: "Notifications", label: "Manage notifications" },
  { key: "view.sync-center", prismaKey: "VIEW_SYNC_CENTER", group: "Offline sync", label: "View sync center" },
  { key: "resolve.sync-conflicts", prismaKey: "RESOLVE_SYNC_CONFLICTS", group: "Offline sync", label: "Resolve sync conflicts", isSensitive: true },
];

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view.dashboard",
    "view.accounts",
    "view.reports",
    "view.ai.reports",
    "view.profile",
    "view.help",
    "view.admin",
    "view.admin.settings",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
    "view.admin.terminals",
    "view.admin.subscriptions",
    "view.admin.approvals",
    "view.notifications",
    "approve.requests",
    "manage.users",
    "manage.terminals",
    "view.audit-trail",
    "manage.notifications",
    "manage.products",
    "manage.inventory",
    "manage.suppliers",
    "manage.purchase-orders",
    "manage.receiving",
    "manage.transfers",
    "manage.expenses",
    "manage.customers",
    "manage.loyalty",
    "manage.promotions",
    "manage.kitchen",
    "view.sync-center",
    "resolve.sync-conflicts",
  ],
  manager: [
    "view.dashboard",
    "view.accounts",
    "view.pos",
    "view.inventory",
    "view.product",
    "view.reports",
    "view.ai.reports",
    "view.profile",
    "view.help",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
    "view.admin.approvals",
    "view.notifications",
    "manage.products",
    "manage.inventory",
    "manage.suppliers",
    "manage.purchase-orders",
    "manage.receiving",
    "manage.transfers",
    "manage.expenses",
    "manage.customers",
    "manage.loyalty",
    "manage.promotions",
    "manage.kitchen",
    "approve.requests",
    "approve.discounts",
    "approve.refunds",
    "approve.stock-adjustments",
    "approve.expenses",
    "approve.transfers",
    "view.audit-trail",
    "view.sync-center",
    "resolve.sync-conflicts",
  ],
  cashier: [
    "view.dashboard",
    "view.pos",
    "view.transactions",
    "view.profile",
    "view.help",
    "view.notifications",
  ],
};

export interface AppRouteConfig {
  href: string;
  permission: Permission;
  label: string;
  showInNav: boolean;
}

export function isBillingRestrictedRole(role: string | null): role is "manager" | "cashier" {
  return role === "manager" || role === "cashier";
}

export function isBillingRestrictedRoute(
  role: string | null,
  pathname: string,
): boolean {
  if (role === "manager") {
    return pathname === "/accounts";
  }

  return false;
}

export const appRoutes: AppRouteConfig[] = [
  {
    href: "/pos",
    permission: "view.pos",
    label: "Point of Sale",
    showInNav: true,
  },
  {
    href: "/pos/customer-display/[terminalId]",
    permission: "view.pos",
    label: "Customer Display",
    showInNav: false,
  },
  {
    href: "/dashboard",
    permission: "view.dashboard",
    label: "Dashboard",
    showInNav: true,
  },
  {
    href: "/help",
    permission: "view.help",
    label: "Help Center",
    showInNav: false,
  },
  {
    href: "/product",
    permission: "view.product",
    label: "Products & Inventory",
    showInNav: true,
  },
  {
    href: "/inventory-ledger",
    permission: "manage.inventory",
    label: "Inventory Health",
    showInNav: true,
  },
  {
    href: "/sync",
    permission: "view.sync-center",
    label: "Sync Center",
    showInNav: true,
  },
  {
    href: "/expenses",
    permission: "manage.expenses",
    label: "Expenses",
    showInNav: true,
  },
  {
    href: "/suppliers",
    permission: "manage.suppliers",
    label: "Suppliers",
    showInNav: true,
  },
  {
    href: "/purchase-orders",
    permission: "manage.purchase-orders",
    label: "Purchase Orders",
    showInNav: true,
  },
  {
    href: "/transfers",
    permission: "manage.transfers",
    label: "Branch Transfers",
    showInNav: true,
  },
  {
    href: "/customers",
    permission: "manage.customers",
    label: "Customers",
    showInNav: true,
  },
  {
    href: "/promotions",
    permission: "manage.promotions",
    label: "Promotions",
    showInNav: true,
  },
  {
    href: "/kitchen",
    permission: "manage.kitchen",
    label: "Kitchen",
    showInNav: true,
  },
  {
    href: "/reports",
    permission: "view.reports",
    label: "Reports",
    showInNav: true,
  },
  {
    href: "/reports/ai",
    permission: "view.ai.reports",
    label: "AI Report Assistant",
    showInNav: true,
  },
  {
    href: "/accounts",
    permission: "view.accounts",
    label: "User Management",
    showInNav: true,
  },
  {
    href: "/companies",
    permission: "view.company",
    label: "Manage Companies",
    showInNav: true,
  },
  {
    href: "/companies/[companyId]",
    permission: "view.company",
    label: "Company",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/terminals",
    permission: "view.company.terminals",
    label: "Terminal List",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/subscription",
    permission: "view.company.subscription",
    label: "Subscriptions",
    showInNav: false,
  },
  {
    href: "/terminals",
    permission: "view.admin.terminals",
    label: "Terminals",
    showInNav: false,
  },
  {
    href: "/subscriptions",
    permission: "view.admin.subscriptions",
    label: "Subscriptions",
    showInNav: false,
  },
  {
    href: "/approvals",
    permission: "view.admin.approvals",
    label: "Approvals",
    showInNav: false,
  },
  {
    href: "/admin/permissions",
    permission: "view.admin.settings",
    label: "Permission Matrix",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/settings",
    permission: "view.company.settings",
    label: "Business Info",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/settings/sales-accounts",
    permission: "view.company.settings",
    label: "Sales Accounts",
    showInNav: false,
  },
  {
    href: "/profile",
    permission: "view.profile",
    label: "Profile",
    showInNav: false,
  },
  {
    href: "/accounts/[profileId]",
    permission: "view.profile",
    label: "Profile",
    showInNav: false,
  },
  {
    href: "/settings",
    permission: "view.company.settings",
    label: "Settings",
    showInNav: false,
  },
  {
    href: "/admin",
    permission: "view.admin",
    label: "Administration",
    showInNav: false,
  },
  {
    href: "/admin/settings",
    permission: "view.admin.settings",
    label: "System Settings",
    showInNav: false,
  },
];

function routeToRegExp(href: string) {
  const pattern = href.replace(/\[.+?\]/g, "[^/]+");
  return new RegExp(`^${pattern}(?:/.*)?$`);
}

function getMatchingRoute(pathname: string) {
  const sortedRoutes = [...appRoutes].sort(
    (a, b) => b.href.length - a.href.length,
  );
  return sortedRoutes.find((route) => routeToRegExp(route.href).test(pathname));
}

function isConcreteHref(href: string) {
  return !href.includes("[");
}

export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isValidUserRole(role)) {
    return [];
  }

  return rolePermissions[role];
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
  const first = appRoutes.find(
    (route) =>
      isConcreteHref(route.href) && userPermissions.includes(route.permission),
  );

  return first?.href ?? "/auth/login";
}

export function resolveProtectedRouteRedirect(input: {
  role: string | null;
  pathname: string;
}) {
  if (!hasPermissionForRoute(input.role, input.pathname)) {
    const destination = getFirstAccessibleRoute(input.role);
    return destination === "/auth/login" || destination === input.pathname
      ? "/unauthorized"
      : destination;
  }

  return null;
}
