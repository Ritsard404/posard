import "dotenv/config";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const allowDatabaseIntegration =
  process.env.ALLOW_DATABASE_INTEGRATION_TESTS === "true";
const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");

function createPrismaClient() {
  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is required.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function readMigrationSql() {
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsRoot, entry.name, "migration.sql"))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n\n");
}

test("RLS migration contract covers browser-visible auth tables", () => {
  const migrationSql = readMigrationSql();

  for (const table of ["profiles", "registration_requests", "customer_display_state"]) {
    assert.match(
      migrationSql,
      new RegExp(`ALTER TABLE\\s+"public"\\."${table}"\\s+ENABLE ROW LEVEL SECURITY`, "i"),
    );
  }
});

test("RLS policy migrations use optimized auth helper calls", () => {
  const migrationSql = readMigrationSql();
  const policyMigration = migrationSql.match(
    /CREATE POLICY "profiles_self_or_admin_read"[\s\S]+CREATE POLICY "registration_requests_admin_update"[\s\S]+WITH CHECK \(public\.is_admin\(\(SELECT auth\.uid\(\)\)\)\);/i,
  )?.[0];

  assert.ok(policyMigration);
  assert.doesNotMatch(policyMigration, /(?<!SELECT )auth\.uid\(\)/i);
  assert.match(policyMigration, /\(SELECT auth\.uid\(\)\)/i);
});

test(
  "is_admin is a search-path-safe security definer function",
  { skip: !allowDatabaseIntegration },
  async () => {
    const prisma = createPrismaClient();

    try {
      const rows = await prisma.$queryRaw<
        Array<{ is_security_definer: boolean; config: string[] | null; definition: string }>
      >`
        SELECT
          p.prosecdef AS is_security_definer,
          p.proconfig AS config,
          pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'is_admin'
          AND pg_get_function_identity_arguments(p.oid) = 'user_id uuid';
      `;

      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.is_security_definer, true);
      assert.match((rows[0]?.config ?? []).join(","), /search_path=public, pg_temp/);
      assert.match(rows[0]?.definition ?? "", /FROM public\.profiles/i);
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  "browser roles do not have table grants without RLS enabled",
  { skip: !allowDatabaseIntegration },
  async () => {
    const prisma = createPrismaClient();

    try {
      const rows = await prisma.$queryRaw<
        Array<{ table_name: string; grantee: string; privilege_type: string }>
      >`
        SELECT
          g.table_name,
          g.grantee,
          g.privilege_type
        FROM information_schema.role_table_grants g
        JOIN pg_namespace n ON n.nspname = g.table_schema
        JOIN pg_class c ON c.relnamespace = n.oid
          AND c.relname = g.table_name
          AND c.relkind IN ('r', 'p')
        WHERE g.table_schema = 'public'
          AND g.grantee IN ('anon', 'authenticated')
          AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
          AND c.relrowsecurity = false
        ORDER BY g.table_name, g.grantee, g.privilege_type;
      `;

      assert.deepEqual(rows, []);
    } finally {
      await prisma.$disconnect();
    }
  },
);
