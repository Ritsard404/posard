import { MemberListItem, MemberApprovalStatus } from "./member.dto";
import { MOCK_MEMBERS } from "./member.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── In-memory store so mutations persist during the session ──────────────────
let mockStore: MemberListItem[] = [...MOCK_MEMBERS];

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

export const memberService = {
  // ── Queries ───────────────────────────────────────────────────────────────

  async findAll(): Promise<MemberListItem[]> {
    if (USE_MOCK) {
      await delay();
      return [...mockStore];
    }
    // TODO: return prisma.member.findMany({ include: { company: true } })
    return [];
  },

  async findById(id: string): Promise<MemberListItem | null> {
    if (USE_MOCK) {
      await delay();
      return mockStore.find((m) => m.memberId === id) ?? null;
    }
    // TODO: return prisma.member.findUnique({ where: { id } })
    return null;
  },

  // ── Mutations ─────────────────────────────────────────────────────────────

  async approve(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id
          ? { ...m, approvalStatus: "APPROVED" as MemberApprovalStatus }
          : m
      );
      return;
    }
    // TODO: await prisma.member.update({ where: { id }, data: { approvalStatus: "APPROVED" } })
  },

  async reject(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id
          ? { ...m, approvalStatus: "REJECTED" as MemberApprovalStatus }
          : m
      );
      return;
    }
    // TODO: await prisma.member.update({ where: { id }, data: { approvalStatus: "REJECTED" } })
  },

  async activate(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id ? { ...m, isActive: true } : m
      );
      return;
    }
    // TODO: await prisma.member.update({ where: { id }, data: { isActive: true } })
  },

  async deactivate(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockStore = mockStore.map((m) =>
        m.memberId === id ? { ...m, isActive: false } : m
      );
      return;
    }
    // TODO: await prisma.member.update({ where: { id }, data: { isActive: false } })
  },
};