import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("pending registrations immediately email every active admin with the approval link", () => {
  const service = read("app/auth/_services/registration-request.service.ts");
  const templates = read("lib/messaging/email-templates.ts");

  assert.match(service, /where:\s*\{ role: "admin", status: "active" \}/);
  assert.match(service, /select:\s*\{ id: true, email: true \}/);
  assert.match(service, /emailTemplates\.registrationApprovalRequested/);
  assert.match(service, /`\$\{appConfig\.appUrl\}\/approvals`/);
  assert.match(service, /flow: "admin_approval_requested"/);
  assert.match(service, /to: admin\.email/);
  assert.match(templates, /label: "Review registration"/);
});

test("direct registrations require email confirmation instead of admin approval", () => {
  const service = read("app/auth/_services/registration-request.service.ts");
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260711120000_enable_verified_direct_registration/migration.sql",
  );
  const successPage = read("app/auth/sign-up-success/page.tsx");

  assert.match(service, /auth\.admin\.generateLink\(\{[\s\S]*type: "signup"/);
  assert.match(service, /redirectTo:[\s\S]*\/auth\/callback/);
  assert.match(service, /emailTemplates\.accountEmailConfirmation/);
  assert.match(service, /mode: "email_confirmation"/);
  assert.doesNotMatch(service, /email_confirm: true/);
  assert.match(schema, /directRegistrationEnabled\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /SET DEFAULT true/);
  assert.match(migration, /SET "direct_registration_enabled" = true/);
  assert.match(successPage, /No admin approval is required/);
  assert.match(successPage, /Confirm email/);
});

test("legacy approvals email a secure password setup link without exposing a password", () => {
  const service = read(
    "app/(protected)/approvals/_services/registration-approval.service.ts",
  );
  const component = read(
    "app/(protected)/approvals/_components/PendingManagerApprovalsClient.tsx",
  );
  const templates = read("lib/messaging/email-templates.ts");
  const confirmRoute = read("app/auth/confirm/route.ts");

  assert.match(service, /auth\.admin\.generateLink\(\{[\s\S]*type: "invite"/);
  assert.match(service, /type=invite&next=\/auth\/update-password/);
  assert.match(service, /emailTemplates\.accountPasswordSetup/);
  assert.match(service, /flow: "approved_password_setup"/);
  assert.doesNotMatch(service, /email_confirm: true/);
  assert.doesNotMatch(service, /password: input\.password/);
  assert.doesNotMatch(component, /Initial Password/);
  assert.doesNotMatch(component, /approvalPassword/);
  assert.match(templates, /label: "Set my password"/);
  assert.match(confirmRoute, /supabase\.auth\.verifyOtp/);
  assert.match(confirmRoute, /redirect\(next\)/);
});
