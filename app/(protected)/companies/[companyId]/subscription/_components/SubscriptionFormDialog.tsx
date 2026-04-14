"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type UpsertTerminalSubscriptionPayload,
  type TerminalSubscriptionDTO,
} from "../../_services/subscription.dto";
import type { TerminalDTO } from "../../_services/terminal.dto";

interface SubscriptionFormDialogProps {
  open: boolean;
  terminal: TerminalDTO | null;
  subscription?: TerminalSubscriptionDTO;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (terminalId: string, data: UpsertTerminalSubscriptionPayload) => void;
}

const subscriptionFormSchema = z.object({
  billingCycle: z.enum(["monthly", "quarterly", "annually"]),
  status: z.enum(["pending", "active", "expired", "suspended", "cancelled"]),
  startsAt: z.string(),
  expiresAt: z.string(),
  renewedAt: z.string(),
  autoRenew: z.boolean(),
  price: z.string(),
  notes: z.string(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

export function SubscriptionFormDialog({
  open,
  terminal,
  subscription,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: SubscriptionFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      billingCycle: "monthly",
      status: "pending",
      startsAt: "",
      expiresAt: "",
      renewedAt: "",
      autoRenew: false,
      price: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      billingCycle: subscription?.billingCycle ?? "monthly",
      status: subscription?.status ?? "pending",
      startsAt: subscription?.startsAt ? toDateInputValue(subscription.startsAt) : "",
      expiresAt: subscription?.expiresAt ? toDateInputValue(subscription.expiresAt) : "",
      renewedAt: subscription?.renewedAt ? toDateInputValue(subscription.renewedAt) : "",
      autoRenew: subscription?.autoRenew ?? false,
      price: subscription?.price?.toString() ?? "",
      notes: subscription?.notes ?? "",
    });
  }, [open, reset, subscription]);

  const autoRenew = watch("autoRenew");

  const submit = (values: SubscriptionFormValues) => {
    if (!terminal) {
      return;
    }

    onSubmit(terminal.id, {
      billingCycle: values.billingCycle,
      status: values.status,
      startsAt: values.startsAt,
      expiresAt: values.expiresAt,
      renewedAt: values.renewedAt,
      autoRenew: values.autoRenew,
      price: values.price,
      notes: values.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Terminal Subscription</DialogTitle>
          <DialogDescription>
            {terminal
              ? `Configure billing for ${terminal.posName}.`
              : "Configure billing for this terminal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Billing Cycle" error={errors.billingCycle?.message}>
              <select
                {...register("billingCycle")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </FieldGroup>

            <FieldGroup label="Status" error={errors.status?.message}>
              <select
                {...register("status")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FieldGroup>

            <FieldGroup label="Starts At" error={errors.startsAt?.message}>
              <Input type="date" {...register("startsAt")} />
            </FieldGroup>

            <FieldGroup label="Expires At" error={errors.expiresAt?.message}>
              <Input type="date" {...register("expiresAt")} />
            </FieldGroup>

            <FieldGroup label="Renewed At" error={errors.renewedAt?.message}>
              <Input type="date" {...register("renewedAt")} />
            </FieldGroup>

            <FieldGroup label="Price" error={errors.price?.message}>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("price")} />
            </FieldGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subscription-notes">Notes</Label>
            <Input id="subscription-notes" placeholder="Renewal or billing notes" {...register("notes")} />
            {errors.notes ? <p className="text-xs text-red-500">{errors.notes.message}</p> : null}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="subscription-autorenew"
                checked={autoRenew}
                onCheckedChange={(checked) =>
                  setValue("autoRenew", checked === true, { shouldDirty: true })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="subscription-autorenew">Auto renew</Label>
                <p className="text-xs text-muted-foreground">
                  Keep the terminal eligible for automatic renewal handling.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !terminal}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Save Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function toDateInputValue(value: Date | string) {
  return new Date(value).toISOString().split("T")[0];
}
