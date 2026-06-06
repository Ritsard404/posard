"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { CancelOrderDto, OrderDto, ReturnInvoiceDto } from "../_services/_dto/order.dto";
import type { ReceiptDto } from "../_services/_dto/receipt.dto";
import { orderService } from "../_services/order.service";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { toSafeActionError } from "@/lib/security/safe-action-error";

export async function payOrderAction(
  dto: OrderDto,
): Promise<
  | { success: true; receipt: ReceiptDto }
  | { success: false; error: string }
> {
  try {
    if (dto.discount?.managerPin || dto.debt?.managerPin) {
      const profile = await getCurrentProfile();
      await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "CHECKOUT_MANAGER_PIN",
        profileId: profile?.id,
        userId: profile?.id,
        role: profile?.role,
        companyId: profile?.companyId,
        terminalId: dto.timestampId,
      });
    }
    const receipt = await orderService.payOrder(dto);
    after(async () => {
      try {
        await orderService.archiveReceipt(receipt);
      } catch (error) {
        console.error("Failed to archive receipt after checkout", error);
      }
    });
    return { success: true, receipt };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Payment failed. Please review the sale and try again."),
    };
  }
}

export async function cancelOrderAction(dto: CancelOrderDto) {
  try {
    const profile = await getCurrentProfile();
    await enforceRateLimit({
      bucket: "sensitivePosAction",
      route: "/pos",
      action: "VOID_ORDER",
      profileId: profile?.id,
      userId: profile?.id,
      role: profile?.role,
      companyId: profile?.companyId,
    });
    await orderService.cancelOrder(dto);
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Cancellation failed. Please try again."),
    };
  }
}

export async function returnInvoiceAction(dto: ReturnInvoiceDto) {
  try {
    const profile = await getCurrentProfile();
    if (dto.managerPin) {
      await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "RETURN_INVOICE_PIN",
        profileId: profile?.id,
        userId: profile?.id,
        role: profile?.role,
        companyId: profile?.companyId,
      });
    }
    await enforceRateLimit({
      bucket: "sensitivePosAction",
      route: "/pos",
      action: "RETURN_INVOICE",
      profileId: profile?.id,
      userId: profile?.id,
      role: profile?.role,
      companyId: profile?.companyId,
    });
    const data = await orderService.returnInvoice(dto);
    revalidatePath("/reports");
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Return failed. Please review the return and try again."),
    };
  }
}
