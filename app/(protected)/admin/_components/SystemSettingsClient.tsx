"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Gift, Loader2, Plus, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DonationAccountDto, SystemConfigurationDto } from "../_services/system-configuration.dto";
import { updateSystemConfigurationAction } from "../_actions/system-configuration.actions";

function normalizeText(value: string | null | undefined) {
  const next = value?.trim();
  return next ? next : null;
}

function createDonationAccount(displayOrder: number): DonationAccountDto {
  return {
    id: `new-${Date.now()}-${displayOrder}`,
    label: null,
    providerName: null,
    accountHolder: null,
    accountDetail: null,
    imageUrl: null,
    notes: null,
    enabled: true,
    displayOrder,
  };
}

function normalizeDonationAccount(account: DonationAccountDto, index: number): DonationAccountDto {
  return {
    ...account,
    label: normalizeText(account.label),
    providerName: normalizeText(account.providerName),
    accountHolder: normalizeText(account.accountHolder),
    accountDetail: normalizeText(account.accountDetail),
    imageUrl: normalizeText(account.imageUrl),
    notes: normalizeText(account.notes),
    displayOrder: index,
  };
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
      donationNotes: normalizeText(config.donationNotes),
      donationAccounts: config.donationAccounts.map(normalizeDonationAccount),
    };
    const primaryAccount =
      payload.donationAccounts.find((account) => account.enabled) ??
      payload.donationAccounts[0];
    payload.donationImageUrl = primaryAccount?.imageUrl ?? null;
    payload.donationProviderName = primaryAccount?.providerName ?? primaryAccount?.label ?? null;
    payload.donationAccountHolder = primaryAccount?.accountHolder ?? null;
    payload.donationAccountDetail = primaryAccount?.accountDetail ?? null;

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

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Donation accounts</h3>
                <p className="text-sm text-muted-foreground">
                  Add separate QR codes or bank details for each account you accept.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || config.donationAccounts.length >= 12}
                onClick={() =>
                  setConfig((current) => ({
                    ...current,
                    donationAccounts: [
                      ...current.donationAccounts,
                      createDonationAccount(current.donationAccounts.length),
                    ],
                  }))
                }
                className="w-full gap-2 sm:w-auto"
              >
                <Plus className="size-4" />
                Add account
              </Button>
            </div>

            {config.donationAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No donation accounts yet. Add an account for each bank, wallet, or QR code you want to show.
              </div>
            ) : (
              <div className="space-y-4">
                {config.donationAccounts.map((account, index) => (
                  <DonationAccountEditor
                    key={account.id}
                    account={account}
                    index={index}
                    disabled={isPending}
                    onChange={(nextAccount) =>
                      setConfig((current) => ({
                        ...current,
                        donationAccounts: current.donationAccounts.map((item, itemIndex) =>
                          itemIndex === index ? nextAccount : item,
                        ),
                      }))
                    }
                    onRemove={() =>
                      setConfig((current) => ({
                        ...current,
                        donationAccounts: current.donationAccounts.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </div>

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

function DonationAccountEditor({
  account,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  account: DonationAccountDto;
  index: number;
  disabled: boolean;
  onChange: (account: DonationAccountDto) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<DonationAccountDto>) =>
    onChange({ ...account, ...patch });

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Account {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            This account can use its own QR image and public details.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium">
            <Checkbox
              checked={account.enabled}
              disabled={disabled}
              onCheckedChange={(checked) => update({ enabled: checked === true })}
            />
            Show this account
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onRemove}
            className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" id={`donation-account-label-${account.id}`}>
          <Input
            id={`donation-account-label-${account.id}`}
            value={account.label ?? ""}
            disabled={disabled}
            onChange={(event) => update({ label: event.target.value })}
            placeholder="BDO, BPI, GCash, Maya"
          />
        </Field>
        <Field label="Provider or Bank" id={`donation-account-provider-${account.id}`}>
          <Input
            id={`donation-account-provider-${account.id}`}
            value={account.providerName ?? ""}
            disabled={disabled}
            onChange={(event) => update({ providerName: event.target.value })}
            placeholder="Bank, Maya, GCash"
          />
        </Field>
        <Field label="Account Holder" id={`donation-account-holder-${account.id}`}>
          <Input
            id={`donation-account-holder-${account.id}`}
            value={account.accountHolder ?? ""}
            disabled={disabled}
            onChange={(event) => update({ accountHolder: event.target.value })}
          />
        </Field>
        <Field label="Account Details" id={`donation-account-detail-${account.id}`}>
          <Input
            id={`donation-account-detail-${account.id}`}
            value={account.accountDetail ?? ""}
            disabled={disabled}
            onChange={(event) => update({ accountDetail: event.target.value })}
          />
        </Field>
      </div>

      <ImageUploadField
        id={`donation-account-image-${account.id}`}
        label="QR or Bank Info Image"
        purpose="donation"
        value={account.imageUrl}
        disabled={disabled}
        previewClassName="aspect-square max-w-52"
        description="Optional JPG, PNG, or WEBP QR/bank info image."
        onChange={(value) => update({ imageUrl: value })}
      />

      <Field label="Public note" id={`donation-account-notes-${account.id}`}>
        <textarea
          id={`donation-account-notes-${account.id}`}
          value={account.notes ?? ""}
          disabled={disabled}
          onChange={(event) => update({ notes: event.target.value })}
          className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Optional note for this account."
        />
      </Field>
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
