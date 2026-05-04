"use server";

import { customerDisplayService } from "../_services/customer-display.service";
import {
  sanitizeCustomerDisplayDTO,
  type CustomerDisplayDTO,
} from "../_services/_dto/customer-display.dto";

export async function getCustomerDisplaySnapshotAction(terminalId: string) {
  try {
    const display = await customerDisplayService.getSnapshot(terminalId);
    return { success: true as const, display };
  } catch {
    return {
      success: false as const,
      error: "Unable to load customer display.",
    };
  }
}

export async function publishCustomerDisplayAction(display: CustomerDisplayDTO) {
  try {
    const sanitized = sanitizeCustomerDisplayDTO(display, display.terminalId);
    const published = await customerDisplayService.publishSnapshot(sanitized);
    return { success: true as const, display: published };
  } catch {
    return {
      success: false as const,
      error: "Unable to update customer display.",
    };
  }
}
