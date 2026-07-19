import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const mode = process.argv[2] ?? "unit";
const databaseContract = "tests/security/database-rls.test.ts";

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collectTests(path) : [path];
    })
    .filter((path) => path.endsWith(".test.ts"))
    .map((path) => relative(root, path).replaceAll("\\", "/"))
    .sort();
}

if (!new Set(["unit", "integration"]).has(mode)) {
  console.error(`Unknown test mode: ${mode}`);
  process.exit(2);
}

if (
  mode === "integration" &&
  process.env.ALLOW_DATABASE_INTEGRATION_TESTS !== "true"
) {
  console.error(
    "Database integration tests are opt-in. Set ALLOW_DATABASE_INTEGRATION_TESTS=true only for an approved non-production target.",
  );
  process.exit(2);
}

const files =
  mode === "integration" ? [databaseContract] : collectTests(join(root, "tests"));
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  {
    cwd: root,
    env: {
      ...process.env,
      ALLOW_DATABASE_INTEGRATION_TESTS:
        mode === "integration" ? "true" : "false",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
