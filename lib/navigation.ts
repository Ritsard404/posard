import {
  Box,
  Calculator,
  LayoutDashboard,
  Receipt,
  Users,
  ShoppingCart,
  BarChart,
  Settings,
  UserCircle,
} from "lucide-react";

// lib/navigation.ts
export type UserRole = "admin" | "manager" | "cashier";

// lib/navigation.ts
export const roleRouteMap: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/profile",
    "/users",
    "/reports",
    "/settings",
    "/orders",
    "/inventory",
    "/pos",
    "/transactions",
  ],
  manager: ["/dashboard", "/profile", "/orders", "/inventory"],
  cashier: ["/dashboard", "/profile", "/pos", "/transactions"],
};

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

export const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "cashier"],
  },
  { label: "POS", href: "/pos", icon: Calculator, roles: ["admin", "cashier"] },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Box,
    roles: ["admin", "manager"],
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    roles: ["admin", "manager"],
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: Receipt,
    roles: ["admin", "cashier"],
  },
  { label: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { label: "Reports", href: "/reports", icon: BarChart, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
  {
    label: "Profile",
    href: "/profile",
    icon: UserCircle,
    roles: ["admin", "manager", "cashier"],
  },
];
export function getNavByRole(role: UserRole) {
  return navItems.filter((item) => item.roles.includes(role));
}
