"use client";

import type { ManagerVerifierDto } from "./_dto/offline.dto";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyManagerPinOffline(input: {
  companyId: string;
  deviceId: string;
  pin: string;
  verifiers: ManagerVerifierDto[];
}) {
  const normalizedPin = input.pin.trim();
  if (!normalizedPin) {
    return null;
  }

  for (const verifier of input.verifiers) {
    const candidate = await sha256Hex(
      `${input.companyId}:${verifier.profileId}:${input.deviceId}:${normalizedPin}`,
    );
    if (candidate === verifier.pinVerifier) {
      return {
        id: verifier.profileId,
        email: verifier.email,
        name: verifier.name,
        role: verifier.role,
      };
    }
  }

  return null;
}
