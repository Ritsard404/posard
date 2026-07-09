"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Gift, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SystemConfigurationDto } from "../_services/system-configuration.dto";
import { updateSystemConfigurationAction } from "../_actions/system-configuration.actions";

function normalizeText(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

export function SystemSettingsClient({
  initialConfig,
}: {
  initialConfig: SystemConfigurationDto;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (
      initialConfig.platformBillingMode !== "PAID" &&
      config.platformBillingMode === "PAID" &&
      !window.confirm("Enable paid mode? Inactive terminal subscriptions can block store operations.")
    ) {
      return;
    }

    const payload: SystemConfigurationDto = {
      ...config,
      donationTitle: normalizeText(config.donationTitle),
      donationMessage: normalizeText(config.donationMessage),
      donationImageUrl: normalizeText(config.donationImageUrl),
      donationProviderName: normalizeText(config.donationProviderName),
      donationAccountHolder: normalizeText(config.donationAccountHolder),
      donationAccountDetail: normalizeText(config.donationAccountDetail),
      donationNotes: normalizeText(config.donationNotes),
    };

    startTransition(() => {
      void updateSystemConfigurationAction(payload).then((result) => {
        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setConfig(result.data);
        toast.success("System settings updated.");
      });
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">System Settings</h2>
          <p className="text-sm text-muted-foreground">
            Registration behavior and platform-wide controls.
          </p>
        </div>
        <Badge variant={config.platformBillingMode === "FREE" ? "default" : "secondary"}>
          {config.platformBillingMode === "FREE" ? "Free Mode" : "Paid Mode"}
        </Badge>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            User Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="direct-registration-enabled"
              checked={config.directRegistrationEnabled}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setConfig((current) => ({
                  ...current,
                  directRegistrationEnabled: checked === true,
                }))
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="direct-registration-enabled"
                className="text-sm font-semibold"
              >
                Allow direct registration without admin approval
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, public manager sign-ups create an active account immediately.
                When disabled, sign-ups stay in the existing admin approval queue.
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4" />
            Platform Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                setConfig((current) => ({
                  ...current,
                  platformBillingMode: "FREE",
                }))
              }
              className={`rounded-lg border p-4 text-left transition ${
                config.platformBillingMode === "FREE"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-border bg-background"
              }`}
            >
              <span className="block text-sm font-semibold">Free mode</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                POS checkout stays available without active terminal subscriptions.
              </span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                setConfig((current) => ({
                  ...current,
                  platformBillingMode: "PAID",
                }))
              }
              className={`rounded-lg border p-4 text-left transition ${
                config.platformBillingMode === "PAID"
                  ? "border-amber-500 bg-amber-50 text-amber-950"
                  : "border-border bg-background"
              }`}
            >
              <span className="block text-sm font-semibold">Paid mode</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Terminal subscription status can block checkout when inactive.
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-4" />
            Optional Donations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="donation-enabled"
              checked={config.donationEnabled}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setConfig((current) => ({
                  ...current,
                  donationEnabled: checked === true,
                }))
              }
            />
            <div className="space-y-1">
              <Label htmlFor="donation-enabled" className="text-sm font-semibold">
                Show optional donation details
              </Label>
              <p className="text-sm text-muted-foreground">
                Donations are optional and do not automatically unlock features.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" id="donation-title">
              <Input
                id="donation-title"
                value={config.donationTitle ?? ""}
                disabled={isPending}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    donationTitle: event.target.value,
                  }))
                }
                placeholder="Support POSard"
              />
            </Field>
            <Field label="Provider or Bank" id="donation-provider">
              <Input
                id="donation-provider"
                value={config.donationProviderName ?? ""}
                disabled={isPending}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    donationProviderName: event.target.value,
                  }))
                }
                placeholder="Bank, Maya, GCash"
              />
            </Field>
            <Field label="Account Holder" id="donation-holder">
              <Input
                id="donation-holder"
                value={config.donationAccountHolder ?? ""}
                disabled={isPending}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    donationAccountHolder: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Account Details" id="donation-detail">
              <Input
                id="donation-detail"
                value={config.donationAccountDetail ?? ""}
                disabled={isPending}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    donationAccountDetail: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="Message" id="donation-message">
            <textarea
              id="donation-message"
              value={config.donationMessage ?? ""}
              disabled={isPending}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  donationMessage: event.target.value,
                }))
              }
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="POSard is free right now. Donations help support ongoing improvements."
            />
          </Field>

          <ImageUploadField
            id="donation-image"
            label="Donation QR or Bank Info Image"
            purpose="donation"
            value={config.donationImageUrl}
            disabled={isPending}
            previewClassName="aspect-square max-w-52"
            description="Optional JPG, PNG, or WEBP QR/bank info image."
            onChange={(value) =>
              setConfig((current) => ({
                ...current,
                donationImageUrl: value,
              }))
            }
          />

          <Field label="Private Notes" id="donation-notes">
            <textarea
              id="donation-notes"
              value={config.donationNotes ?? ""}
              disabled={isPending}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  donationNotes: event.target.value,
                }))
              }
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
        </CardContent>
      </Card>

      <Button
        type="button"
        onClick={save}
        disabled={isPending}
        aria-busy={isPending}
        className="gap-2"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {isPending ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
