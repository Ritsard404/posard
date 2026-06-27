export type FeatureCatalogRole = "Everyone" | "Cashier" | "Manager" | "Admin";

export type FeatureCatalogItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  benefit: string;
  howItWorks: string[];
  sampleOutcome: string;
  roles: FeatureCatalogRole[];
  appPath?: string;
  helpAnchor: string;
  keywords: string[];
};

export const featureCatalog: FeatureCatalogItem[] = [
  {
    id: "fast-pos-checkout",
    category: "Checkout",
    title: "Fast POS checkout",
    summary:
      "Run product, cafe, restaurant, and service sales from a cashier-friendly terminal.",
    benefit:
      "Shorter lines and fewer checkout mistakes because staff work from one focused cart and payment flow.",
    howItWorks: [
      "Open Point of Sale and select the terminal.",
      "Scan or tap products into the cart.",
      "Review quantity, discounts, payment, and change before confirming.",
    ],
    sampleOutcome:
      "A cashier completes a mixed cash and e-payment order, prints the receipt, and the sale appears in reports without extra encoding.",
    roles: ["Cashier", "Manager"],
    appPath: "/pos",
    helpAnchor: "sales-and-checkout-create-a-sale",
    keywords: ["pos", "checkout", "sale", "cart", "cashier", "payment"],
  },
  {
    id: "barcode-scanner",
    category: "Checkout",
    title: "Barcode scanner",
    summary: "Add items faster by scanning product barcodes at the counter.",
    benefit:
      "Reduces manual search time and helps cashiers pick the correct product variant.",
    howItWorks: [
      "Open the scanner in Point of Sale.",
      "Scan the product barcode.",
      "Confirm the matched item and quantity in the cart.",
    ],
    sampleOutcome:
      "A busy cashier scans grocery items instead of typing names, keeping the queue moving during peak hours.",
    roles: ["Cashier", "Manager"],
    appPath: "/pos",
    helpAnchor: "sales-and-checkout-use-the-barcode-scanner",
    keywords: ["barcode", "scan", "scanner", "product lookup"],
  },
  {
    id: "receipts-reprints",
    category: "Checkout",
    title: "Receipts and reprints",
    summary:
      "Generate receipts after checkout and reprint transaction copies when customers need them.",
    benefit:
      "Keeps customer proof-of-purchase requests from interrupting manager reporting work.",
    howItWorks: [
      "Complete checkout.",
      "Print the receipt from the sale confirmation.",
      "Find the transaction later and reprint when needed.",
    ],
    sampleOutcome:
      "A customer loses a receipt and staff can reprint it from POSard instead of manually recreating the sale record.",
    roles: ["Cashier", "Manager"],
    appPath: "/reports/sales",
    helpAnchor: "sales-and-checkout-print-or-reprint-a-receipt",
    keywords: ["receipt", "print", "reprint", "invoice"],
  },
  {
    id: "discount-workflows",
    category: "Checkout",
    title: "PWD, Senior, and custom discounts",
    summary:
      "Apply common Philippine discount workflows and store-specific discounts with clearer records.",
    benefit:
      "Protects margin and compliance by making discount type, details, and approvals visible.",
    howItWorks: [
      "Choose the discount type during checkout.",
      "Enter required customer or document details.",
      "Request approval when the store rules require it.",
    ],
    sampleOutcome:
      "A cashier applies a Senior Citizen discount, the manager can review it later, and the discount report stays organized.",
    roles: ["Cashier", "Manager"],
    appPath: "/pos",
    helpAnchor: "sales-and-checkout-apply-a-discount",
    keywords: ["discount", "senior", "pwd", "approval", "dswd"],
  },
  {
    id: "offline-sync",
    category: "Checkout",
    title: "Offline-ready sync center",
    summary:
      "Keep selling during unstable connectivity and review queued or failed sync activity afterward.",
    benefit:
      "Stores avoid stopping checkout just because the connection is temporarily unreliable.",
    howItWorks: [
      "Continue supported POS work when the network drops.",
      "Open Sync Center to review queued, failed, or needs-review actions.",
      "Retry, resolve, or dismiss sync items after checking the safe message.",
    ],
    sampleOutcome:
      "A sale captured during a connection problem is reviewed in Sync Center before staff repeat or adjust anything manually.",
    roles: ["Cashier", "Manager"],
    appPath: "/sync",
    helpAnchor: "management-monitor-offline-sync",
    keywords: ["offline", "sync", "retry", "queue", "connection"],
  },
  {
    id: "customer-display",
    category: "Checkout",
    title: "Customer display",
    summary:
      "Show customers their cart, payment, and completed sale on a second screen.",
    benefit:
      "Builds trust at the counter because customers can see item names, totals, and payment status as checkout happens.",
    howItWorks: [
      "Open the customer display for the selected terminal.",
      "Keep the second screen visible to the customer.",
      "Use POS normally while cart changes mirror to the display.",
    ],
    sampleOutcome:
      "A customer checks the running total before paying, reducing disputes about quantities or prices.",
    roles: ["Cashier", "Manager"],
    appPath: "/pos",
    helpAnchor: "sales-and-checkout-use-the-customer-display",
    keywords: ["customer display", "second screen", "cart display"],
  },
  {
    id: "inventory-health",
    category: "Inventory and Purchasing",
    title: "Inventory health and stock ledger",
    summary:
      "Track product stock, movement, adjustments, low-stock items, and inventory warnings.",
    benefit:
      "Managers can catch stock problems before they become missed sales or unexplained shortages.",
    howItWorks: [
      "Add products and turn on inventory tracking where needed.",
      "Review stock movement and low-stock warnings.",
      "Use adjustments, receiving, and transfer records to explain changes.",
    ],
    sampleOutcome:
      "A manager sees a low-stock warning before weekend demand and creates a purchase order in time.",
    roles: ["Manager", "Cashier"],
    appPath: "/inventory-ledger",
    helpAnchor: "management-manage-products-and-inventory",
    keywords: ["inventory", "stock", "ledger", "low stock", "adjustment"],
  },
  {
    id: "product-catalog",
    category: "Inventory and Purchasing",
    title: "Product catalog",
    summary:
      "Manage product names, pricing, costs, categories, VAT setup, barcodes, and POS favorites.",
    benefit:
      "Cleaner product records make checkout, reports, and restocking more reliable.",
    howItWorks: [
      "Open Products & Inventory.",
      "Create or edit product details.",
      "Save price, cost, barcode, VAT, category, and stock settings.",
    ],
    sampleOutcome:
      "A new drink is added with a barcode and POS favorite flag, so cashiers can sell it immediately.",
    roles: ["Manager"],
    appPath: "/product",
    helpAnchor: "management-manage-products-and-inventory",
    keywords: ["product", "catalog", "barcode", "price", "vat"],
  },
  {
    id: "pharmacy-batches",
    category: "Inventory and Purchasing",
    title: "Batch, expiry, and pharmacy metadata",
    summary:
      "Track generic names, brand names, prescription requirements, shelf location, batches, and expiry dates.",
    benefit:
      "Pharmacy-style stores can prioritize near-expiry stock and identify prescription-required products before checkout.",
    howItWorks: [
      "Add pharmacy metadata to product records.",
      "Capture batch number, expiry date, and shelf location during receiving.",
      "Review expiry warnings in Inventory Health.",
    ],
    sampleOutcome:
      "Staff identify medicine batches nearing expiry and sell or pull them before they become losses.",
    roles: ["Manager", "Cashier"],
    appPath: "/inventory-ledger",
    helpAnchor: "management-use-supplier-and-purchase-order-pages",
    keywords: ["pharmacy", "batch", "expiry", "fefo", "prescription"],
  },
  {
    id: "suppliers-purchase-orders",
    category: "Inventory and Purchasing",
    title: "Suppliers and purchase orders",
    summary:
      "Manage suppliers, purchase orders, receiving records, delivery quantities, and expected dates.",
    benefit:
      "Purchasing work becomes traceable from supplier request to received inventory.",
    howItWorks: [
      "Open Suppliers or Purchase Orders.",
      "Create the order with supplier, item, quantity, and expected date.",
      "Record delivered quantities and receiving details when stock arrives.",
    ],
    sampleOutcome:
      "A manager checks ordered versus delivered quantities before updating stock, preventing silent shortages.",
    roles: ["Manager", "Cashier"],
    appPath: "/purchase-orders",
    helpAnchor: "management-use-supplier-and-purchase-order-pages",
    keywords: ["supplier", "purchase order", "receiving", "delivery"],
  },
  {
    id: "product-import-export",
    category: "Inventory and Purchasing",
    title: "Product import and catalog export",
    summary:
      "Import products from CSV or Excel and export product catalogs for review or backup.",
    benefit:
      "Bulk setup and supplier catalog work take minutes instead of repetitive manual entry.",
    howItWorks: [
      "Prepare a CSV or Excel product file.",
      "Upload it from Products & Inventory and review the preview.",
      "Export product catalogs or backup files from Data Exchange when needed.",
    ],
    sampleOutcome:
      "A store imports hundreds of items with barcodes, reorder points, and preferred suppliers before opening day.",
    roles: ["Manager"],
    appPath: "/data-exchange",
    helpAnchor: "management-import-products-from-a-file",
    keywords: ["import", "csv", "xlsx", "excel", "export", "catalog"],
  },
  {
    id: "branch-transfers",
    category: "Operations",
    title: "Branch transfers",
    summary:
      "Track stock movement between branches or storage locations with transfer records.",
    benefit:
      "Owners can see why stock moved instead of treating every location difference as a mystery adjustment.",
    howItWorks: [
      "Open Branch Transfers.",
      "Choose source, destination, and items.",
      "Review transfer status and follow up on pending movement.",
    ],
    sampleOutcome:
      "A store moves slow stock to a busier branch and keeps a record of who requested and received it.",
    roles: ["Manager", "Cashier"],
    appPath: "/transfers",
    helpAnchor: "management-monitor-sync-expenses-suppliers-promotions-and-kitchen",
    keywords: ["transfer", "branch", "stock movement"],
  },
  {
    id: "expenses",
    category: "Operations",
    title: "Expense tracking",
    summary:
      "Record operating expenses by category, payment method, vendor, date, and branch.",
    benefit:
      "Daily cash and profit conversations include non-sales costs without mixing them into sales totals.",
    howItWorks: [
      "Open Expenses.",
      "Add amount, category, date, vendor, and payment details.",
      "Submit for approval when the business requires it.",
    ],
    sampleOutcome:
      "Fuel and repair expenses are visible beside sales reports, helping owners understand real operating cost.",
    roles: ["Manager", "Cashier"],
    appPath: "/expenses",
    helpAnchor: "management-manage-expenses",
    keywords: ["expenses", "petty cash", "vendor", "operating cost"],
  },
  {
    id: "customers-loyalty-debts",
    category: "Operations",
    title: "Customers, loyalty, and debts",
    summary:
      "Track customer profiles, loyalty activity, unpaid balances, collections, and transaction history.",
    benefit:
      "Staff can recognize repeat customers while managers keep credit and collection records organized.",
    howItWorks: [
      "Open Customers or Debts.",
      "Search for the customer.",
      "Review purchases, points, balances, and collection updates.",
    ],
    sampleOutcome:
      "A manager finds a customer's unpaid balance before allowing another charge sale.",
    roles: ["Manager", "Cashier"],
    appPath: "/customers",
    helpAnchor: "management-manage-customers-loyalty-and-debts",
    keywords: ["customers", "loyalty", "debt", "balance", "points"],
  },
  {
    id: "promotions",
    category: "Operations",
    title: "Promotions",
    summary:
      "Set up discount promotions with active periods, usage limits, redemptions, and status.",
    benefit:
      "Campaigns become measurable instead of being remembered only by cashier notes.",
    howItWorks: [
      "Open Promotions.",
      "Create the campaign rules and active dates.",
      "Monitor redemption count and campaign status.",
    ],
    sampleOutcome:
      "A manager checks whether a weekend promo actually increased sales before running it again.",
    roles: ["Manager", "Cashier"],
    appPath: "/promotions",
    helpAnchor: "management-monitor-sync-expenses-suppliers-promotions-and-kitchen",
    keywords: ["promotions", "campaign", "redemption", "discount"],
  },
  {
    id: "kitchen-workflow",
    category: "Operations",
    title: "Kitchen workflow",
    summary:
      "Move restaurant and cafe tickets through queued, preparing, ready, and served states.",
    benefit:
      "Kitchen staff and cashiers share one order status, reducing missed or duplicated preparation.",
    howItWorks: [
      "Create the order in POS.",
      "Open Kitchen and update ticket status.",
      "Mark the order served after handoff.",
    ],
    sampleOutcome:
      "A cafe team sees which orders are ready without calling back and forth during rush hour.",
    roles: ["Cashier", "Manager"],
    appPath: "/kitchen",
    helpAnchor: "management-use-kitchen-workflow",
    keywords: ["kitchen", "ticket", "restaurant", "ready", "served"],
  },
  {
    id: "dashboard-live-status",
    category: "Reports and Control",
    title: "Dashboard and live store status",
    summary:
      "Review store warnings, open drawers, sync, printers, approvals, kitchen queue, stock, and customer displays.",
    benefit:
      "Managers get an operations checkpoint before opening deeper reports or troubleshooting pages.",
    howItWorks: [
      "Open Dashboard.",
      "Review summary cards and Live Store Status.",
      "Open the related page for anything that needs attention.",
    ],
    sampleOutcome:
      "A manager sees printer and low-stock warnings before the lunch rush instead of after customers complain.",
    roles: ["Everyone"],
    appPath: "/dashboard",
    helpAnchor: "getting-started-use-the-dashboard",
    keywords: ["dashboard", "live status", "warning", "printer", "stock"],
  },
  {
    id: "reports-readings",
    category: "Reports and Control",
    title: "Sales reports, X-Reading, and Z-Reading",
    summary:
      "Review sales, returns, voids, payments, cashier shifts, X-Reading, Z-Reading, and printed reports.",
    benefit:
      "Owners and managers can close the day with traceable totals and fewer spreadsheet reconciliations.",
    howItWorks: [
      "Open Reports.",
      "Choose the report and date range.",
      "Review, print, or export the result.",
    ],
    sampleOutcome:
      "A manager prints a Z-Reading after closing and uses transaction history to investigate a variance.",
    roles: ["Manager", "Admin"],
    appPath: "/reports",
    helpAnchor: "management-view-sales-reports",
    keywords: ["reports", "x-reading", "z-reading", "sales", "transactions"],
  },
  {
    id: "ai-report-assistant",
    category: "Reports and Control",
    title: "AI Report Assistant",
    summary:
      "Ask plain-language questions about report results and review suggested actions.",
    benefit:
      "Managers can spot trends faster while still using official reports for exact totals.",
    howItWorks: [
      "Open AI Assistant under Reports.",
      "Ask a specific question about the report result.",
      "Review the summary, suggested actions, and source report.",
    ],
    sampleOutcome:
      "A manager asks why sales dipped this week and gets a focused list of report areas to inspect.",
    roles: ["Manager", "Admin"],
    appPath: "/reports/ai",
    helpAnchor: "management-use-ai-report-assistant",
    keywords: ["ai", "assistant", "reports", "insights"],
  },
  {
    id: "approvals-permissions",
    category: "Reports and Control",
    title: "Approvals, permissions, and roles",
    summary:
      "Separate admin, manager, and cashier access with approval workflows and permission visibility.",
    benefit:
      "Sensitive changes stay controlled while staff still get the tools their job requires.",
    howItWorks: [
      "Assign users to the correct role.",
      "Review permissions or approval requests.",
      "Approve only clear requests with the right business reason.",
    ],
    sampleOutcome:
      "A cashier requests a special discount and the manager approves it with a clear audit trail.",
    roles: ["Manager", "Admin"],
    appPath: "/approvals",
    helpAnchor: "management-review-approval-requests",
    keywords: ["approvals", "permissions", "roles", "manager", "admin"],
  },
  {
    id: "terminals-subscriptions",
    category: "Setup and Support",
    title: "Terminals and subscriptions",
    summary:
      "Manage terminal registrations, cashier capacity, status, subscriptions, printer settings, VAT, and restaurant options.",
    benefit:
      "A growing store can control device access and terminal behavior without mixing setup work into checkout.",
    howItWorks: [
      "Open Terminal List, Terminal Settings, or Subscription.",
      "Review terminal status, settings, and expiry.",
      "Update setup details before live selling.",
    ],
    sampleOutcome:
      "A manager spots an expired terminal subscription before opening and resolves access before the cashier shift starts.",
    roles: ["Manager", "Admin"],
    appPath: "/companies/[companyId]/terminals?view=list",
    helpAnchor: "store-setup-manage-terminals",
    keywords: ["terminal", "subscription", "printer", "vat", "cashier slots"],
  },
  {
    id: "branch-company-setup",
    category: "Setup and Support",
    title: "Company, branch, and receipt setup",
    summary:
      "Keep company details, branches, receipt information, invoice prefixes, and branch assignments accurate.",
    benefit:
      "Receipts, reports, and user assignments stay aligned with the real store structure.",
    howItWorks: [
      "Open Company or Business Info.",
      "Update business, branch, receipt, and invoice details.",
      "Assign users and terminals to the right operational branch.",
    ],
    sampleOutcome:
      "A second branch opens with its own invoice prefix and cashier assignments without changing the first branch setup.",
    roles: ["Manager", "Admin"],
    appPath: "/companies/[companyId]",
    helpAnchor: "store-setup-set-up-company-information",
    keywords: ["company", "branch", "receipt", "invoice prefix"],
  },
  {
    id: "help-center-guides",
    category: "Setup and Support",
    title: "Searchable Help Center",
    summary:
      "Use role-aware guides for checkout, inventory, reports, setup, sync, expenses, suppliers, promotions, and kitchen work.",
    benefit:
      "Staff can answer basic workflow questions without waiting for a manager every time.",
    howItWorks: [
      "Open Help Center.",
      "Search by task, feature, or problem.",
      "Jump to the guide that matches your role and page access.",
    ],
    sampleOutcome:
      "A new cashier searches receipt reprint and follows a short guide during training.",
    roles: ["Everyone"],
    appPath: "/help",
    helpAnchor: "getting-started-log-in-and-access-posard",
    keywords: ["help", "guide", "training", "search", "workflow"],
  },
  {
    id: "data-exchange-backups",
    category: "Setup and Support",
    title: "Data exchange and backups",
    summary:
      "Download store backups, export catalogs, and preview restore files before importing.",
    benefit:
      "Managers get safer data portability because duplicate risks are visible before restore work proceeds.",
    howItWorks: [
      "Open Data Exchange.",
      "Download backups or export catalogs.",
      "Upload a backup file to preview duplicates and restore risks.",
    ],
    sampleOutcome:
      "A manager previews a backup from another device and catches duplicate barcodes before data is restored.",
    roles: ["Manager"],
    appPath: "/data-exchange",
    helpAnchor: "management-export-backups-and-product-catalogs",
    keywords: ["data exchange", "backup", "restore", "catalog", "export"],
  },
];

export const featureCatalogCategories = Array.from(
  new Set(featureCatalog.map((feature) => feature.category)),
);

export function getFeatureById(id: string | undefined) {
  return featureCatalog.find((feature) => feature.id === id);
}

export function getFeaturesByCategory(category: string) {
  return featureCatalog.filter((feature) => feature.category === category);
}
