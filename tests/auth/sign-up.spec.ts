import { expect, type Page, test } from "@playwright/test";
import { prisma } from "../../lib/prisma";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

async function fillSignUpForm(page: Page, email: string) {
  await page.getByLabel("Full Name").fill("Juan dela Cruz");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Phone Number").fill("+63 900 000 0000");
  await page.getByLabel("Company Name").fill("E2E Merchant Store");
  const password = page.getByLabel("Password", { exact: true });
  if (await password.isVisible().catch(() => false)) {
    await password.fill("E2E-password-2026");
    await page.getByLabel("Confirm Password").fill("E2E-password-2026");
  }
}

test.describe("auth sign-up @smoke", () => {
  test("requires terms and privacy consent before submitting a registration request", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");
    await fillSignUpForm(page, `terms-${Date.now()}@example.com`);
    await page
      .getByRole("button", { name: /Create Account|Submit Registration Request/ })
      .click();

    await expect(
      page.getByRole("alert").filter({
        hasText: "Please accept the Terms and Conditions and Privacy Policy.",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up$/);
  });

  test("submits a registration request and redirects to the success page", async ({
    page,
  }) => {
    assertE2EDatabaseWritesAllowed();
    const email = `signup-${Date.now()}@example.com`;
    const config = await prisma.systemConfiguration.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
      select: { directRegistrationEnabled: true },
    });

    try {
      await prisma.systemConfiguration.update({
        where: { id: "default" },
        data: { directRegistrationEnabled: false },
      });
      await page.goto("/auth/sign-up");
      await fillSignUpForm(page, email);
      await page.getByLabel(/I agree to the Terms and Conditions/).check();
      await page
        .getByRole("button", { name: "Submit Registration Request" })
        .click();

      await expect(page).toHaveURL(/\/auth\/sign-up-success\?mode=pending$/);
      await expect(page.getByText("Registration Request Submitted")).toBeVisible();
      await expect(page.getByText(/administrator must approve/i)).toBeVisible();
    } finally {
      await prisma.registrationRequest.deleteMany({ where: { email } });
      await prisma.systemConfiguration.update({
        where: { id: "default" },
        data: {
          directRegistrationEnabled: config.directRegistrationEnabled,
        },
      });
    }
  });
});
