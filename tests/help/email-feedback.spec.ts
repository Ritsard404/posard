import { expect, test } from "@playwright/test";
import {
  authenticatePageWithCredentials,
  managerCredentials,
} from "../fixtures/auth.fixture";

test("support feedback stays clear and usable on desktop and mobile @smoke", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await authenticatePageWithCredentials(page, managerCredentials);
  await page.goto("/help");

  const topic = page.getByLabel("Topic");
  const priority = page.getByLabel("Priority");
  const message = page.getByLabel("Feedback details");
  const replyEmail = page.getByLabel("Reply email");
  const sendButton = page.getByRole("button", { name: "Send Feedback" });

  await expect(topic).toHaveValue("Bug or error");
  await expect(priority).toHaveValue("Normal");
  await topic.selectOption("Feature request");
  await priority.selectOption("High");
  await message.fill("Please add a clearer email delivery status for admins.");
  await replyEmail.fill("not-an-email");

  await expect(
    page.getByText("Enter a valid reply email or leave this field blank."),
  ).toBeVisible();
  await expect(sendButton).toBeDisabled();

  await replyEmail.fill("manager@example.com");
  const disabledMessage = page.getByText(
    "Feedback sending is disabled until email settings are ready.",
  );
  if (await disabledMessage.isVisible().catch(() => false)) {
    await expect(sendButton).toBeDisabled();
  } else {
    await expect(sendButton).toBeEnabled();
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(topic).toBeVisible();
  await expect(priority).toBeVisible();
  await expect(sendButton).toBeVisible();

  const buttonBox = await sendButton.boundingBox();
  expect(buttonBox).not.toBeNull();
  expect((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0)).toBeLessThanOrEqual(375);
});
