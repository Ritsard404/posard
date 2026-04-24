import type {
  LegacyPrinterConnectionType,
  PrinterDriver,
  PrinterMode,
  PrinterTransport,
} from "./_dto/print.dto";

const PRINTER_MODE_META: Record<
  PrinterMode,
  {
    label: string;
    description: string;
    transport: PrinterTransport;
    driver: PrinterDriver;
    connectionType: LegacyPrinterConnectionType;
  }
> = {
  "usb-web": {
    label: "USB Printer",
    description: "Print with WebUSB to a paired USB thermal printer.",
    transport: "usb",
    driver: "webusb",
    connectionType: "usb",
  },
  "bluetooth-ble-web": {
    label: "Bluetooth BLE Printer",
    description:
      "Use Web Bluetooth with BLE printers that expose writable GATT services.",
    transport: "bluetooth",
    driver: "webbluetooth",
    connectionType: "bluetooth",
  },
  "bluetooth-serial-web": {
    label: "Bluetooth Serial Printer",
    description:
      "Use Web Serial for Bluetooth Classic/SPP printers when the runtime supports it.",
    transport: "bluetooth",
    driver: "webserial",
    connectionType: "serial",
  },
  "sunmi-built-in-native": {
    label: "Built-in Sunmi Printer",
    description:
      "Use the Sunmi-native bridge exposed by the Android wrapper runtime.",
    transport: "built-in",
    driver: "sunmi-native",
    connectionType: "built_in",
  },
};

export function getPrinterModeMeta(mode: PrinterMode) {
  return PRINTER_MODE_META[mode];
}

export function getPrinterModeLabel(mode: PrinterMode | null | undefined) {
  if (!mode) {
    return "Not configured";
  }

  return PRINTER_MODE_META[mode].label;
}

export function derivePrinterMode(input: {
  mode?: string | null;
  transport?: string | null;
  driver?: string | null;
  connectionType?: string | null;
}): PrinterMode | null {
  const explicitMode = input.mode as PrinterMode | null | undefined;

  if (explicitMode && explicitMode in PRINTER_MODE_META) {
    return explicitMode;
  }

  const transport = input.transport as PrinterTransport | null | undefined;
  const driver = input.driver as PrinterDriver | null | undefined;

  if (transport && driver) {
    const matched =
      (Object.entries(PRINTER_MODE_META).find(
        ([, meta]) => meta.transport === transport && meta.driver === driver,
      )?.[0] as PrinterMode | undefined) ?? null;

    if (matched) {
      return matched;
    }
  }

  switch (input.connectionType) {
    case "usb":
      return "usb-web";
    case "bluetooth":
      return "bluetooth-ble-web";
    case "serial":
      return "bluetooth-serial-web";
    case "built_in":
      return "sunmi-built-in-native";
    default:
      return null;
  }
}

export function derivePrinterTransport(input: {
  mode?: string | null;
  transport?: string | null;
  connectionType?: string | null;
}): PrinterTransport | null {
  const mode = derivePrinterMode(input);

  if (mode) {
    return PRINTER_MODE_META[mode].transport;
  }

  return (input.transport as PrinterTransport | null | undefined) ?? null;
}

export function derivePrinterDriver(input: {
  mode?: string | null;
  driver?: string | null;
  connectionType?: string | null;
}): PrinterDriver | null {
  const mode = derivePrinterMode(input);

  if (mode) {
    return PRINTER_MODE_META[mode].driver;
  }

  return (input.driver as PrinterDriver | null | undefined) ?? null;
}

export function deriveLegacyConnectionType(input: {
  mode?: string | null;
  connectionType?: string | null;
}): LegacyPrinterConnectionType | null {
  const mode = derivePrinterMode(input);

  if (mode) {
    return PRINTER_MODE_META[mode].connectionType;
  }

  return (input.connectionType as LegacyPrinterConnectionType | null | undefined) ?? null;
}
