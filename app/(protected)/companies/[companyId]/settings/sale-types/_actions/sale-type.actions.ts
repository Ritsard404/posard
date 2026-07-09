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
  paymentQrImageUrl: string | null;
  paymentAccountHolder: string | null;
  paymentAccountNumber: string | null;
  paymentProviderName: string | null;
  paymentInstructions: string | null;
  paymentDisplayEnabled: boolean;
  paymentDisplayOrder: number | null;
  paymentDetailsUpdatedAt: Date | null;
  _count: { ePayments: number };
}): SaleTypeListItemDTO {
  return {
    id: data.id,
    name: data.name?.trim() || "Unlabeled payment method",
    account: data.account?.trim() || null,
    paymentQrImageUrl: data.paymentQrImageUrl?.trim() || null,
    paymentAccountHolder: data.paymentAccountHolder?.trim() || null,
    paymentAccountNumber: data.paymentAccountNumber?.trim() || null,
    paymentProviderName: data.paymentProviderName?.trim() || null,
    paymentInstructions: data.paymentInstructions?.trim() || null,
    paymentDisplayEnabled: data.paymentDisplayEnabled,
    paymentDisplayOrder: data.paymentDisplayOrder,
    paymentDetailsUpdatedAt: data.paymentDetailsUpdatedAt?.toISOString() ?? null,
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
    const data = await saleTypeService.createReferencePaymentMethod(companyId, validated);

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
    const data = await saleTypeService.updateReferencePaymentMethod(companyId, saleTypeId, validated);

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

    await saleTypeService.deleteReferencePaymentMethod(companyId, saleTypeId);

    revalidateSaleTypePaths(companyId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete payment method",
    };
  }
}
