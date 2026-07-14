import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { BranchUpsertSchema } from "@/app/(protected)/companies/[companyId]/_services/branch.dto";
import type { ReceiptDto } from "@/app/(protected)/pos/_services/_dto/receipt.dto";
import { buildInvoicePrintPackage } from "@/app/(protected)/pos/_services/print-format.service";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("branch receipt design validates logo paths and footer text", () => {
  const parsed = BranchUpsertSchema.parse({
    name: "Main Branch",
    code: "MAIN",
    address: "123 Store St",
    phone: "",
    email: "",
    managerId: "",
    timezone: "Asia/Manila",
    currency: "PHP",
    taxMode: "inherit",
    taxRate: "",
    receiptFooter: " Thank you for shopping ",
    logoImageUrl: " companies/main/logos/logo.webp ",
    openingDate: "",
    invoicePrefix: "MAIN",
    isActive: true,
  });

  assert.equal(parsed.receiptFooter, "Thank you for shopping");
  assert.equal(parsed.logoImageUrl, "companies/main/logos/logo.webp");
});

test("receipt formatter includes configured footer without requiring a logo", () => {
  const receipt: ReceiptDto = {
    id: "invoice-1",
    invoiceNumber: 7,
    createdAt: "2026-07-14T01:00:00.000Z",
    posTerminalName: "Terminal 1",
    printerName: null,
    printerConfig: null,
    registeredName: "POSard Store",
    address: "123 Store St",
    vatTinNumber: null,
    minNumber: "MIN-001",
    receiptLogoImageUrl: "companies/main/logos/logo.webp",
    receiptFooter: "Thank you for shopping",
    terminalVat: 0,
    cashierName: "Cashier A",
    isTrainMode: false,
    discountType: null,
    discountAmount: 0,
    dueAmount: 100,
    totalTendered: 100,
    eligibleDiscName: null,
    customerName: "Walk-in Customer",
    totalAmount: 100,
    cashTendered: 100,
    changeAmount: 0,
    vatSales: 0,
    vatExempt: 0,
    vatZero: 100,
    vatAmount: 0,
    otherPayments: [],
    stockUpdates: [],
    debt: null,
    items: [
      {
        id: "item-1",
        productName: "Sample Item",
        qty: 2,
        subTotal: 100,
        status: "PAID",
        selections: [],
        specialInstructions: null,
      },
    ],
  };

  const printPackage = buildInvoicePrintPackage(receipt);

  assert.match(printPackage.previewContent, /Thank you for shopping/);
  assert.match(printPackage.archiveContent, /Acknowledgment Receipt/);
});

test("thermal logo printing stays wired for web ESC/POS and SUNMI native paths", () => {
  const printDevice = read("app/(protected)/pos/_services/print-device.service.ts");
  const sunmiClient = read("app/(protected)/pos/_services/sunmi-native-print.service.ts");
  const sunmiPlugin = read("android/app/src/main/java/com/posard/app/plugins/SunmiPrinterPlugin.java");
  const raster = read("app/(protected)/pos/_services/receipt-logo-raster.client.ts");

  assert.match(raster, /GS,\s*0x76,\s*0x30/);
  assert.match(printDevice, /buildReceiptLogoEscPosRaster/);
  assert.match(printDevice, /concatPrinterBytes/);
  assert.match(sunmiClient, /getReceiptLogoBase64Png/);
  assert.match(sunmiClient, /logoBase64Png/);
  assert.match(sunmiPlugin, /decodeReceiptLogo/);
  assert.match(sunmiPlugin, /printBitmap/);
});
