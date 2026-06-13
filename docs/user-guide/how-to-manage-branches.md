# How to Manage Branches

## What this feature does
Branches let a company separate cashiers, terminals, sessions, invoices, and branch-level sales activity under the same business account. A new branch is created with its own default POS terminal so it can be used right away.

## When to use it
Use this when the company has more than one store location, counter area, or operating branch.

## Before you begin
- You need manager or admin access.
- Managers can manage branches only for their own company.
- Admins can manage branches for any company.
- Prepare the branch name, code, address, phone, email, manager assignment, opening date, and invoice prefix if available.

## Steps
1. Open **Company**.
2. Select **Branches**.
3. Review the branch list, cashier count, terminal count, sales total, and active status.
4. Select **Add Branch** to create a branch.
5. Enter the branch details.
6. Assign a manager if the branch already has one.
7. Review timezone, currency, tax setting, receipt footer, logo override, opening date, and invoice prefix.
8. Save the branch.
9. To update a branch, select **Edit**, change the details, and save.
10. To stop using a branch, select **Disable**.

## Assign a cashier to a branch
1. Open **User Management**.
2. Create or edit a cashier account.
3. Choose the cashier's company.
4. Select the cashier's branch.
5. Save the account.

## What happens next
POSard creates an active default POS terminal named **Terminal 1** for the branch. Cashiers assigned to the branch can use terminals assigned to that same branch. New POS sessions and invoices keep the branch on the transaction record for reporting.

Branch invoice numbers use the branch prefix when available, such as `CEB-000001` or `MNL-000001`.

## Tips or reminders
- Keep one default branch for older records and simple single-location companies.
- Disable a branch instead of deleting it so historical sales remain traceable.
- Check the terminal list after branch creation if you need to rename or configure the default POS terminal.
- The default unsubscribed company limit is 2 active cashiers total across all branches.
- If a cashier sees **No branch assigned. Please contact your manager.**, edit the cashier account and choose a branch.

## Common questions or issues
- **A cashier cannot see a terminal**  
  Check that the cashier and terminal belong to the same branch.

- **A manager cannot see another company's branches**  
  Managers are limited to their own company. Admin access is required for other companies.

- **A cashier limit warning appears**  
  The default limit counts all active cashiers in the company, not cashiers per branch.
