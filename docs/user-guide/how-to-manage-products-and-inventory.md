# How to Manage Products and Inventory

## What this feature does
This lets managers add products, update prices, record stock changes, add pharmacy-style product details, review restock recommendations, and monitor batch expiry.

## When to use it
Use this when adding new items, changing prices, correcting stock counts, deciding what to reorder, or checking batches that are expired or near expiry.

## Before you begin
- You need manager access.
- Prepare product name, price, category, stock details, generic/brand names, shelf location, reorder point, and preferred supplier if available.

## Steps
1. Open **Products & Inventory**.
2. Add a new product or select an existing product.
3. Enter product details, including generic name, brand name, barcode, and preferred supplier if needed.
4. Set shelf location, prescription-required status, and reorder point.
5. Turn on inventory tracking if stock should be counted.
6. Review markup from price and cost, then save the product.
7. Use stock adjustment when stock quantity changes.
8. Open **Inventory Health** to review the Stock Watchlist, Restock Assistant, and Batch & Expiry Monitor.
9. Check suggested reorder quantity, stock days left, risk level, supplier history, and expiry priority before ordering or selling down batches.

## What happens next
The product appears in POS if it is available. Cashiers can search by barcode, product name, generic name, brand name, category, or preferred supplier. Stock changes can be reviewed in inventory records. Restock recommendations use the product reorder point when it is set. If received batches exist, POSard warns on near-expiry products and blocks checkout when only expired or blocked batch stock remains.

## Tips or reminders
- Keep product, generic, and brand names clear and easy for cashiers to find.
- Use reorder point for the actual shelf level where you want POSard to treat the product as low stock.
- Use prescription-required for items that need a cashier warning before selling.
- Use stock adjustment only when the stock count really changed.
- Treat reorder quantity as a recommendation. Confirm shelf count and supplier availability before placing an order.
- Use purchase order receiving for batch number and expiry date. Stock adjustments change quantity but do not create a supplier batch.

## Common questions or issues
- **The product does not appear in POS**  
  Check if it is active, available, and assigned to the right company.
- **A product has no supplier listed**  
  Link a preferred supplier on the product, or add and receive purchase orders so supplier history can appear in restock guidance.
- **A product cannot be sold because of expiry**
  Check Inventory Health for expired or blocked lots, then receive a non-expired batch or remove the unsafe stock from sale.
