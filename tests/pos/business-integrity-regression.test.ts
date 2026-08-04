import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function sourceFilesUnder(relativeDirectory: string): string[] {
  const absoluteDirectory = join(root, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      return sourceFilesUnder(relativePath);
    }
    return /\.(?:tsx?|jsx?)$/.test(entry.name) && !statSync(join(root, relativePath)).isSymbolicLink()
      ? [relativePath]
      : [];
  });
}

test("invoice idempotency and terminal invoice uniqueness remain enforced", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");
  const syncRoute = read("app/api/sync/actions/route.ts");

  assert.match(schema, /idempotencyKey\s+String\?\s+@unique\s+@map\("idempotency_key"\)/);
  assert.match(schema, /@@unique\(\[posTerminalId, invoiceNumber\]/);
  assert.match(orderService, /findInvoiceByIdempotencyKey/);
  assert.match(orderService, /idempotencyKey/);
  assert.match(syncRoute, /idempotencyKey/);
});

test("duplicate reference payments are guarded before persistence", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");

  assert.match(schema, /model EPayment/);
  assert.match(schema, /reference\s+String\s+@unique/);
  assert.match(orderService, /Reference number is required/);
  assert.match(orderService, /One or more reference payment methods are invalid|reference payment/i);
});

test("returns keep invoice, item, manager approval, and stock reversal paths", () => {
  const schema = read("prisma/schema.prisma");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");

  assert.match(schema, /model InvoiceReturn/);
  assert.match(schema, /model InvoiceReturnItem/);
  assert.match(orderService, /async returnInvoice/);
  assert.match(orderService, /resolveReturnApproval/);
  assert.match(orderService, /type:\s*"IN"/);
  assert.match(orderService, /returnedAmount/);
});

test("debt collection retries are idempotent per payment action", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/debts/_services/debt.dto.ts");
  const service = read("app/(protected)/debts/_services/debt.service.ts");

  assert.match(schema, /model CustomerDebtPayment[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /recordDebtPaymentSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(service, /findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey: input\.idempotencyKey/);
});

test("expense retries carry a database-unique idempotency key", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/_components/ManagementForms.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model Expense[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(workflowSchema, /expenseCreateSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /expense\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey: input\.idempotencyKey/);
});

test("non-sales income retries carry a database-unique idempotency key", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/_components/ManagementForms.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model NonSalesIncome[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(workflowSchema, /nonSalesIncomeCreateSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/g);
  assert.match(service, /nonSalesIncome\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
});

test("stock adjustments use a request ledger before lot movement fan-out", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/_components/ManagementForms.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model StockAdjustmentRequest[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(workflowSchema, /stockAdjustmentSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/g);
  assert.match(service, /stockAdjustmentRequest\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /stockAdjustmentRequest\.create\(/);
});

test("stock-count session retries are idempotent before count creation", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/_components/ManagementForms.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model StockCountSession[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(workflowSchema, /stockCountCreateSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/g);
  assert.match(service, /stockCountSession\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey: input\.idempotencyKey/);
});

test("stock dispositions use a request ledger before loss movement fan-out", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/_components/ManagementForms.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model StockDispositionRequest[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(workflowSchema, /stockDispositionSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/g);
  assert.match(service, /stockDispositionRequest\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /stockDispositionRequest\.create\(/);
});

test("purchase receiving retries are idempotent per receiving action", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchema = read("app/(protected)/_services/management-workflow.schemas.ts");
  const forms = read("app/(protected)/purchase-orders/page.tsx");
  const service = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model ReceivingRecord[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(workflowSchema, /purchaseOrderReceiveSchema[\s\S]*idempotencyKey:\s*uuid/);
  assert.match(forms, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /receivingRecord\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("wholesale sales-order retries are idempotent per order action", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/business-fit/_services/business-fit.dto.ts");
  const form = read("app/(protected)/business-fit/page.tsx");
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(schema, /model SalesOrder[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /SalesOrderCreateSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(form, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /salesOrder\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("repair-intake retries are idempotent per job action", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/business-fit/_services/business-fit.dto.ts");
  const form = read("app/(protected)/business-fit/page.tsx");
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(schema, /model RepairJob[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /RepairJobCreateSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(form, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /repairJob\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("service-booking retries are idempotent per booking action", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/business-fit/_services/business-fit.dto.ts");
  const form = read("app/(protected)/business-fit/page.tsx");
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(schema, /model ServiceBooking[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /ServiceBookingCreateSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(form, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /serviceBooking\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("restaurant open-ticket retries use the existing idempotency key", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/business-fit/_services/business-fit.dto.ts");
  const form = read("app/(protected)/business-fit/page.tsx");
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(schema, /model PosOpenTicket[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /PosOpenTicketCreateSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(form, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /posOpenTicket\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("prescription-verification retries are idempotent per verification action", () => {
  const schema = read("prisma/schema.prisma");
  const dto = read("app/(protected)/business-fit/_services/business-fit.dto.ts");
  const form = read("app/(protected)/business-fit/page.tsx");
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(schema, /model PrescriptionVerification[\s\S]*idempotencyKey\s+String\?\s+@unique/);
  assert.match(dto, /PrescriptionVerificationCreateSchema[\s\S]*idempotencyKey:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(form, /name="idempotencyKey" value=\{crypto\.randomUUID\(\)\}/);
  assert.match(service, /prescriptionVerification\.findUnique\(\{\s*where:\s*\{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(service, /idempotencyKey:\s*input\.idempotencyKey/);
});

test("cash withdrawals use a request ledger before drawer increments", () => {
  const schema = read("prisma/schema.prisma");
  const action = read("app/(protected)/pos/_actions/session.action.ts");
  const service = read("app/(protected)/pos/_services/session-mutation.service.ts");
  const modal = read("app/(protected)/pos/_components/WithdrawModal.tsx");

  assert.match(schema, /model CashWithdrawalRequest[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(action, /idempotencyKey:\s*string/);
  assert.match(service, /cashWithdrawalRequest\.findUnique\(\{\s*where:\s*\{ idempotencyKey \}/);
  assert.match(service, /cashWithdrawalRequest\.create\(/);
  assert.match(modal, /withdrawalIdempotencyKeyRef/);
});

test("cashier session opening uses a request ledger before timestamp creation", () => {
  const schema = read("prisma/schema.prisma");
  const action = read("app/(protected)/pos/_actions/session.action.ts");
  const service = read("app/(protected)/pos/_services/session-mutation.service.ts");
  const modal = read("app/(protected)/pos/_components/OpenSessionModal.tsx");

  assert.match(schema, /model PosSessionOpenRequest[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(action, /idempotencyKey:\s*string/);
  assert.match(action, /idempotencyKey:\s*string\s*=\s*randomUUID\(\)/);
  assert.match(service, /posSessionOpenRequest\.findUnique\(\{\s*where:\s*\{ idempotencyKey \}/);
  assert.match(service, /posSessionOpenRequest\.create\(/);
  assert.match(modal, /openSessionIdempotencyKeyRef/);
});

test("cashier session closing uses a request ledger before timestamp closure", () => {
  const schema = read("prisma/schema.prisma");
  const action = read("app/(protected)/pos/_actions/session.action.ts");
  const service = read("app/(protected)/pos/_services/session-mutation.service.ts");
  const modal = read("app/(protected)/pos/_components/CloseSessionModal.tsx");

  assert.match(schema, /model PosSessionCloseRequest[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(action, /closeSessionAction[\s\S]*idempotencyKey:\s*string/);
  assert.match(action, /idempotencyKey:\s*string\s*=\s*randomUUID\(\)/);
  assert.match(service, /posSessionCloseRequest\.findUnique\(\{\s*where:\s*\{ idempotencyKey \}/);
  assert.match(service, /posSessionCloseRequest\.create\(/);
  assert.match(modal, /closeSessionIdempotencyKeyRef/);
});

test("checkout completion stays locked while a sale is processing", () => {
  const checkout = read("app/(protected)/pos/_components/checkout-shared.tsx");

  assert.match(checkout, /checkoutIdempotencyKeyRef\.current/);
  assert.match(checkout, /disabled=\{\s*!canComplete \|\| isProcessing\s*\}/);
  assert.match(checkout, /checkoutIdempotencyKeyRef\.current = null/);
});

test("pending checkout warns before browser unload", () => {
  const checkout = read("app/(protected)/pos/_components/checkout-shared.tsx");

  assert.match(checkout, /beforeunload/);
  assert.match(checkout, /preventPendingCheckoutUnload/);
  assert.match(checkout, /event\.returnValue = \"\"/);
  assert.match(checkout, /preventPendingCheckoutNavigation/);
  assert.match(checkout, /pendingCheckoutHistoryMarker/);
  assert.match(checkout, /addEventListener\("popstate", preventPendingCheckoutHistoryNavigation\)/);
  assert.match(checkout, /history\.go\(1\)/);
  assert.match(checkout, /export function preventPendingCheckoutNavigation/);
  assert.match(checkout, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/);
  assert.match(checkout, /document\.addEventListener\("click", preventPendingCheckoutNavigation, true\)/);
  assert.match(checkout, /event\.preventDefault\(\);\s*\n\s*event\.stopPropagation\(\);/);
});

test("local-first checkout always schedules foreground replay", () => {
  const checkout = read("app/(protected)/pos/_components/checkout-shared.tsx");

  assert.match(checkout, /Always schedule a foreground replay/);
    assert.match(checkout, /scheduleCheckoutBackgroundSync\(\);\s*\n\s*return;/);
    assert.match(checkout, /if \(navigator\.onLine\) \{\s*\n\s*void syncOfflineActions\(\)\.catch/);
    assert.match(checkout, /if \(retryDelay !== null\) \{\s*\n\s*scheduleCheckoutBackgroundSync\(retryDelay\);/g);
});

test("customer display logos reserve intrinsic layout space", () => {
  const idleDisplay = read(
    "app/(protected)/pos/customer-display/[terminalId]/_components/customer-display-idle.tsx",
  );

  assert.match(idleDisplay, /width=\{256\}/);
  assert.match(idleDisplay, /height=\{112\}/);
});

test("external storage image fallbacks preserve dimensions and lazy loading", () => {
  const storageImage = read("components/storage/StorageImage.tsx");

  assert.match(storageImage, /width=\{width\}/);
  assert.match(storageImage, /height=\{height\}/);
  assert.match(storageImage, /loading="lazy"/);
});

test("generated receipt preview logos reserve intrinsic dimensions", () => {
  const printPreview = read(
    "app/(protected)/pos/_services/print-preview.service.ts",
  );

  assert.match(printPreview, /class="receipt-logo"/);
  assert.match(printPreview, /width="180" height="96"/);
});

test("performance audit keeps raw image and hard-reload surfaces reviewed", () => {
  const files = [
    ...sourceFilesUnder("app"),
    ...sourceFilesUnder("components"),
  ];
  const rawImageSurfaces = files.flatMap((file) =>
    /<img\b/.test(read(file)) ? [file.replaceAll("\\", "/")] : [],
  );
  const reviewedImageSurfaces = [
    "app/(protected)/pos/_services/print-preview.service.ts",
    "app/(protected)/pos/customer-display/[terminalId]/_components/customer-display-idle.tsx",
    "components/storage/StorageImage.tsx",
  ].sort();

  assert.deepEqual(rawImageSurfaces.sort(), reviewedImageSurfaces);
  assert.deepEqual(
    files.filter((file) => /window\.location\.reload|location\.reload/.test(read(file))),
    [],
  );
});

test("void approval cannot use a manager from another company", () => {
  const orderService = read("app/(protected)/pos/_services/order.service.ts");

  assert.match(orderService, /where:\s*\{\s*email:\s*dto\.managerIdentifier,\s*companyId\s*\}/);
});

test("offline replay preserves local invoice traceability and does not trust offline manager approvals", () => {
  const syncRoute = read("app/api/sync/actions/route.ts");
  const bootstrapRoute = read("app/api/sync/bootstrap/route.ts");

  assert.match(syncRoute, /localInvoiceNo:\s*action\.payload\.invoiceNoLocal/);
  assert.match(syncRoute, /Offline cash withdrawal requires online manager approval review/);
  assert.match(syncRoute, /Offline session close requires online manager approval review/);
  assert.doesNotMatch(bootstrapRoute, /pinVerifier:\s*buildManagerPinVerifier/);
  assert.doesNotMatch(bootstrapRoute, /pin:\s*true/);
  assert.doesNotMatch(read("app/(protected)/pos/_services/_dto/offline.dto.ts"), /pinVerifier/);
});

test("terminal pinless mode stays terminal-scoped and defaults to PIN-required", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260709143000_terminal_pinless_mode/migration.sql");
  const terminalDto = read("app/(protected)/companies/[companyId]/_services/terminal.dto.ts");
  const terminalForm = read("app/(protected)/companies/[companyId]/terminals/_components/TerminalConfigurationForm.tsx");
  const sessionAction = read("app/(protected)/pos/_actions/session.action.ts");
  const openSessionModal = read("app/(protected)/pos/_components/OpenSessionModal.tsx");

  assert.match(schema, /pinlessModeEnabled\s+Boolean\s+@default\(false\)\s+@map\("pinless_mode_enabled"\)/);
  assert.match(migration, /pinless_mode_enabled"\s+BOOLEAN\s+NOT NULL\s+DEFAULT false/);
  assert.match(terminalDto, /pinlessModeEnabled:\s+z\.boolean\(\)\.default\(false\)/);
  assert.match(terminalForm, /Enable pinless session controls/);
  assert.match(sessionAction, /if \(!terminal\.pinlessModeEnabled\)/);
  assert.match(openSessionModal, /!pinlessModeEnabled && managerPin\.length < 4/);
});

test("session close rejects an already closed timestamp before writing", () => {
  const sessionService = read("app/(protected)/pos/_services/session-mutation.service.ts");

  assert.match(sessionService, /!timestamp \|\| timestamp\.timestampOut !== null/);
  assert.match(sessionService, /Session is not active or does not exist/);
});

test("offline replay persists failed and review actions for Sync Center recovery", () => {
  const syncRoute = read("app/api/sync/actions/route.ts");
  const syncPage = read("app/(protected)/sync/page.tsx");
  const service = read("app/(protected)/_services/remaining-features.service.ts");

  assert.match(syncRoute, /offlineSyncIssue\.upsert/);
  assert.match(syncRoute, /companyId_localId/);
  assert.match(syncRoute, /syncIssueCategory/);
  assert.match(syncRoute, /resolveSyncIssue/);
  assert.match(syncPage, /recoveryHint/);
  assert.match(syncPage, /Review note/);
  assert.match(service, /idempotencyKey:\s*true/);
});

test("inventory movements cannot create invalid or negative tracked stock", () => {
  const inventoryService = read("app/(protected)/product/_services/inventory.service.ts");
  const workflowService = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(inventoryService, /assertFiniteQuantity/);
  assert.match(inventoryService, /Inventory movement cannot make stock negative/);
  assert.match(workflowService, /Inventory movement quantity must be a non-zero number/);
  assert.match(workflowService, /Inventory movement cannot make stock negative/);
});

test("procurement and transfers validate every selected entity in the viewer company", () => {
  const schema = read("prisma/schema.prisma");
  const workflowSchemas = read("app/(protected)/_services/management-workflow.schemas.ts");
  const workflowService = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(schema, /model PurchaseOrder \{[\s\S]+?idempotencyKey\s+String\?\s+@unique/);
  assert.match(schema, /model BranchTransfer \{[\s\S]+?idempotencyKey\s+String\?\s+@unique/);
  assert.match(workflowSchemas, /export const purchaseOrderCreateSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const transferCreateSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const purchaseOrderTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const transferTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const expenseTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const promotionCreateSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const promotionTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const kitchenTicketTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const syncIssueTransitionSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const supplierUpsertSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowSchemas, /export const supplierArchiveSchema = z\.object\(\{[\s\S]+?idempotencyKey: uuid/);
  assert.match(workflowService, /where: \{ idempotencyKey: input\.idempotencyKey \}/);
  assert.match(workflowService, /idempotencyKey: input\.idempotencyKey/);
  assert.match(workflowService, /tx\.workflowMutationRequest\.findUnique/);
  assert.match(workflowService, /tx\.workflowMutationRequest\.create/);
  assert.match(workflowService, /Supplier or product is not available in this company/);
  assert.match(workflowService, /Source and destination terminals must be different/);
  assert.match(workflowService, /Transfer terminals or product are not available in this company/);
  assert.match(workflowService, /companyId:\s*viewer\.companyId/);
  assert.match(workflowService, /Expense category or terminal is not available in this company/);
  assert.match(workflowService, /Income terminal is not available in this company/);
  assert.match(workflowService, /id:\s*input\.supplierId,\s*companyId:\s*viewer\.companyId/);
});

test("pharmacy batch expiry and FEFO paths stay wired", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260626090000_stock_lots_batch_expiry/migration.sql");
  const allocationService = read("app/(protected)/_services/stock-lot-allocation.service.ts");
  const workflowService = read("app/(protected)/_services/management-workflow.service.ts");
  const orderService = read("app/(protected)/pos/_services/order.service.ts");
  const productService = read("app/(protected)/pos/_services/product.service.ts");
  const inventoryPage = read("app/(protected)/inventory-ledger/page.tsx");
  const purchaseOrdersPage = read("app/(protected)/purchase-orders/page.tsx");

  assert.match(schema, /model StockLot/);
  assert.match(schema, /stockLotId\s+String\?\s+@map\("stock_lot_id"\)/);
  assert.match(migration, /CREATE TABLE "public"\."stock_lot"/);
  assert.match(allocationService, /allocateStockLotsForStockOut/);
  assert.match(allocationService, /status === "available"/);
  assert.match(workflowService, /lotQuantityBefore/);
  assert.match(workflowService, /allocateStockLotsForStockOut/);
  assert.match(orderService, /movementType:\s*"sale_deduction"/);
  assert.match(orderService, /stockLotId:\s*allocation\.stockLotId/);
  assert.match(productService, /saleBlockedByExpiry/);
  assert.match(productService, /expiryStatus/);
  assert.match(inventoryPage, /Batch & Expiry Monitor/);
  assert.match(purchaseOrdersPage, /name="batchNumber"/);
  assert.match(purchaseOrdersPage, /name="expiryDate"/);
});

test("inventory controls keep terminals and stock-count assignees company-scoped", () => {
  const workflowService = read("app/(protected)/_services/management-workflow.service.ts");

  assert.match(workflowService, /id: input\.terminalId, companyId: input\.companyId/);
  assert.match(workflowService, /id: input\.terminalId, companyId: viewer\.companyId/);
  assert.match(workflowService, /id: input\.assignedToId, companyId: viewer\.companyId/);
  assert.match(workflowService, /Selected stock-count assignee was not found/);
});

test("business-fit workflows scope references and globally unique numbers by company", () => {
  const service = read("app/(protected)/business-fit/_services/business-fit.service.ts");

  assert.match(service, /companyId\.slice\(0, 8\)/);
  assert.match(service, /id: input\.terminalId, companyId: input\.companyId/);
  assert.match(service, /id: input\.customerId, companyId: input\.companyId/);
  assert.match(service, /id: input\.productId, companyId: input\.companyId/);
  assert.match(service, /id: input\.staffId, companyId: input\.companyId/);
});

test("report and sync recovery indexes cover common POS report filters", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260606120000_phase2_pos_reliability_indexes/migration.sql");
  const terminalDateMigration = read("prisma/migrations/20260803120000_invoice_terminal_created_at_index/migration.sql");

  assert.match(schema, /@@index\(\[posTerminalId, status, createdAt\]\)/);
  assert.match(schema, /@@index\(\[posTerminalId, createdAt\]\)/);
  assert.match(schema, /@@index\(\[cashierId, createdAt\]\)/);
  assert.match(schema, /@@index\(\[companyId, movementType, createdAt\]\)/);
  assert.match(schema, /@@index\(\[companyId, createdAt\]\)/);
  assert.match(migration, /invoice_uuid_pos_terminal_status_created_at_idx/);
  assert.match(migration, /offline_sync_issue_idempotency_key_idx/);
  assert.match(migration, /stock_movement_company_id_movement_type_created_at_idx/);
  assert.match(terminalDateMigration, /invoice_pos_terminal_created_at_idx/);
});

test("phase 3 workflow pages expose operational health, history, and recovery context", () => {
  const remainingFeatures = read("app/(protected)/_services/remaining-features.service.ts");
  const inventoryPage = read("app/(protected)/inventory-ledger/page.tsx");
  const customerPage = read("app/(protected)/customers/page.tsx");
  const debtClient = read("app/(protected)/debts/_components/DebtsPageClient.tsx");
  const kitchenPage = read("app/(protected)/kitchen/page.tsx");
  const returnDialog = read("app/(protected)/report/_components/ReturnInvoiceDialog.tsx");

  assert.match(remainingFeatures, /watchlist/);
  assert.match(remainingFeatures, /recentPurchases/);
  assert.match(remainingFeatures, /loyaltyEvents/);
  assert.match(remainingFeatures, /CUSTOMER_PAGE_SIZE/);
  assert.match(remainingFeatures, /skip:\s*\(page - 1\) \* pageSize/);
  assert.match(remainingFeatures, /customerId:\s*{\s*in:\s*customerIds/);
  assert.match(inventoryPage, /Stock Watchlist/);
  assert.match(customerPage, /Recent History/);
  assert.match(customerPage, /CustomerPagination/);
  assert.match(debtClient, /daysOverdue/);
  assert.match(debtClient, /paymentHistory/);
  assert.match(kitchenPage, /Over 30 Min/);
  assert.match(kitchenPage, /Handoff note/);
  assert.match(returnDialog, /commonReasons/);
  assert.match(returnDialog, /Full Remaining/);
});

test("customer edits and loyalty mutations are company-scoped and balance-safe", () => {
  const actions = read("app/(protected)/customers/_actions/customer.actions.ts");
  const page = read("app/(protected)/customers/page.tsx");

  assert.match(actions, /\["admin", "manager"\]\.includes\(profile\.role\)/);
  assert.match(actions, /companyId: viewer\.companyId/);
  assert.match(actions, /Loyalty balance cannot become negative/);
  assert.match(actions, /FOR UPDATE/);
  assert.match(actions, /workflowMutationRequest\.findUnique/);
  assert.match(actions, /CUSTOMER_UPDATED/);
  assert.match(page, /updateCustomerAction/);
  assert.match(page, /recordLoyaltyMutationAction/);
  assert.match(page, /canManageCustomerMutations/);
});

test("current disabled-feature matrix keeps unsupported surfaces explicit", () => {
  const customersPage = read("app/(protected)/customers/page.tsx");
  const downloadPage = read("app/(marketing)/download/page.tsx");
  const helpClient = read("app/(protected)/help/HelpCenterClient.tsx");

  assert.match(customersPage, /Manager only/);
  assert.match(downloadPage, /disabled/);
  assert.match(helpClient, /Feedback sending is disabled until email settings are ready/);
  assert.match(read("tests/transactions/customers-loyalty.spec.ts"), /\/customers\/new/);
});

test("CI keeps a production-server performance gate", () => {
  const workflow = read(".github/workflows/e2e.yml");

  assert.match(workflow, /name: Build production server for performance gate/);
  assert.match(
    workflow,
    /PLAYWRIGHT_WEB_SERVER_COMMAND: npm run start -- --hostname 127\.0\.0\.1 --port 3000/,
  );
  assert.match(workflow, /name: Run production-server performance gate/);
  assert.match(workflow, /run: npm run test:e2e:performance/);
});

test("transaction reports skip the unused overview query fan-out", () => {
  const reportPage = read(
    "app/(protected)/reports/_services/report-page.service.ts",
  );

  assert.match(
    reportPage,
    /definition\.view === "transactions"\s*\n\s*\? Promise\.resolve\(null\)/,
  );
});
