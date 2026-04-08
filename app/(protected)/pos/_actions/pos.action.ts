"use server";

import { POSMetaDataDto } from "../_services/_dto/pos.dto";
import { categoryService } from "../_services/category.service";
import { productService } from "../_services/product.service";
import { epaymentService } from "../_services/epayment.service";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
