"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface VatRegistrationToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function VatRegistrationToggle({
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: VatRegistrationToggleProps) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border-border bg-muted/20 text-foreground",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        className="mt-0.5"
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-semibold">
          {checked ? "VAT registered" : "Non-VAT"}
        </span>
        <span className="block text-xs text-muted-foreground">
          {checked
            ? "Philippine VAT is fixed at 12% for this terminal."
            : "Invoices use acknowledgement receipt behavior with no VAT details."}
        </span>
      </span>
    </label>
  );
}
