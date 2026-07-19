import 'dotenv/config';

const unsafeHostMarkers = [
  'prod',
  'production',
  'live',
];

export function assertE2EDatabaseWritesAllowed() {
  if (process.env.E2E_ALLOW_DATABASE_WRITES !== 'true') {
    throw new Error(
      'Destructive E2E setup is disabled. Set E2E_ALLOW_DATABASE_WRITES=true only for a dedicated test database and Supabase project.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for destructive E2E tests.');
  }

  const hostname = new URL(databaseUrl).hostname.toLowerCase();
  if (unsafeHostMarkers.some((marker) => hostname.includes(marker))) {
    throw new Error(
      `Refusing destructive E2E setup for unsafe database host: ${hostname}`,
    );
  }

  for (const key of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    if (!process.env[key]) {
      throw new Error(`${key} is required for destructive E2E tests.`);
    }
  }
}

