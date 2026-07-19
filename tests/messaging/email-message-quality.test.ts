import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("transactional emails include accessible fallbacks and security guidance", () => {
  const templates = read("lib/messaging/email-templates.ts");

  assert.match(templates, /display:none;max-height:0;overflow:hidden/);
  assert.match(templates, /If the button does not open, copy this link/);
  assert.match(templates, /do not forward this confirmation link/i);
  assert.match(templates, /will never send or request your password by email/i);
  assert.match(templates, /registrationPendingReview/);
});

test("providers support direct replies, Resend tags, and duplicate-send protection", () => {
  const types = read("lib/messaging/email.types.ts");
  const service = read("lib/messaging/email.service.ts");

  assert.match(types, /replyTo\?: string/);
  assert.match(types, /idempotencyKey\?: string/);
  assert.match(service, /"Idempotency-Key": payload\.idempotencyKey/);
  assert.match(service, /\{ name: "category", value: payload\.category \}/);
  assert.match(service, /payload\.replyTo \|\| this\.replyTo/);
  assert.match(service, /payload\.replyTo \|\| this\.options\.replyTo/);
});

test("Help Center feedback is categorized and replyable", () => {
  const action = read("app/(protected)/help/_actions/support-feedback.action.ts");
  const client = read("app/(protected)/help/HelpCenterClient.tsx");

  assert.match(action, /topic: z\.enum\(feedbackTopics\)/);
  assert.match(action, /priority: z\.enum\(feedbackPriorities\)/);
  assert.match(action, /emailTemplates\.supportFeedback/);
  assert.match(action, /replyTo: reporterEmail \|\| undefined/);
  assert.match(client, /Choose a topic and priority/);
  assert.match(client, /support can reply directly to your email/i);
});
