"use client";

import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import type React from "react";
import { Check, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type InstallStatus =
  | "checking"
  | "available"
  | "installing"
  | "installed"
  | "accepted"
  | "manual"
  | "unsupported";

type InstallState = {
  isInstalled: boolean;
  status: InstallStatus;
  prompt: BeforeInstallPromptEvent | null;
  fallbackReason: "ios" | "desktop" | "android" | "browser" | null;
  serviceWorkerReady: boolean;
  serviceWorkerControlled: boolean;
  error: string | null;
};

let installState: InstallState = {
  isInstalled: false,
  status: "checking",
  prompt: null,
  fallbackReason: null,
  serviceWorkerReady: false,
  serviceWorkerControlled: false,
  error: null,
};

let isListening = false;
let checkingTimer: number | null = null;
let cleanupInstallListeners: (() => void) | null = null;
const subscribers = new Set<() => void>();
const installDebugEnabled = process.env.NODE_ENV !== "production";

function debugInstall(message: string, details?: Record<string, unknown>) {
  let isDebugEnabled = installDebugEnabled;
  try {
    isDebugEnabled =
      isDebugEnabled ||
      (typeof window !== "undefined" &&
        window.localStorage.getItem("POSARD_PWA_DEBUG") === "1");
  } catch {
    isDebugEnabled = installDebugEnabled;
  }

  if (!isDebugEnabled) {
    return;
  }

  console.info(`[POSard PWA] ${message}`, details ?? {});
}

function emitInstallState() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function setInstallState(nextState: Partial<InstallState>) {
  installState = { ...installState, ...nextState };
  emitInstallState();
}

function getInstallState() {
  return installState;
}

function subscribeInstallState(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && cleanupInstallListeners) {
      cleanupInstallListeners();
      cleanupInstallListeners = null;
    }
  };
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroidBrowser() {
  return /android/i.test(window.navigator.userAgent);
}

function isDesktopChromiumBrowser() {
  const userAgent = window.navigator.userAgent;
  return (
    !isIosBrowser() &&
    !isAndroidBrowser() &&
    /chrome|edg|opr|brave/i.test(userAgent)
  );
}

function getFallbackReason(): InstallState["fallbackReason"] {
  if (isIosBrowser()) {
    return "ios";
  }

  if (isDesktopChromiumBrowser()) {
    return "desktop";
  }

  if (isAndroidBrowser()) {
    return "android";
  }

  return "browser";
}

function hasManualInstallPath() {
  return isIosBrowser() || isAndroidBrowser() || isDesktopChromiumBrowser();
}

function finishCheckingIfNoPrompt() {
  if (installState.status !== "checking" || installState.prompt) {
    return;
  }

  debugInstall("beforeinstallprompt unavailable; showing fallback", {
    reason: getFallbackReason(),
  });
  setInstallState({
    status: hasManualInstallPath() ? "manual" : "unsupported",
    fallbackReason: getFallbackReason(),
  });
}

function setupInstallListeners() {
  if (isListening || typeof window === "undefined") {
    return;
  }

  isListening = true;
  const installed = isStandaloneMode();
  if (installed) {
    debugInstall("installed display mode detected");
  }
  setInstallState({
    isInstalled: installed,
    status: installed ? "installed" : "checking",
    serviceWorkerControlled:
      "serviceWorker" in navigator ? navigator.serviceWorker.controller !== null : false,
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/pos-sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        debugInstall("service worker registered", {
          scope: registration.scope,
          controlled: navigator.serviceWorker.controller !== null,
        });
        registration.update().catch(() => undefined);
        return navigator.serviceWorker.ready;
      })
      .then((registration) => {
        debugInstall("service worker ready", {
          scope: registration.scope,
          active: registration.active?.state,
          controlled: navigator.serviceWorker.controller !== null,
        });
        setInstallState({
          serviceWorkerReady: true,
          serviceWorkerControlled: navigator.serviceWorker.controller !== null,
        });
      })
      .catch((error) => {
        console.warn("Unable to register POSard service worker", error);
        setInstallState({
          error: "Service worker registration failed.",
          status: "unsupported",
          fallbackReason: getFallbackReason(),
        });
      });
  } else {
    setInstallState({
      status: "unsupported",
      fallbackReason: getFallbackReason(),
      error: "Service workers are unavailable in this browser.",
    });
  }

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    debugInstall("beforeinstallprompt fired");
    if (checkingTimer !== null) {
      window.clearTimeout(checkingTimer);
      checkingTimer = null;
    }
    setInstallState({
      isInstalled: false,
      status: "available",
      prompt: event as BeforeInstallPromptEvent,
      fallbackReason: null,
      error: null,
    });
  };

  const handleInstalled = () => {
    debugInstall("appinstalled fired");
    setInstallState({
      isInstalled: true,
      status: "installed",
      prompt: null,
      fallbackReason: null,
    });
  };

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const handleDisplayModeChange = () => {
    const nextInstalled = isStandaloneMode();
    if (nextInstalled) {
      debugInstall("installed display mode detected");
    }
    setInstallState({
      isInstalled: nextInstalled,
      status: nextInstalled ? "installed" : installState.status,
    });
  };

  const handleControllerChange = () => {
    debugInstall("service worker controller changed", {
      controlled: navigator.serviceWorker.controller !== null,
    });
    setInstallState({
      serviceWorkerControlled: navigator.serviceWorker.controller !== null,
    });
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleInstalled);
  navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
  standaloneQuery.addEventListener("change", handleDisplayModeChange);

  // Some browsers never expose beforeinstallprompt. After a short check window,
  // show explicit browser instructions instead of pretending install is ready.
  checkingTimer = window.setTimeout(
    finishCheckingIfNoPrompt,
    isDesktopChromiumBrowser() ? 8000 : 1800,
  );

  cleanupInstallListeners = () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleInstalled);
    navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    standaloneQuery.removeEventListener("change", handleDisplayModeChange);
    if (checkingTimer !== null) {
      window.clearTimeout(checkingTimer);
      checkingTimer = null;
    }
    isListening = false;
  };
}

type PwaInstallButtonProps = {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
  showFallback?: boolean;
};

export function usePwaInstall() {
  const state = useSyncExternalStore(
    subscribeInstallState,
    getInstallState,
    getInstallState,
  );

  useEffect(() => {
    setupInstallListeners();
  }, []);

  const install = async () => {
    if (!state.prompt || state.status === "installing") {
      return;
    }

    setInstallState({ status: "installing", error: null });

    try {
      debugInstall("prompt shown");
      await state.prompt.prompt();
      const choice = await state.prompt.userChoice;
      debugInstall("userChoice outcome", {
        outcome: choice.outcome,
        platform: choice.platform,
      });

      setInstallState({
        prompt: null,
        isInstalled: choice.outcome === "accepted",
        status: choice.outcome === "accepted" ? "accepted" : "manual",
        fallbackReason: choice.outcome === "accepted" ? null : getFallbackReason(),
      });
    } catch (error) {
      console.warn("POSard install prompt failed", error);
      setInstallState({
        prompt: null,
        status: hasManualInstallPath() ? "manual" : "unsupported",
        fallbackReason: getFallbackReason(),
        error: "Install prompt failed or was dismissed.",
      });
    }
  };

  return { ...state, install };
}

export function PwaInstallButton({
  className,
  variant = "outline",
  size = "default",
  label = "Install App",
  showFallback = true,
}: PwaInstallButtonProps) {
  const {
    isInstalled,
    status,
    fallbackReason,
    serviceWorkerReady,
    serviceWorkerControlled,
    error,
    install,
  } = usePwaInstall();
  const [fallbackVisible, setFallbackVisible] = useState(false);

  useEffect(() => {
    if (status === "available" || status === "installed" || status === "accepted") {
      setFallbackVisible(false);
    }
  }, [status]);

  const fallbackMessage = useMemo(() => {
    if (fallbackReason === "ios") {
      return "On iPhone or iPad, open Safari, tap Share, then choose Add to Home Screen.";
    }

    if (fallbackReason === "desktop") {
      return "Chrome or Edge supports manual install here. Open the browser menu and choose Install POSard or Apps > Install this site.";
    }

    if (fallbackReason === "android") {
      return "If the install prompt does not appear, open the browser menu and choose Install app or Add to Home screen.";
    }

    return "This browser does not expose a direct install prompt. Use the browser menu if Add to Home Screen is available.";
  }, [fallbackReason]);

  if (isInstalled && status !== "installed" && status !== "accepted") {
    return null;
  }

  const handleInstall = async () => {
    if (status !== "available") {
      setFallbackVisible((value) => !value);
      return;
    }

    await install();
  };

  if ((status === "manual" || status === "unsupported") && !showFallback) {
    return null;
  }

  const isBusy = status === "checking" || status === "installing";
  const isDisabled =
    status === "checking" ||
    status === "installing" ||
    status === "installed" ||
    status === "accepted" ||
    status === "manual";
  const buttonLabel =
    status === "checking"
      ? "Preparing install..."
      : status === "installing"
        ? "Installing..."
      : status === "installed"
        ? "Installed"
        : status === "accepted"
          ? "Installed"
        : status === "manual"
          ? "Install App"
        : status === "unsupported"
          ? "Not supported"
          : label;

  return (
    <div className={cn("flex flex-col items-stretch gap-2", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="h-auto min-h-10 whitespace-normal text-center leading-tight"
        onClick={handleInstall}
        disabled={isDisabled}
        aria-live="polite"
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "installed" || status === "accepted" ? (
          <Check className="size-4" />
        ) : (
          <Download className="size-4" />
        )}
        {buttonLabel}
      </Button>
      {status === "available" && (!serviceWorkerReady || !serviceWorkerControlled) ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          Install is available. The offline service worker is still becoming
          ready for this tab.
        </p>
      ) : null}
      {showFallback && (fallbackVisible || status === "manual" || status === "unsupported") ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          {fallbackMessage}
          {error ? ` ${error}` : ""}
        </p>
      ) : null}
    </div>
  );
}
