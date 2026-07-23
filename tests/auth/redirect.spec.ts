import { expect, test } from "@playwright/test";
import { prisma } from "../../lib/prisma";
import {
  authCredentials,
  authenticatePageWithCredentials,
  createOnboardingAdminAccount,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  expectLoginPage,
  loginAsTestUser,
  loginWithCredentials,
  managerCredentials,
} from "../fixtures/auth.fixture";

const protectedRouteGroups = [
  "/accounts",
  "/admin",
  "/approvals",
  "/companies",
  "/customers",
  "/dashboard",
  "/data-exchange",
  "/debts",
  "/expenses",
  "/feature-guide",
  "/help",
  "/inventory-ledger",
  "/kitchen",
  "/notifications",
  "/pos",
  "/product",
  "/promotions",
  "/purchase-orders",
  "/report",
  "/reports",
  "/settings",
  "/setup-company",
  "/subscriptions",
  "/suppliers",
  "/sync",
  "/terminals",
  "/transfers",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("auth redirects @smoke @permissions", () => {
  test("allows unauthenticated users to visit public marketing pages", async ({
    page,
  }) => {
    for (const path of ["/pricing", "/solutions", "/features"]) {
      await page.goto(path);

      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("redirects unauthenticated users from protected routes to login", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    for (const path of protectedRouteGroups) {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveURL(
        new RegExp(
          `/auth/login\\?callbackUrl=${escapeRegExp(encodeURIComponent(path))}$`,
        ),
      );
      await expectLoginPage(page);
    }
  });

  test("redirects authenticated users away from the login page", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await authenticatePageWithCredentials(page, authCredentials);

    await page.goto("/auth/login");

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
  });

  test("rejects an expired browser session without rendering protected content", async ({
    page,
  }) => {
    await authenticatePageWithCredentials(page, authCredentials);
    const sessionCookies = await page.context().cookies();
    await page.context().clearCookies();
    await page.context().addCookies(
      sessionCookies.map((cookie) => ({
        ...cookie,
        expires: Math.floor(Date.now() / 1000) - 60,
      })),
    );

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expectLoginPage(page);
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
  });

  test("returns a valid login to its protected deep link", async ({ page }) => {
    test.setTimeout(90_000);
    const profiles = await ensurePosResponsiveProfiles();
    const authUser = await ensureAuthUserForProfile(managerCredentials);
    try {
      await page.goto("/dashboard?source=e2e-deep-link");
      await expectLoginPage(page);
      await expect(page.locator("[data-login-callback-url]")).toHaveAttribute(
        "data-login-callback-url",
        "/dashboard?source=e2e-deep-link",
      );
      await page.getByLabel("Email Address").fill(managerCredentials.email);
      await page.getByLabel("Password").fill(managerCredentials.password);
      await page.getByRole("button", { name: "Login" }).click();

      await expect(page).toHaveURL(/\/dashboard\?source=e2e-deep-link$/, {
        timeout: 30_000,
      });
      await expect(page.getByRole("heading").first()).toBeVisible();
    } finally {
      await authUser.cleanup();
      await profiles.cleanup();
    }
  });

  test("rejects an external login redirect", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto(
      `/auth/login?callbackUrl=${encodeURIComponent("https://example.com/steal")}`,
    );
    await page.getByLabel("Email Address").fill(authCredentials.email);
    await page.getByLabel("Password").fill(authCredentials.password);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(
      /\/(?:dashboard|pos|setup-company)(?:\?.*)?$/,
      {
        timeout: 30_000,
      },
    );
    expect(new URL(page.url()).origin).toBe(
      new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").origin,
    );
  });

  test("renders query-driven auth error messages for signed-in users", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAsTestUser(page);

    await page.goto("/auth/error?error=Auth%20callback%20failed");

    await expect(page.getByText("Sorry, something went wrong.")).toBeVisible();
    await expect(
      page.getByText("Code error: Auth callback failed"),
    ).toBeVisible();
  });

  test("redirects a new company admin with no company to onboarding after login", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const onboardingAdmin = await createOnboardingAdminAccount();

    try {
      await loginWithCredentials(page, onboardingAdmin.credentials);

      await expect(page).toHaveURL(/\/setup-company(?:\?.*)?$/, {
        timeout: 30_000,
      });
      await expect(page.getByText("Create Your Workspace")).toBeVisible();
      await expect(page.getByText("Company Essentials")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Launch My Workspace" }),
      ).toBeVisible();
    } finally {
      await onboardingAdmin.cleanup();
    }
  });

  test("creates a first company once under concurrent onboarding submits @destructive", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const onboardingAdmin = await createOnboardingAdminAccount();
    let companyId: string | null = null;

    try {
      await loginWithCredentials(page, onboardingAdmin.credentials);
      await expect(page).toHaveURL(/\/setup-company(?:\?.*)?$/, {
        timeout: 30_000,
      });
      const secondPage = await page.context().newPage();
      await secondPage.goto("/setup-company");
      const companyName = `E2E ONBOARDING ${Date.now()}`;

      for (const setupPage of [page, secondPage]) {
        await setupPage.getByPlaceholder("e.g. Brew & Co.").fill(companyName);
        await setupPage
          .getByPlaceholder("Secure 4-6 digit numeric PIN")
          .fill("2468");
      }

      await Promise.all([
        page.getByRole("button", { name: "Launch My Workspace" }).click(),
        secondPage.getByRole("button", { name: "Launch My Workspace" }).click(),
      ]);

      await expect
        .poll(
          async () => {
            const profile = await prisma.profile.findUnique({
              where: { email: onboardingAdmin.credentials.email },
              select: { companyId: true },
            });
            return profile?.companyId ?? null;
          },
          { timeout: 45_000 },
        )
        .not.toBeNull();
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { email: onboardingAdmin.credentials.email },
        select: { companyId: true },
      });
      companyId = profile.companyId;
      expect(companyId).toBeTruthy();
      expect(await prisma.company.count({ where: { name: companyName } })).toBe(
        1,
      );
      expect(
        await prisma.posTerminalInfo.count({
          where: { companyId: companyId! },
        }),
      ).toBe(1);
      expect(
        await prisma.terminalSubscription.count({
          where: { terminal: { companyId: companyId! } },
        }),
      ).toBe(1);
      await secondPage.close();
    } finally {
      if (companyId) {
        await prisma.profile.updateMany({
          where: { email: onboardingAdmin.credentials.email },
          data: { companyId: null },
        });
        await prisma.posTerminalInfo.deleteMany({ where: { companyId } });
        await prisma.company.deleteMany({ where: { id: companyId } });
      }
      await onboardingAdmin.cleanup();
    }
  });
});
