"use server";

import { z } from "zod";
import { POSMetaDataDto } from "../_services/_dto/pos.dto";
import type { PrinterConfigDto } from "../_services/_dto/print.dto";
import { categoryService } from "../_services/category.service";
import { productService } from "../_services/product.service";
import { epaymentService } from "../_services/epayment.service";
import { terminalPrinterConfigService } from "../_services/terminal-printer-config.service";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { toSafeActionError } from "@/lib/security/safe-action-error";

const PrinterConfigSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
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
  deviceId: z.string().trim().nullable(),
  serviceUuid: z.string().trim().nullable(),
  characteristicUuid: z.string().trim().nullable(),
  autoPrintEnabled: z.boolean(),
});

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function fetchPOSMetaDataAction(): Promise<{ success: true; data: POSMetaDataDto } | { success: false; error: string }> {
  try {
    const profile = await getCurrentProfile();
    const companyId = profile.companyId;

    if (!companyId) {
      return { success: false, error: "No company associated with user." };
    }

    const [categories, products, epaymentMethods] = await Promise.all([
      categoryService.getCategories(companyId),
      productService.getProducts(companyId),
      epaymentService.getEPaymentMethods(companyId),
    ]);

    return {
      success: true,
      data: {
        categories,
        products,
        epaymentMethods,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Failed to load POS metadata."),
    };
  }
}

export async function saveSessionPrinterConfigAction(
  timestampId: string,
  printerConfig: PrinterConfigDto | null,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false as const, error: "No company associated with user." };
    }
    await enforceRateLimit({
      bucket: "sensitivePosAction",
      route: "/pos",
      action: "SAVE_SESSION_PRINTER_CONFIG",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });
    const validated = printerConfig === null ? null : PrinterConfigSchema.parse(printerConfig);

    const timestamp = await prisma.timestamp.findFirst({
      where: {
        id: timestampId,
        cashierId: profile.id,
      },
      select: {
        posTerminalId: true,
      },
    });

    if (!timestamp) {
      return { success: false as const, error: "Active session not found for printer setup." };
    }

    await terminalPrinterConfigService.updateTerminalPrinterConfig(
      timestamp.posTerminalId,
      validated,
      {
        companyId: profile.companyId,
        actorProfileId: profile.id,
        timestampId,
      },
    );

    revalidatePath("/pos");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Failed to save printer configuration."),
    };
  }
}
