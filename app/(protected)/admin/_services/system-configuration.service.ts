import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import type { DonationAccountDto, SystemConfigurationDto } from "./system-configuration.dto";

const CONFIG_ID = "default";
const SYSTEM_CONFIGURATION_SELECT = {
  directRegistrationEnabled: true,
  platformBillingMode: true,
  donationEnabled: true,
  donationTitle: true,
  donationMessage: true,
  donationImageUrl: true,
  donationProviderName: true,
  donationAccountHolder: true,
  donationAccountDetail: true,
  donationNotes: true,
  donationAccounts: {
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      label: true,
      providerName: true,
      accountHolder: true,
      accountDetail: true,
      imageUrl: true,
      notes: true,
      enabled: true,
      displayOrder: true,
    },
  },
} satisfies Prisma.SystemConfigurationSelect;

function assertAdmin(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function isDonationAccountMeaningful(account: DonationAccountDto) {
  return Boolean(
    account.label ||
      account.providerName ||
      account.accountHolder ||
      account.accountDetail ||
      account.imageUrl ||
      account.notes,
  );
}

function mapDonationAccounts(config: {
  donationImageUrl: string | null;
  donationProviderName: string | null;
  donationAccountHolder: string | null;
  donationAccountDetail: string | null;
  donationAccounts: DonationAccountDto[];
}) {
  if (config.donationAccounts.length > 0) {
    return config.donationAccounts;
  }

  if (
    !config.donationImageUrl &&
    !config.donationProviderName &&
    !config.donationAccountHolder &&
    !config.donationAccountDetail
  ) {
    return [];
  }

  return [
    {
      id: "legacy-donation-account",
      label: config.donationProviderName ?? "Donation account",
      providerName: config.donationProviderName,
      accountHolder: config.donationAccountHolder,
      accountDetail: config.donationAccountDetail,
      imageUrl: config.donationImageUrl,
      notes: null,
      enabled: true,
      displayOrder: 0,
    },
  ];
}

function normalizeDonationAccount(account: DonationAccountDto, index: number): DonationAccountDto {
  return {
    id: account.id,
    label: account.label,
    providerName: account.providerName,
    accountHolder: account.accountHolder,
    accountDetail: account.accountDetail,
    imageUrl: account.imageUrl,
    notes: account.notes,
    enabled: account.enabled,
    displayOrder: index,
  };
}

function mapSystemConfiguration(config: Omit<SystemConfigurationDto, "donationAccounts"> & {
  donationAccounts: DonationAccountDto[];
}): SystemConfigurationDto {
  const donationAccounts = mapDonationAccounts(config);

  return {
    directRegistrationEnabled: config.directRegistrationEnabled,
    platformBillingMode: config.platformBillingMode,
    donationEnabled: config.donationEnabled,
    donationTitle: config.donationTitle,
    donationMessage: config.donationMessage,
    donationImageUrl: config.donationImageUrl,
    donationProviderName: config.donationProviderName,
    donationAccountHolder: config.donationAccountHolder,
    donationAccountDetail: config.donationAccountDetail,
    donationNotes: config.donationNotes,
    donationAccounts,
  };
}

export const systemConfigurationService = {
  async get(): Promise<SystemConfigurationDto> {
    const config = await prisma.systemConfiguration.upsert({
      where: { id: CONFIG_ID },
      update: {},
      create: { id: CONFIG_ID },
      select: SYSTEM_CONFIGURATION_SELECT,
    });

    return mapSystemConfiguration(config);
  },

  async update(
    viewer: AccountsViewerDto,
    input: SystemConfigurationDto,
  ): Promise<SystemConfigurationDto> {
    assertAdmin(viewer);
    const donationAccounts = input.donationAccounts
      .filter(isDonationAccountMeaningful)
      .map(normalizeDonationAccount);
    const primaryAccount = donationAccounts.find((account) => account.enabled) ?? donationAccounts[0];

    const config = await prisma.systemConfiguration.upsert({
      where: { id: CONFIG_ID },
      update: {
        directRegistrationEnabled: input.directRegistrationEnabled,
        platformBillingMode: input.platformBillingMode,
        donationEnabled: input.donationEnabled,
        donationTitle: input.donationTitle,
        donationMessage: input.donationMessage,
        donationImageUrl: primaryAccount?.imageUrl ?? null,
        donationProviderName: primaryAccount?.providerName ?? primaryAccount?.label ?? null,
        donationAccountHolder: primaryAccount?.accountHolder ?? null,
        donationAccountDetail: primaryAccount?.accountDetail ?? null,
        donationNotes: input.donationNotes,
        donationAccounts: {
          deleteMany: {},
          create: donationAccounts.map((account) => ({
            label: account.label,
            providerName: account.providerName,
            accountHolder: account.accountHolder,
            accountDetail: account.accountDetail,
            imageUrl: account.imageUrl,
            notes: account.notes,
            enabled: account.enabled,
            displayOrder: account.displayOrder,
          })),
        },
      },
      create: {
        id: CONFIG_ID,
        directRegistrationEnabled: input.directRegistrationEnabled,
        platformBillingMode: input.platformBillingMode,
        donationEnabled: input.donationEnabled,
        donationTitle: input.donationTitle,
        donationMessage: input.donationMessage,
        donationImageUrl: primaryAccount?.imageUrl ?? null,
        donationProviderName: primaryAccount?.providerName ?? primaryAccount?.label ?? null,
        donationAccountHolder: primaryAccount?.accountHolder ?? null,
        donationAccountDetail: primaryAccount?.accountDetail ?? null,
        donationNotes: input.donationNotes,
        donationAccounts: {
          create: donationAccounts.map((account) => ({
            label: account.label,
            providerName: account.providerName,
            accountHolder: account.accountHolder,
            accountDetail: account.accountDetail,
            imageUrl: account.imageUrl,
            notes: account.notes,
            enabled: account.enabled,
            displayOrder: account.displayOrder,
          })),
        },
      },
      select: SYSTEM_CONFIGURATION_SELECT,
    });

    return mapSystemConfiguration(config);
  },
};
