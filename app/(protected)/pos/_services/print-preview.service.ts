import type { PrintJobDto } from "./_dto/print.dto";
import { getPosardImagePublicUrl } from "@/lib/storage/image-storage";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function buildMarkup(job: PrintJobDto, autoPrint: boolean) {
  const logoUrl = getPosardImagePublicUrl(job.logoImageUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(job.title)}</title>
    <style>
      body { margin: 0; padding: 16px; font-family: "Courier New", monospace; color: #111827; background: #ffffff; }
      .receipt-logo { display: block; max-width: 180px; max-height: 96px; object-fit: contain; margin: 0 auto 10px; filter: grayscale(1) contrast(1.18); }
      pre { margin: 0; white-space: pre-wrap; font-size: 12px; line-height: 1.35; }
      @page { margin: 8mm; }
    </style>
  </head>
  <body>
    ${logoUrl ? `<img class="receipt-logo" src="${escapeAttribute(logoUrl)}" alt="Receipt logo" width="180" height="96" />` : ""}
    <pre>${escapeHtml(job.previewContent)}</pre>
    ${
      autoPrint
        ? '<script>window.onload=function(){window.print();};</script>'
        : ""
    }
  </body>
</html>`;
}

export const printPreviewService = {
  open(job: PrintJobDto, autoPrint = false) {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      throw new Error("The browser blocked the print window.");
    }

    printWindow.document.open();
    printWindow.document.write(buildMarkup(job, autoPrint));
    printWindow.document.close();
  },
};
