import { expect, test, type Page } from "@playwright/test";

import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";

function collectRuntimeFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/i.test(reason)) {
      failures.push(`request: ${request.method()} ${request.url()} (${reason})`);
    }
  });
  return failures;
}

async function assertAccessiblePageSkeleton(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  expect(await page.locator("main").count()).toBeGreaterThan(0);
  expect(await page.getByRole("heading", { level: 1 }).count()).toBeGreaterThan(0);

  const defects = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .map((element) => element.id)
      .filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const unnamedControls = Array.from(
      document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea"),
    ).filter((element) => {
      if (element.getAttribute("aria-hidden") === "true") return false;
      if (element instanceof HTMLInputElement && element.type === "hidden") {
        return false;
      }
      const label = [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.textContent,
        element instanceof HTMLInputElement ? element.placeholder : null,
      ]
        .filter(Boolean)
        .join(" ");
      const associatedLabels =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? element.labels?.length ?? 0
          : 0;
      return !label.trim() && associatedLabels === 0;
    });
    return {
      duplicateIds: [...new Set(duplicateIds)],
      unnamedControls: unnamedControls.map((element) => element.outerHTML.slice(0, 1_000)),
    };
  });

  expect(defects.duplicateIds).toEqual([]);
  expect(defects.unnamedControls).toEqual([]);
}

test("login is keyboard operable and free of runtime/accessibility smoke defects @smoke", async ({
  page,
}) => {
  const failures = collectRuntimeFailures(page);
  await page.goto("/auth/login");
  await assertAccessiblePageSkeleton(page);

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");
  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Login" })).toBeFocused();
  expect(failures).toEqual([]);
});

test("core protected smoke routes have clean runtime and accessible page structure @smoke", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const failures = collectRuntimeFailures(page);

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    await authenticatePageWithCredentials(page, managerCredentials);
    for (const route of ["/dashboard", "/pos", "/product", "/reports"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
      await assertAccessiblePageSkeleton(page);
    }
    expect(failures).toEqual([]);
  } finally {
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
