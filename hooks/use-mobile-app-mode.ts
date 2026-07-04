"use client";

import * as React from "react";
import {
  getClientViewportAppMode,
  normalizePosardAppMode,
  POSARD_APP_MODE_COOKIE,
  type PosardAppMode,
} from "@/lib/mobile-app-mode";
import { getPlatform, isCapacitorRuntime } from "@/src/lib/capacitor/platform";

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

function writeAppModeCookie(mode: PosardAppMode) {
  document.cookie = `${POSARD_APP_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function detectClientAppMode(): PosardAppMode {
  if (isCapacitorRuntime()) {
    const platform = getPlatform();
    return platform === "ios" ? "capacitor-ios" : "capacitor-android";
  }

  return getClientViewportAppMode(window.innerWidth);
}

export function useMobileAppMode(initialMode?: PosardAppMode | null) {
  const [mode, setMode] = React.useState<PosardAppMode>(
    initialMode ?? "desktop-browser",
  );

  React.useEffect(() => {
    const syncMode = () => {
      const nextMode = detectClientAppMode();
      const currentCookie = normalizePosardAppMode(
        decodeURIComponent(readCookie(POSARD_APP_MODE_COOKIE) ?? ""),
      );

      setMode(nextMode);
      document.documentElement.dataset.posardAppMode = nextMode;

      if (currentCookie !== nextMode) {
        writeAppModeCookie(nextMode);
        window.dispatchEvent(
          new CustomEvent("posard:app-mode-change", { detail: nextMode }),
        );
      }
    };

    syncMode();

    const mediaQueries = [
      window.matchMedia("(max-width: 767px)"),
      window.matchMedia("(min-width: 768px) and (max-width: 1279px)"),
      window.matchMedia("(min-width: 1280px)"),
    ];

    mediaQueries.forEach((query) =>
      query.addEventListener("change", syncMode),
    );
    window.addEventListener("resize", syncMode);

    return () => {
      mediaQueries.forEach((query) =>
        query.removeEventListener("change", syncMode),
      );
      window.removeEventListener("resize", syncMode);
    };
  }, []);

  return mode;
}
