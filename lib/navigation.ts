import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  BaggageClaimIcon,
  Package,
  BarChart3,
} from "lucide-react";

// lib/navigation.ts
export type UserRole = "admin" | "manager" | "cashier";

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
  {
    href: "/pos",
    roles: ["cashier", "manager"],
    label: "Point of Sale",
    icon: ShoppingCart, // Pass the component directly
  },
  {
    href: "/product",
    roles: ["manager"],
    label: "Products",
    icon: BaggageClaimIcon,
  },
  {
    href: "/inventory",
    roles: ["manager"],
    label: "Inventory",
    icon: Package,
  },
  {
    href: "/report",
    roles: ["manager", "admin"],
    label: "Reports",
    icon: BarChart3,
  },
  {
    href: "/accounts",
    roles: ["admin"],
    label: "Accounts",
    icon: Users,
  },
  {
    href: "/admin",
    roles: ["manager"],
    label: "Accounts",
    icon: Users,
  },
  {
    href: "/settings",
    roles: ["manager"],
    label: "Settings",
    icon: Settings,
  },
];
export function getNavByRole(role: UserRole) {
  return navItems.filter((item) => item.roles.includes(role));
}
