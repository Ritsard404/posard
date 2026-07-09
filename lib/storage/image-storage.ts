export const POSARD_IMAGE_BUCKET = "posard-images";

export type PosardImageKind = "product" | "company-logo" | "donation";

const POSARD_STORAGE_PREFIXES = [
  "companies/",
  "platform/",
  "draft/",
] as const;

export function isAbsoluteImageUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function isPosardStoragePath(value: string | null | undefined): value is string {
  const path = value;
  if (!path || isAbsoluteImageUrl(path) || path.startsWith("/")) {
    return false;
  }

  return POSARD_STORAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function getPosardImagePublicUrl(value: string | null | undefined): string | null {
  const path = value;
  if (!path) return null;
  if (isAbsoluteImageUrl(path) || path.startsWith("/")) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const baseUrl = supabaseUrl.replace(/\/$/, "");
  return `${baseUrl}/storage/v1/object/public/${POSARD_IMAGE_BUCKET}/${encodeURI(path)}`;
}

function sanitizeFileName(value: string): string {
  const baseName = value
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return baseName || "image";
}

export function buildPosardImagePath(params: {
  kind: PosardImageKind;
  companyId?: string | null;
  ownerId?: string | null;
  fileName: string;
  extension?: string;
}): string {
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeName = sanitizeFileName(params.fileName);
  const extension = params.extension?.replace(/^\./, "") || "webp";

  if (params.kind === "company-logo") {
    const companySegment = params.ownerId || params.companyId || `draft-${uniqueId}`;
    return `companies/${companySegment}/logos/${Date.now()}-${uniqueId}-${safeName}.${extension}`;
  }

  if (params.kind === "donation") {
    return `platform/donations/${Date.now()}-${uniqueId}-${safeName}.${extension}`;
  }

  const companySegment = params.companyId || "unscoped";
  const productSegment = params.ownerId || `draft-${uniqueId}`;
  return `companies/${companySegment}/products/${productSegment}/${Date.now()}-${uniqueId}-${safeName}.${extension}`;
}
