"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDebtCustomerAction, recordDebtPaymentAction } from "../_actions/debt.actions";
import type {
  CreateCustomerInput,
  DebtListFiltersInput,
  DebtWorkspaceDto,
} from "../_services/debt.dto";

export function DebtsPageClient({
  initialData,
  initialFilters,
}: {
  initialData: DebtWorkspaceDto;
  initialFilters: DebtListFiltersInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status);
  const [customerName, setCustomerName] = useState("");
  const [customerAccountType, setCustomerAccountType] = useState<CreateCustomerInput["accountType"]>("RETAIL");
  const [customerCreditLimit, setCustomerCreditLimit] = useState("");
  const [customerTermsDays, setCustomerTermsDays] = useState("");
  const [paymentState, setPaymentState] = useState<Record<string, { amount: string; method: string; referenceNo: string; notes: string }>>({});
  const paymentIdempotencyKeys = useRef<Record<string, string>>({});

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }),
    [],
  );

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    startTransition(() => router.push(`/debts?${params.toString()}`));
  };

  const handleCreateCustomer = async () => {
    const payload: CreateCustomerInput = {
      name: customerName,
      phone: null,
      address: null,
      notes: null,
      accountType: customerAccountType,
      priceLevel: null,
      creditLimit: customerCreditLimit ? Number(customerCreditLimit) : null,
      paymentTermsDays: customerTermsDays ? Number(customerTermsDays) : null,
    };
    const result = await createDebtCustomerAction(payload);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Customer created.");
    setCustomerName("");
    setCustomerAccountType("RETAIL");
    setCustomerCreditLimit("");
    setCustomerTermsDays("");
    router.refresh();
  };

  const handleRecordPayment = async (debtId: string) => {
    const state = paymentState[debtId];
    const idempotencyKey = paymentIdempotencyKeys.current[debtId] ?? crypto.randomUUID();
    paymentIdempotencyKeys.current[debtId] = idempotencyKey;
    const result = await recordDebtPaymentAction({
      debtId,
      idempotencyKey,
      amount: Number(state?.amount ?? 0),
      method: state?.method || "CASH",
      referenceNo: state?.referenceNo || null,
      notes: state?.notes || null,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    delete paymentIdempotencyKeys.current[debtId];
    toast.success("Debt payment recorded.");
    router.refresh();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-black tracking-tight">Debts</h1>
        <p className="text-sm text-muted-foreground">
          Track utang balances, due dates, and later collections without distorting the normal sales flow.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Outstanding" value={currency.format(initialData.summary.totalOutstanding)} />
        <SummaryCard label="Due Today" value={currency.format(initialData.summary.dueToday)} />
        <SummaryCard label="Overdue" value={currency.format(initialData.summary.overdue)} />
        <SummaryCard label="Collected Today" value={currency.format(initialData.summary.collectedToday)} />
        <SummaryCard label="Customers" value={String(initialData.summary.activeCustomers)} />
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-4 lg:grid-cols-[1fr_auto_auto]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer or invoice" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value as DebtListFiltersInput["status"])}
        >
          <option value="ALL">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button onClick={applyFilters} disabled={isPending}>Apply</Button>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 lg:grid-cols-[1fr_180px_160px_160px_auto]">
        <Input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Quick add customer"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={customerAccountType}
          onChange={(event) => setCustomerAccountType(event.target.value as CreateCustomerInput["accountType"])}
        >
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="B2B">B2B</option>
          <option value="VIP">VIP</option>
          <option value="STAFF">Staff</option>
        </select>
        <Input
          value={customerCreditLimit}
          onChange={(event) => setCustomerCreditLimit(event.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Credit limit"
        />
        <Input
          value={customerTermsDays}
          onChange={(event) => setCustomerTermsDays(event.target.value)}
          type="number"
          min="0"
          max="365"
          placeholder="Terms days"
        />
        <Button onClick={handleCreateCustomer} disabled={!customerName.trim()}>
          Add Customer
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Balance</th>
              <th className="px-3 py-2">History</th>
              <th className="px-3 py-2">Collect</th>
            </tr>
          </thead>
          <tbody>
            {initialData.items.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="px-3 py-3">
                  <div className="font-semibold">{item.customerName}</div>
                  <div className="text-xs text-muted-foreground">{item.terminalName}</div>
                </td>
                <td className="px-3 py-3">#{String(item.invoiceNumber).padStart(6, "0")}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{item.status}</span>
                </td>
                <td className="px-3 py-3">
                  <div>{new Date(item.dueDate).toLocaleDateString()}</div>
                  <div className={item.dueStatus === "overdue" ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>
                    {item.dueStatus === "overdue"
                      ? `${item.daysOverdue} day${item.daysOverdue === 1 ? "" : "s"} overdue`
                      : item.dueStatus.replaceAll("_", " ")}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div>{currency.format(item.remainingAmount)}</div>
                  <div className="text-xs text-muted-foreground">
                    Paid {currency.format(item.paidAmount)} of {currency.format(item.originalAmount)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="max-w-[220px] space-y-1 text-xs">
                    {item.paymentHistory.map((payment) => (
                      <div key={payment.id} className="rounded-md border bg-background px-2 py-1">
                        <div className="font-semibold">
                          {currency.format(payment.amount)} / {payment.method}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString()} by {payment.receivedByName}
                        </div>
                      </div>
                    ))}
                    {item.paymentHistory.length === 0 ? (
                      <span className="text-muted-foreground">No collections yet</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {item.status === "CANCELLED" || item.status === "PAID" ? (
                    <span className="text-xs text-muted-foreground">No action</span>
                  ) : (
                    <div className="flex flex-col gap-2 sm:min-w-[240px]">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={paymentState[item.id]?.amount ?? ""}
                        onChange={(event) =>
                          setPaymentState((state) => ({
                            ...state,
                            [item.id]: {
                              amount: event.target.value,
                              method: state[item.id]?.method ?? "CASH",
                              referenceNo: state[item.id]?.referenceNo ?? "",
                              notes: state[item.id]?.notes ?? "",
                            },
                          }))
                        }
                      />
                      <div className="grid grid-cols-3 gap-1">
                        {[item.remainingAmount, Math.ceil(item.remainingAmount / 2), 100].map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() =>
                              setPaymentState((state) => ({
                                ...state,
                                [item.id]: {
                                  amount: String(Math.min(item.remainingAmount, amount)),
                                  method: state[item.id]?.method ?? "CASH",
                                  referenceNo: state[item.id]?.referenceNo ?? "",
                                  notes: state[item.id]?.notes ?? "",
                                },
                              }))
                            }
                          >
                            {amount === item.remainingAmount ? "Full" : currency.format(Math.min(item.remainingAmount, amount))}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                          value={paymentState[item.id]?.method ?? "CASH"}
                          onChange={(event) =>
                            setPaymentState((state) => ({
                              ...state,
                              [item.id]: {
                                amount: state[item.id]?.amount ?? "",
                                method: event.target.value,
                                referenceNo: state[item.id]?.referenceNo ?? "",
                                notes: state[item.id]?.notes ?? "",
                              },
                            }))
                          }
                        >
                          <option value="CASH">Cash</option>
                          <option value="GCASH">GCash</option>
                          <option value="MAYA">Maya</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                        <Button onClick={() => void handleRecordPayment(item.id)}>Record</Button>
                      </div>
                      <Input
                        placeholder="Reference number"
                        value={paymentState[item.id]?.referenceNo ?? ""}
                        onChange={(event) =>
                          setPaymentState((state) => ({
                            ...state,
                            [item.id]: {
                              amount: state[item.id]?.amount ?? "",
                              method: state[item.id]?.method ?? "CASH",
                              referenceNo: event.target.value,
                              notes: state[item.id]?.notes ?? "",
                            },
                          }))
                        }
                      />
                      <Input
                        placeholder="Collection notes"
                        value={paymentState[item.id]?.notes ?? ""}
                        onChange={(event) =>
                          setPaymentState((state) => ({
                            ...state,
                            [item.id]: {
                              amount: state[item.id]?.amount ?? "",
                              method: state[item.id]?.method ?? "CASH",
                              referenceNo: state[item.id]?.referenceNo ?? "",
                              notes: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {initialData.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No debts found for the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
