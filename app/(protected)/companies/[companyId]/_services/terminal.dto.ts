import { z } from "zod";
import type { PrinterConfigDto } from "@/app/(protected)/pos/_services/_dto/print.dto";

export const PrinterConfigSchema = z.object({
  displayName: z.string().nullable(),
  mode: z
    .enum([
      "usb-web",
      "bluetooth-ble-web",
      "bluetooth-serial-web",
      "sunmi-built-in-native",
    ])
    .nullable(),
  transport: z.enum(["usb", "bluetooth", "built-in"]).nullable(),
  driver: z
    .enum(["webusb", "webbluetooth", "webserial", "sunmi-native"])
    .nullable(),
  connectionType: z.enum(["usb", "bluetooth", "serial", "built_in"]).nullable(),
  vendorId: z.number().int().nullable(),
  productId: z.number().int().nullable(),
  deviceId: z.string().nullable(),
  serviceUuid: z.string().nullable(),
  characteristicUuid: z.string().nullable(),
  autoPrintEnabled: z.boolean(),
});

const nullableStringInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nullableNumberInput = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.number().min(0).nullable());

const nullablePercentageInput = nullableNumberInput.refine(
  (value) => value === null || value <= 100,
  "Percentage cannot exceed 100%",
);

const requiredDateInput = z
  .union([z.string(), z.date()])
  .transform((value, ctx) => {
    if (typeof value === "string" && value.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Date is required",
      });
      return z.NEVER;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
      });
      return z.NEVER;
    }

    return date;
  });

export const TerminalSchema = z.object({
  id: z.string().uuid(),
  minNumber: z.string().nullable(),
  accreditationNumber: z.string().nullable(),
  ptuNumber: z.string().nullable(),
  dateIssued: z.date(),
  validUntil: z.date(),
  posName: z.string().nullable(),
  registeredName: z.string().nullable(),
  operatedBy: z.string().nullable(),
  address: z.string().nullable(),
  vatTinNumber: z.string().nullable(),
  vat: z.number().int().min(0).nullable(),
  discountMax: z.number().min(0).nullable(),
  printerName: z.string().nullable(),
  printerDisplayName: z.string().nullable().optional(),
  printerConnectionType: z.enum(["usb", "bluetooth", "serial", "built_in"]).nullable().optional(),
  printerTransport: z.enum(["usb", "bluetooth", "built_in"]).nullable().optional(),
  printerDriver: z
    .enum(["webusb", "webbluetooth", "webserial", "sunmi_native"])
    .nullable()
    .optional(),
  printerVendorId: z.number().int().nullable().optional(),
  printerProductId: z.number().int().nullable().optional(),
  printerDeviceId: z.string().nullable().optional(),
  printerServiceUuid: z.string().nullable().optional(),
  printerCharacteristicUuid: z.string().nullable().optional(),
  autoPrintEnabled: z.boolean().optional(),
  printerConfig: PrinterConfigSchema.nullable().optional(),
  resetCounterNo: z.number().int().min(0),
  resetCounterTrainNo: z.number().int().min(0),
  zCounterNo: z.number().int().min(0),
  zCounterTrainNo: z.number().int().min(0),
  isTrainMode: z.boolean(),
  isActive: z.boolean(),
  companyId: z.string().uuid(),
  companyName: z.string().nullable().optional(),
  subscriptionStatus: z.enum(["pending", "active", "expired", "suspended", "cancelled"]).nullable().optional(),
  subscriptionExpiresAt: z.date().nullable().optional(),
  assignedUserName: z.string().nullable().optional(),
  isInUse: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TerminalDTO = z.infer<typeof TerminalSchema>;

export interface TerminalPrinterConfigurationDTO {
  printerConfig: PrinterConfigDto | null;
}

export const CreateTerminalSchema = z.object({
  minNumber: nullableStringInput.optional(),
  accreditationNumber: nullableStringInput.optional(),
  ptuNumber: nullableStringInput.optional(),
  dateIssued: requiredDateInput,
  validUntil: requiredDateInput,
  operatedBy: nullableStringInput.optional(),
  vatTinNumber: nullableStringInput.optional(),
  vat: nullablePercentageInput.optional(),
  discountMax: nullablePercentageInput.optional(),
  printerName: nullableStringInput.optional(),
});

export type CreateTerminalPayload = z.input<typeof CreateTerminalSchema>;
export type CreateTerminalInput = z.infer<typeof CreateTerminalSchema>;

export const UpdateTerminalSchema = CreateTerminalSchema.partial();

export type UpdateTerminalPayload = z.input<typeof UpdateTerminalSchema>;
export type UpdateTerminalInput = z.infer<typeof UpdateTerminalSchema>;

const vatTinPattern = /^\d{3}-\d{3}-\d{3}-\d{3,4}$/;

export const TerminalConfigurationSchema = z.object({
  vat: nullablePercentageInput,
  discountMax: nullablePercentageInput,
  vatTinNumber: nullableStringInput.refine(
    (value) => value === null || vatTinPattern.test(value),
    "Use VAT TIN format ###-###-###-####",
  ),
  printerName: nullableStringInput,
  printerConfig: PrinterConfigSchema.nullable().optional(),
});

export type TerminalConfigurationPayload = z.input<typeof TerminalConfigurationSchema>;
export type TerminalConfigurationInput = z.infer<typeof TerminalConfigurationSchema>;

export const SetTerminalActiveSchema = z.object({
  isActive: z.boolean(),
});

export type SetTerminalActiveInput = z.infer<typeof SetTerminalActiveSchema>;
