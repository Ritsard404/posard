export const spreadsheetXmlContentType = "application/vnd.ms-excel; charset=utf-8";

export type SpreadsheetXmlSheet = {
  name: string;
  columns?: readonly number[];
  rows: readonly (readonly unknown[])[];
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellType(value: unknown): "Number" | "String" {
  return typeof value === "number" && Number.isFinite(value) ? "Number" : "String";
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function buildColumn(width: number) {
  return `<Column ss:Width="${Math.max(32, Math.round(width))}" />`;
}

function buildCell(value: unknown) {
  const text = stringifyCell(value);
  return `<Cell><Data ss:Type="${cellType(value)}">${escapeXml(text)}</Data></Cell>`;
}

function buildRow(values: readonly unknown[]) {
  return `<Row>${values.map(buildCell).join("")}</Row>`;
}

export function buildSpreadsheetXml(input: { sheets: readonly SpreadsheetXmlSheet[] }) {
  const sheets = input.sheets.map((sheet) => {
    const columns = sheet.columns?.map(buildColumn).join("") ?? "";
    const rows = sheet.rows.map(buildRow).join("");

    return `  <Worksheet ss:Name="${escapeXml(sheet.name)}">
    <Table>${columns}${rows}</Table>
  </Worksheet>`;
  });

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets.join("\n")}
</Workbook>`;
}
