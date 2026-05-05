"use client";

import type { RefObject } from "react";
import { MapPin, ShieldCheck, ToggleLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPrinterModeLabel } from "@/app/(protected)/pos/_services/printer-mode.service";
import type { TerminalDTO } from "../../_services/terminal.dto";
import TerminalConfigurationForm from "./TerminalConfigurationForm";
import type { TerminalConfigurationPayload } from "../../_services/terminal.dto";

function formatDiscountCap(terminal: TerminalDTO) {
  if (terminal.discountMax === null) {
    return "Not set";
  }

  return terminal.discountCapType === "amount"
    ? `PHP ${terminal.discountMax.toFixed(2)}`
    : `${terminal.discountMax}%`;
}

function formatVatRegistration(terminal: TerminalDTO) {
  return terminal.vat && terminal.vat > 0 ? "VAT registered (12%)" : "Non-VAT";
}

interface TerminalDetailPanelProps {
  terminal: TerminalDTO | null;
  canUpdateConfiguration: boolean;
  focusSection?: "overview" | "terminal" | "printer";
  printerSectionRef?: RefObject<HTMLDivElement | null>;
  isSubmittingConfiguration?: boolean;
  isTogglingTrainingMode?: boolean;
  onSubmitConfiguration?: (
    terminal: TerminalDTO,
    data: TerminalConfigurationPayload,
  ) => void;
  onTrainingModeChange?: (terminal: TerminalDTO, nextValue: boolean) => void;
}

export default function TerminalDetailPanel({
  terminal,
  canUpdateConfiguration,
  focusSection = "overview",
  printerSectionRef,
  isSubmittingConfiguration = false,
  isTogglingTrainingMode = false,
  onSubmitConfiguration,
  onTrainingModeChange,
}: TerminalDetailPanelProps) {
  if (!terminal) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Terminal Details</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a terminal to view its registration, status, and configuration details.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-focus-section={focusSection}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{terminal.posName ?? "Unnamed terminal"}</h2>
            <StatusPill label={terminal.isActive ? "active" : "inactive"} tone={terminal.isActive ? "success" : "neutral"} />
            <StatusPill label={terminal.isTrainMode ? "training mode" : "live mode"} tone={terminal.isTrainMode ? "warning" : "success"} />
            {terminal.billingStatusLabel ? (
              <StatusPill
                label={terminal.billingStatusLabel}
                tone={terminal.billingStatusTone ?? "neutral"}
              />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{terminal.registeredName ?? "No registered name"}</p>
          <p className="text-sm text-muted-foreground">
            Terminal details stay visible here while managers configure the approved business settings below.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DetailSection
          title="Registration"
          icon={ShieldCheck}
          items={[
            ["MIN Number", terminal.minNumber ?? "Not set"],
            ["Accreditation Number", terminal.accreditationNumber ?? "Not set"],
            ["PTU Number", terminal.ptuNumber ?? "Not set"],
            ["Date Issued", formatDate(terminal.dateIssued)],
            ["Valid Until", formatDate(terminal.validUntil)],
            ["VAT TIN", terminal.vat && terminal.vat > 0 ? terminal.vatTinNumber ?? "Not set" : "None"],
          ]}
        />
        <DetailSection
          title="Business Snapshot"
          icon={MapPin}
          items={[
            ["Registered Name", terminal.registeredName ?? "Not set"],
            ["Operated By", terminal.operatedBy ?? "Not set"],
            ["Address", terminal.address ?? "Not set"],
            ["VAT", formatVatRegistration(terminal)],
            ["Discount Cap Type", terminal.discountCapType],
            ["Discount Cap", formatDiscountCap(terminal)],
            ["Printer", terminal.printerDisplayName ?? terminal.printerName ?? "Not set"],
            ["Printer Mode", getPrinterModeLabel(terminal.printerConfig?.mode)],
          ]}
        />
        <DetailSection
          title="Billing Status"
          icon={ShieldCheck}
          items={[
            ["Subscription State", terminal.subscriptionStatus ?? "No subscription record"],
            ["Billing Label", terminal.billingStatusLabel ?? "Not set"],
            ["Billing Guidance", terminal.billingActionLabel ?? "No action required"],
            ["Billing Reason", terminal.billingStatusReason ?? "No billing note"],
            ["Subscription Expiry", formatNullableDate(terminal.subscriptionExpiresAt)],
          ]}
        />
        <Card className="border-dashed p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ToggleLeft className="size-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold">Training Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Use this switch to control whether the selected terminal operates in training or live mode.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={terminal.isTrainMode}
                aria-label={`Toggle training mode for ${terminal.posName ?? "terminal"}`}
                disabled={!onTrainingModeChange || isTogglingTrainingMode}
                onClick={() => onTrainingModeChange?.(terminal, !terminal.isTrainMode)}
                className={cn(
                  "flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                  terminal.isTrainMode
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900",
                  (!onTrainingModeChange || isTogglingTrainingMode) && "cursor-not-allowed opacity-60",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">{terminal.isTrainMode ? "ON" : "OFF"}</p>
                  <p className="text-xs opacity-80">
                    {terminal.isTrainMode ? "Training mode enabled" : "Training mode disabled"}
                  </p>
                </div>
                <span
                  className={cn(
                    "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                    terminal.isTrainMode ? "bg-amber-500" : "bg-emerald-500",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-6 rounded-full bg-white transition-transform",
                      terminal.isTrainMode ? "translate-x-7" : "translate-x-1",
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {canUpdateConfiguration && onSubmitConfiguration ? (
        <div className="mt-6">
          <TerminalConfigurationForm
            terminal={terminal}
            isSubmitting={isSubmittingConfiguration}
            onSubmit={onSubmitConfiguration}
            focusSection={focusSection}
            printerSectionRef={printerSectionRef}
          />
        </div>
      ) : null}
    </Card>
  );
}

function DetailSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof ShieldCheck;
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
          <Icon className="size-5" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="text-sm text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
  } satisfies Record<typeof tone, string>;

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize", tones[tone])}>
      {label}
    </span>
  );
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString();
}

function formatNullableDate(value: Date | string | null | undefined) {
  return value ? formatDate(value) : "Not set";
}
