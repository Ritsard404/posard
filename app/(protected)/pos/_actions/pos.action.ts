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

const PrinterConfigSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
  connectionType: z.enum(["usb", "bluetooth"]).nullable(),
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
    const companyId = profile.companyId ?? undefined;

    const [categories, products, epaymentMethods] = await Promise.all([
      categoryService.getCategories(companyId),
      productService.getProducts(companyId),
      epaymentService.getEPaymentMethods(),
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
      error: error instanceof Error ? error.message : "Failed to load POS metadata",
    };
  }
}

export async function saveSessionPrinterConfigAction(
  timestampId: string,
  printerConfig: PrinterConfigDto | null,
) {
  try {
    const profile = await getCurrentProfile();
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
    );

    revalidatePath("/pos");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to save printer configuration",
    };
  }
}
