"use client";

import { useEffect, useMemo, useState } from "react";
import { InvoiceStatusType } from "@prisma/client";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePOSStore, type DiscountType, type PaymentMethodType } from "../_store/pos-store";
import { payOrderAction } from "../_actions/order.action";
import type { OrderDto } from "../_services/_dto/order.dto";
import type { ReceiptDto } from "../_services/_dto/receipt.dto";
import { calculatePayment } from "../_services/payment-calculation.service";
import { printClientService } from "../_services/print-client.service";
import { receiptPrintService } from "../_services/receipt-print.service";
import { ReceiptPrintControls } from "./ReceiptPrintControls";

export const defaultDiscount = {
  type: "NONE" as const,
  eligibleDiscName: "",
  oscaIdNum: "",
};

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export const paymentMethods: {
  id: PaymentMethodType;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "GCASH", label: "GCash", icon: CreditCard },
  { id: "MAYA", label: "Maya", icon: CreditCard },
  { id: "CARD", label: "Card", icon: CreditCard },
];

export const discountOptions: { id: DiscountType; label: string }[] = [
  { id: "NONE", label: "None" },
  { id: "OTHERS", label: "Max Discount" },
  { id: "PWD", label: "PWD (20% + VAT Exempt)" },
  { id: "SENIOR", label: "Senior (20% + VAT Exempt)" },
];

export function usePOSPaymentSummary() {
  const cart = usePOSStore((state) => state.cart);
  const discount = usePOSStore((state) => state.discount);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);

  return useMemo(() => {
    const activeCart = cart.filter((item) => item.itemStatus !== "VOID");
    const paymentSummary = calculatePayment({
      items: activeCart.map((item) => ({
        productId: item.id,
        subTotal: item.customSubtotal ?? item.price * item.cartQuantity,
        vatType: item.vatType,
      })),
      discount:
        discount.type !== "NONE"
          ? {
              discountType: discount.type,
              eligibleDiscName: discount.eligibleDiscName,
              oscaIdNum: discount.oscaIdNum,
              discountPercent:
                discount.type === "OTHERS"
                  ? (activeTerminal?.discountMax ?? 0)
                  : undefined,
            }
          : undefined,
      vatRate: activeTerminal?.vat ?? 12,
      maxDiscount: activeTerminal?.discountMax ?? Number.MAX_SAFE_INTEGER,
    });

    return {
      activeCart,
      activeItemCount: activeCart.reduce(
        (sum, item) => sum + item.cartQuantity,
        0,
      ),
      subtotal: paymentSummary.grossAmount,
      discountAmount: paymentSummary.discountAmount,
      total: paymentSummary.totalAmount,
      taxDerived: paymentSummary.vatAmount,
    };
  }, [activeTerminal?.discountMax, activeTerminal?.vat, cart, discount]);
}

export function usePOSCheckoutFlow(
  totalAmount: number,
  options?: { onFastComplete?: () => void },
) {
  const {
    cart,
    discount,
    setDiscount,
    setDiscountType,
    updateDiscountDetails,
    paymentMethod,
    setPaymentMethod,
    amountTendered,
    setAmountTendered,
    activeTerminal,
    activeTimestampId,
    clearCart,
    applyStockUpdates,
  } = usePOSStore();

  const [step, setStep] = useState<"PAYMENT" | "RECEIPT">("PAYMENT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [fastCheckout, setFastCheckout] = useState(false);

  const requiresDiscountMetadata =
    discount.type === "PWD" || discount.type === "SENIOR";
  const trimmedEligibleName = discount.eligibleDiscName.trim();
  const trimmedOscaIdNum = discount.oscaIdNum.trim();
  const isDiscountMetadataValid =
    !requiresDiscountMetadata && discount.type === "NONE"
      ? true
      : !requiresDiscountMetadata ||
        !!(trimmedEligibleName && trimmedOscaIdNum);
  const change = amountTendered - totalAmount;
  const isTenderValid =
    paymentMethod !== "CASH" || amountTendered >= totalAmount;
  const canComplete = isTenderValid && isDiscountMetadataValid;

  useEffect(() => {
    if (paymentMethod !== "CASH") {
      setAmountTendered(totalAmount);
    }
  }, [paymentMethod, setAmountTendered, totalAmount]);

  const handleQuickCash = (amount: number) => {
    setAmountTendered((amountTendered || 0) + amount);
  };

  const resetCheckoutState = (shouldClearCart: boolean) => {
    setStep("PAYMENT");
    setIsProcessing(false);
    setReceipt(null);
    setAmountTendered(0);
    setDiscount(defaultDiscount);
    setPaymentMethod("CASH");

    if (shouldClearCart) {
      clearCart();
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;

    setIsProcessing(true);

    const orderDto: OrderDto = {
      timestampId: activeTimestampId ?? "",
      items: cart.map((item) => ({
        productId: item.id,
        qty: item.cartQuantity,
        price: item.price,
        subTotal:
          item.itemStatus === "VOID"
            ? 0
            : (item.customSubtotal ?? item.price * item.cartQuantity),
        status: item.itemStatus || "PENDING",
      })),
      cashTenderAmount: amountTendered,
      discount:
        discount.type !== "NONE"
          ? {
              discountType: discount.type,
              eligibleDiscName: trimmedEligibleName || undefined,
              oscaIdNum: trimmedOscaIdNum || undefined,
              discountPercent:
                discount.type === "OTHERS"
                  ? (activeTerminal?.discountMax ?? 0)
                  : undefined,
            }
          : undefined,
    };

    const res = await payOrderAction(orderDto);
    setIsProcessing(false);

    if (res.success) {
      applyStockUpdates(res.receipt.stockUpdates);

      if (fastCheckout) {
        const receiptPrintPayload = receiptPrintService.buildPayload(res.receipt);

        if (
          receiptPrintPayload.printerAvailable &&
          receiptPrintPayload.printerConfig
        ) {
          void printClientService.print(
            {
              title: "Receipt",
              intent: "receipt",
              previewContent: receiptPrintPayload.previewContent,
              printSegments: receiptPrintPayload.printSegments,
              printerConfig: receiptPrintPayload.printerConfig,
            },
            { fallbackToPreview: false },
          );
        }

        clearCart();
        setStep("PAYMENT");
        setReceipt(null);
        setAmountTendered(0);
        setDiscount(defaultDiscount);
        setPaymentMethod("CASH");
        options?.onFastComplete?.();
        toast.success("Sale complete.", {
          description: "Ready for the next transaction.",
        });
        return;
      }

      setReceipt(res.receipt);
      setStep("RECEIPT");
      return;
    }

    toast.error("Hindi natuloy ang checkout.", {
      description: res.error,
      duration: 5000,
    });
    alert("Payment Failed: " + res.error);
  };

  return {
    step,
    receipt,
    discount,
    paymentMethod,
    amountTendered,
    isProcessing,
    fastCheckout,
    requiresDiscountMetadata,
    trimmedEligibleName,
    trimmedOscaIdNum,
    isDiscountMetadataValid,
    change,
    canComplete,
    setFastCheckout,
    setDiscountType,
    updateDiscountDetails,
    setPaymentMethod,
    setAmountTendered,
    handleQuickCash,
    handleComplete,
    resetCheckoutState,
  };
}

interface POSTenderFormProps {
  totalAmount: number;
  variant?: "mobile" | "dialog";
  activePaymentMethodLabel: string;
  paymentMethod: PaymentMethodType;
  amountTendered: number;
  discountType: DiscountType;
  requiresDiscountMetadata: boolean;
  discountEligibleDiscName: string;
  discountOscaIdNum: string;
  isDiscountMetadataValid: boolean;
  change: number;
  canComplete: boolean;
  isProcessing: boolean;
  fastCheckout: boolean;
  setDiscountType: (type: DiscountType) => void;
  setFastCheckout: (enabled: boolean) => void;
  updateDiscountDetails: (
    details: Partial<{ eligibleDiscName: string; oscaIdNum: string }>,
  ) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setAmountTendered: (amount: number) => void;
  handleQuickCash: (amount: number) => void;
  handleComplete: () => void;
}

export function POSTenderForm({
  totalAmount,
  variant = "dialog",
  activePaymentMethodLabel,
  paymentMethod,
  amountTendered,
  discountType,
  requiresDiscountMetadata,
  discountEligibleDiscName,
  discountOscaIdNum,
  isDiscountMetadataValid,
  change,
  canComplete,
  isProcessing,
  fastCheckout,
  setDiscountType,
  setFastCheckout,
  updateDiscountDetails,
  setPaymentMethod,
  setAmountTendered,
  handleQuickCash,
  handleComplete,
}: POSTenderFormProps) {
  const isMobileVariant = variant === "mobile";
  const quickCashOptions = isMobileVariant ? [20, 50, 100] : [100, 500, 1000];
  const activeDiscountLabel =
    discountOptions.find((option) => option.id === discountType)?.label ??
    discountType;

  if (isMobileVariant) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          <div className="space-y-4">
            <div className="rounded-3xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Total Due
                  </p>
                  <p className="mt-2 font-heading text-4xl font-black tracking-tighter text-foreground">
                    ₱ {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border bg-background px-3 py-2 text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Method
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {activePaymentMethodLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Discount
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl px-4 text-left"
                    >
                      <span className="truncate text-sm font-semibold">
                        {activeDiscountLabel}
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl">
                    <DropdownMenuRadioGroup
                      value={discountType}
                      onValueChange={(value) =>
                        setDiscountType(value as DiscountType)
                      }
                    >
                      {discountOptions.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                          className="rounded-lg py-3"
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {requiresDiscountMetadata && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`discount-customer-name-${variant}`}
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Customer Name
                    </Label>
                    <Input
                      id={`discount-customer-name-${variant}`}
                      value={discountEligibleDiscName}
                      onChange={(e) =>
                        updateDiscountDetails({
                          eligibleDiscName: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`discount-id-number-${variant}`}
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      OSCA / PWD ID Number
                    </Label>
                    <Input
                      id={`discount-id-number-${variant}`}
                      value={discountOscaIdNum}
                      onChange={(e) =>
                        updateDiscountDetails({
                          oscaIdNum: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl"
                      placeholder="Enter ID number"
                    />
                  </div>

                  {!isDiscountMetadataValid && (
                    <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                      Add customer name and ID to enable checkout.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-card p-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((pm) => (
                    <Button
                      key={pm.id}
                      variant={paymentMethod === pm.id ? "default" : "outline"}
                      className="min-h-14 flex-col gap-2 rounded-2xl px-3 py-3"
                      onClick={() => {
                        setPaymentMethod(pm.id);
                        if (pm.id !== "CASH") {
                          setAmountTendered(totalAmount);
                        }
                      }}
                    >
                      <pm.icon className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {pm.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {paymentMethod === "CASH" ? (
              <div className="rounded-3xl border bg-card p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`tendered-${variant}`}
                      className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground"
                    >
                      Cash Received
                    </Label>
                    <div className="group relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-heading text-lg font-black text-primary/60 group-focus-within:text-primary">
                        ₱
                      </span>
                      <Input
                        id={`tendered-${variant}`}
                        type="number"
                        value={amountTendered || ""}
                        onChange={(e) =>
                          setAmountTendered(parseFloat(e.target.value) || 0)
                        }
                        className="h-16 rounded-3xl pl-12 pr-5 font-heading text-3xl font-black tracking-tighter"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {quickCashOptions.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        className="h-12 rounded-2xl text-sm font-bold"
                        onClick={() => handleQuickCash(amount)}
                      >
                        + {amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setAmountTendered(totalAmount)}
                    >
                      Exact
                    </Button>
                  </div>

                  <div
                    className={
                      change >= 0
                        ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                        : "rounded-2xl border border-destructive/10 bg-destructive/5 p-4"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Change
                        </p>
                        <p
                          className={
                            change < 0
                              ? "mt-1 text-xs font-semibold text-destructive"
                              : "mt-1 text-xs font-semibold text-emerald-600"
                          }
                        >
                          {change < 0
                            ? `Need ₱ ${formatCurrency(Math.abs(change))} more`
                            : "Ready for checkout"}
                        </p>
                      </div>
                      <p
                        className={
                          change < 0
                            ? "font-heading text-3xl font-black tracking-tighter text-destructive/60"
                            : "font-heading text-3xl font-black tracking-tighter text-emerald-600"
                        }
                      >
                        ₱ {formatCurrency(Math.max(0, change))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border bg-card p-5 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-7 w-7 text-primary/40" />
                </div>
                <p className="font-heading text-lg font-bold text-foreground">
                  {activePaymentMethodLabel}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Confirm payment after receiving the customer transaction.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background/95 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mb-3 flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Ready to Charge
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {activePaymentMethodLabel}
              </p>
            </div>
            <p className="font-heading text-2xl font-black tracking-tighter text-foreground">
              ₱ {formatCurrency(totalAmount)}
            </p>
          </div>

          {!canComplete && (
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              {requiresDiscountMetadata && !isDiscountMetadataValid
                ? "Complete the discount reference fields to continue."
                : paymentMethod === "CASH"
                  ? "Enter enough cash or tap Exact to enable checkout."
                  : "Review payment details to continue."}
            </p>
          )}

          <FastCheckoutToggle
            checked={fastCheckout}
            onCheckedChange={setFastCheckout}
          />

          <Button
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-4 font-heading text-base font-black uppercase tracking-widest"
            size="lg"
            disabled={!canComplete || isProcessing}
            onClick={handleComplete}
          >
            {isProcessing ? (
              <>
                <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Processing...
              </>
            ) : (
              <>
                Complete Sale
                <Check className="size-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      }
    >
      <div
        className="min-h-0 overflow-y-auto border-b px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r"
      >
        <div className="space-y-5">
          <div className="rounded-3xl border bg-card p-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              Final Amount Due
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-heading text-xs font-black uppercase tracking-[0.3em] text-primary/70">
                  PHP
                </div>
                <p className="font-heading text-4xl font-black tracking-tighter text-foreground sm:text-5xl">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="rounded-2xl border bg-background px-3 py-2 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Method
                </p>
                <p className="text-sm font-bold text-foreground">
                  {activePaymentMethodLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
              Discount Preference
            </Label>
            <div className="grid gap-3">
              {discountOptions.map((option) => (
                <Button
                  key={option.id}
                  variant={discountType === option.id ? "default" : "outline"}
                  className="min-h-14 justify-start rounded-2xl px-4 py-3 text-left text-xs font-bold uppercase tracking-widest"
                  onClick={() => setDiscountType(option.id)}
                >
                  <div className="relative mr-3 flex size-5 items-center justify-center">
                    {discountType === option.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <span className="whitespace-normal text-left leading-tight">
                    {option.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {requiresDiscountMetadata && (
            <div className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                  Discount Holder
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Customer name and ID are required for {discountType} checkout.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`discount-customer-name-${variant}`}
                  className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Customer Name
                </Label>
                <Input
                  id={`discount-customer-name-${variant}`}
                  value={discountEligibleDiscName}
                  onChange={(e) =>
                    updateDiscountDetails({
                      eligibleDiscName: e.target.value,
                    })
                  }
                  className="h-12 rounded-2xl"
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`discount-id-number-${variant}`}
                  className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
                >
                  OSCA / PWD ID Number
                </Label>
                <Input
                  id={`discount-id-number-${variant}`}
                  value={discountOscaIdNum}
                  onChange={(e) =>
                    updateDiscountDetails({
                      oscaIdNum: e.target.value,
                    })
                  }
                  className="h-12 rounded-2xl"
                  placeholder="Enter ID number"
                />
              </div>

              {!isDiscountMetadataValid && (
                <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  Customer name and ID number are required before checkout.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Select Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((pm) => (
                  <Button
                    key={pm.id}
                    variant={paymentMethod === pm.id ? "default" : "outline"}
                    className="min-h-16 flex-col gap-2 rounded-2xl px-3 py-3 sm:min-h-20"
                    onClick={() => {
                      setPaymentMethod(pm.id);
                      if (pm.id !== "CASH") {
                        setAmountTendered(totalAmount);
                      }
                    }}
                  >
                    <pm.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {pm.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "CASH" ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label
                    htmlFor={`tendered-${variant}`}
                    className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground"
                  >
                    Currency Tendered
                  </Label>
                  <div className="group relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-heading text-lg font-black text-primary/60 transition-colors group-focus-within:text-primary sm:left-6 sm:text-xl">
                      PHP
                    </span>
                    <Input
                      id={`tendered-${variant}`}
                      type="number"
                      value={amountTendered || ""}
                      onChange={(e) =>
                        setAmountTendered(parseFloat(e.target.value) || 0)
                      }
                      className="h-16 rounded-3xl pl-14 pr-5 font-heading text-3xl font-black tracking-tighter sm:h-20 sm:pl-16 sm:pr-6 sm:text-4xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {quickCashOptions.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="h-12 rounded-2xl text-sm font-bold"
                      onClick={() => handleQuickCash(amount)}
                    >
                      + {amount}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setAmountTendered(totalAmount)}
                  >
                    Exact
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="h-12 w-full rounded-2xl border border-destructive/10 bg-destructive/5 text-[10px] font-bold uppercase tracking-[0.24em] text-destructive"
                  onClick={() => setAmountTendered(0)}
                >
                  Clear Tendered Amount
                </Button>

                <div
                  className={
                    change >= 0
                      ? "rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5"
                      : "rounded-3xl border border-destructive/10 bg-destructive/5 p-5"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                        Return Change
                      </span>
                      <span
                        className={
                          change < 0
                            ? "text-xs font-bold uppercase tracking-wider text-destructive"
                            : "text-xs font-bold uppercase tracking-wider text-emerald-600"
                        }
                      >
                        {change < 0
                          ? "Insufficient cash received"
                          : "Calculation ready"}
                      </span>
                    </div>
                    <span
                      className={
                        change < 0
                          ? "text-right font-heading text-3xl font-black tracking-tighter text-destructive/50 sm:text-4xl"
                          : "text-right font-heading text-3xl font-black tracking-tighter text-emerald-600 sm:text-4xl"
                      }
                    >
                      PHP {formatCurrency(Math.max(0, change))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center sm:min-h-[320px] sm:p-8">
                <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted sm:mb-6 sm:size-20">
                  <FileText className="h-8 w-8 text-primary/40 sm:h-10 sm:w-10" />
                </div>
                <p className="font-heading text-lg font-bold text-foreground">
                  Waiting for Gateway
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Processing {activePaymentMethodLabel} transaction...
                </p>
                <div className="mt-6 font-heading text-2xl font-black tracking-tighter text-primary/80">
                  PHP {formatCurrency(totalAmount)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background px-4 py-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Ready to Charge
              </p>
              <p className="text-sm font-semibold text-foreground">
                {activePaymentMethodLabel}
              </p>
            </div>
            <p className="font-heading text-2xl font-black tracking-tighter text-foreground">
              PHP {formatCurrency(totalAmount)}
            </p>
          </div>

          <Button
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-4 font-heading text-base font-black uppercase tracking-widest sm:h-16 sm:text-lg"
            size="lg"
            disabled={!canComplete || isProcessing}
            onClick={handleComplete}
          >
            {isProcessing ? (
              <>
                <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Processing...
              </>
            ) : (
              <>
                Complete Sale
                <Check className="size-5 sm:size-6" />
              </>
            )}
          </Button>

          <div className="mt-3">
            <FastCheckoutToggle
              checked={fastCheckout}
              onCheckedChange={setFastCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FastCheckoutToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="mb-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-foreground">
          Fast checkout
        </span>
        <span className="block text-xs font-medium text-muted-foreground">
          Complete sale and return to products immediately.
        </span>
      </span>
    </label>
  );
}

interface POSReceiptContentProps {
  receipt: ReceiptDto;
  discountType: DiscountType;
  requiresDiscountMetadata: boolean;
  trimmedEligibleName: string;
  trimmedOscaIdNum: string;
  paymentMethod: PaymentMethodType;
  onNewCheckout: () => void;
}

export function POSReceiptContent({
  receipt,
  discountType,
  requiresDiscountMetadata,
  trimmedEligibleName,
  trimmedOscaIdNum,
  paymentMethod,
  onNewCheckout,
}: POSReceiptContentProps) {
  const formattedReceiptDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(receipt.createdAt));
  const formattedInvoiceNumber = String(receipt.invoiceNumber).padStart(
    12,
    "0",
  );
  const shouldShowTaxBreakdown = receipt.vatAmount > 0;
  const receiptPrintPayload = receiptPrintService.buildPayload(receipt);

  return (
    <>
      <div className="relative flex flex-col items-center overflow-hidden border-b bg-card px-5 py-6 text-center sm:p-8">
        {receipt.isTrainMode && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <span className="rotate-[-24deg] text-4xl font-black uppercase tracking-[0.35em] text-foreground/10">
              TRAINING MODE
            </span>
          </div>
        )}

        <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 sm:mb-6 sm:size-20">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
        </div>
        <h2 className="font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Transaction Done
        </h2>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Receipt Generated Successfully
        </p>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 py-6 font-mono text-[11px] leading-relaxed sm:max-h-[50vh] sm:p-8">
        <div className="mb-8 text-center">
          <h3 className="mb-1 font-heading text-xl font-black uppercase tracking-tighter text-foreground">
            POSard
          </h3>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            {receipt.isTrainMode ? "Training Receipt" : "Official Receipt"}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            123 Business Avenue, Metro Suite
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Registration: 000-000-000-000
          </p>

          <div className="mt-6 flex items-center justify-between border-y border-dashed py-3 text-[10px] font-bold text-muted-foreground/70">
            <span>{formattedReceiptDate}</span>
            <span>{receipt.posTerminalName}</span>
          </div>
          <div className="mt-3 space-y-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <div className="flex justify-between">
              <span>Invoice No.</span>
              <span className="text-foreground">{formattedInvoiceNumber}</span>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex justify-between border-b pb-2 text-[10px] font-black uppercase tracking-widest text-foreground">
            <span>Description</span>
            <span>Subtotal</span>
          </div>
          {receipt.items
            .filter((item) => item.status !== InvoiceStatusType.VOID)
            .map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between font-medium italic text-muted-foreground"
              >
                <span className="w-2/3">
                  {item.qty}x {item.productName}
                </span>
                <span className="font-bold text-foreground/80">
                  {formatCurrency(item.subTotal)}
                </span>
              </div>
            ))}
        </div>

        <div className="mb-8 space-y-2 rounded-xl border bg-card p-4">
          <div className="flex justify-between font-bold uppercase tracking-widest text-muted-foreground/60">
            <span>Aggregated Total</span>
            <span className="text-foreground">
              PHP {formatCurrency(receipt.totalAmount)}
            </span>
          </div>
          {discountType !== "NONE" && (
            <div className="flex justify-between font-bold uppercase tracking-widest text-primary">
              <span>Applied Adj. ({discountType})</span>
              <span>Success</span>
            </div>
          )}
          {requiresDiscountMetadata && (
            <div className="space-y-1 border-t pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <div className="flex justify-between">
                <span>Discount Name</span>
                <span className="text-foreground">{trimmedEligibleName}</span>
              </div>
              <div className="flex justify-between">
                <span>ID Number</span>
                <span className="text-foreground">{trimmedOscaIdNum}</span>
              </div>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t pt-2 font-bold uppercase tracking-widest text-muted-foreground/60">
            <span>Tendered ({paymentMethod})</span>
            <span className="text-foreground">
              {formatCurrency(receipt.cashTendered)}
            </span>
          </div>
          {paymentMethod === "CASH" && (
            <div className="flex justify-between pt-1 font-black uppercase tracking-widest text-emerald-500">
              <span>Change Due</span>
              <span>PHP {formatCurrency(Math.max(0, receipt.changeAmount))}</span>
            </div>
          )}
        </div>

        {shouldShowTaxBreakdown && (
          <div className="mb-8 space-y-2 rounded-xl border bg-card p-4">
            <div className="flex justify-between border-b pb-2 font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>Tax Breakdown</span>
              <span className="text-foreground">VAT</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>VATable Sales</span>
              <span className="text-foreground">{formatCurrency(receipt.vatSales)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>VAT-Exempt Sales</span>
              <span className="text-foreground">{formatCurrency(receipt.vatExempt)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>Zero-Rated Sales</span>
              <span className="text-foreground">{formatCurrency(receipt.vatZero)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
              <span>VAT Amount</span>
              <span>{formatCurrency(receipt.vatAmount)}</span>
            </div>
          </div>
        )}

        <div className="pb-2 text-center font-bold uppercase tracking-[0.3em] text-muted-foreground/30 italic">
          Thank you for trusting us!
        </div>
      </div>

      <div className="border-t bg-background p-4 sm:p-6">
        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={onNewCheckout}
            className="h-14 w-full rounded-2xl px-4 font-heading text-base font-black uppercase tracking-widest sm:text-lg"
          >
            <Receipt className="size-5" />
            New Checkout
          </Button>
          {receiptPrintPayload ? (
            <ReceiptPrintControls payload={receiptPrintPayload} />
          ) : null}
        </div>
      </div>
    </>
  );
}
