"use client";

import type {
  PrinterConfigDto,
  PrinterConnectionStatusDto,
  PrinterDeviceSummaryDto,
} from "./_dto/print.dto";

const TEXT_ENCODER = new TextEncoder();
const STORAGE_KEY = "posard.bluetooth-printer";
const MAX_RECONNECT_ATTEMPTS = 3;
const COMMON_BLUETOOTH_PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000ae3a-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];
const PREFERRED_BLUETOOTH_CHARACTERISTIC_UUIDS = [
  "2af1",
  "2af0",
  "ae01",
  "ae02",
  "ae03",
  "ae04",
  "ae05",
  "ae10",
  "ae3b",
  "ae3c",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
];

interface BluetoothCharacteristicLike {
  uuid: string;
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValueWithResponse?(value: ArrayBuffer | Uint8Array): Promise<void>;
  writeValueWithoutResponse?(value: ArrayBuffer | Uint8Array): Promise<void>;
}

interface BluetoothServiceLike {
  uuid: string;
  getCharacteristics(): Promise<BluetoothCharacteristicLike[]>;
}

interface BluetoothServerLike {
  connected?: boolean;
  connect(): Promise<BluetoothServerLike>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothServiceLike[]>;
  getPrimaryService(service: string): Promise<BluetoothServiceLike>;
}

interface BluetoothDeviceLike extends EventTarget {
  id?: string;
  name?: string | null;
  gatt?: BluetoothServerLike | null;
}

type NavigatorWithBluetooth = Navigator & {
  bluetooth?: {
    getDevices?(): Promise<BluetoothDeviceLike[]>;
    requestDevice(options: {
      acceptAllDevices: boolean;
      optionalServices: string[];
    }): Promise<BluetoothDeviceLike>;
  };
};

interface SavedBluetoothPrinter {
  name: string | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
  printerType: "bluetooth-ble-web";
  protocol: "webbluetooth";
  lastConnectedAt: string;
}

type Listener = (status: PrinterConnectionStatusDto) => void;

let device: BluetoothDeviceLike | null = null;
let server: BluetoothServerLike | null = null;
let characteristic: BluetoothCharacteristicLike | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectPromise: Promise<boolean> | null = null;
let reconnectAttempts = 0;
let lastConfig: PrinterConfigDto | null = null;
const listeners = new Set<Listener>();
const deviceCache = new Map<string, BluetoothDeviceLike>();
let status: PrinterConnectionStatusDto = {
  state: "idle",
  message: null,
  printerName: null,
  updatedAt: null,
};

function getNavigator() {
  return navigator as NavigatorWithBluetooth;
}

function emit(next: Partial<PrinterConnectionStatusDto>) {
  status = {
    ...status,
    ...next,
    updatedAt: new Date().toISOString(),
  };
  listeners.forEach((listener) => listener(status));
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function isPermissionUnavailableMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("permission is not available") ||
    normalized.includes("permission denied") ||
    normalized.includes("user denied") ||
    normalized.includes("not allowed")
  );
}

function isBluetoothSupported() {
  return typeof navigator !== "undefined" && Boolean(getNavigator().bluetooth);
}

function normalizeBluetoothUuid(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? null;

  if (!normalized) {
    return null;
  }

  if (/^[0-9a-f]{4}$/u.test(normalized)) {
    return `0000${normalized}-0000-1000-8000-00805f9b34fb`;
  }

  if (/^[0-9a-f]{8}$/u.test(normalized)) {
    return `${normalized}-0000-1000-8000-00805f9b34fb`;
  }

  return normalized;
}

function getOptionalServices(preferredServiceUuid?: string | null) {
  const serviceUuids = new Set(COMMON_BLUETOOTH_PRINTER_SERVICE_UUIDS);
  const normalizedPreferredServiceUuid = normalizeBluetoothUuid(preferredServiceUuid);

  if (normalizedPreferredServiceUuid) {
    serviceUuids.add(normalizedPreferredServiceUuid);
  }

  return Array.from(serviceUuids);
}

function chunkBytes(value: Uint8Array, size: number) {
  const chunks: Uint8Array[] = [];

  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size));
  }

  return chunks;
}

async function writeCharacteristic(
  writableCharacteristic: BluetoothCharacteristicLike,
  value: Uint8Array,
) {
  for (const chunk of chunkBytes(value, 180)) {
    if (
      writableCharacteristic.properties?.writeWithoutResponse &&
      writableCharacteristic.writeValueWithoutResponse
    ) {
      await writableCharacteristic.writeValueWithoutResponse(chunk);
      continue;
    }

    if (writableCharacteristic.writeValueWithResponse) {
      await writableCharacteristic.writeValueWithResponse(chunk);
      continue;
    }

    throw new Error("Bluetooth printer characteristic is not writable.");
  }
}

async function resolveWritableCharacteristic(
  activeServer: BluetoothServerLike,
  preferredServiceUuid?: string | null,
  preferredCharacteristicUuid?: string | null,
) {
  if (preferredServiceUuid && preferredCharacteristicUuid) {
    const normalizedServiceUuid = normalizeBluetoothUuid(preferredServiceUuid);
    const normalizedCharacteristicUuid = normalizeBluetoothUuid(
      preferredCharacteristicUuid,
    );

    if (!normalizedServiceUuid || !normalizedCharacteristicUuid) {
      throw new Error("Configured Bluetooth printer UUIDs are invalid.");
    }

    const service = await activeServer.getPrimaryService(normalizedServiceUuid);
    const characteristics = await service.getCharacteristics();
    const matchedCharacteristic =
      characteristics.find(
        (candidate) =>
          normalizeBluetoothUuid(candidate.uuid) === normalizedCharacteristicUuid,
      ) ?? null;

    if (!matchedCharacteristic) {
      throw new Error("Configured Bluetooth printer characteristic was not found.");
    }

    return {
      serviceUuid: service.uuid,
      characteristic: matchedCharacteristic,
    };
  }

  const services = await activeServer.getPrimaryServices();

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writableCharacteristics = characteristics.filter(
      (candidate) =>
        Boolean(candidate.properties?.write) ||
        Boolean(candidate.properties?.writeWithoutResponse),
    );
    const prioritizedCharacteristic =
      PREFERRED_BLUETOOTH_CHARACTERISTIC_UUIDS.map((uuid) =>
        writableCharacteristics.find(
          (candidate) =>
            normalizeBluetoothUuid(candidate.uuid) === normalizeBluetoothUuid(uuid) ||
            normalizeBluetoothUuid(candidate.uuid)?.endsWith(uuid),
        ) ?? null,
      ).find(Boolean) ??
      writableCharacteristics[0] ??
      null;

    if (prioritizedCharacteristic) {
      return {
        serviceUuid: service.uuid,
        characteristic: prioritizedCharacteristic,
      };
    }
  }

  throw new Error(
    "No writable Bluetooth printer characteristic was found. Try Pair Serial for Bluetooth Classic/SPP printers, or use USB.",
  );
}

function savePrinterMetadata(config: PrinterConfigDto) {
  if (typeof window === "undefined" || config.driver !== "webbluetooth") {
    return;
  }

  const metadata: SavedBluetoothPrinter = {
    name: config.displayName,
    deviceId: config.deviceId,
    serviceUuid: config.serviceUuid,
    characteristicUuid: config.characteristicUuid,
    printerType: "bluetooth-ble-web",
    protocol: "webbluetooth",
    lastConnectedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

function readPrinterMetadata() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedBluetoothPrinter) : null;
  } catch {
    return null;
  }
}

function cacheDevice(nextDevice: BluetoothDeviceLike) {
  if (nextDevice.id) {
    deviceCache.set(nextDevice.id, nextDevice);
  }
}

function rememberDevice(nextDevice: BluetoothDeviceLike) {
  device?.removeEventListener("gattserverdisconnected", handleDisconnected);
  device = nextDevice;
  cacheDevice(nextDevice);
  device.addEventListener("gattserverdisconnected", handleDisconnected);
}

function handleDisconnected() {
  server = null;
  characteristic = null;
  emit({
    state: "disconnected",
    message: "Bluetooth printer disconnected.",
    printerName: device?.name ?? lastConfig?.displayName ?? null,
  });

  if (!lastConfig) {
    return;
  }

  scheduleReconnect(lastConfig);
}

function scheduleReconnect(config: PrinterConfigDto, allowActiveReconnect = false) {
  if (
    reconnectTimer ||
    (reconnectPromise && !allowActiveReconnect) ||
    reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
  ) {
    return;
  }

  const delayMs = 800 * 2 ** reconnectAttempts;
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void bluetoothPrinterConnectionService.reconnectKnownPrinter(config);
  }, delayMs);
}

async function findKnownDevice(config: PrinterConfigDto) {
  const saved = readPrinterMetadata();
  const deviceId = config.deviceId?.trim() || saved?.deviceId?.trim();

  if (!deviceId || !isBluetoothSupported()) {
    return null;
  }

  const cached = deviceCache.get(deviceId) ?? null;

  if (cached) {
    return cached;
  }

  const bluetooth = getNavigator().bluetooth;

  if (!bluetooth?.getDevices) {
    return null;
  }

  const devices = await bluetooth.getDevices();
  const matched = devices.find((candidate) => candidate.id === deviceId) ?? null;

  if (matched) {
    cacheDevice(matched);
  }

  return matched;
}

async function connectDevice(
  nextDevice: BluetoothDeviceLike,
  config: PrinterConfigDto,
) {
  if (!nextDevice.gatt) {
    throw new Error(
      "This Bluetooth device does not expose BLE GATT. Use Pair Serial for Bluetooth Classic/SPP printers, or use USB.",
    );
  }

  rememberDevice(nextDevice);
  lastConfig = config;
  server = await nextDevice.gatt.connect();
  const resolved = await resolveWritableCharacteristic(
    server,
    config.serviceUuid,
    config.characteristicUuid,
  );
  characteristic = resolved.characteristic;
  reconnectAttempts = 0;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  savePrinterMetadata({
    ...config,
    deviceId: nextDevice.id ?? config.deviceId,
    displayName: nextDevice.name ?? config.displayName,
    serviceUuid: resolved.serviceUuid,
    characteristicUuid: resolved.characteristic.uuid,
  });

  emit({
    state: "connected",
    message: `Connected to ${nextDevice.name ?? config.displayName ?? "Bluetooth printer"}.`,
    printerName: nextDevice.name ?? config.displayName ?? null,
  });

  return {
    serviceUuid: resolved.serviceUuid,
    characteristicUuid: resolved.characteristic.uuid,
  };
}

export const bluetoothPrinterConnectionService = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(status);

    return () => {
      listeners.delete(listener);
    };
  },

  getConnectionStatus() {
    return status;
  },

  hasSavedPrinter() {
    return Boolean(readPrinterMetadata());
  },

  async requestPrinter(): Promise<PrinterDeviceSummaryDto> {
    if (!isBluetoothSupported()) {
      throw new Error("Web Bluetooth is not supported in this browser.");
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    reconnectAttempts = 0;
    emit({
      state: "requesting",
      message: "Choose a Bluetooth printer.",
      printerName: null,
    });

    const requestedDevice = await getNavigator().bluetooth!.requestDevice({
      acceptAllDevices: true,
      optionalServices: getOptionalServices(),
    });
    const config: PrinterConfigDto = {
      displayName: requestedDevice.name || "Bluetooth thermal printer",
      mode: "bluetooth-ble-web",
      transport: "bluetooth",
      driver: "webbluetooth",
      connectionType: "bluetooth",
      vendorId: null,
      productId: null,
      deviceId: requestedDevice.id ?? null,
      serviceUuid: null,
      characteristicUuid: null,
      autoPrintEnabled: true,
    };

    emit({
      state: "connecting",
      message: "Connecting to Bluetooth printer.",
      printerName: requestedDevice.name ?? null,
    });

    try {
      const resolved = await connectDevice(requestedDevice, config);
      await writeCharacteristic(
        characteristic!,
        TEXT_ENCODER.encode(
          "POSARD BLUETOOTH TEST PRINT\nPrinter connected successfully.\n\n\n",
        ),
      );

      return {
        displayName: requestedDevice.name || "Bluetooth thermal printer",
        mode: "bluetooth-ble-web",
        transport: "bluetooth",
        driver: "webbluetooth",
        connectionType: "bluetooth",
        vendorId: null,
        productId: null,
        deviceId: requestedDevice.id ?? null,
        serviceUuid: resolved.serviceUuid,
        characteristicUuid: resolved.characteristicUuid,
      };
    } catch (error) {
      emit({
        state: "error",
        message: toErrorMessage(error, "Unable to connect Bluetooth printer."),
        printerName: requestedDevice.name ?? null,
      });
      throw error;
    }
  },

  async connectPrinter(config: PrinterConfigDto) {
    if (config.driver !== "webbluetooth") {
      throw new Error("This reconnect flow is only for Web Bluetooth printers.");
    }

    if (!isBluetoothSupported()) {
      throw new Error("Web Bluetooth is not supported in this browser.");
    }

    lastConfig = config;

    if (server?.connected && characteristic) {
      emit({
        state: "connected",
        message: "Bluetooth printer is already connected.",
        printerName: device?.name ?? config.displayName,
      });
      return;
    }

    emit({
      state: "connecting",
      message: "Connecting to Bluetooth printer.",
      printerName: config.displayName,
    });

    const knownDevice = await findKnownDevice(config);

    if (!knownDevice) {
      emit({
        state: "disconnected",
        message:
          "Bluetooth printer permission is not available in this browser. Use Reconnect to approve it again.",
        printerName: config.displayName,
      });
      throw new Error(
        "Bluetooth printer permission is not available in this browser. Use Reconnect to approve it again.",
      );
    }

    try {
      await connectDevice(knownDevice, config);
    } catch (error) {
      emit({
        state: "error",
        message: toErrorMessage(error, "Unable to connect Bluetooth printer."),
        printerName: config.displayName,
      });
      throw error;
    }
  },

  async reconnectKnownPrinter(config?: PrinterConfigDto | null) {
    const targetConfig = config ?? lastConfig;

    if (!targetConfig || targetConfig.driver !== "webbluetooth") {
      return false;
    }

    lastConfig = targetConfig;

    if (server?.connected && characteristic) {
      emit({
        state: "connected",
        message: "Bluetooth printer is already connected.",
        printerName: device?.name ?? targetConfig.displayName,
      });
      return true;
    }

    if (reconnectPromise) {
      return reconnectPromise;
    }

    emit({
      state: "reconnecting",
      message: "Reconnecting Bluetooth printer.",
      printerName: targetConfig.displayName,
    });

    reconnectPromise = (async () => {
      try {
        await this.connectPrinter(targetConfig);
        return true;
      } catch (error) {
        const message = toErrorMessage(error, "Unable to reconnect Bluetooth printer.");

        if (
          reconnectAttempts < MAX_RECONNECT_ATTEMPTS &&
          !isPermissionUnavailableMessage(message)
        ) {
          scheduleReconnect(targetConfig, true);
        }

        emit({
          state: isPermissionUnavailableMessage(message) ? "disconnected" : "error",
          message,
          printerName: targetConfig.displayName,
        });
        return false;
      } finally {
        reconnectPromise = null;
      }
    })();

    return reconnectPromise;
  },

  disconnectPrinter() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    characteristic = null;
    server = null;

    try {
      device?.gatt?.disconnect();
    } catch {
      // Ignore browser disconnect failures.
    }

    emit({
      state: "disconnected",
      message: "Bluetooth printer disconnected.",
      printerName: device?.name ?? lastConfig?.displayName ?? null,
    });
  },

  async print(data: string | string[], config: PrinterConfigDto) {
    if (config.driver !== "webbluetooth") {
      throw new Error("This printer is not configured for Web Bluetooth.");
    }

    if (!server?.connected || !characteristic) {
      const reconnected = await this.reconnectKnownPrinter(config);

      if (!reconnected || !characteristic) {
        throw new Error(
          "Bluetooth printer is offline. Reconnect the printer or use receipt preview.",
        );
      }
    }

    const segments = Array.isArray(data) ? data : [data];

    try {
      for (const segment of segments) {
        await writeCharacteristic(
          characteristic,
          TEXT_ENCODER.encode(`${segment}\n\n\n`),
        );
      }
    } catch (error) {
      characteristic = null;
      server = null;
      emit({
        state: "error",
        message: toErrorMessage(error, "Bluetooth printer write failed."),
        printerName: device?.name ?? config.displayName,
      });
      throw error;
    }

    return {
      status: "printed" as const,
      message: `Printed to ${device?.name ?? config.displayName ?? "Bluetooth printer"}.`,
    };
  },
};
