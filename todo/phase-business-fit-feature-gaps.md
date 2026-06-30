# TODO: Business-Fit Feature Gaps

Created: 2026-06-30

## Goal

Expand POSard from its current strong fit for retail, pharmacy-style retail, small restaurants, and multi-branch stores into a broader small-business POS without creating parallel systems.

This tracker must be treated as an implementation contract. Delete it only after every phase below is implemented, documented, and validated. If only part of the work is completed, update this tracker instead of deleting it.

## Current Fit Already Covered

- General retail, sari-sari, grocery, convenience, cosmetics, accessories, and electronics stores.
- Pharmacy-style retail with product generic/brand names, shelf location, reorder point, prescription warnings, supplier receiving, batch/expiry tracking, and FEFO checkout behavior.
- Small restaurant/cafe/food kiosk workflows with optional restaurant settings, fulfillment details, and kitchen tickets.
- Multi-branch and multi-terminal stores with branch-scoped terminals, cashier sessions, invoice numbering, reports, subscriptions, and role-based access.
- Stores that need customer debt/utang, loyalty, returns, discounts, expenses, non-sales income, purchase orders, sync monitoring, and data exchange.

## Reuse Targets

Before implementing any phase, inspect and extend these existing seams first:

- Business setup: `app/(protected)/companies`, `app/(protected)/companies/[companyId]/settings`, `app/(protected)/companies/[companyId]/terminals`, `lib/access-control.ts`
- Checkout: `app/(protected)/pos`, `app/(protected)/pos/_services/order.service.ts`
- Products and inventory: `app/(protected)/product`, `app/(protected)/product/_services/product.service.ts`, `app/(protected)/inventory-ledger`, `app/(protected)/_services/inventory-restock.service.ts`
- Suppliers and purchasing: `app/(protected)/suppliers`, `app/(protected)/purchase-orders`
- Customers, debt, and loyalty: `app/(protected)/customers`, `app/(protected)/debts`, `app/(protected)/_services/remaining-features.service.ts`
- Restaurant flow: `app/(protected)/kitchen`, terminal restaurant settings, `KitchenTicket`
- Reports and exports: `app/(protected)/reports`, `app/(protected)/reports/_services`, `app/(protected)/data-exchange`
- Operator docs: `docs/user-guide/user-guide-index.md`, matching `docs/user-guide/how-to-*.md`, and `app/(protected)/help/HelpCenterClient.tsx`
- Database contract: `prisma/schema.prisma`

## Implementation Rules

- Reuse existing routes, services, DTOs, actions, validators, and components before creating new files.
- Keep business logic inside the owning feature folder; do not move it into generic `lib` helpers unless it is infrastructure-only.
- Any new operator-facing workflow must update the user guide and in-app Help Center in the same phase.
- Prisma models must be mapped to DTO-safe shapes before reaching UI or actions.
- Each phase should include focused regression coverage where business rules change.

## Phase 0 - Recheck The Real System

- [ ] Re-scan routes, services, docs, and `prisma/schema.prisma` before implementing this tracker.
- [ ] Confirm whether any listed gap was already implemented after this file was created.
- [ ] Write a short present/partial/missing matrix for these business categories: retail, pharmacy, restaurant, service, repair, wholesale, apparel, hardware, and serialized goods.
- [ ] Keep completed capabilities out of new code; extend only true gaps.

## Phase 1 - Business Type Presets And Setup Guidance

Target businesses: all business categories.

- [ ] Add a company or terminal business-type setting only if no existing setting can safely represent it.
- [ ] Support presets such as `retail`, `pharmacy`, `restaurant`, `service`, `repair`, `wholesale`, `apparel`, `hardware`, and `serialized_goods`.
- [ ] Use the preset to guide visible setup steps, recommended terminal toggles, inventory defaults, receipt labels, and Help Center suggestions.
- [ ] Keep settings editable so mixed-use businesses can override the preset.
- [ ] Update the Feature Guide to show which POSard workflows fit each business type.
- [ ] Update `docs/user-guide/how-to-set-up-company-information.md`, `docs/user-guide/how-to-manage-terminals.md`, and Help Center search entries.

Acceptance:

- [ ] A manager can identify the business type during setup or terminal configuration.
- [ ] POSard shows relevant next steps without hiding core controls needed by mixed businesses.
- [ ] Existing retail, pharmacy, and restaurant behavior still works.

## Phase 2 - Service Business Workflow

Target businesses: salons, barbershops, clinics, repair counters with service fees, consulting/service desks, cleaning services.

- [ ] Add first-class service items or a clearer service/non-stock product mode if `trackInventory=false` is not enough for reporting and checkout clarity.
- [ ] Add appointment or service booking support with customer, staff member, date/time, service item, notes, status, deposit, and final checkout link.
- [ ] Allow service packages or repeat service bundles when they can reuse product/promotions logic.
- [ ] Link appointments to POS invoices and customer history.
- [ ] Add service revenue and staff/service performance reporting.
- [ ] Update docs and Help Center with service setup, booking, checkout, and reporting steps.

Acceptance:

- [ ] A cashier can sell a service without stock warnings.
- [ ] A manager can track upcoming and completed service work.
- [ ] Service sales appear correctly in sales reports without corrupting inventory counts.

## Phase 3 - Repair And Job Order Workflow

Target businesses: phone repair, appliance repair, tailoring/alteration, computer repair, watch repair, bike repair.

- [ ] Add repair/job tickets with customer, item/device, issue, intake notes, estimate, status, due date, assigned staff, and pickup status.
- [ ] Support labor charges, parts used from inventory, deposits, balance due, and final POS invoice.
- [ ] Add serial/IMEI/reference fields where needed for repair tracking.
- [ ] Add warranty or comeback tracking linked to the original job/invoice.
- [ ] Add printable job claim stub or service report using existing receipt/document patterns.
- [ ] Update docs and Help Center with repair intake, status updates, parts usage, and checkout steps.

Acceptance:

- [ ] A repair job can move from intake to completed/picked up.
- [ ] Parts reduce inventory only when actually used.
- [ ] Deposits and balances remain visible in customer/debt context.

## Phase 4 - Wholesale, B2B, And Distribution

Target businesses: wholesalers, distributors, suppliers selling to stores, bulk-order retailers.

- [ ] Add customer account types, price levels, and customer-specific discounts without breaking normal retail pricing.
- [ ] Add quotations or sales orders that can convert to invoices.
- [ ] Add credit limit, payment terms, due dates, and partial payment behavior integrated with existing debts.
- [ ] Add delivery note, packing list, or dispatch status if not already covered by invoice documents.
- [ ] Support bulk quantity entry and unit/case pricing where needed.
- [ ] Add reports for customer balances, open orders, aging, and sales by customer group.
- [ ] Update docs and Help Center with wholesale order, credit, and collection workflows.

Acceptance:

- [ ] A manager can assign a customer to a pricing/terms setup.
- [ ] A cashier or manager can create an order without immediately finalizing it as a paid retail sale.
- [ ] Credit exposure remains visible in debt and customer workspaces.

## Phase 5 - Variants, Units, Serial Numbers, And Bundles

Target businesses: apparel, shoes, hardware, electronics, mobile accessories, packaged goods, gift shops.

- [ ] Add product variants for size, color, flavor, model, or other sellable options.
- [ ] Add unit-of-measure support such as piece, pack, box, case, meter, kilo, or liter when stock and sale units differ.
- [ ] Add serial-number tracking for electronics, warranty items, and high-value goods. Keep this separate from pharmacy batch/expiry lots.
- [ ] Add kit or bundle products that can sell grouped items while consuming component stock where required.
- [ ] Update barcode generation/scanning so variants, serials, and bundles can be sold accurately.
- [ ] Add reporting for variant stock, serial movement, warranty exposure, and bundle profitability.
- [ ] Update docs and Help Center for variant setup, UOM conversion, serial sale, warranty lookup, and bundles.

Acceptance:

- [ ] A cashier can select the exact variant or serial item during checkout.
- [ ] Stock math remains correct for base products, variants, units, lots, and bundles.
- [ ] Existing pharmacy lot/expiry behavior remains intact.

## Phase 6 - Advanced Restaurant Operations

Target businesses: dine-in restaurants, cafes with modifiers, quick service with kitchen stations, delivery-heavy food businesses.

- [ ] Add menu modifiers and add-ons, such as size, sugar level, toppings, cooking preference, and side choices.
- [ ] Add table map or table list with open tickets, transfer table, merge table, and split bill.
- [ ] Add service charge, tips, and dining-specific receipt controls if required by settings.
- [ ] Add kitchen stations, prep timing, ticket priority, and item-level preparation status.
- [ ] Add order hold/fire behavior for dine-in service if needed.
- [ ] Update docs and Help Center for menu modifiers, table service, split bills, and kitchen stations.

Acceptance:

- [ ] A restaurant can run dine-in, takeout, pickup, and delivery without using retail-only workarounds.
- [ ] Kitchen staff can see enough detail to prepare modified items.
- [ ] Reports separate food/service charges, tips, discounts, and refunds correctly.

## Phase 7 - Pharmacy Compliance And Patient Safety

Target businesses: pharmacies, drugstores, clinics with medicine dispensing.

- [ ] Add prescription capture or prescription reference workflow for prescription-required products.
- [ ] Add pharmacist or manager verification for controlled or sensitive items.
- [ ] Add customer/patient medication history where legally and operationally appropriate.
- [ ] Add controlled item audit log, dispensing report, and pharmacist accountability report.
- [ ] Add expiry recall, quarantine, supplier return, and blocked-lot handling workflows.
- [ ] Add contraindication/allergy warning support only after a clear data source and liability model are defined.
- [ ] Update docs and Help Center for prescription checks, batch recalls, expiry quarantine, and pharmacist verification.

Acceptance:

- [ ] Prescription-required items cannot be sold silently when verification is required.
- [ ] Controlled or sensitive product movement is auditable.
- [ ] Expired, recalled, or quarantined stock cannot be sold through normal checkout.

## Phase 8 - Business Fit Matrix And Public Positioning

Target businesses: buyers deciding whether POSard fits their store.

- [ ] Add a signed-in business fit matrix to the Feature Guide.
- [ ] Update public `app/(marketing)/solutions` content only after the supported workflows actually exist.
- [ ] Show "ready now", "supported with setup", and "planned" states for each business category.
- [ ] Link each business category to the relevant Help Center guides.
- [ ] Avoid marketing claims for features that are still TODO-only.

Acceptance:

- [ ] Managers can see which setup path fits their business.
- [ ] Public pages do not claim unsupported capabilities.
- [ ] Help Center search finds each implemented business workflow.

## Required Validation Before Closing

Run the relevant subset for each phase, and run the full sequence when schema, shared contracts, checkout, reports, or permissions change:

- [ ] `npx.cmd prisma validate`
- [ ] `npx.cmd prisma generate` after schema changes
- [ ] `npx.cmd prisma migrate deploy` after migration changes
- [ ] `npx.cmd prisma migrate status` after migration changes
- [ ] `npx.cmd tsc --noEmit`
- [ ] Targeted ESLint on changed TS/TSX files
- [ ] Focused business regression tests, including `npx.cmd tsx --test tests/pos/business-integrity-regression.test.ts` when checkout, inventory, debt, return, kitchen, or customer behavior changes
- [ ] `git diff --check`
- [ ] `npm.cmd run build` for route, schema, shared service, or report changes

## Completion Rule

- [ ] Delete this TODO only when every phase is either implemented and validated or intentionally split into a newer, more specific TODO file.
- [ ] If a phase is deferred, create a replacement tracker that explains the remaining scope before removing this file.
