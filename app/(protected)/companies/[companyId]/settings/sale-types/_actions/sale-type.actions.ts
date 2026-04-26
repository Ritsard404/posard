"use server";

import { revalidatePath } from "next/cache";
import { companyAccessService } from "../../../_services/company-access.service";
import {
  SaleTypeFormSchema,
  type SaleTypeFormInput,
  type SaleTypeListItemDTO,
} from "../_services/sale-type.dto";
import { saleTypeService } from "../_services/sale-type.service";

function toListItem(data: {
  id: string;
  name: string | null;
  account: string | null;
  _count: { ePayments: number };
}): SaleTypeListItemDTO {
  return {
    id: data.id,
    name: data.name?.trim() || "Unlabeled payment method",
    account: data.account?.trim() || null,
    paymentCount: data._count.ePayments,
  };
}

function revalidateSaleTypePaths(companyId: string) {
  revalidatePath(`/companies/${companyId}/settings`);
  revalidatePath(`/companies/${companyId}/settings/sale-types`);
  revalidatePath("/pos");
}

export async function createSaleTypeAction(
  companyId: string,
  payload: SaleTypeFormInput,
): Promise<{ success: true; data: SaleTypeListItemDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);

    const validated = SaleTypeFormSchema.parse(payload);
    const data = await saleTypeService.createReferencePaymentMethod(validated);

    revalidateSaleTypePaths(companyId);

    return { success: true, data: toListItem(data) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payment method",
    };
  }
}

export async function updateSaleTypeAction(
  companyId: string,
  saleTypeId: string,
  payload: SaleTypeFormInput,
): Promise<{ success: true; data: SaleTypeListItemDTO } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);

    const validated = SaleTypeFormSchema.parse(payload);
    const data = await saleTypeService.updateReferencePaymentMethod(saleTypeId, validated);

    revalidateSaleTypePaths(companyId);

    return { success: true, data: toListItem(data) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update payment method",
    };
  }
}

export async function deleteSaleTypeAction(
  companyId: string,
  saleTypeId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await companyAccessService.assertCompanyAccess(companyId);

    await saleTypeService.deleteReferencePaymentMethod(saleTypeId);

    revalidateSaleTypePaths(companyId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete payment method",
    };
  }
}
