"use server";

import { revalidatePath } from "next/cache";
import { accountsAccessService } from "../_services/accounts-access.service";
import { accountsService } from "../_services/accounts.service";
import {
  AccountIdSchema,
  CreateAccountSchema,
  GetAccountsSchema,
  UpdateAccountSchema,
  UpdateOwnProfileSchema,
} from "../_services/_validators/accounts.validator";
import type {
  AccountDetailDto,
  AccountListItemDto,
} from "../_services/_dto/accounts.dto";

type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type VoidResult = { success: true } | { success: false; error: string };

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function revalidateAccountsPaths(accountId?: string) {
  revalidatePath("/accounts");

  if (accountId) {
    revalidatePath(`/accounts/${accountId}`);
  }
}

export async function getAccountsAction(
  input?: unknown,
): Promise<DataResult<AccountListItemDto[]>> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validated = GetAccountsSchema.parse(input ?? {});
    const data = await accountsService.getAccounts(viewer, validated);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load accounts"),
    };
  }
}

export async function getAccountByIdAction(
  accountId: string,
): Promise<DataResult<AccountDetailDto>> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    const data = await accountsService.getAccountById(viewer, validatedId);

    if (!data) {
      throw new Error("Account not found");
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load account"),
    };
  }
}

export async function createAccountAction(
  input: unknown,
): Promise<DataResult<AccountDetailDto>> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validated = CreateAccountSchema.parse(input);
    const data = await accountsService.createAccount(viewer, validated);
    revalidateAccountsPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to create account"),
    };
  }
}

export async function updateAccountAction(
  accountId: string,
  input: unknown,
): Promise<DataResult<AccountDetailDto>> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    const validated = UpdateAccountSchema.parse(input);
    const data = await accountsService.updateAccount(
      viewer,
      validatedId,
      validated,
    );
    revalidateAccountsPaths(validatedId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to update account"),
    };
  }
}

export async function deleteAccountAction(
  accountId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    await accountsService.deleteAccount(viewer, validatedId);
    revalidateAccountsPaths(validatedId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to delete account"),
    };
  }
}

export async function approveAccountAction(
  accountId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    await accountsService.approveAccount(viewer, validatedId);
    revalidateAccountsPaths(validatedId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to approve account"),
    };
  }
}

export async function activateAccountAction(
  accountId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    await accountsService.activateAccount(viewer, validatedId);
    revalidateAccountsPaths(validatedId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to activate account"),
    };
  }
}

export async function deactivateAccountAction(
  accountId: string,
): Promise<VoidResult> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validatedId = AccountIdSchema.parse(accountId);
    await accountsService.deactivateAccount(viewer, validatedId);
    revalidateAccountsPaths(validatedId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to deactivate account"),
    };
  }
}

export async function updateOwnAccountProfileAction(
  input: unknown,
): Promise<DataResult<AccountDetailDto>> {
  try {
    const viewer = await accountsAccessService.getViewer();
    const validated = UpdateOwnProfileSchema.parse(input);
    const data = await accountsService.updateOwnProfile(viewer, validated);
    revalidateAccountsPaths(viewer.profileId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to update your profile"),
    };
  }
}
