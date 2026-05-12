import { BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const guideGroups = [
  {
    title: "Getting Started",
    guides: [
      {
        title: "Log in and access POSard",
        role: "Everyone",
        summary: "Open your account and reach the pages allowed for your role.",
        steps: ["Open the login page.", "Enter your email and password.", "Select Log in."],
        reminder: "Ask a manager if your account is still waiting for approval.",
      },
      {
        title: "Select a terminal",
        role: "Cashier",
        summary: "Choose the terminal you will use before selling.",
        steps: ["Open Point of Sale.", "Choose the correct terminal.", "Confirm the selection."],
        reminder: "Check the terminal name before starting sales.",
      },
      {
        title: "Start a cashier session",
        role: "Cashier",
        summary: "Open your shift and record the starting drawer cash.",
        steps: ["Open Point of Sale.", "Select Open Session.", "Enter the starting cash.", "Confirm."],
        reminder: "Enter the real cash amount in the drawer.",
      },
    ],
  },
  {
    title: "Sales and Checkout",
    guides: [
      {
        title: "Create a sale",
        role: "Cashier",
        summary: "Add customer items to the cart and prepare checkout.",
        steps: ["Open Point of Sale.", "Tap or scan items.", "Review the cart.", "Select Checkout."],
        reminder: "Check item quantity before accepting payment.",
      },
      {
        title: "Apply a discount",
        role: "Cashier",
        summary: "Reduce the total for allowed customer or store discounts.",
        steps: ["Open checkout.", "Choose the discount type.", "Enter required details.", "Review the new total."],
        reminder: "A manager may need to approve high or special discounts.",
      },
      {
        title: "Choose payment and complete checkout",
        role: "Cashier",
        summary: "Record cash, card, or e-payment and finish the receipt.",
        steps: ["Choose the payment method.", "Enter payment details.", "Review change or balance.", "Confirm checkout."],
        reminder: "Do not leave payment references blank when your store requires them.",
      },
      {
        title: "Print or reprint a receipt",
        role: "Cashier",
        summary: "Print the receipt after a sale or print another copy.",
        steps: ["Open the receipt.", "Select print or reprint.", "Choose the printer if asked.", "Wait for the printout."],
        reminder: "Check printer connection and paper first.",
      },
    ],
  },
  {
    title: "Corrections and Cash",
    guides: [
      {
        title: "Void an item or order",
        role: "Cashier / Manager",
        summary: "Cancel a wrong item or order with a clear reason.",
        steps: ["Open the cart or transaction.", "Choose the item or order.", "Enter the reason.", "Ask for approval if needed."],
        reminder: "Use returns, not voids, when the customer is bringing back a completed sale item.",
      },
      {
        title: "Return items",
        role: "Manager",
        summary: "Record customer returns against the original sale.",
        steps: ["Open Reports or transaction history.", "Find the sale.", "Select items to return.", "Confirm the return."],
        reminder: "Check the original receipt and store policy first.",
      },
      {
        title: "Close a cashier session",
        role: "Cashier",
        summary: "End the shift and record counted cash.",
        steps: ["Open Point of Sale.", "Choose close session.", "Enter counted cash.", "Confirm closing."],
        reminder: "Explain any cash difference before closing.",
      },
    ],
  },
  {
    title: "Management",
    guides: [
      {
        title: "View sales reports",
        role: "Manager",
        summary: "Review sales, returns, voids, payments, and shift activity.",
        steps: ["Open Reports.", "Choose a report.", "Set the date or filters.", "Review, print, or export."],
        reminder: "Check the date range before printing.",
      },
      {
        title: "Manage products and inventory",
        role: "Manager",
        summary: "Add products, update prices, and record stock changes.",
        steps: ["Open Products & Inventory.", "Add or edit a product.", "Set price and stock settings.", "Save."],
        reminder: "Turn on inventory tracking only for products you count.",
      },
      {
        title: "Manage customers, loyalty, and debts",
        role: "Manager",
        summary: "Track customer records, loyalty points, and unpaid balances.",
        steps: ["Open Customers or Debts.", "Search for the customer.", "Review balance or points.", "Record updates."],
        reminder: "Choose the correct customer before recording unpaid orders.",
      },
      {
        title: "Review approvals",
        role: "Manager / Admin",
        summary: "Approve or reject sensitive requests from staff.",
        steps: ["Open Approvals.", "Read the request.", "Add a note if needed.", "Approve or Reject."],
        reminder: "Approve only when the reason is clear.",
      },
      {
        title: "Monitor sync, expenses, suppliers, promotions, and kitchen",
        role: "Manager",
        summary: "Use the Operations section to review store activity outside normal checkout.",
        steps: ["Open the needed Operations page.", "Review status and details.", "Follow up on any pending or warning items."],
        reminder: "Do not ignore items that need review.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">POSard Help Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Short, simple guides for cashiers, managers, and store owners. Use
              this page when you need to remember what to do next.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {guideGroups.map((group) => (
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
    </div>
  );
}
