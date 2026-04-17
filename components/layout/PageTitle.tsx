"use client";

import { usePathname } from "next/navigation";
import { appRoutes } from "@/lib/access-control-core";

function getPageLabel(pathname: string): string {
  if (!pathname || pathname === "/") return "Dashboard";

  // Sort routes by length descending so more specific paths match first
  const sortedRoutes = [...appRoutes].sort((a, b) => b.href.length - a.href.length);

  for (const r of sortedRoutes) {
    // Convert NEXT.js path like /companies/[companyId]/settings to regex
    const regexPath = r.href.replace(/\[.*?\]/g, "[^/]+");
    const regex = new RegExp(`^${regexPath}(/.*)?$`);
    if (regex.test(pathname)) {
      return r.label;
    }
  }

  return "Dashboard";
}

export function PageTitle() {
  const pathname = usePathname();
  const label = getPageLabel(pathname);
  
  return <>{label}</>;
}
