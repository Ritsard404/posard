import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Prisma, Profile } from "@prisma/client";
import type { prisma as prismaClient } from "@/lib/prisma";

const PIN_HASH_PREFIX = "scrypt";
const LEGACY_SQL_HASH_PREFIX = "sha256";
const PIN_KEY_LENGTH = 32;
const PIN_SALT_BYTES = 16;

type PinProfile = Pick<Profile, "id" | "pin">;

function normalizePin(pin: string) {
  return pin.trim();
}

export function isHashedPin(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${PIN_HASH_PREFIX}$`);
}

function isLegacySqlHashedPin(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${LEGACY_SQL_HASH_PREFIX}$`);
}

export function hashPin(pin: string) {
  const normalizedPin = normalizePin(pin);
  if (!/^\d{4,6}$/.test(normalizedPin)) {
    throw new Error("PIN must be 4 to 6 digits.");
  }

  const salt = randomBytes(PIN_SALT_BYTES).toString("base64url");
  const hash = scryptSync(normalizedPin, salt, PIN_KEY_LENGTH).toString("base64url");
  return `${PIN_HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPin(pin: string, storedPin: string | null | undefined) {
  const normalizedPin = normalizePin(pin);
  if (!normalizedPin || !storedPin) {
    return false;
  }

  if (isLegacySqlHashedPin(storedPin)) {
    const [, salt, expectedHash] = storedPin.split("$");
    if (!salt || !expectedHash) {
      return false;
    }

    const actual = Buffer.from(
      createHash("sha256").update(`${normalizedPin}${salt}`).digest("hex"),
    );
    const expected = Buffer.from(expectedHash);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  if (!isHashedPin(storedPin)) {
    return normalizedPin === storedPin;
  }

  const [, salt, expectedHash] = storedPin.split("$");
  if (!salt || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(
    scryptSync(normalizedPin, salt, PIN_KEY_LENGTH).toString("base64url"),
  );
  const expected = Buffer.from(expectedHash);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyAndUpgradeProfilePin(
  db: Prisma.TransactionClient | typeof prismaClient,
  profile: PinProfile,
  pin: string,
) {
  if (!verifyPin(pin, profile.pin)) {
    return false;
  }

  if (profile.pin && !isHashedPin(profile.pin)) {
    await db.profile.update({
      where: { id: profile.id },
      data: { pin: hashPin(pin) },
    });
  }

  return true;
}

type ProfileByPinSelect<T extends Prisma.ProfileSelect | undefined> =
  T extends Prisma.ProfileSelect ? Prisma.ProfileGetPayload<{ select: T & { id: true; pin: true } }> : Pick<Profile, "id" | "pin">;

export async function findProfileByPin<T extends Prisma.ProfileSelect | undefined = undefined>(input: {
  db?: Prisma.TransactionClient | typeof prismaClient;
  companyId: string;
  pin: string;
  roles?: Array<"admin" | "manager" | "cashier">;
  select?: T;
}): Promise<Omit<ProfileByPinSelect<T>, "pin"> | null> {
  const { prisma } = await import("@/lib/prisma");
  const db = input.db ?? prisma;
  const profiles = await db.profile.findMany({
    where: {
      companyId: input.companyId,
      pin: { not: null },
      ...(input.roles ? { role: { in: input.roles } } : {}),
    },
    select: {
      id: true,
      pin: true,
      ...(input.select ?? {}),
    },
  });

  for (const profile of profiles as ProfileByPinSelect<T>[]) {
    if (await verifyAndUpgradeProfilePin(db, profile, input.pin)) {
      const safeProfile = { ...profile };
      delete (safeProfile as Partial<typeof safeProfile>).pin;
      return safeProfile;
    }
  }

  return null;
}
