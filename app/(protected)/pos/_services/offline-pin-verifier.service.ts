import "server-only";

import { createHash } from "node:crypto";

function buildVerifierMaterial(input: {
  companyId: string;
  profileId: string;
  deviceId: string;
  pin: string;
}) {
  return `${input.companyId}:${input.profileId}:${input.deviceId}:${input.pin}`;
}

export function buildManagerPinVerifier(input: {
  companyId: string;
  profileId: string;
  deviceId: string;
  pin: string;
}) {
  return createHash("sha256")
    .update(buildVerifierMaterial(input))
    .digest("hex");
}
