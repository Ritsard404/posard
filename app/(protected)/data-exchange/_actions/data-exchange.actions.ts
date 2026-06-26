"use server";

import { dataExchangeService } from "../_services/data-exchange.service";

export async function previewRestoreAction(payload: string) {
  try {
    return { success: true as const, data: await dataExchangeService.previewRestore(payload) };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Restore preview failed.",
    };
  }
}
