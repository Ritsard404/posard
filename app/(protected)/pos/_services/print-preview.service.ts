import type { PrintJobDto } from "./_dto/print.dto";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildMarkup(job: PrintJobDto, autoPrint: boolean) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(job.title)}</title>
    <style>
      body { margin: 0; padding: 16px; font-family: "Courier New", monospace; color: #111827; background: #ffffff; }
      pre { margin: 0; white-space: pre-wrap; font-size: 12px; line-height: 1.35; }
      @page { margin: 8mm; }
    </style>
  </head>
  <body>
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
