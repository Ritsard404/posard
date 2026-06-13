import "server-only";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/security/pin";
import type { Prisma, UserStatus } from "@prisma/client";
import {
  mapCompanyToOption,
  mapProfileToAccountDetail,
  mapProfileToAccountListItem,
} from "./_mappers/accounts.mapper";
import type {
  AccountCompanyOptionDto,
  AccountDetailDto,
  AccountListItemDto,
  AccountsViewerDto,
  CreateAccountInputDto,
  GetAccountsInputDto,
  UpdateAccountInputDto,
  UpdateOwnProfileInputDto,
} from "./_dto/accounts.dto";

type ProfileWithCompany = Prisma.ProfileGetPayload<{
  include: { company: true; branch: true };
}>;

const DEFAULT_MAX_CASHIERS = 2;

function assertViewerCanManageAccounts(viewer: AccountsViewerDto) {
  if (viewer.role === "cashier") {
    throw new Error("Forbidden");
  }
}

function getInviteRedirectTo() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/auth/update-password`;
}

function getVerifiedEmailRedirectTo() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://posard.vercel.app";

  return `${baseUrl.replace(/\/$/, "")}/auth/confirm?next=/accounts`;
}

function normalizeAuthError(message: string) {
  if (message.toLowerCase().includes("already")) {
    return "An account with this email already exists";
  }

  return message;
}

async function ensureCompanyExists(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    throw new Error("Company not found");
  }
}

async function ensureBranchBelongsToCompany(
  branchId: string | null | undefined,
  companyId: string,
) {
  if (!branchId) {
    return null;
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, isActive: true },
    select: { id: true },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  return branch.id;
}

async function getCompanyCashierCapacity(companyId: string) {
  const [terminalCount, cashierCount] = await Promise.all([
    prisma.posTerminalInfo.count({
      where: { companyId },
    }),
    prisma.profile.count({
      where: { companyId, role: "cashier", status: { not: "disabled" } },
    }),
  ]);

  const cashierLimit = DEFAULT_MAX_CASHIERS;

  return {
    terminalCount,
    cashierCount,
    cashierLimit,
    cashierSlotsAvailable: Math.max(cashierLimit - cashierCount, 0),
  };
}

async function assertCashierSlotAvailable(
  companyId: string,
  viewer: AccountsViewerDto,
) {
  if (viewer.role === "admin") {
    return;
  }

  const capacity = await getCompanyCashierCapacity(companyId);

  if (capacity.cashierCount >= capacity.cashierLimit) {
    throw new Error(
      `Cashier account limit reached. The default company limit allows up to ${capacity.cashierLimit} active cashier account(s) across all branches.`,
    );
  }
}

async function getTargetAccountOrThrow(id: string): Promise<ProfileWithCompany> {
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { company: true, branch: true },
  });

  if (!profile) {
    throw new Error("Account not found");
  }

  return profile;
}

function assertViewerCanReadTarget(
  viewer: AccountsViewerDto,
  target: ProfileWithCompany,
) {
  if (target.id === viewer.profileId) {
    return;
  }

  if (viewer.role === "admin") {
    if (target.role === "admin") {
      throw new Error("Forbidden");
    }

    return;
  }

  if (
    target.role !== "cashier" ||
    !viewer.companyId ||
    target.companyId !== viewer.companyId
  ) {
    throw new Error("Forbidden");
  }
}

function assertViewerCanMutateTarget(
  viewer: AccountsViewerDto,
  target: ProfileWithCompany,
) {
  if (target.id === viewer.profileId) {
    throw new Error("Use the profile update action for your own account");
  }

  assertViewerCanReadTarget(viewer, target);
}

function buildAccountsWhere(
  viewer: AccountsViewerDto,
  filters?: GetAccountsInputDto,
): Prisma.ProfileWhereInput {
  const keyword = filters?.keyword?.trim();
  const keywordFilter = keyword
    ? {
        OR: [
          { email: { contains: keyword, mode: "insensitive" as const } },
          { fullName: { contains: keyword, mode: "insensitive" as const } },
          {
            company: {
              is: {
                name: { contains: keyword, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};

  if (viewer.role === "admin") {
    return {
      id: { not: viewer.profileId },
      role: filters?.role ? filters.role : { in: ["manager", "cashier"] },
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.companyId ? { companyId: filters.companyId } : {}),
      ...keywordFilter,
    };
  }

  return {
    id: { not: viewer.profileId },
    role: "cashier",
    companyId: viewer.companyId ?? "__missing_company__",
    ...(filters?.status ? { status: filters.status } : {}),
    ...keywordFilter,
  };
}

export const accountsService = {
  async getAccounts(
    viewer: AccountsViewerDto,
    filters?: GetAccountsInputDto,
  ): Promise<AccountListItemDto[]> {
    assertViewerCanManageAccounts(viewer);

    const profiles = await prisma.profile.findMany({
      where: buildAccountsWhere(viewer, filters),
      include: { company: true, branch: true },
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
    });

    return profiles.map((profile) => mapProfileToAccountListItem(profile, viewer));
  },

  async getAccountById(
    viewer: AccountsViewerDto,
    id: string,
  ): Promise<AccountDetailDto | null> {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { company: true, branch: true },
    });

    if (!profile) {
      return null;
    }

    assertViewerCanReadTarget(viewer, profile);
    return mapProfileToAccountDetail(profile, viewer);
  },

  async getOwnAccount(viewer: AccountsViewerDto): Promise<AccountDetailDto> {
    const profile = await getTargetAccountOrThrow(viewer.profileId);
    return mapProfileToAccountDetail(profile, viewer);
  },

  async getCompanyOptions(
    viewer: AccountsViewerDto,
  ): Promise<AccountCompanyOptionDto[]> {
    if (viewer.role === "admin") {
      const companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              posTerminals: true,
              users: { where: { role: "cashier", status: { not: "disabled" } } },
            },
          },
          branches: {
            where: { isActive: true },
            select: { id: true, companyId: true, name: true, isActive: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      return companies.map((company) =>
        mapCompanyToOption({
          id: company.id,
          name: company.name,
          terminalCount: company._count.posTerminals,
          cashierCount: company._count.users,
          cashierLimit: DEFAULT_MAX_CASHIERS,
          branches: company.branches,
        }),
      );
    }

    if (!viewer.companyId) {
      return [];
    }

    const company = await prisma.company.findUnique({
      where: { id: viewer.companyId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            posTerminals: true,
            users: { where: { role: "cashier", status: { not: "disabled" } } },
          },
        },
        branches: {
          where: { isActive: true },
          select: { id: true, companyId: true, name: true, isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    return company
      ? [
          mapCompanyToOption({
            id: company.id,
            name: company.name,
            terminalCount: company._count.posTerminals,
            cashierCount: company._count.users,
            cashierLimit: DEFAULT_MAX_CASHIERS,
            branches: company.branches,
          }),
        ]
      : [];
  },

  async createAccount(
    viewer: AccountsViewerDto,
    input: CreateAccountInputDto,
  ): Promise<AccountDetailDto> {
    assertViewerCanManageAccounts(viewer);

    if (viewer.role === "manager" && input.role !== "cashier") {
      throw new Error("Managers can only create cashier accounts");
    }

    const companyId =
      viewer.role === "manager" ? viewer.companyId : input.companyId;

    if (!companyId) {
      throw new Error("A company is required");
    }

    if (viewer.role === "manager" && companyId !== viewer.companyId) {
      throw new Error("Forbidden");
    }

    await ensureCompanyExists(companyId);

    if (input.role === "cashier") {
      await assertCashierSlotAvailable(companyId, viewer);
    }
    const branchId =
      input.role === "cashier"
        ? await ensureBranchBelongsToCompany(input.branchId, companyId)
        : null;

    const existingProfile = await prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingProfile) {
      throw new Error("An account with this email already exists");
    }

    const adminClient = createAdminClient();
    const authOptions = input.fullName
      ? { data: { full_name: input.fullName } }
      : undefined;

    const authResult =
      input.role === "cashier"
        ? await adminClient.auth.admin.createUser({
            email: input.email,
            password: input.password ?? "",
            email_confirm: true,
            ...(authOptions ? { user_metadata: authOptions.data } : {}),
          })
        : await adminClient.auth.admin.inviteUserByEmail(input.email, {
            ...(getInviteRedirectTo() ? { redirectTo: getInviteRedirectTo() } : {}),
            ...(authOptions ? { data: authOptions.data } : {}),
          });

    const { data, error } = authResult;

    if (error) {
      throw new Error(normalizeAuthError(error.message));
    }

    const invitedUser = data.user;

    if (!invitedUser?.id || !invitedUser.email) {
      throw new Error("Failed to create invited account");
    }

    const profile = await prisma.profile.upsert({
      where: { userId: invitedUser.id },
      update: {
        email: invitedUser.email,
        fullName: input.fullName,
        role: input.role,
        companyId,
        branchId,
        status: "active",
        approvedAt: new Date(),
      },
      create: {
        userId: invitedUser.id,
        email: invitedUser.email,
        fullName: input.fullName,
        role: input.role,
        companyId,
        branchId,
        status: "active",
        approvedAt: new Date(),
      },
      include: { company: true, branch: true },
    });

    return mapProfileToAccountDetail(profile, viewer);
  },

  async updateAccount(
    viewer: AccountsViewerDto,
    id: string,
    input: UpdateAccountInputDto,
  ): Promise<AccountDetailDto> {
    const target = await getTargetAccountOrThrow(id);
    assertViewerCanMutateTarget(viewer, target);

    const nextCompanyId =
      viewer.role === "manager" ? viewer.companyId : input.companyId;

    if (!nextCompanyId) {
      throw new Error("A company is required");
    }

    if (viewer.role === "manager" && nextCompanyId !== viewer.companyId) {
      throw new Error("Forbidden");
    }

    await ensureCompanyExists(nextCompanyId);
    const branchId =
      target.role === "cashier"
        ? await ensureBranchBelongsToCompany(input.branchId, nextCompanyId)
        : null;

    if (input.password) {
      const adminClient = createAdminClient();
      const { error } = await adminClient.auth.admin.updateUserById(target.userId, {
        password: input.password,
      });

      if (error) {
        throw new Error(normalizeAuthError(error.message));
      }
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        fullName: input.fullName,
        companyId: nextCompanyId,
        branchId,
      },
      include: { company: true, branch: true },
    });

    return mapProfileToAccountDetail(profile, viewer);
  },

  async deleteAccount(viewer: AccountsViewerDto, id: string): Promise<void> {
    const target = await getTargetAccountOrThrow(id);
    assertViewerCanMutateTarget(viewer, target);

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(target.userId);

    if (error) {
      throw new Error(normalizeAuthError(error.message));
    }

    await prisma.profile.delete({
      where: { id: target.id },
    });
  },

  async approveAccount(viewer: AccountsViewerDto, id: string): Promise<void> {
    if (viewer.role !== "admin") {
      throw new Error("Forbidden");
    }

    const target = await getTargetAccountOrThrow(id);

    if (target.role !== "manager" || target.status !== "pending") {
      throw new Error("Only pending manager accounts can be approved");
    }

    await prisma.profile.update({
      where: { id },
      data: {
        status: "active",
        approvedAt: new Date(),
      },
    });
  },

  async activateAccount(viewer: AccountsViewerDto, id: string): Promise<void> {
    const target = await getTargetAccountOrThrow(id);
    assertViewerCanMutateTarget(viewer, target);

    await prisma.profile.update({
      where: { id },
      data: {
        status: "active",
        approvedAt: target.approvedAt ?? new Date(),
      },
    });
  },

  async deactivateAccount(
    viewer: AccountsViewerDto,
    id: string,
  ): Promise<void> {
    const target = await getTargetAccountOrThrow(id);
    assertViewerCanMutateTarget(viewer, target);

    await prisma.profile.update({
      where: { id },
      data: {
        status: "disabled",
      },
    });
  },

  async updateOwnProfile(
    viewer: AccountsViewerDto,
    input: UpdateOwnProfileInputDto,
  ): Promise<AccountDetailDto> {
    if (input.password || input.email) {
      const supabase = await createClient();
      const { error } = await supabase.auth.updateUser(
        {
          ...(input.password ? { password: input.password } : {}),
          ...(input.email ? { email: input.email } : {}),
        },
        input.email
          ? {
              emailRedirectTo: getVerifiedEmailRedirectTo(),
            }
          : undefined,
      );

      if (error) {
        throw new Error(normalizeAuthError(error.message));
      }
    }

    const profile = await prisma.profile.update({
      where: { id: viewer.profileId },
      data: {
        fullName: input.fullName,
        ...((viewer.role === "manager" || viewer.role === "admin") &&
        input.pin !== undefined
          ? { pin: input.pin ? hashPin(input.pin) : null }
          : {}),
      },
      include: { company: true, branch: true },
    });

    return mapProfileToAccountDetail(profile, viewer);
  },

  async getAccountStatusSummary(
    viewer: AccountsViewerDto,
  ): Promise<Record<UserStatus, number>> {
    assertViewerCanManageAccounts(viewer);

    const statuses: UserStatus[] = ["pending", "active", "disabled"];
    const where = buildAccountsWhere(viewer);
    const counts = await prisma.profile.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    return statuses.reduce<Record<UserStatus, number>>((acc, status) => {
      acc[status] =
        counts.find((item) => item.status === status)?._count._all ?? 0;
      return acc;
    }, {
      pending: 0,
      active: 0,
      disabled: 0,
    });
  },
};
