"use client";

import type { ManagerVerifierDto } from "./_dto/offline.dto";

export async function verifyManagerPinOffline(input: {
  companyId: string;
  deviceId: string;
  pin: string;
  verifiers: ManagerVerifierDto[];
}): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
} | null> {
  void input;
  return null;
}
