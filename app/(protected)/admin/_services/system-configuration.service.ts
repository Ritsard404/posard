import "server-only";

import { prisma } from "@/lib/prisma";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import type { SystemConfigurationDto } from "./system-configuration.dto";

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
} as const;

function assertAdmin(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function mapSystemConfiguration(config: SystemConfigurationDto): SystemConfigurationDto {
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

    const config = await prisma.systemConfiguration.upsert({
      where: { id: CONFIG_ID },
      update: {
        directRegistrationEnabled: input.directRegistrationEnabled,
        platformBillingMode: input.platformBillingMode,
        donationEnabled: input.donationEnabled,
        donationTitle: input.donationTitle,
        donationMessage: input.donationMessage,
        donationImageUrl: input.donationImageUrl,
        donationProviderName: input.donationProviderName,
        donationAccountHolder: input.donationAccountHolder,
        donationAccountDetail: input.donationAccountDetail,
        donationNotes: input.donationNotes,
      },
      create: {
        id: CONFIG_ID,
        directRegistrationEnabled: input.directRegistrationEnabled,
        platformBillingMode: input.platformBillingMode,
        donationEnabled: input.donationEnabled,
        donationTitle: input.donationTitle,
        donationMessage: input.donationMessage,
        donationImageUrl: input.donationImageUrl,
        donationProviderName: input.donationProviderName,
        donationAccountHolder: input.donationAccountHolder,
        donationAccountDetail: input.donationAccountDetail,
        donationNotes: input.donationNotes,
      },
      select: SYSTEM_CONFIGURATION_SELECT,
    });

    return mapSystemConfiguration(config);
  },
};
