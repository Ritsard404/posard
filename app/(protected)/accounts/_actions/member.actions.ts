"use server";

import { memberService } from "@/app/(protected)/accounts/_services/member.service";
import type { MemberApprovalStatus, MemberListItem } from "@/app/(protected)/accounts/_services/member.dto";

export async function findAllMembers(params?: {
  keyword?: string;
  approvalStatus?: MemberApprovalStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}): Promise<MemberListItem[]> {
  return memberService.findAll(params);
}

export async function findMemberById(id: string): Promise<MemberListItem | null> {
  return memberService.findById(id);
}

export async function approveMember(id: string): Promise<void> {
  return memberService.approve(id);
}

export async function rejectMember(id: string): Promise<void> {
  return memberService.reject(id);
}

export async function activateMember(id: string): Promise<void> {
  return memberService.activate(id);
}

export async function deactivateMember(id: string): Promise<void> {
  return memberService.deactivate(id);
}
