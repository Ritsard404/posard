import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function walk(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

for (const path of [
  "AGENTS.md",
  ".env.example",
  "package.json",
  "prisma/schema.prisma",
  "playwright.config.ts",
]) {
  if (!existsSync(join(root, path))) fail(`Missing required file: ${path}`);
}

const packageJson = JSON.parse(read("package.json"));
for (const script of [
  "build",
  "lint",
  "typecheck",
  "test:unit",
  "test:integration",
  "test:e2e",
  "verify:quick",
  "verify",
  "verify:ci",
]) {
  if (!packageJson.scripts?.[script]) fail(`Missing package script: ${script}`);
}

const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const forbiddenTracked = tracked.filter(
  (path) =>
    existsSync(join(root, path)) &&
    /(^|\/)(\.env(?:\..*)?|__pycache__|test-results|playwright-report|\.next)(\/|$)|\.(?:pyc|pyo|pem|key|jks|keystore|tsbuildinfo)$/i.test(
      path,
    ),
);
if (forbiddenTracked.length > 0) {
  fail(`Forbidden generated or sensitive tracked files: ${forbiddenTracked.join(", ")}`);
}

const config = read(".codex/config.toml");
if (config.includes("@latest")) {
  fail("Project MCP packages must be pinned instead of using @latest.");
}

const exampleEnv = read(".env.example");
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SITE_URL",
  "APP_URL",
]) {
  if (!new RegExp(`^${key}=`, "m").test(exampleEnv)) {
    fail(`.env.example is missing ${key}`);
  }
}

const migrationRoot = join(root, "prisma", "migrations");
const migrationNames = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
for (const name of migrationNames) {
  if (!existsSync(join(migrationRoot, name, "migration.sql"))) {
    fail(`Migration has no migration.sql: ${name}`);
  }
}
if (new Set(migrationNames).size !== migrationNames.length) {
  fail("Duplicate Prisma migration directory names detected.");
}

const skillFiles = [
  ...walk(join(root, ".agents", "skills"), (path) => path.endsWith("SKILL.md")),
  ...walk(join(root, ".codex", "skills"), (path) => path.endsWith("SKILL.md")),
];
for (const path of skillFiles) {
  const content = readFileSync(path, "utf8");
  const displayPath = relative(root, path).replaceAll("\\", "/");
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    fail(`Skill frontmatter is missing: ${displayPath}`);
  }
  if (!/^name:\s*\S+/m.test(content)) fail(`Skill name is missing: ${displayPath}`);
  if (!/^description:\s*\S+/m.test(content)) {
    fail(`Skill description is missing: ${displayPath}`);
  }
}

if (failures.length > 0) {
  console.error("Workspace verification failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Workspace verification passed (${migrationNames.length} migrations, ${skillFiles.length} skills, ${tracked.length} tracked files checked).`,
);
