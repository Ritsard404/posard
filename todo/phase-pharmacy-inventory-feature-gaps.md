# Pharmacy Inventory Capability Gap TODO

Scanned on: 2026-06-25

Purpose: compare the requested pharmacy/POS capability list against the current POSard implementation and leave a reuse-first implementation backlog for the missing or partial work.

## Reuse First

Extend these existing seams before creating new subsystems:

- Product master: `app/(protected)/product/_services/product.service.ts`, `app/(protected)/product/_services/_dto/product.dto.ts`, `app/(protected)/product/_components/ProductFormSheet.tsx`, `app/(protected)/product/_components/InventoryToolbar.tsx`, `app/(protected)/product/_components/ProductDataTable.tsx`
- Product search and scanning: `app/(protected)/pos/_services/product.service.ts`, `app/(protected)/pos/_services/scan-product.service.ts`, `app/(protected)/pos/_components/ProductDisplay.tsx`, `app/(protected)/pos/_components/BarcodeScannerPanel.tsx`, `lib/scanning/camera-scan.client.ts`
- Inventory health and movement history: `app/(protected)/inventory-ledger/page.tsx`, `app/(protected)/_services/remaining-features.service.ts`, `app/(protected)/_services/management-workflow.service.ts`, `app/(protected)/_services/inventory-restock.service.ts`
- Reports and exports: `app/(protected)/reports/_components/reports-config.ts`, `app/(protected)/reports/_services/report-export.service.ts`, `app/(protected)/reports/export/route.ts`, `app/(protected)/report/_services/report.service.ts`
- Database contracts: `prisma/schema.prisma`

## Current Coverage

### Present

- Product categories exist through `Category`, product category selection, category management, and product/POS filtering.
- Product records exist with name, image, barcode, base unit, quantity, cost, price, item type, VAT type, availability, and inventory tracking.
- Selling price and cost tracking exist through product `price` and `cost`.
- Barcode search, hardware scanner support, camera scanner support, and POS add-to-cart flows exist.
- Out-of-stock and low-stock visibility exists in the product table, POS product grid, dashboard, inventory health page, and restock assistant.
- Inventory value exists in inventory health/report aggregations through stock value and potential retail/profit calculations.
- Stock movement history exists through `StockMovement` and the inventory ledger.
- Suppliers, purchase orders, and receiving records exist.
- Stock lots exist for received batches with batch number, expiry date, unit cost, quantity on hand, shelf location, supplier, and status.
- FEFO allocation exists for POS sale deductions, stock adjustment decreases, and transfer dispatch stock-out movements.
- Near-expiry and expired batch monitoring exists on Inventory Health with expired, 0-30 day, 31-60 day, 61-90 day, and no-expiry buckets.
- Reports exist for sales, transactions, invoices, discounts, refunds, returned items, audit trail, X-reading, and Z-reading.
- Excel export exists for reports through XLSX export.
- Bulk product import exists for CSV and the generated Excel XML `.xls` template.
- User roles and permissions exist through `UserRole`, `PermissionKey`, and protected application surfaces.
- Duplicate product detection exists for name/category and barcode during product save/import.
- PWD and Senior statutory discounts exist with required customer/id metadata.
- Product search includes barcode, product name, generic name, brand name, category, and preferred supplier.

### Partial

- Fast-moving and slow-moving visibility is partially covered by top products, restock velocity, and no-movement inventory signals, but there is no dedicated fast/slow mover report.
- Physical stock count is partially covered by stock adjustment/count correction, but there is no count-sheet workflow with variance approval/history.
- Import from Excel is partially covered by `.xls` XML template import, but true `.xlsx` upload is explicitly not supported.
- Export to Excel/PDF is partial: report Excel export exists; product catalog export and direct PDF export are missing.
- Loss/damage tracking is partially modeled by `StockMovementType.waste`, but there is no operator workflow or report for damaged/expired/lost items.
- Profit and gross are partially reported at sales/report level, but there is no per-product profit and markup monitor.
- Non-sales cash movement exists for cash drawer operations and expenses, but there is no dedicated non-sales income ledger.
- Prescription-required products have a product flag and POS display warning, but checkout confirmation/audit remains open.

### Missing

- DSWD discount type/reporting.
- Revenue goal or monthly sales target monitoring.
- Favorite/frequent item shortcuts.
- Backup and restore workflow.
- True `.xlsx` product import.
- Product catalog export to Excel/PDF.

## Implementation TODO

### Phase 1 - Product Master Extensions

- [x] Add product metadata fields to Prisma and product DTOs:
  - `genericName`
  - `brandName`
  - `shelfLocation`
  - `prescriptionRequired`
  - `reorderPoint`
  - `preferredSupplierId` or equivalent supplier association
- [x] Keep existing `name` as the display/search fallback while adding branded/generic structure.
- [x] Update product form, product table, product detail display, import template, and import validation for the new fields.
- [x] Add derived markup display using existing `price` and `cost`.
- [x] Add configurable low-stock level per product and replace fixed UI-only thresholds where inventory alerts are shown.
- [x] Extend duplicate detection to include probable duplicates by barcode, normalized brand/generic name, strength/variant if added, and category.
- [x] Update POS search to match barcode, product name, generic name, brand name, category, and preferred supplier.

### Phase 2 - Batch, Expiry, and FEFO Inventory

- [x] Add a stock lot/batch model linked to product, supplier/receiving item where available, batch number, expiry date, unit cost, quantity on hand, shelf location, and status.
- [x] Update receiving flow to capture batch number and expiry date for tracked products.
- [x] Update stock movement creation so batch movements are recorded with before/after lot quantities.
- [x] Add FEFO allocation for POS sale deductions and stock-out flows.
- [x] Add a near-expiry monitor with expiry windows, for example expired, 0-30 days, 31-60 days, and 61-90 days.
- [x] Add a batch expiry page or inventory-ledger tab showing product, batch number, expiry date, quantity, shelf location, supplier, cost value, and FEFO priority.
- [x] Add expiry warnings to POS product selection and block expired stock unless an admin override is intentionally supported.

### Phase 3 - Stock Count, Loss, Damage, and Adjustment Control

- [ ] Add physical stock count sessions with draft counts, counted quantity, expected quantity, variance, assigned user, submitted date, approved date, and notes.
- [ ] Allow barcode/camera scanning during stock counts.
- [ ] Convert approved variances into `StockMovement` adjustment records and update product/batch quantity.
- [ ] Add explicit workflows for damaged, lost, expired, and disposed products.
- [ ] Map those workflows to movement types, including existing `waste` where appropriate.
- [ ] Add loss/damage/expiry reports with quantity, cost impact, retail impact, user, reason, and date filters.

### Phase 4 - Sales, Discounts, and Prescription Rules

- [ ] Add DSWD discount support if it is a distinct business rule from PWD/Senior/others.
- [ ] Add discount reporting by discount type, approval user, invoice, customer/id metadata, and total discount amount.
- [ ] Add prescription-required warnings in POS product display/cart.
- [ ] Decide whether prescription-required products require a cashier confirmation, uploaded/reference prescription number, or manager override.
- [ ] Store prescription reference metadata on invoice line items if required for audit.

### Phase 5 - Analytics and Monitoring

- [ ] Add a dedicated fast-moving/slow-moving report based on sale velocity, days since last sale, quantity on hand, and stockout risk.
- [ ] Add per-product profit report using sold quantity, revenue, cost of goods, gross profit, gross margin, and markup.
- [ ] Add inventory value report by category, supplier, shelf location, batch, expiry bucket, and product.
- [ ] Add revenue goal/monthly sales target model and dashboard/report progress cards.
- [ ] Add target variance, daily run-rate, and projected month-end sales.
- [ ] Add favorite/frequent items for POS based on configurable favorites plus recent/high-frequency sales.

### Phase 6 - Non-Sales Income, Backup, and File Exchange

- [ ] Add a non-sales income ledger separate from expenses and normal invoice sales.
- [ ] Support income source, amount, reference number, notes, created user, terminal, and report filters.
- [ ] Add backup export for core business data: products, categories, suppliers, customers, invoices, line items, payments, stock movements, batches, users/roles metadata, and settings.
- [ ] Add restore/import validation with dry-run preview, duplicate handling, and admin-only permissions.
- [ ] Add direct product catalog export to Excel.
- [ ] Add direct product catalog/report export to PDF.
- [ ] Add true `.xlsx` product import using the existing report XLSX dependency or another approved parser.
- [ ] Keep CSV import as the lowest-friction fallback.

## Requested Feature Status Matrix

| Requested item | Status | Next action |
| --- | --- | --- |
| Near Expiry tracker/monitor | Present | Inventory Health includes expiry buckets and priority lots |
| Batch No. expiry per stock | Present | Receiving creates stock lots with batch, expiry, shelf, supplier, cost, and status |
| Stock movement history | Present | Batch-aware movements record lot before/after quantities for receiving and stock-out allocations |
| Category of products | Present | Extend only as needed for reports/search |
| Shelf location | Present | Product and stock-lot shelf locations are implemented |
| Naming (Branded&Generic) | Present | Keep using display name fallback while products are migrated |
| Out of stock alert | Present/partial | Product reorder points and batch expiry warnings are implemented; alert configuration can expand later |
| Fast moving&Slow Moving | Partial | Phase 5 |
| Price SRP and Cost tracker/monitor | Present/partial | Add markup/SRP labeling and monitoring in Phase 1/5 |
| FEFO Monitoring | Present | POS, adjustment decreases, and transfer dispatches consume non-expired batches first |
| Inventory Value | Present | Expand batch/category/supplier drilldowns in Phase 5 |
| Stocks and Low Stock Level tracker/monitor | Present/partial | Product-specific reorder points implemented; expand batch/category/supplier drilldowns in Phase 5 |
| Scanning product to easy to find and add product | Present | Expand search fields in Phase 1 |
| Searching product (easy to find) | Present | Product/POS search now includes barcode, name, generic, brand, category, and preferred supplier |
| Phone to Scan | Present | Reuse existing camera scanner |
| Add items | Present | No new subsystem needed |
| Discount DSWD and PWD | Partial | PWD exists; add DSWD if required in Phase 4 |
| Reports | Present | Add pharmacy-specific reports in Phase 5 |
| Suppliers | Present | Preferred supplier can now be linked to products |
| Revenue goal/monthly sales target | Missing | Phase 5 |
| Track non-sales income | Missing/partial | Phase 6 |
| Bulk import products | Present/partial | Add true `.xlsx` support in Phase 6 |
| Loss and damages products tracker | Missing/partial | Phase 3 |
| Mark up | Present/partial | Product form/table markup display is implemented; add reporting drilldowns in Phase 5 |
| Gross | Present/partial | Add product/category drilldowns in Phase 5 |
| Physical stock count | Partial | Phase 3 |
| Profit per product | Partial | Phase 5 |
| Product information | Present/partial | Pharmacy metadata and receiving batch/expiry fields are implemented; prescription audit remains Phase 4 |
| User roles | Present | Add permissions for new workflows as needed |
| Prescription required | Present/partial | Product flag and POS display warning are implemented; checkout confirmation/audit remains Phase 4 |
| Search by barcode, generic branded supplier and category | Present | Implemented in product search, POS search, and exact scan matching |
| Favorite/Frequent Items | Missing | Phase 5 |
| Duplicate Product Detection | Present/partial | Barcode and brand/generic/category duplicate rules are implemented; strength/variant remains if added |
| Backup & Restore | Missing | Phase 6 |
| Export to Excel/PDF | Partial | Phase 6 |
| Import from Excel | Partial | Phase 6 |

## Verification Checklist For Each Implementation Slice

- [ ] Run `npx.cmd prisma validate` after schema changes.
- [ ] Run the appropriate Prisma migration workflow after schema changes.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run targeted ESLint on changed files instead of repo-wide lint until generated output is excluded.
- [ ] Run focused POS/inventory regression tests, including `npx.cmd tsx --test tests/pos/business-integrity-regression.test.ts` when checkout, inventory, discount, or movement behavior changes.
- [ ] Manually verify product creation/edit, POS scan/search/add-to-cart, reports/export, and inventory ledger behavior for the touched slice.
