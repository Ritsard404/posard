"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSubscriptionsAction, upsertSubscriptionAction } from "../../_actions/subscription.actions";
import { getTerminalsAction } from "../../_actions/terminal.actions";
import { SubscriptionFormDialog } from "./SubscriptionFormDialog";
import type { TerminalSubscriptionDTO, UpsertTerminalSubscriptionPayload } from "../../_services/subscription.dto";
import type { TerminalDTO } from "../../_services/terminal.dto";

interface SubscriptionPageClientProps {
  companyId: string;
}

export default function SubscriptionPageClient({ companyId }: SubscriptionPageClientProps) {
  const [terminals, setTerminals] = useState<TerminalDTO[]>([]);
  const [subscriptions, setSubscriptions] = useState<TerminalSubscriptionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [terminalsResult, subscriptionsResult] = await Promise.all([
      getTerminalsAction(companyId),
      getSubscriptionsAction(companyId),
    ]);

    if (terminalsResult.success) {
      setTerminals(terminalsResult.data);
    } else {
      toast.error(terminalsResult.error);
    }

    if (subscriptionsResult.success) {
      setSubscriptions(subscriptionsResult.data);
    } else {
      toast.error(subscriptionsResult.error);
    }

    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const subscriptionsByTerminalId = useMemo(() => {
    return new Map(subscriptions.map((subscription) => [subscription.terminalId, subscription]));
  }, [subscriptions]);

  const selectedTerminal = selectedTerminalId
    ? terminals.find((terminal) => terminal.id === selectedTerminalId) ?? null
    : null;

  const selectedSubscription = selectedTerminalId
    ? subscriptionsByTerminalId.get(selectedTerminalId)
    : undefined;

  const handleSubmit = async (terminalId: string, data: UpsertTerminalSubscriptionPayload) => {
    setIsSubmitting(true);
    try {
      const result = await upsertSubscriptionAction(companyId, terminalId, data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Subscription saved");
      setSelectedTerminalId(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading subscriptions...</Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Terminal-Based Subscription Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each terminal carries its own billing cycle and subscription state. Configure monthly, quarterly, or annual plans per device.
        </p>
      </Card>

      {terminals.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Add at least one terminal before assigning subscriptions.
        </Card>
      ) : (
        <div className="space-y-4">
          {terminals.map((terminal) => {
            const subscription = subscriptionsByTerminalId.get(terminal.id);

            return (
              <Card key={terminal.id} className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-lg font-semibold">{terminal.posName}</h3>
                      <p className="text-sm text-muted-foreground">{terminal.registeredName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <StatusPill
                        label={subscription?.status ?? "unassigned"}
                        tone={
                          subscription?.status === "active"
                            ? "success"
                            : subscription?.status
                              ? "warning"
                              : "neutral"
                        }
                      />
                      <StatusPill
                        label={subscription?.billingCycle ?? "no plan"}
                        tone="neutral"
                      />
                      <StatusPill label={terminal.isActive ? "terminal active" : "terminal inactive"} tone={terminal.isActive ? "success" : "neutral"} />
                      <StatusPill label={terminal.isTrainMode ? "training" : "live"} tone="neutral" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Starts: {formatDate(subscription?.startsAt)}</p>
                      <p>Expires: {formatDate(subscription?.expiresAt)}</p>
                      <p>Renewed: {formatDate(subscription?.renewedAt)}</p>
                      <p>Price: {subscription?.price != null ? `₱${subscription.price.toFixed(2)}` : "Not set"}</p>
                    </div>
                    {subscription?.notes ? (
                      <p className="text-sm text-muted-foreground">{subscription.notes}</p>
                    ) : null}
                  </div>

                  <Button onClick={() => setSelectedTerminalId(terminal.id)}>
                    {subscription ? "Edit Subscription" : "Add Subscription"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SubscriptionFormDialog
        open={selectedTerminalId !== null}
        terminal={selectedTerminal}
        subscription={selectedSubscription}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => (!open ? setSelectedTerminalId(null) : null)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
  } satisfies Record<typeof tone, string>;

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 font-medium capitalize ${classes[tone]}`}>
      {label}
    </span>
  );
}

function formatDate(value?: Date | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}
