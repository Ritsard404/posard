"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, CreditCard, Link as LinkIcon, QrCode } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSaleTypeAction, deleteSaleTypeAction, updateSaleTypeAction } from "../_actions/sale-type.actions";
import type { SaleTypeFormInput, SaleTypeListItemDTO } from "../_services/sale-type.dto";
import { SaleTypeDialog } from "./SaleTypeDialog";

interface SaleTypeManagementClientProps {
  companyId: string;
  saleTypes: SaleTypeListItemDTO[];
}

export default function SaleTypeManagementClient({
  companyId,
  saleTypes: initialSaleTypes,
}: SaleTypeManagementClientProps) {
  const [saleTypes, setSaleTypes] = useState(initialSaleTypes);
  const [activeSaleType, setActiveSaleType] = useState<SaleTypeListItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleTypeListItemDTO | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => ({
      totalMethods: saleTypes.length,
      configuredAccounts: saleTypes.filter((item) => Boolean(item.account)).length,
      displayEnabled: saleTypes.filter((item) => item.paymentDisplayEnabled).length,
      usedMethods: saleTypes.filter((item) => item.paymentCount > 0).length,
    }),
    [saleTypes],
  );

  const openCreateDialog = () => {
    setActiveSaleType(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (saleType: SaleTypeListItemDTO) => {
    setActiveSaleType(saleType);
    setIsDialogOpen(true);
  };

  const handleDialogSubmit = (payload: SaleTypeFormInput) => {
    startTransition(() => {
      void (async () => {
        const result = activeSaleType
          ? await updateSaleTypeAction(companyId, activeSaleType.id, payload)
          : await createSaleTypeAction(companyId, payload);

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setSaleTypes((current) => {
          if (activeSaleType) {
            return current
              .map((item) => (item.id === result.data.id ? result.data : item))
              .sort((a, b) => a.name.localeCompare(b.name));
          }

          return [...current, result.data].sort((a, b) => a.name.localeCompare(b.name));
        });

        toast.success(activeSaleType ? "Sales account updated" : "Sales account created");
        setIsDialogOpen(false);
        setActiveSaleType(null);
      })();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await deleteSaleTypeAction(companyId, deleteTarget.id);

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setSaleTypes((current) => current.filter((item) => item.id !== deleteTarget.id));
        toast.success("Sales account deleted");
        setDeleteTarget(null);
      })();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">POS Payment Catalog</Badge>
                <Badge variant="secondary">Shared SaleType model</Badge>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Sales Accounts</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                POS non-cash tenders already use <code>SaleType</code> and store actual transactions in <code>EPayment</code>.
                Manage the payment-method catalog here, then cashiers can use it in checkout.
              </p>
            </div>
            <Button type="button" onClick={openCreateDialog} disabled={isPending}>
              <Plus className="size-4" />
              Add Sales Account
            </Button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-4">
          <SummaryCard label="Payment Methods" value={summary.totalMethods} helper="Reference payment options available in POS" />
          <SummaryCard label="Mapped Accounts" value={summary.configuredAccounts} helper="Methods with an accounting label filled in" />
          <SummaryCard label="QR Details On" value={summary.displayEnabled} helper="Methods that show payment instructions in checkout" />
          <SummaryCard label="Methods In Use" value={summary.usedMethods} helper="Methods already referenced by transactions" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Reference Payment Methods</h3>
            <p className="text-sm text-muted-foreground">
              Deleting a method is blocked once it has transaction history.
            </p>
          </div>
          <Link
            href={`/companies/${companyId}/settings`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to company settings
          </Link>
        </div>

        <div className="space-y-3">
          {saleTypes.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reference payment methods yet.
            </div>
          ) : (
            saleTypes.map((saleType) => (
              <div
                key={saleType.id}
                className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      <CreditCard className="mr-1 size-3" />
                      EPayment
                    </Badge>
                    {saleType.paymentCount > 0 ? (
                      <Badge variant="outline">{saleType.paymentCount} transactions</Badge>
                    ) : (
                      <Badge variant="outline">Unused</Badge>
                    )}
                    {saleType.paymentDisplayEnabled ? (
                      <Badge variant="outline">
                        <QrCode className="mr-1 size-3" />
                        QR/details shown
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-foreground">{saleType.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <LinkIcon className="size-4" />
                      {saleType.account || "No sales account label yet"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {saleType.paymentDisplayEnabled
                        ? saleType.paymentProviderName ||
                          saleType.paymentAccountNumber ||
                          "Manual payment display enabled"
                        : "No checkout payment details shown"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEditDialog(saleType)}
                    disabled={isPending}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(saleType)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <SaleTypeDialog
        open={isDialogOpen}
        saleType={activeSaleType}
        isSubmitting={isPending}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setActiveSaleType(null);
          }
        }}
        onSubmit={handleDialogSubmit}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sales account</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-semibold text-foreground">{deleteTarget?.name}</span> from the POS payment catalog. This only works for methods that have never been used in transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
