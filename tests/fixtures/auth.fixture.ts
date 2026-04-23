import 'dotenv/config';

import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../../lib/prisma';

type AuthCredentials = {
  email: string;
  password: string;
};

export const authCredentials = {
  email: process.env.E2E_AUTH_EMAIL ?? 'posard@pos.com',
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
  await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/);
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

  await page.getByLabel('Email Address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function ensureAuthUserForProfile(credentials: AuthCredentials) {
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

export async function createOnboardingAdminAccount() {
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
