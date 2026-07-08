# Phase: Manual Payment QR And Details

## Goal

Let merchants collect non-cash payments without paid payment gateway integrations by attaching QR images and payment instructions to their existing reference payment methods.

Primary outcome: when a cashier selects Maya, GCash, bank transfer, card, or another reference payment method during checkout, POSard can show the correct QR code and/or account details so the customer can scan or copy the information before the cashier records the payment reference.

## Product Direction

This is not a payment gateway. POSard should not process, verify, settle, or reverse money movement through Maya, banks, cards, or other providers in this phase.

POSard should only:

- Store merchant-owned payment display details.
- Show those details during checkout and on the customer display.
- Let the cashier record the payment reference after the customer pays outside POSard.
- Keep reports tied to the selected payment method as they work today.

## Current Repo Baseline

- Reference payment methods already exist as `SaleType` records with `type: "EPAYMENT"`.
- Default reference methods are created in `app/(protected)/pos/_services/epayment.service.ts`.
- Cashiers select reference payments in `app/(protected)/pos/_components/checkout-shared.tsx`.
- Payment methods are managed in `app/(protected)/companies/[companyId]/settings/sale-types/`.
- Offline POS metadata already syncs `epaymentMethods` through `app/(protected)/pos/_services/offline-db.client.ts`.
- Customer display already has a payment status surface under `app/(protected)/pos/customer-display/[terminalId]/`.

## Non-Goals

- Do not integrate paid payment gateway APIs in this phase.
- Do not store customer card numbers, bank credentials, OTPs, access tokens, or gateway secrets.
- Do not claim payment is confirmed automatically.
- Do not auto-mark payments as settled from QR display alone.
- Do not upload QR images to public storage without an intentional privacy and access decision.
- Do not create a parallel payment-method system separate from existing `SaleType` reference payments.

## Phase 1 - Payment Method Data Model

### Tasks

- Extend the existing reference payment method model with manual display fields, such as:
  - QR image URL or storage object key
  - account holder name
  - account number, mobile number, username, or bank account details
  - bank/provider name
  - short cashier/customer instructions
  - display enabled/disabled flag
  - optional sort/display priority
  - updated timestamp for sync freshness
- Decide whether fields belong directly on `SaleType` or in a related `PaymentDisplayProfile` table.
- Prefer extending the existing payment method concept unless the storage/security requirements justify a related table.
- Add Prisma migration and regenerate Prisma client.
- Update DTOs used by settings, checkout, bootstrap sync, and offline POS metadata.

### Acceptance Criteria

- Existing payment methods continue to work without QR/details configured.
- Each reference payment method can optionally hold QR/details.
- Cash/reporting behavior still uses the existing payment method IDs.
- The schema does not create a second competing payment catalog.

## Phase 2 - QR Upload And Storage

### Tasks

- Add QR image upload support in payment method settings.
- Validate uploads by:
  - file type
  - maximum file size
  - image dimensions if practical
  - merchant/company ownership
- Store only safe image formats needed for QR display.
- Decide storage location:
  - controlled object storage with signed/private access if available
  - app-managed upload route with strict authorization
  - database object key plus generated access URL
- Add replace/remove QR actions.
- Clean up replaced QR files when safe to do so.
- Show a preview after upload.

### Acceptance Criteria

- Managers can upload, replace, and remove a QR image for a payment method.
- Unauthorized users cannot read or modify another company payment QR.
- Invalid or oversized files are rejected with clear errors.
- Checkout handles missing/broken QR images gracefully.

## Phase 3 - Payment Method Settings UX

### Tasks

- Extend the existing sales account/payment label management page instead of creating a new settings module.
- Add fields for:
  - payment method name
  - sales account
  - QR image
  - account/display details
  - customer-facing instructions
  - enabled display toggle
- Add a compact preview showing what cashiers/customers will see.
- Keep the UI mobile-safe for store owners configuring from a phone or tablet.
- Add guardrails in helper text:
  - "This only displays payment details; POSard does not confirm payment automatically."
  - "Cashiers still need to enter the payment reference."

### Acceptance Criteria

- Managers can configure Maya, bank, GCash, and other manual payment details from the existing payment settings area.
- Payment methods without QR/details still appear as simple reference payment methods.
- The settings screen remains usable on mobile and desktop.

## Phase 4 - Checkout Display

### Tasks

- When a cashier selects a reference payment method, show a payment details panel in checkout.
- Include:
  - QR image if configured
  - provider/method name
  - account holder
  - account number/mobile number/details
  - customer instructions
  - copy buttons for text details where useful
- Keep the payment reference input visible and required according to current rules.
- Support split/reference payments by showing details for the selected row/method.
- Make the QR large enough to scan from a phone but not so large it blocks checkout.
- Add loading/fallback states for offline mode and missing images.

### Acceptance Criteria

- Cashiers can show or read payment details without leaving checkout.
- The payment reference workflow still prevents blank required references.
- Checkout remains fast and usable on phone, tablet, and desktop layouts.
- Split/reference payments show the right details for each selected method.

## Phase 5 - Customer Display Support

### Tasks

- Update the customer display payment view to show the selected method QR/details when available.
- Add a cashier control or automatic behavior for "show payment QR to customer".
- Ensure the customer display never exposes manager-only notes.
- Keep the screen legible at customer-facing distance.
- Handle no configured QR/details with the existing payment status display.

### Acceptance Criteria

- A customer can scan the QR from the customer display during payment.
- Only customer-safe payment details are shown.
- Customer display continues to work when no payment details are configured.

## Phase 6 - Offline And Sync Behavior

### Tasks

- Include manual payment details in sync/bootstrap metadata when safe.
- Decide how QR images are cached for offline checkout:
  - cache image URLs through service worker/runtime cache
  - store small QR assets in IndexedDB
  - show text details offline when image is not cached
- Ensure updates to payment details propagate to POS devices.
- Add stale-state handling so cashiers know if details may not be current.

### Acceptance Criteria

- POS devices receive updated payment method details through existing sync paths.
- Offline checkout can still show at least text payment details if configured.
- QR cache failure does not block checkout.

## Phase 7 - Security, Privacy, And Compliance

### Tasks

- Treat QR images and account details as company-owned sensitive configuration.
- Enforce company/role authorization on create, update, upload, delete, and read paths.
- Avoid logging account numbers or uploaded file contents.
- Add image upload limits to reduce abuse.
- Do not store payment gateway credentials or customer financial credentials.
- Add clear UI copy that payment confirmation happens outside POSard.

### Acceptance Criteria

- Users cannot access another company's QR/details.
- Sensitive payment details are not exposed in logs or unauthenticated routes.
- POSard does not imply automatic payment confirmation.

## Phase 8 - Docs And Help Center

### Tasks

- Update `docs/user-guide/how-to-manage-sales-accounts-and-payment-labels.md`.
- Update `docs/user-guide/how-to-choose-a-payment-method.md`.
- Update `docs/user-guide/how-to-complete-checkout.md`.
- Add Help Center entries/search keywords for:
  - QR payment
  - Maya QR
  - bank transfer details
  - manual payment details
  - payment reference
- Mention that POSard displays merchant payment instructions but does not act as a gateway.

### Acceptance Criteria

- Managers know how to add QR/details for payment methods.
- Cashiers know how to show the QR/details and still enter the payment reference.
- Help Center search can find QR/manual payment guidance.

## Phase 9 - Validation And Deletion Criteria

### Required Validation

- `npx.cmd prisma validate`
- `npx.cmd prisma migrate dev --name manual-payment-qr-details`
- `npx.cmd prisma generate`
- `npx.cmd tsc --noEmit`
- Targeted ESLint for changed files
- Focused tests or component checks for:
  - payment settings create/update
  - QR upload validation
  - checkout details display
  - customer display details display
  - offline bootstrap metadata shape
- Manual browser check for:
  - manager configures Maya QR/details
  - cashier selects Maya during checkout
  - QR/details display in checkout
  - customer display shows QR/details
  - checkout still requires payment reference

### Delete This TODO Only When

- Payment methods can store and manage QR/details.
- Authorized managers can upload, replace, and remove QR images.
- Checkout displays configured QR/details for selected reference payments.
- Customer display can show customer-safe QR/details.
- Offline/sync behavior is implemented or documented with safe fallbacks.
- Docs and Help Center entries are updated.
- Validation commands pass or any environment-specific blockers are documented.

## Suggested Implementation Order

1. Phase 1 - data model and DTO shape
2. Phase 3 - settings form fields for text details
3. Phase 2 - QR upload/storage
4. Phase 4 - checkout display
5. Phase 5 - customer display
6. Phase 6 - offline/sync behavior
7. Phase 7 - security review
8. Phase 8 - docs/help
9. Phase 9 - validation and delete tracker
