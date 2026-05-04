"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import type React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type InstallState = {
  isInstalled: boolean;
  prompt: BeforeInstallPromptEvent | null;
};

let installState: InstallState = {
  isInstalled: false,
  prompt: null,
};

let isListening = false;
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
  };
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function setupInstallListeners() {
  if (isListening || typeof window === "undefined") {
    return;
  }

  isListening = true;
  setInstallState({ isInstalled: isStandaloneMode() });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/pos-sw.js").catch((error) => {
      console.warn("Unable to register POSard service worker", error);
    });
  }

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    setInstallState({
      isInstalled: false,
      prompt: event as BeforeInstallPromptEvent,
    });
  };

  const handleInstalled = () => {
    setInstallState({
      isInstalled: true,
      prompt: null,
    });
  };

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const handleDisplayModeChange = () => {
    setInstallState({ isInstalled: isStandaloneMode() });
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleInstalled);
  standaloneQuery.addEventListener("change", handleDisplayModeChange);
}

type PwaInstallButtonProps = {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
  showFallback?: boolean;
};

export function PwaInstallButton({
  className,
  variant = "outline",
  size = "default",
  label = "Install POSard",
  showFallback = true,
}: PwaInstallButtonProps) {
  const { isInstalled, prompt } = useSyncExternalStore(
    subscribeInstallState,
    getInstallState,
    getInstallState,
  );
  const [fallbackVisible, setFallbackVisible] = useState(false);

  useEffect(() => {
    setupInstallListeners();
  }, []);

  useEffect(() => {
    if (prompt) {
      setFallbackVisible(false);
    }
  }, [prompt]);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    if (!prompt) {
      setFallbackVisible((value) => !value);
      return;
    }

    await prompt.prompt();
    await prompt.userChoice;
    setInstallState({ prompt: null });
  };

  if (!prompt && !showFallback) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-2", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="cursor-pointer"
        onClick={handleInstall}
      >
        <Download className="size-4" />
        {label}
      </Button>
      {showFallback && fallbackVisible ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          If the install prompt is not shown, use your browser menu and choose
          Install app or Add to Home Screen.
        </p>
      ) : null}
    </div>
  );
}
