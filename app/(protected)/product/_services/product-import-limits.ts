export const PRODUCT_IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 1000;
export const PRODUCT_IMPORT_MAX_SHEETS = 2;
export const PRODUCT_IMPORT_PARSE_TIMEOUT_MS = 10_000;

export const PRODUCT_IMPORT_ALLOWED_EXTENSIONS = [".csv", ".xls", ".xml"] as const;
export const PRODUCT_IMPORT_ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/xml",
  "text/xml",
]);

export function formatFileSizeLimit(bytes = PRODUCT_IMPORT_MAX_FILE_BYTES) {
  return `${Math.floor(bytes / 1024 / 1024)} MB`;
}

export function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

export function isAllowedProductImportFile(input: { name: string; type?: string }) {
  const hasAllowedExtension = PRODUCT_IMPORT_ALLOWED_EXTENSIONS.includes(
    getFileExtension(input.name) as (typeof PRODUCT_IMPORT_ALLOWED_EXTENSIONS)[number],
  );
  const mimeType = input.type?.trim().toLowerCase();

  if (hasAllowedExtension) return true;
  if (!mimeType) return false;

  return PRODUCT_IMPORT_ALLOWED_MIME_TYPES.has(mimeType);
}

export function countCsvRows(csvText: string) {
  const trimmed = csvText.trim();
  if (!trimmed) return 0;

  return Math.max(0, trimmed.split(/\r\n|\n|\r/).length - 1);
}

export function assertProductImportLimits(input: {
  csvText: string;
  byteLength?: number;
  sheetCount?: number;
}) {
  const byteLength =
    input.byteLength ?? new TextEncoder().encode(input.csvText).byteLength;

  if (byteLength > PRODUCT_IMPORT_MAX_FILE_BYTES) {
    throw new Error(
      `Product import files must be ${formatFileSizeLimit()} or smaller.`,
    );
  }

  if (
    input.sheetCount !== undefined &&
    input.sheetCount > PRODUCT_IMPORT_MAX_SHEETS
  ) {
    throw new Error(
      `Product import files can include at most ${PRODUCT_IMPORT_MAX_SHEETS} worksheets.`,
    );
  }

  const rowCount = countCsvRows(input.csvText);
  if (rowCount > PRODUCT_IMPORT_MAX_ROWS) {
    throw new Error(
      `Product imports are limited to ${PRODUCT_IMPORT_MAX_ROWS} rows per file.`,
    );
  }
}
