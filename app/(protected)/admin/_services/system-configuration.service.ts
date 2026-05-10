import "server-only";

import { prisma } from "@/lib/prisma";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import type { SystemConfigurationDto } from "./system-configuration.dto";

const CONFIG_ID = "default";

function assertAdmin(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export const systemConfigurationService = {
  async get(): Promise<SystemConfigurationDto> {
    const config = await prisma.systemConfiguration.upsert({
      where: { id: CONFIG_ID },
      update: {},
      create: { id: CONFIG_ID },
      select: { directRegistrationEnabled: true },
    });

    return {
      directRegistrationEnabled: config.directRegistrationEnabled,
    };
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
      },
      create: {
        id: CONFIG_ID,
        directRegistrationEnabled: input.directRegistrationEnabled,
      },
      select: { directRegistrationEnabled: true },
    });

    return {
      directRegistrationEnabled: config.directRegistrationEnabled,
    };
  },
};
