import "dotenv/config";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../../lib/prisma";
import { loginWithCredentials } from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

type AccountState = {
  label: string;
  role?: "admin" | "manager" | "cashier";
  status?: "pending" | "active" | "disabled";
  companyId?: string | null;
};

test("enforces active roles and rejects pending, disabled, and unassigned accounts @permissions @destructive", async ({
  page,
}) => {
  test.setTimeout(300_000);
  assertE2EDatabaseWritesAllowed();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error("Missing Supabase admin credentials.");

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const password = "E2E-access-200303";
  const company = await prisma.company.create({
    data: { name: `E2E Access Matrix ${suffix}` },
    select: { id: true },
  });
  const authUserIds: string[] = [];
  const profileIds: string[] = [];
  let loginAttempt = 0;

  async function login(account: { email: string; password: string }) {
    loginAttempt += 1;
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `192.0.2.${loginAttempt}`,
    });
    await loginWithCredentials(page, account);
  }

  async function createAccount(state: AccountState) {
    const credentials = {
      email: `e2e-${state.label}-${suffix}@posard.test`,
      password,
    };
    const created = await adminClient.auth.admin.createUser({
      email: credentials.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `E2E ${state.label}` },
    });
    if (created.error || !created.data.user) {
      throw (
        created.error ?? new Error(`Unable to create ${state.label} auth user.`)
      );
    }
    authUserIds.push(created.data.user.id);

    if (state.role && state.status) {
      const profile = await prisma.profile.create({
        data: {
          userId: created.data.user.id,
          email: credentials.email,
          fullName: `E2E ${state.label}`,
          role: state.role,
          status: state.status,
          companyId:
            state.companyId === undefined ? company.id : state.companyId,
          approvedAt: state.status === "active" ? new Date() : null,
        },
        select: { id: true },
      });
      profileIds.push(profile.id);
    }

    return credentials;
  }

  try {
    const activeAdmin = await createAccount({
      label: "active-admin",
      role: "admin",
      status: "active",
      companyId: null,
    });
    const activeManager = await createAccount({
      label: "active-manager",
      role: "manager",
      status: "active",
    });
    const activeCashier = await createAccount({
      label: "active-cashier",
      role: "cashier",
      status: "active",
    });
    const pending = await createAccount({
      label: "pending-manager",
      role: "manager",
      status: "pending",
    });
    const disabled = await createAccount({
      label: "disabled-cashier",
      role: "cashier",
      status: "disabled",
    });
    const unassigned = await createAccount({ label: "unassigned" });
    const revoked = await createAccount({
      label: "revoked-manager",
      role: "manager",
      status: "active",
    });

    for (const account of [activeAdmin, activeManager, activeCashier]) {
      await page.context().clearCookies();
      await login(account);
      await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, {
        timeout: 30_000,
      });
      await expect(
        page.getByRole("heading", { name: "Dashboard" }).first(),
      ).toBeVisible();
    }

    await page.context().clearCookies();
    await login(activeAdmin);
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await expect(page.locator("body")).not.toContainText(
      /Application error|Internal Server Error/i,
    );
    await page.goto("/pos");
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);

    await page.context().clearCookies();
    await login(activeManager);
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);

    await page.context().clearCookies();
    await login(activeCashier);
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
    await page.goto("/accounts");
    await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);

    for (const account of [pending, disabled, unassigned]) {
      await page.context().clearCookies();
      await login(account);
      await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/);
      await page.waitForLoadState("domcontentloaded");
      await expect(
        page.getByText(
          "Your account is not active yet. Please contact an admin.",
          {
            exact: true,
          },
        ),
      ).toBeVisible({ timeout: 30_000 });
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/);
    }

    await page.context().clearCookies();
    await login(revoked);
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, {
      timeout: 30_000,
    });
    const revokedUserId = authUserIds.at(-1);
    if (!revokedUserId) throw new Error("Missing revoked test user ID.");
    const revokedResult =
      await adminClient.auth.admin.deleteUser(revokedUserId);
    if (revokedResult.error) throw revokedResult.error;
    await page.goto("/dashboard?revoked=e2e", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(
      0,
    );
  } finally {
    if (profileIds.length > 0) {
      await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
    }
    await prisma.company.deleteMany({ where: { id: company.id } });
    for (const userId of authUserIds) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  }
});
