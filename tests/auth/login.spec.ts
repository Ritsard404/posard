import { expect, type Page, test } from "@playwright/test";
import { expectLoginPage, loginAsTestUser } from "../fixtures/auth.fixture";

const passwordTokenRoute = /\/auth\/v1\/token\?grant_type=password$/;

async function mockInvalidPasswordLogin(page: Page) {
  await page.route(passwordTokenRoute, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    });
  });
}

test.describe("auth login @smoke", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/auth/login");

    await expectLoginPage(page);
    await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    );
  });

  test("keeps users on the login page when required fields are empty", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(
      0,
    );
    await expect(page.getByLabel("Email Address")).toBeFocused();

    const emailIsMissing = await page
      .getByLabel("Email Address")
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing);
    expect(emailIsMissing).toBe(true);
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    await mockInvalidPasswordLogin(page);
    await page.goto("/auth/login");

    await page.getByLabel("Email Address").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Invalid login credentials" }),
    ).toContainText("Invalid login credentials");
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole("button", { name: "Login" })).toBeEnabled();
  });

  for (const failure of [
    {
      name: "rate limiting",
      status: 429,
      body: {
        error: "over_request_rate_limit",
        error_description: "Too many requests. Please try again later.",
      },
      message: /Too many requests|try again later/i,
    },
    {
      name: "authentication service outage",
      status: 500,
      body: {
        error: "unexpected_failure",
        error_description: "Authentication service unavailable.",
      },
      message: /Authentication service unavailable|try again/i,
    },
  ]) {
    test(`recovers safely from ${failure.name}`, async ({ page }) => {
      await page.route(passwordTokenRoute, async (route) => {
        await route.fulfill({
          status: failure.status,
          contentType: "application/json",
          body: JSON.stringify(failure.body),
        });
      });
      await page.goto("/auth/login");

      await page.getByLabel("Email Address").fill("retry@example.com");
      await page.getByLabel("Password").fill("retry-password");
      await page.getByRole("button", { name: "Login" }).click();

      const alert = page.getByRole("alert").filter({ hasText: /\S/ });
      await expect(alert).toContainText(failure.message);
      await expect(alert).not.toContainText(/stack|prisma|sql|token/i);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.getByRole("button", { name: "Login" })).toBeEnabled();
      await expect(page.getByLabel("Email Address")).toBeEnabled();
      await expect(page.getByLabel("Password")).toBeEnabled();
    });
  }

  test("shows loading state while submitting credentials", async ({ page }) => {
    let releaseAuthResponse: () => void = () => {};
    const authResponseGate = new Promise<void>((resolve) => {
      releaseAuthResponse = resolve;
    });

    await page.route(passwordTokenRoute, async (route) => {
      await authResponseGate;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      });
    });

    await page.goto("/auth/login");
    await page.getByLabel("Email Address").fill("pending@example.com");
    await page.getByLabel("Password").fill("pending-password");
    await page.getByRole("button", { name: "Login" }).click();

    try {
      await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
      await expect(
        page.getByRole("button", { name: "Signing you in..." }),
      ).toBeDisabled();
      await expect(page.getByLabel("Email Address")).toBeDisabled();
      await expect(page.getByLabel("Password")).toBeDisabled();
      await expect(page.getByRole("status")).toContainText("Signing you in...");
    } finally {
      releaseAuthResponse();
    }

    await expect(
      page.getByRole("alert").filter({ hasText: "Invalid login credentials" }),
    ).toContainText("Invalid login credentials");
  });

  test("logs in with the documented test account", async ({ page }) => {
    test.setTimeout(60_000);

    await loginAsTestUser(page);

    await expect(page).toHaveURL(/\/(?:dashboard|pos)(?:\?.*)?$/);
    await expect(
      page
        .getByRole("heading", { name: /^(?:Dashboard|Point of Sale)$/ })
        .first(),
    ).toBeVisible();
  });
});
