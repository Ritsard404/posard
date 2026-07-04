# Phase: Mobile Native Performance And Feature Restrictions

## Goal

Make the POSard mobile/tablet app feel fast, focused, and designed for counter use instead of feeling like the full desktop web app inside a webview.

Primary outcome: transactions should start, scan/search, add to cart, tender, save, and print with fewer loaded surfaces, fewer taps, and predictable mobile/tablet layouts.

## Current Repo Baseline

- Capacitor Android exists and is wired through `capacitor.config.ts`.
- POS checkout already has mobile tabs in `app/(protected)/pos/_components/POSLayout.tsx`.
- Product browsing, cart, and tender are already split across:
  - `app/(protected)/pos/_components/ProductDisplay.tsx`
  - `app/(protected)/pos/_components/CartPanel.tsx`
  - `app/(protected)/pos/_components/TenderPanel.tsx`
- POS state already lives in `app/(protected)/pos/_store/pos-store.ts`.
- Offline checkout/sync already exists through `app/(protected)/pos/_services/offline-sync.client.ts` and Sync Center.
- Responsive proof already exists in `tests/pos/pos-responsive.spec.ts`.

## Non-Goals

- Do not create a second POS checkout system.
- Do not duplicate product, cart, payment, receipt, or sync logic for mobile.
- Do not remove the existing web app.
- Do not expose raw technical errors to operators.
- Do not make public marketing claims unless the app behavior is implemented and verified.

## Important Design Constraint

If this remains a Capacitor app, it still technically runs web code inside a native WebView. The implementation goal is to make the experience native-feeling by limiting loaded features, using a dedicated mobile/tablet shell, preloading only transaction-critical data, and exposing native-device integrations only where they make checkout faster.

If the long-term goal is a true native app, create a separate future TODO after this phase for a native rewrite assessment. This phase should first optimize the existing POSard Capacitor/Next.js app.

## Phase 1 - Define Mobile App Mode And Feature Gates

### Tasks

- Add a durable mobile-app mode detector that can distinguish:
  - desktop browser
  - tablet browser
  - Capacitor Android app
  - small phone layout
- Reuse existing route/access-control seams before adding new route rules.
- Create a feature restriction map for mobile/tablet app mode.
- Restrict heavy non-checkout features from the mobile/tablet app shell by default:
  - large reports
  - admin company management
  - bulk product import/export
  - deep setup pages
  - broad feature-guide walkthroughs
  - heavy dashboard charts
- Keep transaction-critical surfaces available:
  - POS
  - cashier session open/close
  - cash in/out
  - printer setup
  - barcode scanner
  - Sync Center
  - product lookup needed for checkout
  - customer/debt actions needed during checkout
- Add a friendly restricted-feature screen for mobile/tablet app mode with:
  - plain reason
  - "Use desktop/admin device" direction
  - allowed quick links back to POS and Sync Center
- Ensure restrictions are role-aware and do not bypass existing permissions.

### Acceptance Criteria

- Mobile/tablet app mode cannot load intentionally restricted heavy routes from the app shell.
- Restricted routes show a friendly screen, not a crash or blank page.
- Managers still have full access from desktop browser.
- Cashiers keep fast access to POS, session controls, printer setup, and Sync Center.
- No duplicate permissions system is created.

## Phase 2 - Build A Native-Feeling Mobile/Tablet Shell

### Tasks

- Reuse the protected layout and POS layout instead of creating a parallel mobile app.
- Add a mobile/tablet app shell that prioritizes:
  - POS
  - Cart
  - Tender
  - Sync
  - Session
- Reduce header/action clutter in app mode.
- Convert secondary actions into a compact action drawer with clear labels.
- Keep touch targets at least 48px.
- Make tablet layout dense but readable:
  - keep POS grid and cart visible when width allows
  - avoid desktop admin navigation density inside the app shell
  - preserve independent scroll zones
- Add app-mode safe empty/loading/error states for product, cart, tender, and sync panels.
- Avoid hover-only or icon-only interactions.

### Acceptance Criteria

- Phone users can complete a sale through Menu -> Cart -> Tender without visiting desktop navigation.
- Tablet users can see product and order context without horizontal overflow.
- App-mode shell has no clipped content at 375px, 390px, 768px, and 1280px.
- Checkout controls are reachable with one hand on phone layouts.
- Session, sync, and printer states remain visible without crowding checkout.

## Phase 3 - Speed Up Transaction Startup

### Tasks

- Audit the POS startup path and identify which data is loaded before checkout becomes usable.
- Prioritize loading:
  - active session
  - terminal
  - products needed for sale
  - categories
  - payment methods
  - offline bootstrap status
- Defer or lazy-load non-critical data:
  - customer display setup
  - business-fit links
  - kitchen/status summaries unless enabled
  - large management counters
  - printer diagnostics until printer panel opens
- Keep Capacitor/native plugin imports lazy and availability-checked.
- Batch native bridge calls where possible.
- Avoid running expensive route data for restricted app-mode pages.
- Add lightweight timing logs or metrics for:
  - app launch to POS visible
  - POS visible to first product tap/scan ready
  - tender click to sale saved
  - offline save time

### Acceptance Criteria

- POS screen becomes usable before non-critical panels finish loading.
- Heavy feature data does not load in app mode unless the user opens the relevant feature.
- Native plugin code is not imported at startup unless required for the active screen.
- Timing proof is available during validation.

## Phase 4 - Optimize Product Search, Scan, And Cart Flow

### Tasks

- Review `ProductDisplay.tsx` for large catalog behavior on mobile/tablet.
- Keep search responsive with large product/category counts.
- Add or improve product list windowing/pagination if real large catalogs still render too much at once.
- Make barcode scan path prefer direct add-to-cart when an exact barcode match exists.
- Keep category filtering fast and avoid rendering long category rails when collapsed.
- Preserve current search fields:
  - name
  - barcode
  - generic name
  - brand
- Make cart quantity edits faster:
  - large plus/minus controls
  - direct quantity edit
  - clear warning for stock/expiry restrictions
- Keep configurable items/modifiers usable without slowing normal one-tap products.

### Acceptance Criteria

- Large catalog search does not freeze the phone/tablet UI.
- Exact barcode scans add products without extra taps when allowed.
- Cart quantity changes do not shift layout unexpectedly.
- Modifier/configurable flows remain available only when needed.

## Phase 5 - Faster Tender And Receipt Path

### Tasks

- Review `TenderPanel.tsx` and checkout action flow for unnecessary steps.
- Keep exact-cash checkout one tap after cart review.
- Keep reference/e-payment checkout clear but compact.
- Avoid blocking the success receipt view on optional printing when possible.
- If printer is unavailable, save the sale first and show a clear printer retry action.
- Keep offline sale commit fast and visible.
- Make "New Checkout" the primary post-sale action.
- Ensure sale completion cannot double-submit from rapid taps.

### Acceptance Criteria

- Cash checkout can complete in the fewest safe taps.
- Sale save state is obvious and prevents duplicate submit.
- Receipt/print failure does not hide a successfully saved sale.
- Offline sale completion remains clear and recoverable through Sync Center.

## Phase 6 - Native Device Integration Cleanup

### Tasks

- Audit Capacitor config and Android project for production-safe app behavior.
- Keep development URLs out of production builds.
- Verify app-mode URL/config behavior with `CAPACITOR_APP_URL`.
- Lazy-load scanner/printer/native services.
- Check native feature availability before use.
- Add graceful web fallback for browser use.
- Document device support expectations:
  - normal Android phone
  - Android tablet
  - SUNMI-style POS device if supported
  - browser fallback

### Acceptance Criteria

- Android app can be synced without committing device-specific local URLs.
- Native-only features fail gracefully in browser mode.
- Printer/scanner setup does not slow normal checkout startup.
- Capacitor docs are updated if setup or release commands change.

## Phase 7 - Docs, Help Center, And Operator Guidance

### Tasks

- Update or create user guide coverage for mobile/tablet app mode.
- Update `docs/user-guide/user-guide-index.md`.
- Update `app/(protected)/help/HelpCenterClient.tsx` with searchable operator help.
- Update `docs/capacitor-setup.md` if build, sync, or release behavior changes.
- Keep wording operator-facing:
  - what is available on mobile/tablet
  - why some admin features are restricted
  - how to finish sales quickly
  - what to do when offline or printer fails

### Acceptance Criteria

- Cashiers can find mobile/tablet checkout instructions in Help Center.
- Managers can understand which features belong on desktop/admin devices.
- Capacitor setup docs match the implemented app-mode behavior.

## Phase 8 - Validation And Deletion Criteria

### Required Validation

- `npx.cmd prisma validate`
- `npx.cmd tsc --noEmit`
- Targeted ESLint for changed files
- `npx.cmd tsx --test tests\pos\business-integrity-regression.test.ts`
- `npx.cmd playwright test tests\pos\pos-responsive.spec.ts`
- `npm.cmd run build`
- `npm.cmd run cap:sync`
- Android run or build proof when native files/config are changed:
  - `npm.cmd run android:assemble:release` or a documented debug-device run

### Responsive Proof

Verify at:

- 375 x 667 phone
- 390 x 844 phone
- 768 x 1024 tablet
- 1280 x 720 tablet/desktop boundary
- 1440 x 900 desktop

### Performance Proof

Capture before/after notes for:

- app launch to POS visible
- POS visible to product search ready
- scan/tap to cart update
- cart to tender ready
- complete sale to saved receipt
- offline sale save time

### Delete This TODO Only When

- All phases are implemented.
- Heavy mobile/tablet restrictions are active and verified.
- Transaction path is measurably faster or at least instrumented with clear proof.
- Mobile/tablet UI passes responsive checks.
- Android/Capacitor sync or build proof passes if native behavior changed.
- User guide and Help Center coverage are updated.
- No duplicate mobile POS or duplicate business logic was created.

## Suggested Implementation Order

1. Phase 1 - mobile/tablet app-mode restrictions
2. Phase 2 - native-feeling app shell
3. Phase 3 - startup performance
4. Phase 4 - search/scan/cart speed
5. Phase 5 - tender/receipt speed
6. Phase 6 - native integration cleanup
7. Phase 7 - docs/help
8. Phase 8 - validation and delete tracker

