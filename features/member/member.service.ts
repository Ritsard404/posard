import { MemberListItem } from "./member.dto";
import { MOCK_MEMBERS } from "./member.mock";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const memberService = {
  findAll(): Promise<MemberListItem[]> {
    if (USE_MOCK) return Promise.resolve(MOCK_MEMBERS);
    // TODO: return prisma.member.findMany(...)
    return Promise.resolve([]);
  },
  async findById(id: string): Promise<MemberListItem | null> {
    if (USE_MOCK) {
      const member = MOCK_MEMBERS.find((m) => m.memberId === id);
      return member ?? null;
    }
    // TODO: return prisma.member.findUnique(...)
    return Promise.resolve(null);
  },
};
