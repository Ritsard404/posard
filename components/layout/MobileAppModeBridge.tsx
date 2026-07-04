"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getMobileAppRouteRestriction,
  isRestrictedMobileAppMode,
  type PosardAppMode,
} from "@/lib/mobile-app-mode";
import { useMobileAppMode } from "@/hooks/use-mobile-app-mode";

export function MobileAppModeBridge({
  initialMode,
}: {
  initialMode: PosardAppMode;
}) {
  const mode = useMobileAppMode(initialMode);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastRefreshKey = useRef<string | null>(null);

  useEffect(() => {
    const restriction = getMobileAppRouteRestriction({
      pathname,
      search: searchParams,
      mode,
    });
    const refreshKey = `${mode}:${pathname}?${searchParams.toString()}`;

    if (
      isRestrictedMobileAppMode(mode) &&
      restriction.restricted &&
      lastRefreshKey.current !== refreshKey
    ) {
      lastRefreshKey.current = refreshKey;
      router.refresh();
    }
  }, [mode, pathname, router, searchParams]);

  return null;
}
