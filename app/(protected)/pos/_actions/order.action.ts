"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { CancelOrderDto, OrderDto, ReturnInvoiceDto } from "../_services/_dto/order.dto";
import type { ReceiptDto } from "../_services/_dto/receipt.dto";
import { orderService } from "../_services/order.service";

export async function payOrderAction(
  dto: OrderDto,
): Promise<
  | { success: true; receipt: ReceiptDto }
  | { success: false; error: string }
> {
  try {
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
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}

export async function cancelOrderAction(dto: CancelOrderDto) {
  try {
    await orderService.cancelOrder(dto);
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cancellation failed",
    };
  }
}

export async function returnInvoiceAction(dto: ReturnInvoiceDto) {
  try {
    const data = await orderService.returnInvoice(dto);
    revalidatePath("/report");
    revalidatePath("/reports");
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Return failed",
    };
  }
}
