"use server";

import {
  profileService,
  type ProfileListItem,
} from "@/app/(protected)/accounts/_services/profile.service";
import type { UserStatus } from "@prisma/client";

export async function findAllProfiles(params?: {
  keyword?: string;
  status?: UserStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}): Promise<ProfileListItem[]> {
  return profileService.findAll(params);
}

export async function findProfileById(
  id: string,
): Promise<ProfileListItem | null> {
  return profileService.findById(id);
}

export async function approveProfile(id: string): Promise<void> {
  return profileService.approve(id);
}

export async function rejectProfile(id: string): Promise<void> {
  return profileService.reject(id);
}

export async function activateProfile(id: string): Promise<void> {
  return profileService.activate(id);
}

export async function deactivateProfile(id: string): Promise<void> {
  return profileService.deactivate(id);
}
