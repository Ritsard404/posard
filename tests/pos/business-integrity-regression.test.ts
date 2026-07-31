import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
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
  const workflowService = read("app/(protected)/_services/management-workflow.service.ts");

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

  assert.match(schema, /@@index\(\[posTerminalId, status, createdAt\]\)/);
  assert.match(schema, /@@index\(\[cashierId, createdAt\]\)/);
  assert.match(schema, /@@index\(\[companyId, movementType, createdAt\]\)/);
  assert.match(schema, /@@index\(\[companyId, createdAt\]\)/);
  assert.match(migration, /invoice_uuid_pos_terminal_status_created_at_idx/);
  assert.match(migration, /offline_sync_issue_idempotency_key_idx/);
  assert.match(migration, /stock_movement_company_id_movement_type_created_at_idx/);
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
