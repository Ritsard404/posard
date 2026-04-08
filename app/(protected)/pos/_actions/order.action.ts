"use server";

import { revalidatePath } from "next/cache";
import { CancelOrderDto, OrderDto } from "../_services/_dto/order.dto";
import { orderService } from "../_services/order.service";

export async function payOrderAction(dto: OrderDto) {
  try {
    await orderService.payOrder(dto);
    revalidatePath("/pos");
    return { success: true };
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
