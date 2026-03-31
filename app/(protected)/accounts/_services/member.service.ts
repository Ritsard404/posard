import "server-only";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  MemberListItem,
  MemberApprovalStatus,
  PermissionType,
} from "./member.dto";
import { MOCK_MEMBERS } from "./member.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── In-memory store so mock mutations persist during the session ──────────────
let mockStore: MemberListItem[] = [...MOCK_MEMBERS];

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ── Valid sort columns (whitelist to prevent injection) ───────────────────────
const SORTABLE_FIELDS: Record<
  string,
  keyof Prisma.MemberOrderByWithRelationInput
> = {
  firstName: "firstName",
  lastName: "lastName",
  username: "username",
  createdAt: "createdAt",
  approvalStatus: "approvalStatus",
};

// ── Mapper ────────────────────────────────────────────────────────────────────
// Schema note: Member has no role field — role lives on Profile (linked by Member.id = Profile.userId).
// We fetch Profile in the same query to resolve permission.
// isActive is derived: approved + not soft-deleted.

type MemberWithRelations = Prisma.MemberGetPayload<{
  include: { company: true };
}>;

type ProfileRole = "admin" | "manager" | "cashier";

function toListItem(
  member: MemberWithRelations,
  role: ProfileRole = "cashier",
): MemberListItem {
  return {
    memberId: member.id,
    identifier:
      member.username ??
      (`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
        member.id),
    // Schema only has PENDING | APPROVED; soft-deleted members are treated as rejected
    approvalStatus: member.memberIsDeleted
      ? "REJECTED"
      : (member.approvalStatus as MemberApprovalStatus),
    isActive: member.approvalStatus === "APPROVED" && !member.memberIsDeleted,
    permission: role as PermissionType,
    company: member.company
      ? {
          uuid: member.company.id,
          name: member.company.name,
          code: member.company.code,
          email: member.company.email,
          phone: member.company.phone,
          logoImageUrl: member.company.logoImageUrl,
        }
      : {
          uuid: null,
          name: null,
          code: null,
          email: null,
          phone: null,
          logoImageUrl: null,
        },
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const memberService = {
  async findAll(params?: {
    keyword?: string;
    approvalStatus?: MemberApprovalStatus;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<MemberListItem[]> {
    if (USE_MOCK) {
      await delay();
      return [...mockStore];
    }

    const orderByKey =
      params?.sortBy && SORTABLE_FIELDS[params.sortBy]
        ? SORTABLE_FIELDS[params.sortBy]
        : "createdAt";

    const where: Prisma.MemberWhereInput = {
      // REJECTED in DTO = soft-deleted; if filtering by REJECTED, query deleted records
      ...(params?.approvalStatus === "REJECTED"
        ? { memberIsDeleted: true }
        : {
            memberIsDeleted: false,
            ...(params?.approvalStatus
              ? {
                  approvalStatus: params.approvalStatus as
                    | "PENDING"
                    | "APPROVED",
                }
              : {}),
          }),
      ...(params?.keyword
        ? {
            OR: [
              { username: { contains: params.keyword, mode: "insensitive" } },
              { firstName: { contains: params.keyword, mode: "insensitive" } },
              { lastName: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const members = await prisma.member.findMany({
      where,
      include: { company: true },
      skip: (params?.page ?? 0) * (params?.size ?? 50),
      take: params?.size ?? 50,
      orderBy: { [orderByKey]: params?.direction ?? "desc" },
    });

    // Batch-fetch profiles to resolve roles
    const memberIds = members.map((m) => m.id);
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, role: true },
    });
    const roleMap = new Map(
      profiles.map((p) => [p.userId, p.role as ProfileRole]),
    );

    return members.map((m) => toListItem(m, roleMap.get(m.id)));
  },

  async findById(id: string): Promise<MemberListItem | null> {
    if (USE_MOCK) {
      await delay();
      return mockStore.find((m) => m.memberId === id) ?? null;
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!member) return null;

    const profile = await prisma.profile.findUnique({
      where: { userId: id },
      select: { role: true },
    });

    return toListItem(member, profile?.role as ProfileRole | undefined);
  },

  async approve(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id
          ? { ...m, approvalStatus: "APPROVED" as MemberApprovalStatus }
          : m,
      );
      return;
    }

    await prisma.member.update({
      where: { id },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        memberIsDeleted: false,
      },
    });
  },

  // Schema has no REJECTED status — soft-delete the member instead.
  async reject(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id
          ? { ...m, approvalStatus: "REJECTED" as MemberApprovalStatus }
          : m,
      );
      return;
    }

    await prisma.member.update({
      where: { id },
      data: {
        memberIsDeleted: true,
        memberDeletedAt: new Date(),
      },
    });
  },

  // Schema has no isActive field — re-approve to activate.
  async activate(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id ? { ...m, isActive: true } : m,
      );
      return;
    }

    await prisma.member.update({
      where: { id },
      data: {
        approvalStatus: "APPROVED",
        memberIsDeleted: false,
      },
    });
  },

  // Schema has no isActive field — soft-delete to deactivate.
  async deactivate(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id ? { ...m, isActive: false } : m,
      );
      return;
    }

    await prisma.member.update({
      where: { id },
      data: {
        memberIsDeleted: true,
        memberDeletedAt: new Date(),
      },
    });
  },
};
