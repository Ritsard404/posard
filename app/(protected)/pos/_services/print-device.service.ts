import type {
  PrinterCapabilityDto,
  PrinterMode,
  PrintJobDto,
  PrinterConfigDto,
  PrinterDeviceSummaryDto,
  PrintJobResultDto,
} from "./_dto/print.dto";
import { bluetoothPrinterConnectionService } from "./bluetooth-printer-connection.service";
import { getPrinterModeMeta } from "./printer-mode.service";
import { sunmiNativePrintService } from "./sunmi-native-print.service";
import { getPlatform, isNativePlatform } from "@/src/lib/capacitor/platform";

const USB_PRINTER_CLASS = 0x07;
const DEFAULT_SERIAL_BAUD_RATE = 9600;
const TEXT_ENCODER = new TextEncoder();

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

interface SerialPortInfoLike {
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: string;
}

interface SerialWriterLike {
  write(value: Uint8Array): Promise<void>;
  releaseLock(): void;
}

interface SerialWritableLike {
  getWriter(): SerialWriterLike;
}

interface SerialPortLike {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
    bufferSize?: number;
    flowControl?: "none" | "hardware";
  }): Promise<void>;
  close(): Promise<void>;
  getInfo?(): SerialPortInfoLike;
  writable?: SerialWritableLike | null;
}

interface SerialNavigatorLike {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(options?: {
    allowedBluetoothServiceClassIds?: string[];
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
  }): Promise<SerialPortLike>;
}

type NavigatorWithDevices = Navigator & {
  usb?: UsbNavigatorLike;
  serial?: SerialNavigatorLike;
  bluetooth?: {
    getDevices?(): Promise<unknown[]>;
    requestDevice(options: {
      acceptAllDevices: boolean;
      optionalServices: string[];
    }): Promise<unknown>;
  };
};

function getNavigator() {
  return navigator as NavigatorWithDevices;
}

type UsbDeviceWithTransfer = UsbDeviceLike & {
  transferOut(endpointNumber: number, data: ArrayBuffer | Uint8Array): Promise<unknown>;
};

function isUsbSupported() {
  if (isNativePlatform() && getPlatform() === "android") {
    return false;
  }

  return typeof navigator !== "undefined" && Boolean(getNavigator().usb);
}

function isBluetoothSupported() {
  if (isNativePlatform() && getPlatform() === "android") {
    return false;
  }

  return typeof navigator !== "undefined" && Boolean(getNavigator().bluetooth);
}

function isSerialSupported() {
  if (isNativePlatform() && getPlatform() === "android") {
    return false;
  }

  return typeof navigator !== "undefined" && Boolean(getNavigator().serial);
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

function toHexId(value: number | null | undefined) {
  return value === null || value === undefined
    ? null
    : `0x${value.toString(16).padStart(4, "0").toUpperCase()}`;
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
    mode: "usb-web",
    transport: "usb",
    driver: "webusb",
    connectionType: "usb",
    vendorId: device.vendorId ?? null,
    productId: device.productId ?? null,
    deviceId: device.serialNumber ?? null,
    serviceUuid: null,
    characteristicUuid: null,
  };
}

function getSerialPortInfo(port: SerialPortLike) {
  const info = port.getInfo?.();

  return {
    vendorId: info?.usbVendorId ?? null,
    productId: info?.usbProductId ?? null,
    bluetoothServiceClassId: info?.bluetoothServiceClassId ?? null,
  };
}

function describeSerialPort(port: SerialPortLike) {
  const info = getSerialPortInfo(port);
  const vendorId = toHexId(info.vendorId);
  const productId = toHexId(info.productId);

  if (vendorId && productId) {
    return `Serial printer ${vendorId}:${productId}`;
  }

  if (info.bluetoothServiceClassId) {
    return "Bluetooth serial printer";
  }

  return "Serial thermal printer";
}

async function openSerialPort(port: SerialPortLike) {
  try {
    await port.open({
      baudRate: DEFAULT_SERIAL_BAUD_RATE,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      bufferSize: 255,
      flowControl: "none",
    });
  } catch (error) {
    const message = toErrorMessage(error, "Unable to open the serial printer.");

    if (message.toLowerCase().includes("already open")) {
      return;
    }

    throw new Error(message);
  }
}

async function writeSerialPort(port: SerialPortLike, value: Uint8Array) {
  if (!port.writable) {
    throw new Error("The selected serial printer is not writable.");
  }

  const writer = port.writable.getWriter();

  try {
    await writer.write(value);
  } finally {
    writer.releaseLock();
  }
}

async function findSerialPort(config: PrinterConfigDto) {
  if (!isSerialSupported()) {
    return null;
  }

  const ports = await getNavigator().serial!.getPorts();

  const matched =
    ports.find((port) => {
      const info = getSerialPortInfo(port);

      if (config.vendorId !== null && info.vendorId !== config.vendorId) {
        return false;
      }

      if (config.productId !== null && info.productId !== config.productId) {
        return false;
      }

      return true;
    }) ??
    (ports.length === 1 ? ports[0] : null);

  return matched ?? null;
}

async function printSerial(
  job: PrintJobDto,
  config: PrinterConfigDto,
): Promise<PrintJobResultDto> {
  const port = await findSerialPort(config);

  if (!port) {
    return {
      status: "unsupported",
      message:
        "The paired serial printer is not available in this browser. Pair it again from this terminal before printing.",
    };
  }

  await openSerialPort(port);

  try {
    const printSegments = job.printSegments?.length
      ? job.printSegments
      : [job.previewContent];

    for (const segment of printSegments) {
      await writeSerialPort(port, TEXT_ENCODER.encode(`${segment}\n\n\n`));
    }

    return {
      status: "printed",
      message: `Printed to ${config.displayName ?? "Serial printer"}.`,
    };
  } finally {
    await port.close().catch(() => undefined);
  }
}

async function pairSerialPrinter(): Promise<PrinterDeviceSummaryDto> {
  if (!isSerialSupported()) {
    throw new Error("Web Serial is not supported in this browser.");
  }

  const port = await getNavigator().serial!.requestPort();

  await openSerialPort(port);

  try {
    await writeSerialPort(
      port,
      TEXT_ENCODER.encode(
        "POSARD SERIAL TEST PRINT\nPrinter connected successfully.\n\n\n",
      ),
    );
  } finally {
    await port.close().catch(() => undefined);
  }

  const info = getSerialPortInfo(port);

  return {
    displayName: describeSerialPort(port),
    mode: "bluetooth-serial-web",
    transport: "bluetooth",
    driver: "webserial",
    connectionType: "serial",
    vendorId: info.vendorId,
    productId: info.productId,
    deviceId: null,
    serviceUuid: null,
    characteristicUuid: null,
  };
}

async function printBluetooth(
  job: PrintJobDto,
  config: PrinterConfigDto,
): Promise<PrintJobResultDto> {
  return bluetoothPrinterConnectionService.print(
    job.printSegments?.length ? job.printSegments : job.previewContent,
    config,
  );
}

async function pairBluetoothPrinter(): Promise<PrinterDeviceSummaryDto> {
  if (!isBluetoothSupported()) {
    throw new Error("Web Bluetooth is not supported in this browser.");
  }

  return bluetoothPrinterConnectionService.requestPrinter();
}

function getCapability(
  mode: PrinterMode,
  input: {
    supported: boolean;
    reason?: string | null;
  },
): PrinterCapabilityDto {
  const meta = getPrinterModeMeta(mode);

  return {
    mode,
    transport: meta.transport,
    driver: meta.driver,
    label: meta.label,
    description: meta.description,
    supported: input.supported,
    reason: input.reason ?? null,
  };
}

export const printDeviceService = {
  getBrowserSupport() {
    return {
      usb: isUsbSupported(),
      bluetooth: isBluetoothSupported(),
      serial: isSerialSupported(),
      sunmiNative: sunmiNativePrintService.getCapability().supported,
    };
  },

  getCapabilities() {
    const support = this.getBrowserSupport();
    const isAndroidWrapper = isNativePlatform() && getPlatform() === "android";
    const capabilities: PrinterCapabilityDto[] = [
      getCapability("usb-web", {
        supported: support.usb,
        reason: support.usb
          ? null
          : isAndroidWrapper
            ? "USB browser pairing is not available inside the Android wrapper. Use the built-in SUNMI printer mode instead."
            : "WebUSB is not supported in this browser.",
      }),
      getCapability("bluetooth-ble-web", {
        supported: support.bluetooth,
        reason: support.bluetooth
          ? null
          : isAndroidWrapper
            ? "Bluetooth browser pairing is not available inside the Android wrapper. Use the built-in SUNMI printer mode instead."
            : "Web Bluetooth is not supported in this browser.",
      }),
      getCapability("bluetooth-serial-web", {
        supported: support.serial,
        reason: support.serial
          ? null
          : isAndroidWrapper
            ? "Bluetooth serial browser pairing is not available inside the Android wrapper. Use the built-in SUNMI printer mode instead."
            : "Web Serial is not supported in this browser/runtime.",
      }),
    ];

    if (isAndroidWrapper) {
      capabilities.push(sunmiNativePrintService.getCapability());
    }

    return capabilities;
  },

  async pair(mode: PrinterMode) {
    if (mode === "usb-web") {
      return pairUsbPrinter();
    }

    if (mode === "bluetooth-serial-web") {
      return pairSerialPrinter();
    }

    if (mode === "sunmi-built-in-native") {
      return sunmiNativePrintService.pair();
    }

    return pairBluetoothPrinter();
  },

  async print(job: PrintJobDto, config: PrinterConfigDto): Promise<PrintJobResultDto> {
    if (!config.mode || !config.transport || !config.driver) {
      return {
        status: "unsupported",
        message: "No paired printer is configured for this terminal.",
      };
    }

    if (config.driver === "sunmi-native") {
      await sunmiNativePrintService.printText(job.printSegments?.join("\n\n\n") || job.previewContent);
      return {
        status: "printed",
        message: `Printed to ${config.displayName ?? "Built-in Sunmi printer"}.`,
      };
    }

    if (config.driver === "webusb") {
      if (!isUsbSupported()) {
        return {
          status: "unsupported",
          message: "WebUSB is not supported in this browser.",
        };
      }

      return printUsb(job, config);
    }

    if (config.driver === "webserial") {
      if (!isSerialSupported()) {
        return {
          status: "unsupported",
          message: "Web Serial is not supported in this browser.",
        };
      }

      return printSerial(job, config);
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
    if (!config?.mode || !config.driver || !config.transport) {
      return false;
    }

    if (config.driver === "webbluetooth") {
      return Boolean(config.serviceUuid && config.characteristicUuid);
    }

    return true;
  },

  isUsbPrinterClass(value: number | undefined) {
    return value === USB_PRINTER_CLASS;
  },
};
