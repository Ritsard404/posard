# How to Import Products from a File

## What this feature does
This lets managers add many products at once from a prepared CSV or Excel file.

## When to use it
Use this when setting up a store or adding a large product list.

## Before you begin
- Prepare the product file carefully. CSV, legacy POSARD `.xls` XML templates, and `.xlsx` workbooks are supported.
- Check product names, categories, prices, stock values, generic/brand names, shelf locations, reorder points, prescription flags, and preferred supplier names.

## Steps
1. Open **Products & Inventory**.
2. Choose the import or upload option.
3. Select the product file.
4. Review the preview, including brand/generic details, reorder point, prescription status, POS favorite status, and supplier links.
5. Fix any rows with errors.
6. Confirm the import.

## What happens next
Valid products are added to the product list with their pharmacy metadata, POS favorite setting, and inventory alert settings.

## Tips or reminders
- Do not import a file until you review the preview.
- Keep a backup copy of your product file.
- Preferred supplier must match an existing active supplier name, or leave it blank.
- Reorder Point must be zero or greater when provided.
- Duplicate Product Name within the same Category and duplicate Brand Name plus Generic Name within the same Category are blocked.

## Common questions or issues
- **Some rows have errors**  
  Fix the shown rows in the file, then upload again.
- **A supplier row fails**
  Create or activate that supplier first, or clear the Preferred Supplier cell and import again.
