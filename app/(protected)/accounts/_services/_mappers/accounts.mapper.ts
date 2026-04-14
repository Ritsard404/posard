import type { Prisma } from "@prisma/client";
import type {
  AccountCompanyOptionDto,
  AccountDetailDto,
  AccountListItemDto,
  AccountPermissionsDto,
  AccountsViewerDto,
} from "../_dto/accounts.dto";

type ProfileWithCompany = Prisma.ProfileGetPayload<{
  include: { company: true };
}>;

function getPermissions(
  viewer: AccountsViewerDto,
  profile: ProfileWithCompany,
): AccountPermissionsDto {
  const isSelf = viewer.profileId === profile.id;

  if (isSelf || profile.role === "admin") {
    return {
      canApprove: false,
      canActivate: false,
      canDeactivate: false,
      canEdit: false,
      canDelete: false,
    };
  }

  if (viewer.role === "admin") {
    return {
      canApprove: profile.role === "manager" && profile.status === "pending",
      canActivate: profile.status === "disabled",
      canDeactivate: profile.status === "active",
      canEdit: profile.role === "manager" || profile.role === "cashier",
      canDelete: profile.role === "manager" || profile.role === "cashier",
    };
  }

  const canManageCashier =
    profile.role === "cashier" &&
    viewer.companyId !== null &&
    profile.companyId === viewer.companyId;

  return {
    canApprove: false,
    canActivate: canManageCashier && profile.status === "disabled",
    canDeactivate: canManageCashier && profile.status === "active",
    canEdit: canManageCashier,
    canDelete: canManageCashier,
  };
}

export function mapProfileToAccountListItem(
  profile: ProfileWithCompany,
  viewer: AccountsViewerDto,
): AccountListItemDto {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    status: profile.status,
    company: profile.company
      ? { id: profile.company.id, name: profile.company.name }
      : { id: null, name: null },
    isSelf: viewer.profileId === profile.id,
    ...getPermissions(viewer, profile),
  };
}

export function mapProfileToAccountDetail(
  profile: ProfileWithCompany,
  viewer: AccountsViewerDto,
): AccountDetailDto {
  return {
    ...mapProfileToAccountListItem(profile, viewer),
    approvedAt: profile.approvedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function mapCompanyToOption(
  company: { id: string; name: string },
): AccountCompanyOptionDto {
  return {
    id: company.id,
    name: company.name,
  };
}
