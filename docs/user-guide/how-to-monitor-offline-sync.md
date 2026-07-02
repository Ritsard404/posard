# How to Monitor Offline Sync

## What this feature does
This shows actions that were saved while a device had connection problems and need attention. POSard keeps checkout work in a local queue, then retries when the connection returns.

## When to use it
Use this when a cashier reports offline sales, failed updates, or records that need review.

## Before you begin
- You need manager access.
- Know the terminal or cashier involved if possible.
- Keep the original POS device open when retrying local queued work.

## Steps
1. Open **Sync Center**.
2. Review the action type and status.
3. Read the message.
4. Check the terminal and time.
5. Check the network and queue indicator.
6. Retry or review the issue when the option is available.
7. Add a review note before resolving or dismissing an issue.

## What happens next
You can see which actions still need attention instead of losing them silently. Successful retries are marked recovered. Items that need manager review stay visible until handled.

## Tips or reminders
- Do not ignore needs-review items.
- Compare the receipt and report if a sale looks duplicated or missing.
- Cashiers can keep selling with saved product data when the product refresh fails.
- Logging out clears protected browser caches, but POS offline data stays in the explicit offline storage path until it syncs or a manager handles it.
- Official sales may pause if no invoice number is available. Training mode can continue with local records.
- Do not repeat the same sale manually unless a manager confirms the queued sale will not sync.

## Common questions or issues
- **A failed item keeps returning**  
  Ask a manager or administrator to review the terminal and sale details.
- **The POS says it is using saved data**  
  Continue only if the product and price look correct. Ask a manager to refresh when the connection is stable.
- **The invoice pool is empty**  
  Stop official checkout and contact a manager. Do not reuse an old receipt number.
- **The message looks technical**  
  Use the safe message shown on screen. Report the terminal, cashier, time, and local reference to support.
