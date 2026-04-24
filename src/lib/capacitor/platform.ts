import { Capacitor } from "@capacitor/core";

export type PosardCapacitorPlatform = "web" | "android" | "ios";

function getCapacitorGlobal() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { Capacitor?: typeof Capacitor }).Capacitor ?? null;
}

export function isCapacitorRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  if (Capacitor.isNativePlatform()) {
    return true;
  }

  const capacitorGlobal = getCapacitorGlobal();

  if (capacitorGlobal?.isNativePlatform?.()) {
    return true;
  }

  const platform = capacitorGlobal?.getPlatform?.();
  return platform === "android" || platform === "ios";
}

export function isNativePlatform() {
  return isCapacitorRuntime();
}

export function getPlatform(): PosardCapacitorPlatform {
  if (typeof window === "undefined") {
    return "web";
  }

  const platform = Capacitor.getPlatform();

  if (platform === "android" || platform === "ios") {
    return platform;
  }

  const fallbackPlatform = getCapacitorGlobal()?.getPlatform?.();

  if (fallbackPlatform === "android" || fallbackPlatform === "ios") {
    return fallbackPlatform;
  }

  return "web";
}

export function isCapacitorPluginAvailable(name: string) {
  if (typeof window === "undefined") {
    return false;
  }

  if (Capacitor.isPluginAvailable(name)) {
    return true;
  }

  const capacitorGlobal = getCapacitorGlobal();

  if (capacitorGlobal?.isPluginAvailable?.(name)) {
    return true;
  }

  return Boolean((capacitorGlobal as { Plugins?: Record<string, unknown> } | null)?.Plugins?.[name]);
}
