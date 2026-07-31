import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../../lib/prisma';
import { hashPin } from '../../lib/security/pin';
import { assertE2EDatabaseWritesAllowed } from './e2e-environment';

type AuthCredentials = {
  email: string;
  password: string;
};

const SUPABASE_COOKIE_PREFIX = 'base64-';
const SUPABASE_COOKIE_CHUNK_SIZE = 3180;
const SUPABASE_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const authCredentials = {
  email: process.env.E2E_AUTH_EMAIL ?? 'manager@posard.com',
  password: process.env.E2E_AUTH_PASSWORD ?? '200303',
};

export const managerCredentials = {
  email: process.env.E2E_MANAGER_EMAIL ?? 'manager@posard.com',
  password: process.env.E2E_MANAGER_PASSWORD ?? '200303',
};

export const cashierCredentials = {
  email: process.env.E2E_CASHIER_EMAIL ?? 'cashier@posard.com',
  password: process.env.E2E_CASHIER_PASSWORD ?? '200303',
};

export async function expectLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/, { timeout: 30_000 });
  await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Enter your credentials to access your terminal'),
  ).toBeVisible();
  await expect(page.getByLabel('Email Address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
}

export async function loginAsTestUser(page: Page) {
  await loginWithCredentials(page, authCredentials);

  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({
    timeout: 30_000,
  });
}

export async function loginAsManager(page: Page) {
  await loginWithCredentials(page, managerCredentials);

  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({
    timeout: 30_000,
  });
}

export async function loginAsCashier(page: Page) {
  await loginWithCredentials(page, cashierCredentials);

  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({
    timeout: 30_000,
  });
}

export async function loginWithCredentials(
  page: Page,
  credentials: AuthCredentials,
) {
  await page.goto('/auth/login');
  await expectLoginPage(page);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
    // The dev HMR socket can keep the page from becoming fully idle.
  });

  await page.getByLabel('Email Address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Login' }).click();
}

function getPlaywrightBaseUrl() {
  const port = Number(process.env.PORT ?? 3000);
  return process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
}

function getSupabaseStorageKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for auth test setup.');
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

function chunkCookieValue(key: string, value: string) {
  const encodedValue = encodeURIComponent(value);

  if (encodedValue.length <= SUPABASE_COOKIE_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  const chunks: string[] = [];
  let remainingEncodedValue = encodedValue;

  while (remainingEncodedValue.length > 0) {
    let encodedChunk = remainingEncodedValue.slice(
      0,
      SUPABASE_COOKIE_CHUNK_SIZE,
    );
    const lastEscapePosition = encodedChunk.lastIndexOf('%');

    if (lastEscapePosition > SUPABASE_COOKIE_CHUNK_SIZE - 3) {
      encodedChunk = encodedChunk.slice(0, lastEscapePosition);
    }

    let decodedChunk = '';

    while (encodedChunk.length > 0) {
      try {
        decodedChunk = decodeURIComponent(encodedChunk);
        break;
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedChunk.at(-3) === '%' &&
          encodedChunk.length > 3
        ) {
          encodedChunk = encodedChunk.slice(0, encodedChunk.length - 3);
        } else {
          throw error;
        }
      }
    }

    chunks.push(decodedChunk);
    remainingEncodedValue = remainingEncodedValue.slice(encodedChunk.length);
  }

  return chunks.map((chunk, index) => ({ name: `${key}.${index}`, value: chunk }));
}

export async function authenticatePageWithCredentials(
  page: Page,
  credentials: AuthCredentials,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing public Supabase env vars for auth test setup.');
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error || !data.session) {
    throw error ?? new Error(`Unable to sign in ${credentials.email}.`);
  }

  const storageKey = getSupabaseStorageKey();
  const sessionCookieValue =
    SUPABASE_COOKIE_PREFIX +
    Buffer.from(JSON.stringify(data.session), 'utf8').toString('base64url');
  const expires = Math.floor(Date.now() / 1000) + SUPABASE_COOKIE_MAX_AGE_SECONDS;

  await page.context().addCookies(
    chunkCookieValue(storageKey, sessionCookieValue).map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: getPlaywrightBaseUrl(),
      sameSite: 'Lax' as const,
      expires,
    })),
  );
}

/** Persist an authenticated browser context for suites that do not test login itself. */
export async function saveAuthenticatedStorageState(
  page: Page,
  credentials: AuthCredentials,
  storageStatePath: string,
) {
  await authenticatePageWithCredentials(page, credentials);
  await page.context().storageState({ path: storageStatePath });
}

export async function ensureAuthUserForProfile(credentials: AuthCredentials) {
  assertE2EDatabaseWritesAllowed();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env vars for auth test setup.');
  }

  const profile = await prisma.profile.findUnique({
    where: { email: credentials.email },
    select: { id: true, userId: true, fullName: true },
  });

  if (!profile) {
    throw new Error(`Profile ${credentials.email} must exist before auth setup.`);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) {
    throw users.error;
  }

  let authUser = users.data.users.find(
    (user) => user.email?.toLowerCase() === credentials.email.toLowerCase(),
  );

  if (!authUser) {
    const created = await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { full_name: profile.fullName ?? credentials.email },
    });

    if (created.error || !created.data.user) {
      throw created.error ?? new Error('Failed to create auth test user.');
    }

    authUser = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(authUser.id, {
      password: credentials.password,
      email_confirm: true,
      user_metadata: { full_name: profile.fullName ?? credentials.email },
    });

    if (updated.error) {
      throw updated.error;
    }
  }

  const conflictingProfile = await prisma.profile.findUnique({
    where: { userId: authUser.id },
    select: { id: true, email: true },
  });

  if (conflictingProfile && conflictingProfile.id !== profile.id) {
    throw new Error(
      `Auth user ${credentials.email} is already linked to profile ${conflictingProfile.email}.`,
    );
  }

  const originalUserId = profile.userId;

  if (originalUserId !== authUser.id) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { userId: authUser.id },
    });
  }

  return {
    async cleanup() {
      if (originalUserId !== authUser.id) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { userId: originalUserId },
        });
      }
    },
  };
}

export async function ensurePosResponsiveProfiles() {
  assertE2EDatabaseWritesAllowed();
  const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const company = await prisma.company.create({
    data: { name: `E2E POS Responsive ${testId}` },
    select: { id: true },
  });
  const createdProfileIds: string[] = [];
  const existingProfiles: Array<{
    id: string;
    userId: string;
    fullName: string | null;
    role: 'admin' | 'manager' | 'cashier';
    status: 'pending' | 'active' | 'disabled';
    companyId: string | null;
    branchId: string | null;
    approvedAt: Date | null;
  }> = [];

  const ensureProfile = async (
    credentials: AuthCredentials,
    role: 'manager' | 'cashier',
  ) => {
    const existing = await prisma.profile.findUnique({
      where: { email: credentials.email },
      select: {
        id: true,
        userId: true,
        fullName: true,
        role: true,
        status: true,
        companyId: true,
        branchId: true,
        approvedAt: true,
      },
    });

    if (existing) {
      existingProfiles.push(existing);
      await prisma.profile.update({
        where: { id: existing.id },
        data: {
          role,
          status: 'active',
          companyId: company.id,
          branchId: null,
          approvedAt: existing.approvedAt ?? new Date(),
        },
      });
      return;
    }

    const created = await prisma.profile.create({
      data: {
        userId: randomUUID(),
        email: credentials.email,
        fullName: role === 'manager' ? 'E2E Manager' : 'E2E Cashier',
        role,
        status: 'active',
        approvedAt: new Date(),
        companyId: company.id,
      },
      select: { id: true },
    });
    createdProfileIds.push(created.id);
  };

  await ensureProfile(managerCredentials, 'manager');
  await ensureProfile(cashierCredentials, 'cashier');
  const returnApprover = await prisma.profile.create({
    data: {
      userId: randomUUID(),
      email: `e2e-return-approver-${testId}@example.com`,
      fullName: 'E2E Return Approver',
      role: 'manager',
      status: 'active',
      approvedAt: new Date(),
      companyId: company.id,
      pin: hashPin('2468'),
    },
    select: { id: true },
  });
  createdProfileIds.push(returnApprover.id);

  return {
    companyId: company.id,
    async cleanup() {
      for (const profile of existingProfiles) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            userId: profile.userId,
            fullName: profile.fullName,
            role: profile.role,
            status: profile.status,
            companyId: profile.companyId,
            branchId: profile.branchId,
            approvedAt: profile.approvedAt,
          },
        });
      }

      if (createdProfileIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { actorProfileId: { in: createdProfileIds } },
        });
        await prisma.profile.deleteMany({
          where: { id: { in: createdProfileIds } },
        });
      }

      await prisma.company.deleteMany({ where: { id: company.id } });
    },
  };
}

export async function createOnboardingAdminAccount() {
  assertE2EDatabaseWritesAllowed();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase env vars for onboarding auth test setup.',
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const credentials = {
    email: `e2e-onboarding-admin-${uniqueId}@posard.test`,
    password: '200303',
  };

  const { data: authData, error: createUserError } =
    await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Onboarding Admin' },
    });

  if (createUserError || !authData.user) {
    throw createUserError ?? new Error('Failed to create onboarding auth user.');
  }

  const userId = authData.user.id;
  try {
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        email: credentials.email,
        fullName: 'E2E Onboarding Admin',
        role: 'manager',
        status: 'active',
        companyId: null,
      },
      update: {
        email: credentials.email,
        fullName: 'E2E Onboarding Admin',
        role: 'manager',
        status: 'active',
        companyId: null,
      },
    });
  } catch (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw profileError;
  }

  return {
    credentials,
    async cleanup() {
      await prisma.profile.deleteMany({ where: { userId } });
      await admin.auth.admin.deleteUser(userId);
    },
  };
}
