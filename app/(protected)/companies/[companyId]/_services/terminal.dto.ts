import { z } from "zod";

export const TerminalSchema = z.object({
  id: z.string().uuid(),
  minNumber: z.string().min(1, "MIN number is required"),
  accreditationNumber: z.string().min(1, "Accreditation number is required"),
  ptuNumber: z.string().min(1, "PTU number is required"),
  dateIssued: z.date(),
  validUntil: z.date(),
  posName: z.string().min(1, "POS Name is required"),
  registeredName: z.string().min(1, "Registered Name is required"),
  operatedBy: z.string().min(1, "Operated By is required"),
  address: z.string().min(1, "Address is required"),
  vatTinNumber: z.string().min(1, "VAT TIN is required"),
  vat: z.number().int().min(0),
  discountMax: z.number().min(0),
  costCenter: z.string().min(1, "Cost Center is required"),
  branchCenter: z.string().min(1, "Branch Center is required"),
  useCenter: z.string().min(1, "Use Center is required"),
  dbName: z.string().nullable(),
  printerName: z.string().min(1, "Printer Name is required"),
  resetCounterNo: z.number().int().min(0),
  resetCounterTrainNo: z.number().int().min(0),
  zCounterNo: z.number().int().min(0),
  zCounterTrainNo: z.number().int().min(0),
  isTrainMode: z.boolean(),
  isActive: z.boolean(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TerminalDTO = z.infer<typeof TerminalSchema>;

export const CreateTerminalSchema = z.object({
  minNumber: z.string().min(1, "MIN number is required"),
  accreditationNumber: z.string().min(1, "Accreditation number is required"),
  ptuNumber: z.string().min(1, "PTU number is required"),
  dateIssued: z.string().or(z.date()).transform((val) => new Date(val)),
  validUntil: z.string().or(z.date()).transform((val) => new Date(val)),
  posName: z.string().min(1, "POS Name is required"),
  registeredName: z.string().min(1, "Registered Name is required"),
  operatedBy: z.string().min(1, "Operated By is required"),
  address: z.string().min(1, "Address is required"),
  vatTinNumber: z.string().min(1, "VAT TIN is required"),
  vat: z.coerce.number().int().min(0),
  discountMax: z.coerce.number().min(0),
  costCenter: z.string().min(1, "Cost Center is required"),
  branchCenter: z.string().min(1, "Branch Center is required"),
  useCenter: z.string().min(1, "Use Center is required"),
  dbName: z.string().nullable().optional(),
  printerName: z.string().min(1, "Printer Name is required"),
});

export type CreateTerminalPayload = z.input<typeof CreateTerminalSchema>;
export type CreateTerminalInput = z.infer<typeof CreateTerminalSchema>;

export const UpdateTerminalSchema = CreateTerminalSchema.partial();

export type UpdateTerminalPayload = z.input<typeof UpdateTerminalSchema>;
export type UpdateTerminalInput = z.infer<typeof UpdateTerminalSchema>;

const vatTinPattern = /^\d{3}-\d{3}-\d{3}-\d{3,4}$/;

export const TerminalConfigurationSchema = z.object({
  vat: z.coerce.number().min(0, "VAT rate must be at least 0%").max(100, "VAT rate cannot exceed 100%"),
  discountMax: z.coerce.number().min(0, "Max discount must be at least 0%").max(100, "Max discount cannot exceed 100%"),
  vatTinNumber: z
    .string()
    .trim()
    .min(1, "VAT TIN is required")
    .refine((value) => vatTinPattern.test(value), "Use VAT TIN format ###-###-###-####"),
  address: z.string().trim().min(1, "Address is required"),
  costCenter: z.string().trim().max(100, "Cost Center must be 100 characters or fewer"),
  branchCenter: z.string().trim().max(100, "Branch Center must be 100 characters or fewer"),
  useCenter: z.string().trim().max(100, "Use Center must be 100 characters or fewer"),
  printerName: z.string().trim().max(100, "Printer must be 100 characters or fewer"),
});

export type TerminalConfigurationPayload = z.input<typeof TerminalConfigurationSchema>;
export type TerminalConfigurationInput = z.infer<typeof TerminalConfigurationSchema>;
