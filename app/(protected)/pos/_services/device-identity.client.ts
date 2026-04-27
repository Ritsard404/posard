"use client";

const DEVICE_STORAGE_KEY = "posard.device-id";

export function getDeviceIdentity(): string {
  if (typeof window === "undefined") {
    return "server-device";
  }

  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const generated = window.crypto.randomUUID();
  window.localStorage.setItem(DEVICE_STORAGE_KEY, generated);
  return generated;
}
