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
  | "unsupported";

type InstallState = {
  isInstalled: boolean;
  status: InstallStatus;
  prompt: BeforeInstallPromptEvent | null;
  unsupportedReason: "ios" | "desktop" | "browser" | null;
  serviceWorkerReady: boolean;
  error: string | null;
};

let installState: InstallState = {
  isInstalled: false,
  status: "checking",
  prompt: null,
  unsupportedReason: null,
  serviceWorkerReady: false,
  error: null,
};

let isListening = false;
let checkingTimer: number | null = null;
let cleanupInstallListeners: (() => void) | null = null;
const subscribers = new Set<() => void>();

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

function getUnsupportedReason(): InstallState["unsupportedReason"] {
  if (isIosBrowser()) {
    return "ios";
  }

  if (/chrome|crios|edg|opr|brave/i.test(window.navigator.userAgent)) {
    return "desktop";
  }

  return "browser";
}

function finishCheckingIfNoPrompt() {
  if (installState.status !== "checking" || installState.prompt) {
    return;
  }

  setInstallState({
    status: "unsupported",
    unsupportedReason: getUnsupportedReason(),
  });
}

function setupInstallListeners() {
  if (isListening || typeof window === "undefined") {
    return;
  }

  isListening = true;
  const installed = isStandaloneMode();
  setInstallState({
    isInstalled: installed,
    status: installed ? "installed" : "checking",
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/pos-sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        setInstallState({ serviceWorkerReady: true });
      })
      .catch((error) => {
        console.warn("Unable to register POSard service worker", error);
        setInstallState({
          error: "Service worker registration failed.",
          status: "unsupported",
          unsupportedReason: getUnsupportedReason(),
        });
      });
  } else {
    setInstallState({
      status: "unsupported",
      unsupportedReason: getUnsupportedReason(),
      error: "Service workers are unavailable in this browser.",
    });
  }

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    if (checkingTimer !== null) {
      window.clearTimeout(checkingTimer);
      checkingTimer = null;
    }
    setInstallState({
      isInstalled: false,
      status: "available",
      prompt: event as BeforeInstallPromptEvent,
      unsupportedReason: null,
      error: null,
    });
  };

  const handleInstalled = () => {
    setInstallState({
      isInstalled: true,
      status: "installed",
      prompt: null,
      unsupportedReason: null,
    });
  };

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const handleDisplayModeChange = () => {
    setInstallState({ isInstalled: isStandaloneMode() });
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleInstalled);
  standaloneQuery.addEventListener("change", handleDisplayModeChange);

  // Some browsers never expose beforeinstallprompt. After a short check window,
  // show explicit browser instructions instead of pretending install is ready.
  checkingTimer = window.setTimeout(finishCheckingIfNoPrompt, 1800);

  cleanupInstallListeners = () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleInstalled);
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
      await state.prompt.prompt();
      const choice = await state.prompt.userChoice;

      setInstallState({
        prompt: null,
        status: choice.outcome === "accepted" ? "installing" : "unsupported",
        unsupportedReason:
          choice.outcome === "accepted" ? null : getUnsupportedReason(),
      });
    } catch (error) {
      console.warn("POSard install prompt failed", error);
      setInstallState({
        prompt: null,
        status: "unsupported",
        unsupportedReason: getUnsupportedReason(),
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
    unsupportedReason,
    serviceWorkerReady,
    error,
    install,
  } = usePwaInstall();
  const [fallbackVisible, setFallbackVisible] = useState(false);

  useEffect(() => {
    if (status === "available" || status === "installed") {
      setFallbackVisible(false);
    }
  }, [status]);

  const fallbackMessage = useMemo(() => {
    if (unsupportedReason === "ios") {
      return "On iPhone or iPad, open Safari, tap Share, then choose Add to Home Screen.";
    }

    if (unsupportedReason === "desktop") {
      return "If install is not offered, open the Chrome or Edge menu and choose Install POSard or Apps > Install this site.";
    }

    return "This browser does not expose a direct install prompt. Use the browser menu if Add to Home Screen is available.";
  }, [unsupportedReason]);

  if (isInstalled && status !== "installed") {
    return null;
  }

  const handleInstall = async () => {
    if (status !== "available") {
      setFallbackVisible((value) => !value);
      return;
    }

    await install();
  };

  if (status === "unsupported" && !showFallback) {
    return null;
  }

  const isBusy = status === "checking" || status === "installing";
  const isDisabled = status === "checking" || status === "installing" || status === "installed";
  const buttonLabel =
    status === "checking"
      ? "Checking..."
      : status === "installing"
        ? "Installing..."
        : status === "installed"
          ? "Installed"
          : status === "unsupported"
            ? "Not supported on this browser"
            : label;

  return (
    <div className={cn("flex flex-col items-stretch gap-2", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="cursor-pointer"
        onClick={handleInstall}
        disabled={isDisabled}
        aria-live="polite"
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "installed" ? (
          <Check className="size-4" />
        ) : (
          <Download className="size-4" />
        )}
        {buttonLabel}
      </Button>
      {status === "available" && !serviceWorkerReady ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          Install is available. The offline service worker is still becoming
          ready.
        </p>
      ) : null}
      {showFallback && (fallbackVisible || status === "unsupported") ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          {fallbackMessage}
          {error ? ` ${error}` : ""}
        </p>
      ) : null}
    </div>
  );
}
