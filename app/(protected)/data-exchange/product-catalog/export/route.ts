import { dataExchangeService } from "../../_services/data-exchange.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";

  if (format === "pdf") {
    const pdf = await dataExchangeService.buildProductCatalogPdf();
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="product-catalog-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  }

  const workbook = await dataExchangeService.buildProductCatalogWorkbook();
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="product-catalog-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
