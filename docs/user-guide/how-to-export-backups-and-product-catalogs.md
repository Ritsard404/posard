# How to Export Backups and Product Catalogs

## What this feature does
This lets managers download a store backup or product catalog for review, filing, or handoff.

## When to use it
Use this when you need a copy of store records, a product catalog, or a file for authorized business review.

## Before you begin
- You need manager or admin access.
- Use a trusted device and connection.
- Confirm the business or branch context before downloading.

## Steps
1. Open **Data Exchange**.
2. Choose **Download backup** for a streamed JSON backup.
3. Choose **Product Excel** for a POSARD `.xls` Excel XML catalog, or **Product PDF** for a PDF catalog.
4. Wait for the status message to move from preparing to downloading.
5. Review **Recent Export History** when you need to confirm who exported what.
6. Store the file in an approved location.
7. Log out if you used a shared device.

## What happens next
POSard checks your access, limits repeated export attempts, streams large backups, records the export in the audit trail, and sends the file with no-store download headers.

## Tips or reminders
- Cashier accounts cannot export backups or product catalogs.
- Full backups that include sensitive user records require admin access. Manager backups use the operational export scope.
- Do not leave backup files in Downloads on shared devices.
- If POSard says there are too many export attempts, wait before trying again or ask an admin to review the activity.

## Common questions or issues
- **The export is blocked**  
  Check that you are signed in as a manager or admin.
- **The file did not download**  
  Refresh your session and try once. If it still fails, report the time, user, and export type to an admin.
