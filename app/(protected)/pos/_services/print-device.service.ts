import type {
  PrintJobDto,
  PrinterConfigDto,
  PrinterDeviceSummaryDto,
  PrintJobResultDto,
} from "./_dto/print.dto";

const USB_PRINTER_CLASS = 0x07;
const TEXT_ENCODER = new TextEncoder();
const COMMON_BLUETOOTH_PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000ae3a-0000-1000-8000-00805f9b34fb",
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
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
];
const bluetoothDeviceCache = new Map<string, BluetoothDeviceLike>();

interface UsbEndpointLike {
  endpointNumber: number;
  direction: "in" | "out";
}

interface UsbAlternateLike {
  alternateSetting: number;
  interfaceClass?: number;
  endpoints: UsbEndpointLike[];
}

interface UsbInterfaceLike {
  interfaceNumber: number;
  alternates: UsbAlternateLike[];
}

interface UsbConfigurationLike {
  interfaces: UsbInterfaceLike[];
}

interface UsbDeviceLike {
  opened: boolean;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  vendorId?: number;
  productId?: number;
  configuration?: UsbConfigurationLike | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
  transferOut(endpointNumber: number, data: ArrayBuffer | Uint8Array): Promise<unknown>;
}

interface UsbNavigatorLike {
  getDevices(): Promise<UsbDeviceLike[]>;
  requestDevice(options: {
    filters: Array<{ vendorId?: number; productId?: number }>;
  }): Promise<UsbDeviceLike>;
}

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

interface BluetoothDeviceLike {
  id?: string;
  name?: string | null;
  gatt?: BluetoothServerLike | null;
}

type NavigatorWithDevices = Navigator & {
  usb?: UsbNavigatorLike;
  bluetooth?: {
    getDevices?(): Promise<BluetoothDeviceLike[]>;
    requestDevice(options: {
      acceptAllDevices: boolean;
      optionalServices: string[];
    }): Promise<BluetoothDeviceLike>;
  };
};

function getNavigator() {
  return navigator as NavigatorWithDevices;
}

type UsbDeviceWithTransfer = UsbDeviceLike & {
  transferOut(endpointNumber: number, data: ArrayBuffer | Uint8Array): Promise<unknown>;
};

function isUsbSupported() {
  return typeof navigator !== "undefined" && Boolean(getNavigator().usb);
}

function isBluetoothSupported() {
  return typeof navigator !== "undefined" && Boolean(getNavigator().bluetooth);
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isAccessDeniedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("access denied") || message.includes("permission denied");
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

function getBluetoothOptionalServices(preferredServiceUuid?: string | null) {
  const serviceUuids = new Set(COMMON_BLUETOOTH_PRINTER_SERVICE_UUIDS);

  const normalizedPreferredServiceUuid = normalizeBluetoothUuid(preferredServiceUuid);

  if (normalizedPreferredServiceUuid) {
    serviceUuids.add(normalizedPreferredServiceUuid);
  }

  return Array.from(serviceUuids);
}

function cacheBluetoothDevice(device: BluetoothDeviceLike) {
  if (!device.id) {
    return;
  }

  bluetoothDeviceCache.set(device.id, device);
}

async function findBluetoothDevice(config: PrinterConfigDto) {
  const deviceId = config.deviceId?.trim();

  if (!deviceId || !isBluetoothSupported()) {
    return null;
  }

  const cachedDevice = bluetoothDeviceCache.get(deviceId) ?? null;

  if (cachedDevice) {
    return cachedDevice;
  }

  const navigatorBluetooth = getNavigator().bluetooth;

  if (!navigatorBluetooth?.getDevices) {
    return null;
  }

  const devices = await navigatorBluetooth.getDevices();
  const matchedDevice = devices.find((device) => device.id === deviceId) ?? null;

  if (matchedDevice) {
    cacheBluetoothDevice(matchedDevice);
  }

  return matchedDevice;
}

async function requestBluetoothDevice(preferredServiceUuid?: string | null) {
  const device = await getNavigator().bluetooth!.requestDevice({
    acceptAllDevices: true,
    optionalServices: getBluetoothOptionalServices(preferredServiceUuid),
  });

  cacheBluetoothDevice(device);
  return device;
}

async function findUsbDevice(config: PrinterConfigDto) {
  if (!isUsbSupported()) {
    return null;
  }

  const devices = await getNavigator().usb!.getDevices();

  return (
    devices.find((device) => {
      if (
        config.vendorId !== null &&
        device.vendorId !== config.vendorId
      ) {
        return false;
      }

      if (
        config.productId !== null &&
        device.productId !== config.productId
      ) {
        return false;
      }

      if (config.deviceId && device.serialNumber !== config.deviceId) {
        return false;
      }

      return true;
    }) ?? null
  );
}

async function resolveUsbEndpoint(device: UsbDeviceLike) {
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }

  const configuration = device.configuration;

  if (!configuration) {
    throw new Error("Printer configuration is unavailable.");
  }

  for (const iface of configuration.interfaces) {
    const alternate =
      iface.alternates.find((candidate) =>
        candidate.endpoints.some((endpoint) => endpoint.direction === "out"),
      ) ?? iface.alternates[0];

    if (!alternate) {
      continue;
    }

    const endpoint =
      alternate.endpoints.find((candidate) => candidate.direction === "out") ??
      null;

    if (!endpoint) {
      continue;
    }

    await device.claimInterface(iface.interfaceNumber);

    if (alternate.alternateSetting !== 0) {
      await device.selectAlternateInterface(
        iface.interfaceNumber,
        alternate.alternateSetting,
      );
    }

    return {
      endpointNumber: endpoint.endpointNumber,
      interfaceNumber: iface.interfaceNumber,
    };
  }

  throw new Error("No writable USB endpoint was found for this printer.");
}

async function openUsbDevice(device: UsbDeviceLike) {
  if (device.opened) {
    return;
  }

  try {
    await device.open();
  } catch (error) {
    if (isAccessDeniedError(error)) {
      throw new Error(
        "USB printer access was denied. Close other apps using the printer, reconnect it, then pair it again in this browser.",
      );
    }

    throw new Error(toErrorMessage(error, "Unable to open the USB printer."));
  }
}

async function printUsb(job: PrintJobDto, config: PrinterConfigDto): Promise<PrintJobResultDto> {
  const device = await findUsbDevice(config);

  if (!device) {
    return {
      status: "unsupported",
      message: "The paired USB printer is not available in this browser. Pair it again from this terminal before printing.",
    };
  }

  await openUsbDevice(device);

  try {
    const { endpointNumber, interfaceNumber } = await resolveUsbEndpoint(device);
    const printSegments = job.printSegments?.length
      ? job.printSegments
      : [job.previewContent];

    for (const segment of printSegments) {
      const payload = TEXT_ENCODER.encode(`${segment}\n\n\n`);
      await (device as UsbDeviceWithTransfer).transferOut(endpointNumber, payload);
    }

    try {
      await device.releaseInterface(interfaceNumber);
    } catch {
      // Ignore release failures on browsers that auto-detach.
    }

    return {
      status: "printed",
      message: `Printed to ${config.displayName ?? "USB printer"}.`,
    };
  } finally {
    if (device.opened) {
      await device.close();
    }
  }
}

async function pairUsbPrinter(): Promise<PrinterDeviceSummaryDto> {
  if (!isUsbSupported()) {
    throw new Error("WebUSB is not supported in this browser.");
  }

  const device = await getNavigator().usb!.requestDevice({
    filters: [],
  });

  await openUsbDevice(device);

  try {
    const { interfaceNumber } = await resolveUsbEndpoint(device);

    try {
      await device.releaseInterface(interfaceNumber);
    } catch {
      // Ignore release failures on browsers that auto-detach.
    }
  } finally {
    if (device.opened) {
      await device.close();
    }
  }

  return {
    displayName: device.productName || "USB thermal printer",
    connectionType: "usb",
    vendorId: device.vendorId ?? null,
    productId: device.productId ?? null,
    deviceId: device.serialNumber ?? null,
    serviceUuid: null,
    characteristicUuid: null,
  };
}

function chunkBytes(value: Uint8Array, size: number) {
  const chunks: Uint8Array[] = [];

  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size));
  }

  return chunks;
}

async function writeBluetoothCharacteristic(
  characteristic: BluetoothCharacteristicLike,
  value: Uint8Array,
) {
  const chunks = chunkBytes(value, 180);

  for (const chunk of chunks) {
    if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
      continue;
    }

    if (characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
      continue;
    }

    throw new Error("Bluetooth printer characteristic is not writable.");
  }
}

async function resolveBluetoothWritableCharacteristic(
  server: BluetoothServerLike,
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

    const service = await server.getPrimaryService(normalizedServiceUuid);
    const characteristics = await service.getCharacteristics();
    const matchedCharacteristic =
      characteristics.find(
        (characteristic) =>
          normalizeBluetoothUuid(characteristic.uuid) ===
          normalizedCharacteristicUuid,
      ) ?? null;

    if (!matchedCharacteristic) {
      throw new Error("Configured Bluetooth printer characteristic was not found.");
    }

    return {
      serviceUuid: service.uuid,
      characteristic: matchedCharacteristic,
    };
  }

  const services = await server.getPrimaryServices();

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writableCharacteristics = characteristics.filter(
      (characteristic) =>
        Boolean(characteristic.properties?.write) ||
        Boolean(characteristic.properties?.writeWithoutResponse),
    );

    const prioritizedCharacteristic =
      PREFERRED_BLUETOOTH_CHARACTERISTIC_UUIDS.map((uuid) =>
        writableCharacteristics.find(
          (characteristic) =>
            normalizeBluetoothUuid(characteristic.uuid)?.endsWith(uuid),
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

  throw new Error("No writable Bluetooth printer characteristic was found.");
}

async function withBluetoothConnection<T>(
  device: BluetoothDeviceLike,
  task: (server: BluetoothServerLike) => Promise<T>,
) {
  if (!device.gatt) {
    throw new Error("This Bluetooth printer does not expose a GATT server.");
  }

  const server = await device.gatt.connect();

  try {
    return await task(server);
  } finally {
    try {
      device.gatt.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
  }
}

async function printBluetooth(
  job: PrintJobDto,
  config: PrinterConfigDto,
): Promise<PrintJobResultDto> {
  const device =
    (await findBluetoothDevice(config)) ??
    (await requestBluetoothDevice(config.serviceUuid));

  const result = await withBluetoothConnection(device, async (server) => {
    const { characteristic } = await resolveBluetoothWritableCharacteristic(
      server,
      config.serviceUuid,
      config.characteristicUuid,
    );

    const printSegments = job.printSegments?.length
      ? job.printSegments
      : [job.previewContent];

    for (const segment of printSegments) {
      await writeBluetoothCharacteristic(
        characteristic,
        TEXT_ENCODER.encode(`${segment}\n\n\n`),
      );
    }

    return {
      status: "printed" as const,
      message: `Printed to ${config.displayName ?? "Bluetooth printer"}.`,
    };
  });

  return result;
}

async function pairBluetoothPrinter(): Promise<PrinterDeviceSummaryDto> {
  if (!isBluetoothSupported()) {
    throw new Error("Web Bluetooth is not supported in this browser.");
  }

  const device = await requestBluetoothDevice();

  const discovered = await withBluetoothConnection(device, async (server) => {
    const { serviceUuid, characteristic } =
      await resolveBluetoothWritableCharacteristic(server);

    await writeBluetoothCharacteristic(
      characteristic,
      TEXT_ENCODER.encode("POSARD BLUETOOTH TEST PRINT\nPrinter connected successfully.\n\n\n"),
    );

    return {
      serviceUuid,
      characteristicUuid: characteristic.uuid,
    };
  });

  return {
    displayName: device.name || "Bluetooth thermal printer",
    connectionType: "bluetooth",
    vendorId: null,
    productId: null,
    deviceId: device.id ?? null,
    serviceUuid: discovered.serviceUuid,
    characteristicUuid: discovered.characteristicUuid,
  };
}

export const printDeviceService = {
  getBrowserSupport() {
    return {
      usb: isUsbSupported(),
      bluetooth: isBluetoothSupported(),
    };
  },

  async pair(connectionType: "usb" | "bluetooth") {
    if (connectionType === "usb") {
      return pairUsbPrinter();
    }

    return pairBluetoothPrinter();
  },

  async print(job: PrintJobDto, config: PrinterConfigDto): Promise<PrintJobResultDto> {
    if (!config.connectionType) {
      return {
        status: "unsupported",
        message: "No paired printer is configured for this terminal.",
      };
    }

    if (config.connectionType === "usb") {
      if (!isUsbSupported()) {
        return {
          status: "unsupported",
          message: "WebUSB is not supported in this browser.",
        };
      }

      return printUsb(job, config);
    }

    if (!isBluetoothSupported()) {
      return {
        status: "unsupported",
        message: "Web Bluetooth is not supported in this browser.",
      };
    }

    return printBluetooth(job, config);
  },

  isLikelyConfigured(config: PrinterConfigDto | null) {
    if (!config?.connectionType) {
      return false;
    }

    if (config.connectionType === "bluetooth") {
      return Boolean(config.serviceUuid && config.characteristicUuid);
    }

    return true;
  },

  isUsbPrinterClass(value: number | undefined) {
    return value === USB_PRINTER_CLASS;
  },
};
