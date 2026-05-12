import "server-only";

const PRIVATE_VALUE = "unknown";

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const vercelIp = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();

  return forwarded || realIp || vercelIp || PRIVATE_VALUE;
}
