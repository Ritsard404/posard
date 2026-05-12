import "server-only";

export function getUserAgent(headers: Headers): string {
  return headers.get("user-agent")?.slice(0, 240) || "unknown";
}
