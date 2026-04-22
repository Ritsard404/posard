import { expect, type Page, test } from "@playwright/test";

const signUpRoute = /\/auth\/v1\/signup$/;

async function fillSignUpForm(page: Page) {
  await page.getByLabel("Full Name").fill("Juan dela Cruz");
  await page.getByLabel("Email Address").fill("juan@example.com");
  await page.getByLabel("Password", { exact: true }).fill("strong-password");
  await page.getByLabel("Repeat Password").fill("strong-password");
}

test.describe("auth sign-up", () => {
  test("requires terms and privacy consent before creating an account", async ({
    page,
  }) => {
    let signUpRequests = 0;
    await page.route(signUpRoute, async (route) => {
      signUpRequests += 1;
      await route.abort();
    });

    await page.goto("/auth/sign-up");
    await fillSignUpForm(page);
    await page.getByRole("button", { name: "Create My Merchant Account" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText: "Please accept the Terms and Conditions and Privacy Policy.",
      }),
    ).toBeVisible();
    expect(signUpRequests).toBe(0);
    await expect(page).toHaveURL(/\/auth\/sign-up$/);
  });

  test("sends accepted terms metadata during account creation", async ({
    page,
  }) => {
    let requestBody: {
      data?: {
        terms_accepted?: boolean;
        terms_accepted_at?: string;
      };
    } | null = null;

    await page.route(signUpRoute, async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "juan@example.com",
          user_metadata: requestBody?.data ?? {},
          app_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/auth/sign-up");
    await fillSignUpForm(page);
    await page.getByLabel(/I agree to the Terms and Conditions/).check();
    await page.getByRole("button", { name: "Create My Merchant Account" }).click();

    await expect(page).toHaveURL(/\/auth\/sign-up-success$/);
    expect(requestBody?.data?.terms_accepted).toBe(true);
    expect(requestBody?.data?.terms_accepted_at).toEqual(expect.any(String));
  });
});
