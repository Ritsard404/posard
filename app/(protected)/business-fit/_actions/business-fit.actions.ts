"use server";

import { revalidatePath } from "next/cache";
import { toSafeActionError } from "@/lib/security/safe-action-error";
import { businessFitService } from "../_services/business-fit.service";
import {
  PosOpenTicketCreateSchema,
  PrescriptionVerificationCreateSchema,
  RepairJobCreateSchema,
  SalesOrderCreateSchema,
  ServiceBookingCreateSchema,
} from "../_services/business-fit.dto";

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function failure(error: unknown, fallback: string) {
  console.error(toSafeActionError(error, fallback));
}

export async function createServiceBookingAction(formData: FormData): Promise<void> {
  try {
    const input = ServiceBookingCreateSchema.parse(formObject(formData));
    await businessFitService.createServiceBooking(input);
    revalidatePath("/business-fit");
  } catch (error) {
    failure(error, "Unable to create service booking.");
  }
}

export async function createRepairJobAction(formData: FormData): Promise<void> {
  try {
    const input = RepairJobCreateSchema.parse(formObject(formData));
    await businessFitService.createRepairJob(input);
    revalidatePath("/business-fit");
  } catch (error) {
    failure(error, "Unable to create repair job.");
  }
}

export async function createSalesOrderAction(formData: FormData): Promise<void> {
  try {
    const input = SalesOrderCreateSchema.parse(formObject(formData));
    await businessFitService.createSalesOrder(input);
    revalidatePath("/business-fit");
  } catch (error) {
    failure(error, "Unable to create sales order.");
  }
}

export async function createOpenTicketAction(formData: FormData): Promise<void> {
  try {
    const input = PosOpenTicketCreateSchema.parse(formObject(formData));
    await businessFitService.createOpenTicket(input);
    revalidatePath("/business-fit");
  } catch (error) {
    failure(error, "Unable to create open POS ticket.");
  }
}

export async function createPrescriptionVerificationAction(formData: FormData): Promise<void> {
  try {
    const input = PrescriptionVerificationCreateSchema.parse(formObject(formData));
    await businessFitService.createPrescriptionVerification(input);
    revalidatePath("/business-fit");
  } catch (error) {
    failure(error, "Unable to create prescription verification.");
  }
}
