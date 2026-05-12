"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Mail, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type HelpAudience = "everyone" | "cashier" | "manager" | "admin";

interface HelpGuide {
  title: string;
  role: string;
  audience: HelpAudience[];
  summary: string;
  steps: string[];
  reminder: string;
  keywords: string[];
}

interface HelpGroup {
  title: string;
  guides: HelpGuide[];
}

type CurrentRole = "admin" | "manager" | "cashier";

function canViewGuide(role: CurrentRole, guide: HelpGuide) {
  if (guide.audience.includes("everyone")) {
    return true;
  }

  if (role === "admin") {
    return true;
  }

  if (role === "manager") {
    return guide.audience.some((audience) =>
      ["manager", "cashier"].includes(audience),
    );
  }

  return guide.audience.includes("cashier");
}

function roleLabel(role: CurrentRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

const guideGroups: HelpGroup[] = [
  {
    title: "Getting Started",
    guides: [
      {
        title: "Log in and access POSard",
        role: "Everyone",
        audience: ["everyone"],
        summary: "Open your account and reach the pages allowed for your role.",
        steps: ["Open the login page.", "Enter your email and password.", "Select Log in."],
        reminder: "Ask a manager if your account is still waiting for approval.",
        keywords: ["login", "sign in", "access", "password", "account"],
      },
      {
        title: "Select a terminal",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Choose the terminal you will use before selling.",
        steps: ["Open Point of Sale.", "Choose the correct terminal.", "Confirm the selection."],
        reminder: "Check the terminal name before starting sales.",
        keywords: ["terminal", "pos", "start selling", "cashier"],
      },
      {
        title: "Start a cashier session",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Open your shift and record the starting drawer cash.",
        steps: ["Open Point of Sale.", "Select Open Session.", "Enter the starting cash.", "Confirm."],
        reminder: "Enter the real cash amount in the drawer.",
        keywords: ["open session", "shift", "cash drawer", "starting cash"],
      },
      {
        title: "Install POSard on a device",
        role: "Everyone",
        audience: ["everyone"],
        summary: "Add POSard to a trusted phone, tablet, or computer.",
        steps: ["Open POSard in the browser.", "Select Install when it appears.", "Confirm the browser prompt.", "Open POSard from the device home screen."],
        reminder: "Install POSard only on store devices you trust.",
        keywords: ["install", "app", "device", "home screen", "tablet"],
      },
      {
        title: "Use the dashboard",
        role: "Everyone",
        audience: ["everyone"],
        summary: "Check the most important store activity before opening deeper reports.",
        steps: ["Open Dashboard.", "Review summary cards.", "Check warning cards.", "Open the related page when something needs attention."],
        reminder: "Use reports when you need exact totals for a date range.",
        keywords: ["dashboard", "summary", "warning", "overview"],
      },
    ],
  },
  {
    title: "Sales and Checkout",
    guides: [
      {
        title: "Create a sale",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Add customer items to the cart and prepare checkout.",
        steps: ["Open Point of Sale.", "Tap or scan items.", "Review the cart.", "Select Checkout."],
        reminder: "Check item quantity before accepting payment.",
        keywords: ["sale", "sell", "cart", "checkout", "item"],
      },
      {
        title: "Use the barcode scanner",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Scan product barcodes to add items faster.",
        steps: ["Open Point of Sale.", "Open the barcode scanner.", "Scan the barcode.", "Check that the correct item appears in the cart."],
        reminder: "If a barcode is not found, ask a manager to update the product record.",
        keywords: ["barcode", "scanner", "scan", "product"],
      },
      {
        title: "Use the customer display",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Show customers their cart, payment, and completed sale on a second screen.",
        steps: ["Open the customer display for the terminal.", "Keep it visible to the customer.", "Use POS normally.", "Check that cart changes appear."],
        reminder: "Use the customer display link for the correct terminal.",
        keywords: ["customer display", "second screen", "display", "customer screen"],
      },
      {
        title: "Add and update cart items",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Change quantities, remove wrong items, and review options before payment.",
        steps: ["Add products to the cart.", "Review names, prices, and quantities.", "Increase or decrease quantity.", "Remove wrong items.", "Continue to checkout."],
        reminder: "Always confirm quantity before checkout.",
        keywords: ["cart", "quantity", "remove item", "update item"],
      },
      {
        title: "Apply a discount",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Reduce the total for allowed customer or store discounts.",
        steps: ["Open checkout.", "Choose the discount type.", "Enter required details.", "Review the new total."],
        reminder: "A manager may need to approve high or special discounts.",
        keywords: ["discount", "senior", "pwd", "approval", "less"],
      },
      {
        title: "Choose payment and complete checkout",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Record cash, card, or e-payment and finish the receipt.",
        steps: ["Choose the payment method.", "Enter payment details.", "Review change or balance.", "Confirm checkout."],
        reminder: "Do not leave payment references blank when your store requires them.",
        keywords: ["payment", "cash", "card", "e-payment", "checkout"],
      },
      {
        title: "Choose a payment method",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Record whether the customer paid by cash, card, or e-payment.",
        steps: ["Open checkout.", "Choose the payment method.", "Enter the amount received.", "Enter a reference if needed.", "Review the total paid."],
        reminder: "Check the change amount before finishing.",
        keywords: ["payment method", "cash", "reference", "change"],
      },
      {
        title: "Print or reprint a receipt",
        role: "Cashier",
        audience: ["cashier"],
        summary: "Print the receipt after a sale or print another copy.",
        steps: ["Open the receipt.", "Select print or reprint.", "Choose the printer if asked.", "Wait for the printout."],
        reminder: "Check printer connection and paper first.",
        keywords: ["receipt", "print", "reprint", "printer", "paper"],
      },
    ],
  },
  {
    title: "Corrections and Cash",
    guides: [
      {
        title: "Void an item or order",
        role: "Cashier / Manager",
        audience: ["cashier", "manager"],
        summary: "Cancel a wrong item or order with a clear reason.",
        steps: ["Open the cart or transaction.", "Choose the item or order.", "Enter the reason.", "Ask for approval if needed."],
        reminder: "Use returns, not voids, when the customer is bringing back a completed sale item.",
        keywords: ["void", "cancel", "wrong item", "approval"],
      },
      {
        title: "Return items",
        role: "Manager",
        audience: ["manager"],
        summary: "Record customer returns against the original sale.",
        steps: ["Open Reports or transaction history.", "Find the sale.", "Select items to return.", "Confirm the return."],
        reminder: "Check the original receipt and store policy first.",
        keywords: ["return", "refund", "returned item", "transaction history"],
      },
      {
        title: "Close a cashier session",
        role: "Cashier",
        audience: ["cashier"],
        summary: "End the shift and record counted cash.",
        steps: ["Open Point of Sale.", "Choose close session.", "Enter counted cash.", "Confirm closing."],
        reminder: "Explain any cash difference before closing.",
        keywords: ["close session", "end shift", "cash count", "drawer"],
      },
      {
        title: "Handle cash in and cash out",
        role: "Cashier / Manager",
        audience: ["cashier", "manager"],
        summary: "Record cash added to or removed from the drawer during a session.",
        steps: ["Open Point of Sale.", "Choose the cash action.", "Enter the amount.", "Ask for approval if needed.", "Confirm the action."],
        reminder: "Record cash movement immediately so the session report stays clear.",
        keywords: ["cash in", "cash out", "withdraw", "drawer", "petty cash"],
      },
    ],
  },
  {
    title: "Store Setup",
    guides: [
      {
        title: "Set up company information",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Keep business details, contact information, and receipt information accurate.",
        steps: ["Open Company or Business Info.", "Review the current details.", "Update needed fields.", "Save changes."],
        reminder: "Check receipt output after changing official business details.",
        keywords: ["company", "business info", "receipt details", "setup"],
      },
      {
        title: "Manage terminals",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Review and update terminal details, status, VAT, discount, and restaurant settings.",
        steps: ["Open Terminal List or Terminal Settings.", "Select a terminal.", "Review details.", "Save any changes."],
        reminder: "Avoid changing terminal settings while a cashier is actively selling unless needed.",
        keywords: ["terminal", "terminal settings", "vat", "discount", "restaurant"],
      },
      {
        title: "Set VAT, discounts, and restaurant options",
        role: "Manager",
        audience: ["manager"],
        summary: "Control tax display, discount limits, and restaurant tools for each terminal.",
        steps: ["Open Terminal Settings.", "Choose a terminal.", "Review VAT and discount settings.", "Turn restaurant features on only when needed.", "Save."],
        reminder: "Kitchen workflow should stay off for normal retail terminals.",
        keywords: ["vat", "discount limit", "restaurant", "kitchen", "tax"],
      },
      {
        title: "Set up printers",
        role: "Manager / Cashier",
        audience: ["manager", "cashier"],
        summary: "Connect receipt printing to the terminal or cashier session.",
        steps: ["Open Printer Setup.", "Choose the printer mode.", "Connect or select the printer.", "Print a test or preview.", "Save."],
        reminder: "Built-in Sunmi printing works only on supported devices.",
        keywords: ["printer", "print", "receipt", "bluetooth", "sunmi"],
      },
      {
        title: "Manage sales accounts",
        role: "Manager",
        audience: ["manager"],
        summary: "Control the card and e-payment labels cashiers choose during checkout.",
        steps: ["Open Sales Accounts.", "Add or edit a payment label.", "Enter a clear name.", "Save.", "Check checkout."],
        reminder: "Use names staff recognize, such as GCash, Maya, Card, or Bank Transfer.",
        keywords: ["sales accounts", "payment label", "gcash", "maya", "card"],
      },
      {
        title: "Manage sales accounts and payment labels",
        role: "Manager",
        audience: ["manager"],
        summary: "Keep checkout payment labels clear for cashiers and reports.",
        steps: ["Open Sales Accounts.", "Add or edit a payment label.", "Enter a clear name and account label.", "Save.", "Check checkout."],
        reminder: "Avoid duplicate payment names.",
        keywords: ["payment label", "sales account", "e-payment", "reference payment"],
      },
      {
        title: "Manage subscriptions",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Check whether terminals are active, expired, suspended, or pending.",
        steps: ["Open Subscription or Subscriptions.", "Find the terminal.", "Review status and expiry.", "Update or request changes if allowed."],
        reminder: "Expired or suspended subscriptions may block POS use.",
        keywords: ["subscription", "billing", "expired", "suspended", "terminal access"],
      },
    ],
  },
  {
    title: "Management",
    guides: [
      {
        title: "View sales reports",
        role: "Manager",
        audience: ["manager"],
        summary: "Review sales, returns, voids, payments, and shift activity.",
        steps: ["Open Reports.", "Choose a report.", "Set the date or filters.", "Review, print, or export."],
        reminder: "Check the date range before printing.",
        keywords: ["reports", "sales", "z-reading", "x-reading", "export"],
      },
      {
        title: "Manage products and inventory",
        role: "Manager",
        audience: ["manager"],
        summary: "Add products, update prices, and record stock changes.",
        steps: ["Open Products & Inventory.", "Add or edit a product.", "Set price and stock settings.", "Save."],
        reminder: "Turn on inventory tracking only for products you count.",
        keywords: ["product", "inventory", "stock", "price", "category"],
      },
      {
        title: "Import products from a file",
        role: "Manager",
        audience: ["manager"],
        summary: "Add many products at once using a prepared product file.",
        steps: ["Open Products & Inventory.", "Choose import or upload.", "Select the file.", "Review the preview.", "Fix errors.", "Confirm import."],
        reminder: "Do not import a file until you review the preview.",
        keywords: ["import", "upload", "csv", "product file", "bulk"],
      },
      {
        title: "Manage staff accounts",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Review staff access, roles, and account status.",
        steps: ["Open User Management.", "Search or select a staff account.", "Review role and status.", "Save changes."],
        reminder: "Disable accounts that should no longer access the store.",
        keywords: ["staff", "accounts", "user management", "cashier", "role"],
      },
      {
        title: "Use notifications",
        role: "Everyone",
        audience: ["everyone"],
        summary: "Check important alerts and open related pages from the bell icon.",
        steps: ["Select the bell icon.", "Read the latest items.", "Open alerts that need action.", "Mark items as read when finished."],
        reminder: "Do not ignore action-required alerts.",
        keywords: ["notifications", "bell", "alerts", "read"],
      },
      {
        title: "Review the permission matrix",
        role: "Admin",
        audience: ["admin"],
        summary: "See what admins, managers, and cashiers can access.",
        steps: ["Open Permissions.", "Find the feature or action.", "Check allowed roles.", "Review sensitive permissions carefully."],
        reminder: "Give staff only the access they need for their work.",
        keywords: ["permissions", "roles", "admin", "access", "matrix"],
      },
      {
        title: "Manage customers, loyalty, and debts",
        role: "Manager",
        audience: ["manager"],
        summary: "Track customer records, loyalty points, and unpaid balances.",
        steps: ["Open Customers or Debts.", "Search for the customer.", "Review balance or points.", "Record updates."],
        reminder: "Choose the correct customer before recording unpaid orders.",
        keywords: ["customer", "loyalty", "debt", "unpaid", "balance"],
      },
      {
        title: "Manage customers and loyalty",
        role: "Manager",
        audience: ["manager"],
        summary: "Review customer profiles, contact details, and loyalty point balances.",
        steps: ["Open Customers.", "Search for the customer.", "Review details and points.", "Update details when needed."],
        reminder: "Avoid creating duplicate customer records.",
        keywords: ["customer", "loyalty", "points", "profile"],
      },
      {
        title: "Manage debts or unpaid orders",
        role: "Manager / Cashier",
        audience: ["manager", "cashier"],
        summary: "Track sales where the customer still owes money.",
        steps: ["Create the sale in POS.", "Choose the unpaid order option if available.", "Enter customer and due date details.", "Record any partial payment.", "Confirm the order."],
        reminder: "Do not treat unpaid orders as cash received.",
        keywords: ["debt", "utang", "unpaid", "partial payment", "collect"],
      },
      {
        title: "Review approvals",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Approve or reject sensitive requests from staff.",
        steps: ["Open Approvals.", "Read the request.", "Add a note if needed.", "Approve or Reject."],
        reminder: "Approve only when the reason is clear.",
        keywords: ["approval", "approve", "reject", "request"],
      },
      {
        title: "Use AI Report Assistant",
        role: "Manager / Admin",
        audience: ["manager", "admin"],
        summary: "Ask plain-language questions about report results.",
        steps: ["Open AI Assistant under Reports.", "Ask a clear question.", "Review the summary.", "Read suggested actions.", "Check the report for exact details."],
        reminder: "Use AI answers as guidance, not as the official printed report.",
        keywords: ["ai", "assistant", "report", "summary", "insights"],
      },
      {
        title: "Monitor sync, expenses, suppliers, promotions, and kitchen",
        role: "Manager",
        audience: ["manager"],
        summary: "Use the Operations section to review store activity outside normal checkout.",
        steps: ["Open the needed Operations page.", "Review status and details.", "Follow up on any pending or warning items."],
        reminder: "Do not ignore items that need review.",
        keywords: ["operations", "sync", "expenses", "suppliers", "promotions", "kitchen"],
      },
      {
        title: "Monitor offline sync",
        role: "Manager",
        audience: ["manager"],
        summary: "Review saved offline actions that failed or need attention.",
        steps: ["Open Sync Center.", "Review the action and status.", "Read the message.", "Check the terminal and time.", "Retry or review when available."],
        reminder: "Do not ignore needs-review items.",
        keywords: ["sync", "offline", "failed", "needs review", "retry"],
      },
      {
        title: "Manage expenses",
        role: "Manager",
        audience: ["manager"],
        summary: "Record store expenses such as supplies, repairs, fuel, or petty cash use.",
        steps: ["Open Expenses.", "Add or review the expense.", "Choose a category.", "Enter amount and date.", "Save or submit for approval."],
        reminder: "Expenses do not change sales totals.",
        keywords: ["expenses", "petty cash", "supplies", "repairs", "fuel"],
      },
      {
        title: "Use supplier and purchase order pages",
        role: "Manager",
        audience: ["manager"],
        summary: "Track suppliers, orders, receiving, and purchase history.",
        steps: ["Open Suppliers.", "Check supplier details.", "Open Purchase Orders.", "Review supplier, status, expected date, and total.", "Use receiving records when items arrive."],
        reminder: "Check delivered quantity against ordered quantity.",
        keywords: ["supplier", "purchase order", "po", "receiving", "delivery"],
      },
      {
        title: "Use kitchen workflow",
        role: "Restaurant staff",
        audience: ["cashier", "manager"],
        summary: "Move restaurant tickets from queued to preparing, ready, and served.",
        steps: ["Create the order in POS.", "Open Kitchen.", "Mark the ticket preparing.", "Mark it ready.", "Mark it served after handoff."],
        reminder: "Keep ticket status updated during busy service.",
        keywords: ["kitchen", "restaurant", "ticket", "preparing", "ready"],
      },
      {
        title: "Check system readiness",
        role: "Admin",
        audience: ["admin"],
        summary: "Review setup warnings before rollout or after platform changes.",
        steps: ["Open the admin area.", "Open System Readiness.", "Review warnings.", "Open related pages to fix issues.", "Check readiness again."],
        reminder: "Fix critical setup issues before allowing live selling.",
        keywords: ["admin", "readiness", "setup", "warnings", "system"],
      },
      {
        title: "Admins check system readiness",
        role: "Admin",
        audience: ["admin"],
        summary: "Confirm setup items are ready before live use.",
        steps: ["Open the admin area.", "Open System Readiness.", "Review warnings.", "Fix related setup items.", "Check readiness again."],
        reminder: "Do not ignore terminal or subscription warnings.",
        keywords: ["admin", "readiness", "system", "terminal", "subscription"],
      },
    ],
  },
];

export function HelpCenterClient({
  currentRole,
  supportEmail,
}: {
  currentRole: CurrentRole;
  supportEmail: string;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const roleGroups = useMemo(
    () =>
      guideGroups
        .map((group) => ({
          ...group,
          guides: group.guides.filter((guide) =>
            canViewGuide(currentRole, guide),
          ),
        }))
        .filter((group) => group.guides.length > 0),
    [currentRole],
  );
  const filteredGroups = useMemo(() => {
    return guideGroups
      .map((group) => ({
        ...group,
        guides: group.guides
          .filter((guide) => canViewGuide(currentRole, guide))
          .filter((guide) => {
            if (!normalizedSearch) {
              return true;
            }

            return [
              group.title,
              guide.title,
              guide.role,
              guide.summary,
              guide.reminder,
              ...guide.steps,
              ...guide.keywords,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch);
          }),
      }))
      .filter((group) => group.guides.length > 0);
  }, [currentRole, normalizedSearch]);
  const totalGuides = roleGroups.reduce(
    (count, group) => count + group.guides.length,
    0,
  );
  const visibleGuides = filteredGroups.reduce(
    (count, group) => count + group.guides.length,
    0,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">POSard Help Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Short, simple guides for cashiers, managers, and store owners. Use
              this page when you need to remember what to do next.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Showing guides for {roleLabel(currentRole)}
              </Badge>
              {currentRole === "manager" ? (
                <Badge variant="outline">Includes cashier guides</Badge>
              ) : null}
              {currentRole === "admin" ? (
                <Badge variant="outline">Includes all guides</Badge>
              ) : null}
            </div>
          </div>
          </div>
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search help: receipt, printer, debt, discount"
                className="h-10 pr-10 pl-9"
                aria-label="Search help guides"
              />
              {search ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {visibleGuides} of {totalGuides} guides.
            </p>
          </div>
        </div>
      </Card>

      {supportEmail ? (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <Mail className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold">Need more help?</h2>
              <p className="text-sm text-muted-foreground">
                Contact support if you cannot find the guide you need.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <a href={`mailto:${supportEmail}`}>Contact Support</a>
          </Button>
        </Card>
      ) : null}

      {filteredGroups.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">No guides found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a simpler word, such as sale, receipt, printer, report, or
            customer.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setSearch("")}
          >
            Show all guides
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
        {filteredGroups.map((group) => (
          <Card key={group.title} className="overflow-hidden">
            <div className="border-b bg-muted/30 px-4 py-3">
              <h2 className="font-semibold">{group.title}</h2>
            </div>
            <div className="divide-y">
              {group.guides.map((guide) => (
                <article key={guide.title} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{guide.title}</h3>
                    <Badge variant="secondary">{guide.role}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {guide.summary}
                  </p>
                  <ol className="mt-3 space-y-1 text-sm">
                    {guide.steps.map((step) => (
                      <li key={step} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    {guide.reminder}
                  </p>
                </article>
              ))}
            </div>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}
