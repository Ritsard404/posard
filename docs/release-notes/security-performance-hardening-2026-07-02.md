# Security and Performance Hardening - 2026-07-02

## Operator-visible changes

- Product imports now support CSV and the POSARD `.xls` Excel XML template. Binary `.xlsx` uploads are rejected.
- Product catalog Excel exports use the POSARD `.xls` Excel XML format.
- Backup downloads stream large JSON files and show preparing/downloading status.
- Data Exchange shows recent export history for manager review.
- Manager backups use an operational scope by default. Full backups with sensitive user records require admin access.
- POS offline bootstrap requests now use sync cursors where available and show stale-data age when the offline fallback is used.
- Dashboard charts load after the main dashboard shell so high-volume stores get faster first render.
- Customers & Loyalty now supports search and page controls so managers can review large customer lists without loading every history row at once.

## Technical changes

- Replaced `next-pwa` with Serwist and removed generated Workbox artifacts from source control.
- Removed `xlsx` from the runtime dependency path.
- Added import/export payload limits, streamed backup output, and no-store download headers.
- Added RLS policy-contract migration checks for `profiles`, `registration_requests`, and `customer_display_state`.
- Moved dashboard top-products, payment mix, fulfillment mix, terminal totals, trend, and variance data to aggregate queries.
- Bounded customer debt, loyalty, and purchase-history lookups to the visible customer page.
