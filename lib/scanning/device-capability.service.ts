"use client";

import { getPlatform, isNativePlatform } from "@/src/lib/capacitor/platform";

import type { DeviceCapabilityDto, ScanPermissionState } from "./scan.dto";

type PermissionNameWithDevice = PermissionName | "camera" | "nfc";

async function queryBrowserPermission(name: PermissionNameWithDevice): Promise<ScanPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const status = await navigator.permissions.query({ name } as PermissionDescriptor);

    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

export const deviceCapabilityService = {
  async getCapabilities(): Promise<DeviceCapabilityDto> {
    const platform = getPlatform();
    const native = isNativePlatform();
    const hasMediaDevices =
      typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
    const hasWebNfc =
      typeof window !== "undefined" && "NDEFReader" in window && window.isSecureContext;

    const cameraPermission = native
      ? "prompt"
      : hasMediaDevices
        ? await queryBrowserPermission("camera")
        : "unsupported";

    return {
      platform,
      cameraBarcode: {
        supported: native || hasMediaDevices,
        permission: cameraPermission,
        provider: native ? "capacitor" : hasMediaDevices ? "web" : null,
        reason:
          native || hasMediaDevices
            ? undefined
            : "Camera scanning requires camera access on this browser or device.",
      },
      hardwareKeyboardScanner: {
        supported: true,
      },
      nfc: {
        supported: hasWebNfc,
        permission: hasWebNfc ? await queryBrowserPermission("nfc") : "unsupported",
        provider: hasWebNfc ? "web_nfc" : native ? "native_future" : null,
        reason: hasWebNfc
          ? undefined
          : native
            ? "Native NFC/RFID approval is prepared for a future Capacitor plugin."
            : "Web NFC is only available on limited secure-context Android browsers.",
      },
    };
  },
};
