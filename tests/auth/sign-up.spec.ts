import { expect, type Page, test } from "@playwright/test";

async function fillSignUpForm(page: Page, email: string) {
  await page.getByLabel("Full Name").fill("Juan dela Cruz");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Phone Number").fill("+63 900 000 0000");
  await page.getByLabel("Company Name").fill("E2E Merchant Store");
}

test.describe("auth sign-up", () => {
  test("requires terms and privacy consent before submitting a registration request", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");
    await fillSignUpForm(page, `terms-${Date.now()}@example.com`);
    await page
      .getByRole("button", { name: "Submit Registration Request" })
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
    await page.goto("/auth/sign-up");
    await fillSignUpForm(page, `signup-${Date.now()}@example.com`);
    await page.getByLabel(/I agree to the Terms and Conditions/).check();
    await page
      .getByRole("button", { name: "Submit Registration Request" })
      .click();

    await expect(page).toHaveURL(/\/auth\/sign-up-success$/);
    await expect(
      page.getByText("Registration request submitted. Please wait for admin approval."),
    ).toBeVisible();
  });
});
