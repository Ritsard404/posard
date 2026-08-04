import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, PackageCheck, Stethoscope, Store, Utensils } from "lucide-react";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { businessFitService } from "./_services/business-fit.service";
import type { BusinessFitOptionDTO, BusinessFitQueueItemDTO } from "./_services/business-fit.dto";
import {
  createOpenTicketAction,
  createPrescriptionVerificationAction,
  createRepairJobAction,
  createSalesOrderAction,
  createServiceBookingAction,
} from "./_actions/business-fit.actions";

export const metadata: Metadata = {
  title: "Business Fit",
  description: "Business type setup guidance and workflow queues for POSard.",
  robots: { index: false, follow: false },
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function dateTime(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function OptionSelect({
  name,
  options,
  placeholder,
  required = false,
}: {
  name: string;
  options: BusinessFitOptionDTO[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <select name={name} required={required} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}{option.helper ? ` - ${option.helper}` : ""}
        </option>
      ))}
    </select>
  );
}

function QueueList({ title, items }: { title: string; items: BusinessFitQueueItemDTO[] }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No records yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.number} / {item.customer}</div>
                </div>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <span>{item.helper}</span>
                <span>{dateTime(item.schedule)}</span>
                <span>{money(item.amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CreateForms({ options }: { options: Awaited<ReturnType<typeof businessFitService.getWorkspace>>["options"] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WorkflowForm title="Service Booking" icon={<Stethoscope className="size-4" />} action={createServiceBookingAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <OptionSelect name="customerId" options={options.customers} placeholder="Walk-in or select customer" />
        <OptionSelect name="serviceProductId" options={options.serviceProducts} placeholder="Select service item" />
        <OptionSelect name="assignedStaffId" options={options.staff} placeholder="Assign staff" />
        <OptionSelect name="terminalId" options={options.terminals} placeholder="Terminal" />
        <Input name="scheduledStart" type="datetime-local" required />
        <Input name="scheduledEnd" type="datetime-local" />
        <Input name="depositAmount" type="number" min="0" step="0.01" placeholder="Deposit" />
        <Input name="notes" placeholder="Service notes" />
      </WorkflowForm>

      <WorkflowForm title="Repair Job" icon={<BriefcaseBusiness className="size-4" />} action={createRepairJobAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <OptionSelect name="customerId" options={options.customers} placeholder="Walk-in or select customer" />
        <OptionSelect name="laborProductId" options={options.serviceProducts} placeholder="Labor/service item" />
        <OptionSelect name="assignedStaffId" options={options.staff} placeholder="Assign technician" />
        <OptionSelect name="terminalId" options={options.terminals} placeholder="Terminal" />
        <Input name="itemLabel" required placeholder="Device or item" />
        <Input name="serialReference" placeholder="Serial, IMEI, or claim ref" />
        <Input name="issueSummary" required placeholder="Issue summary" />
        <Input name="estimateAmount" type="number" min="0" step="0.01" placeholder="Estimate" />
        <Input name="depositAmount" type="number" min="0" step="0.01" placeholder="Deposit" />
        <Input name="dueDate" type="date" />
      </WorkflowForm>

      <WorkflowForm title="Wholesale / B2B Order" icon={<Store className="size-4" />} action={createSalesOrderAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <OptionSelect name="customerId" options={options.customers} placeholder="Select B2B customer" />
        <OptionSelect name="terminalId" options={options.terminals} placeholder="Terminal" />
        <OptionSelect name="productId" options={options.products} placeholder="Optional first item" />
        <Input name="quantity" type="number" min="0" step="0.0001" placeholder="Quantity" />
        <Input name="unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" />
        <Input name="discountAmount" type="number" min="0" step="0.01" placeholder="Discount" />
        <Input name="paymentTermsDays" type="number" min="0" max="365" placeholder="Payment terms days" />
        <Input name="quoteValidUntil" type="date" />
        <Input name="deliveryStatus" placeholder="Delivery or dispatch status" />
        <Input name="notes" placeholder="Order notes" />
      </WorkflowForm>

      <WorkflowForm title="Restaurant Open Ticket" icon={<Utensils className="size-4" />} action={createOpenTicketAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <OptionSelect name="terminalId" options={options.terminals} placeholder="Select terminal" required />
        <OptionSelect name="customerId" options={options.customers} placeholder="Walk-in or select customer" />
        <select name="fulfillmentType" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="DINE_IN">
          <option value="WALK_IN">Walk-in</option>
          <option value="DINE_IN">Dine-in</option>
          <option value="TAKE_OUT">Takeout</option>
          <option value="DELIVERY">Delivery</option>
          <option value="PICKUP">Pickup</option>
        </select>
        <Input name="ticketName" placeholder="Ticket name" />
        <Input name="tableNumber" placeholder="Table or pickup ref" />
        <Input name="guestCount" type="number" min="1" placeholder="Guest count" />
        <Input name="kitchenStation" placeholder="Kitchen station" />
        <Input name="notes" placeholder="Hold, fire, or handoff note" />
      </WorkflowForm>

      <WorkflowForm title="Prescription Verification" icon={<PackageCheck className="size-4" />} action={createPrescriptionVerificationAction}>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <OptionSelect name="productId" options={options.products} placeholder="Select prescription product" required />
        <OptionSelect name="customerId" options={options.customers} placeholder="Walk-in or select patient" />
        <OptionSelect name="terminalId" options={options.terminals} placeholder="Terminal" />
        <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="PENDING">
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Input name="prescriptionReference" placeholder="Prescription reference" />
        <Input name="notes" placeholder="Verification notes" />
      </WorkflowForm>
    </div>
  );
}

function WorkflowForm({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        {children}
        <Button type="submit" className="sm:col-span-2">Create</Button>
      </form>
    </Card>
  );
}

export default async function BusinessFitPage() {
  const workspace = await businessFitService.getWorkspace();

  return (
    <div className="space-y-4">
      <HeaderActions>
        <Button asChild size="sm" variant="outline">
          <Link href="/feature-guide#business-fit-matrix">Feature Guide</Link>
        </Button>
        {workspace.company.id ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/companies/${workspace.company.id}/settings`}>Company setup</Link>
          </Button>
        ) : null}
      </HeaderActions>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardList className="size-4" />
              Business fit workspace
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">Setup guidance and business workflow queues</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              Use this page to align the company preset, track non-retail work, and keep advanced workflows visible before they become invoices.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Metric label="Services" value={workspace.summary.serviceBookings} />
            <Metric label="Repairs" value={workspace.summary.repairJobs} />
            <Metric label="B2B Orders" value={workspace.summary.salesOrders} />
            <Metric label="Open Tickets" value={workspace.summary.openTickets} />
          </div>
        </div>
      </Card>

      <section id="business-fit-matrix" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Business Fit Matrix</h2>
        <div className="grid gap-3 xl:grid-cols-3">
          {workspace.matrix.map((row) => (
            <Card key={row.preset} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{row.label}</h3>
                  <Badge variant={row.status === "ready_now" ? "secondary" : "outline"}>{row.status.replaceAll("_", " ")}</Badge>
                </div>
              </div>
              <MatrixList label="Present" items={row.present} />
              <MatrixList label="Setup/partial" items={row.partial} />
              <MatrixList label="Advanced follow-through" items={row.missing} />
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Create Workflow Records</h2>
        <CreateForms options={workspace.options} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <QueueList title="Service Bookings" items={workspace.serviceBookings} />
        <QueueList title="Repair Jobs" items={workspace.repairJobs} />
        <QueueList title="Wholesale / B2B Orders" items={workspace.salesOrders} />
        <QueueList title="Restaurant Open Tickets" items={workspace.openTickets} />
        <QueueList title="Prescription Checks" items={workspace.prescriptionChecks} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function MatrixList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
