"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Receipt,
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
import { receiptPrintService } from "../_services/receipt-print.service";
import { ReceiptPrintControls } from "./ReceiptPrintControls";
import { printReceipt } from "@/src/lib/capacitor/printer-bridge";
import { buildProvisionalReceipt } from "../_services/offline-receipt.client";
import {
  enqueueOfflineAction,
  getOfflineQueueSnapshot,
} from "../_services/offline-sync.client";
import { getStockSnapshotVersion } from "../_services/offline-db.client";

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

function getPaymentMethodLabel(name: string | null) {
  return name?.trim() || "Unlabeled payment method";
}

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
    selectedEPaymentMethodId,
    setSelectedEPaymentMethodId,
    paymentReference,
    setPaymentReference,
    epaymentMethods,
    amountTendered,
    setAmountTendered,
    activeTerminal,
    activeTimestampId,
    activeDeviceId,
    activeCompanyId,
    activeProfileId,
    activeUser,
    clearCart,
    applyStockUpdates,
    upsertOfflineReceipt,
  } = usePOSStore();
  const isOnline = usePOSStore((state) => state.isOnline);

  const [step, setStep] = useState<"PAYMENT" | "RECEIPT">("PAYMENT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [fastCheckout, setFastCheckout] = useState(false);

  const selectedEPaymentMethod =
    epaymentMethods.find((method) => method.id === selectedEPaymentMethodId) ??
    null;
  const activePaymentMethodLabel =
    paymentMethod === "cash"
      ? "Cash"
      : getPaymentMethodLabel(selectedEPaymentMethod?.name ?? null);
  const trimmedReference = paymentReference.trim();
  const requiresDiscountMetadata =
    discount.type === "PWD" || discount.type === "SENIOR";
  const trimmedEligibleName = discount.eligibleDiscName.trim();
  const trimmedOscaIdNum = discount.oscaIdNum.trim();
  const isDiscountMetadataValid =
    !requiresDiscountMetadata && discount.type === "NONE"
      ? true
      : !requiresDiscountMetadata ||
        !!(trimmedEligibleName && trimmedOscaIdNum);
  const isCashPayment = paymentMethod === "cash";
  const change = isCashPayment ? amountTendered - totalAmount : 0;
  const isReferencePaymentValid =
    isCashPayment || Boolean(selectedEPaymentMethod && trimmedReference);
  const isTenderValid = isCashPayment
    ? amountTendered >= totalAmount
    : totalAmount > 0 && isReferencePaymentValid;
  const canComplete = isTenderValid && isDiscountMetadataValid;

  const selectCashPayment = () => {
    setPaymentMethod("cash");
    setAmountTendered(0);
  };

  const selectReferencePayment = (saleTypeId: string) => {
    setPaymentMethod("reference");
    setSelectedEPaymentMethodId(saleTypeId);
    setAmountTendered(0);
  };

  const handleQuickCash = (amount: number) => {
    setAmountTendered((amountTendered || 0) + amount);
  };

  const resetCheckoutState = (shouldClearCart: boolean) => {
    setStep("PAYMENT");
    setIsProcessing(false);
    setReceipt(null);
    setAmountTendered(0);
    setDiscount(defaultDiscount);
    setPaymentMethod("cash");

    if (shouldClearCart) {
      clearCart();
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;

    if (!isCashPayment && !selectedEPaymentMethod) {
      toast.error("Select a reference payment method.");
      return;
    }

    if (!isCashPayment && !trimmedReference) {
      toast.error("Enter a reference number.");
      return;
    }

    setIsProcessing(true);

    const orderDto: OrderDto = {
      timestampId: activeTimestampId ?? "",
      deviceId: activeDeviceId ?? undefined,
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
      cashTenderAmount: isCashPayment ? amountTendered : 0,
      ePayments:
        !isCashPayment && selectedEPaymentMethod
          ? [
              {
                saleTypeId: selectedEPaymentMethod.id,
                reference: trimmedReference,
                amount: totalAmount,
              },
            ]
          : undefined,
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

    if (!isOnline) {
      if (!activeTimestampId || !activeTerminal || !activeDeviceId || !activeCompanyId || !activeProfileId) {
        setIsProcessing(false);
        toast.error("Offline checkout needs an active synced session on this device.");
        return;
      }

      try {
        const queueState = await getOfflineQueueSnapshot();
        const stockSnapshotVersion = await getStockSnapshotVersion();
        const queuedCounter =
          queueState.actions.filter((action) => action.type === "PAY_ORDER").length + 1;
        const { receipt: provisionalReceipt, localInvoiceNo, stockUpdates } =
          buildProvisionalReceipt({
            order: orderDto,
            products: cart.map((item) => item),
            cashierName: activeUser?.name ?? null,
            terminalName: activeTerminal.name,
            terminalVat: activeTerminal.vat,
            printerConfig: activeTerminal.printerConfig ?? null,
            counter: queuedCounter,
          });

        const localId = crypto.randomUUID();
        await enqueueOfflineAction({
          localId,
          type: "PAY_ORDER",
          idempotencyKey: `${activeTerminal.id}-${activeDeviceId}-${crypto.randomUUID()}`,
          timestampId: activeTimestampId,
          terminalId: activeTerminal.id,
          deviceId: activeDeviceId,
          cashierId: activeProfileId,
          companyId: activeCompanyId,
          createdAtLocal: new Date().toISOString(),
          syncStatus: "pending",
          lastError: null,
          syncedAt: null,
          payload: {
            order: {
              ...orderDto,
              localInvoiceNo,
            },
            invoiceNoLocal: localInvoiceNo,
            stockSnapshotVersion,
          },
        });

        usePOSStore.getState().setSyncCounts({
          pendingSyncCount: queueState.pendingCount + 1,
          syncingCount: queueState.syncingCount,
          needsReviewCount: queueState.needsReviewCount,
          lastSyncMessage: "Sale queued for sync.",
        });
        applyStockUpdates(stockUpdates);
        upsertOfflineReceipt({
          localId,
          receiptId: provisionalReceipt.id,
          localInvoiceNo,
          syncStatus: "pending",
        });

        if (fastCheckout) {
          clearCart();
          setStep("PAYMENT");
          setReceipt(null);
          options?.onFastComplete?.();
        } else {
          setReceipt(provisionalReceipt);
          setStep("RECEIPT");
        }

        setIsProcessing(false);
        toast.success("Offline sale queued.", {
          description: "It will sync automatically when the device reconnects.",
        });
        return;
      } catch (error) {
        setIsProcessing(false);
        toast.error("Unable to queue offline sale.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        return;
      }
    }

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
          void printReceipt(receiptPrintPayload, {
            fallbackToPreview: false,
          });
        }

        clearCart();
        setStep("PAYMENT");
        setReceipt(null);
        setAmountTendered(0);
        setDiscount(defaultDiscount);
        setPaymentMethod("cash");
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
  };

  return {
    step,
    receipt,
    discount,
    paymentMethod,
    selectedEPaymentMethodId,
    paymentReference,
    epaymentMethods,
    activePaymentMethodLabel,
    amountTendered,
    isProcessing,
    fastCheckout,
    requiresDiscountMetadata,
    trimmedEligibleName,
    trimmedOscaIdNum,
    isDiscountMetadataValid,
    isReferencePaymentValid,
    change,
    canComplete,
    setFastCheckout,
    setDiscountType,
    updateDiscountDetails,
    setPaymentReference,
    selectCashPayment,
    selectReferencePayment,
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
  selectedEPaymentMethodId: string | null;
  paymentReference: string;
  epaymentMethods: Array<{ id: string; name: string | null }>;
  amountTendered: number;
  discountType: DiscountType;
  requiresDiscountMetadata: boolean;
  discountEligibleDiscName: string;
  discountOscaIdNum: string;
  isDiscountMetadataValid: boolean;
  isReferencePaymentValid: boolean;
  change: number;
  canComplete: boolean;
  isProcessing: boolean;
  fastCheckout: boolean;
  setDiscountType: (type: DiscountType) => void;
  setFastCheckout: (enabled: boolean) => void;
  updateDiscountDetails: (
    details: Partial<{ eligibleDiscName: string; oscaIdNum: string }>,
  ) => void;
  setPaymentReference: (reference: string) => void;
  selectCashPayment: () => void;
  selectReferencePayment: (saleTypeId: string) => void;
  setAmountTendered: (amount: number) => void;
  handleQuickCash: (amount: number) => void;
  handleComplete: () => void;
}

export function POSTenderForm({
  totalAmount,
  variant = "dialog",
  activePaymentMethodLabel,
  paymentMethod,
  selectedEPaymentMethodId,
  paymentReference,
  epaymentMethods,
  amountTendered,
  discountType,
  requiresDiscountMetadata,
  discountEligibleDiscName,
  discountOscaIdNum,
  isDiscountMetadataValid,
  isReferencePaymentValid,
  change,
  canComplete,
  isProcessing,
  fastCheckout,
  setDiscountType,
  setFastCheckout,
  updateDiscountDetails,
  setPaymentReference,
  selectCashPayment,
  selectReferencePayment,
  setAmountTendered,
  handleQuickCash,
  handleComplete,
}: POSTenderFormProps) {
  const isMobileVariant = variant === "mobile";
  const quickCashOptions = isMobileVariant ? [20, 50, 100] : [100, 500, 1000];
  const activeDiscountLabel =
    discountOptions.find((option) => option.id === discountType)?.label ??
    discountType;
  const selectedReferenceLabel =
    paymentMethod === "reference" ? activePaymentMethodLabel : "Choose method";
  const summaryTenderedLabel =
    paymentMethod === "cash" ? "Cash Received" : "Tendered";
  const summaryTenderedAmount =
    paymentMethod === "cash" ? amountTendered : totalAmount;
  const summaryChangeAmount = paymentMethod === "cash" ? Math.max(0, change) : 0;
  const completionHint =
    requiresDiscountMetadata && !isDiscountMetadataValid
      ? "Complete the discount reference fields to continue."
      : paymentMethod === "cash"
        ? "Enter enough cash or tap Exact to enable checkout."
        : "Enter the payment reference number to enable checkout.";

  return (
    <div className={isMobileVariant ? "flex h-full min-h-0 flex-col bg-background" : "flex min-h-0 flex-1 flex-col bg-background"}>
      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="grid gap-3 lg:hidden">
          <div className="grid grid-cols-2 gap-3">
            <SummaryMetric label="Total Due" value={`PHP ${formatCurrency(totalAmount)}`} emphasis="strong" />
            <SummaryMetric label="Payment Method" value={activePaymentMethodLabel} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryMetric
              label={summaryTenderedLabel}
              value={`PHP ${formatCurrency(summaryTenderedAmount)}`}
            />
            <SummaryMetric
              label="Change"
              value={`PHP ${formatCurrency(summaryChangeAmount)}`}
              tone={change < 0 ? "danger" : "success"}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={isMobileVariant ? "min-h-0 overflow-y-auto px-4 py-4 pb-24" : "min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"}>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                      Payment Method
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={paymentMethod === "cash" ? "default" : "outline"}
                        className="h-12 rounded-2xl px-4 text-sm font-black uppercase tracking-[0.18em]"
                        onClick={selectCashPayment}
                      >
                        <Banknote className="size-4" />
                        Cash
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant={paymentMethod === "reference" ? "default" : "outline"}
                            className="h-12 justify-between rounded-2xl px-4 text-left"
                          >
                            <span className="truncate text-sm font-semibold">
                              {selectedReferenceLabel}
                            </span>
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                        >
                          <DropdownMenuRadioGroup
                            value={selectedEPaymentMethodId ?? ""}
                            onValueChange={(value) => selectReferencePayment(value)}
                          >
                            {epaymentMethods.map((method) => (
                              <DropdownMenuRadioItem
                                key={method.id}
                                value={method.id}
                                className="rounded-lg py-3"
                              >
                                {getPaymentMethodLabel(method.name)}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

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
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                      >
                        <DropdownMenuRadioGroup
                          value={discountType}
                          onValueChange={(value) => setDiscountType(value as DiscountType)}
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
                </div>

                {requiresDiscountMetadata && (
                  <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
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
                        onChange={(event) =>
                          updateDiscountDetails({
                            eligibleDiscName: event.target.value,
                          })
                        }
                        className="h-11 rounded-2xl"
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
                        onChange={(event) =>
                          updateDiscountDetails({
                            oscaIdNum: event.target.value,
                          })
                        }
                        className="h-11 rounded-2xl"
                        placeholder="Enter ID number"
                      />
                    </div>

                    {!isDiscountMetadataValid && (
                      <p className="sm:col-span-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                        Customer name and ID number are required before checkout.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {paymentMethod === "cash" ? (
                <div className="rounded-2xl border bg-card p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`tendered-${variant}`}
                        className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground"
                      >
                        Cash Received
                      </Label>
                      <div className="group relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-base font-black text-primary/60 transition-colors group-focus-within:text-primary">
                          PHP
                        </span>
                        <Input
                          id={`tendered-${variant}`}
                          type="number"
                          value={amountTendered || ""}
                          onChange={(event) =>
                            setAmountTendered(parseFloat(event.target.value) || 0)
                          }
                          className="h-14 rounded-3xl pl-14 pr-5 font-heading text-2xl font-black tracking-tighter sm:h-16 sm:text-3xl"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {quickCashOptions.map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-11 rounded-2xl text-sm font-bold"
                          onClick={() => handleQuickCash(amount)}
                        >
                          + {amount}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setAmountTendered(totalAmount)}
                      >
                        Exact
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div
                        className={
                          change >= 0
                            ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
                            : "rounded-2xl border border-destructive/10 bg-destructive/5 px-4 py-3"
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                              Change
                            </span>
                            <span
                              className={
                                change < 0
                                  ? "text-xs font-bold uppercase tracking-wider text-destructive"
                                  : "text-xs font-bold uppercase tracking-wider text-emerald-600"
                              }
                            >
                              {change < 0 ? "Insufficient cash received" : "Ready to give"}
                            </span>
                          </div>
                          <span
                            className={
                              change < 0
                                ? "text-right font-heading text-2xl font-black tracking-tighter text-destructive/50 sm:text-3xl"
                                : "text-right font-heading text-2xl font-black tracking-tighter text-emerald-600 sm:text-3xl"
                            }
                          >
                            PHP {formatCurrency(summaryChangeAmount)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        className="h-11 rounded-2xl border border-destructive/10 bg-destructive/5 px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-destructive"
                        onClick={() => setAmountTendered(0)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card p-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <FileText className="h-5 w-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="font-heading text-base font-bold text-foreground">
                          Reference Payment
                        </p>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          Record the customer-provided transaction reference for {activePaymentMethodLabel}.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`payment-reference-${variant}`}
                        className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Reference Number
                      </Label>
                      <Input
                        id={`payment-reference-${variant}`}
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        className="h-11 rounded-2xl"
                        placeholder="Enter reference number"
                      />
                    </div>
                    {!isReferencePaymentValid && (
                      <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                        Select a reference payment method and enter its reference number.
                      </p>
                    )}
                    <div className="rounded-2xl border bg-background px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          Amount
                        </span>
                        <span className="font-heading text-2xl font-black tracking-tighter text-foreground">
                          PHP {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="hidden min-h-0 border-l bg-card/40 lg:flex lg:flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
              <div className="grid gap-3">
                <SummaryMetric label="Total Due" value={`PHP ${formatCurrency(totalAmount)}`} emphasis="strong" />
                <SummaryMetric label="Payment Method" value={activePaymentMethodLabel} />
                <SummaryMetric
                  label={summaryTenderedLabel}
                  value={`PHP ${formatCurrency(summaryTenderedAmount)}`}
                />
                <SummaryMetric
                  label="Change"
                  value={`PHP ${formatCurrency(summaryChangeAmount)}`}
                  tone={change < 0 ? "danger" : "success"}
                />
              </div>

              <div className="mt-auto rounded-2xl border bg-background p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Ready to Complete
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activePaymentMethodLabel}
                </p>
                {!canComplete ? (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    {completionHint}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="border-t bg-background px-4 py-3 sm:px-6">
        {!canComplete && (
          <p className="mb-3 text-xs font-medium text-muted-foreground lg:hidden">
            {completionHint}
          </p>
        )}

        <FastCheckoutToggle
          checked={fastCheckout}
          onCheckedChange={setFastCheckout}
        />

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
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "default",
  emphasis = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  emphasis?: "default" | "strong";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : tone === "danger"
        ? "border-destructive/20 bg-destructive/10"
        : "border-border bg-background";
  const valueClassName =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 truncate ${emphasis === "strong" ? "font-heading text-2xl font-black tracking-tighter" : "text-sm font-semibold"} ${valueClassName}`}
      >
        {value}
      </p>
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
  onNewCheckout: () => void;
}

export function POSReceiptContent({
  receipt,
  discountType,
  requiresDiscountMetadata,
  trimmedEligibleName,
  trimmedOscaIdNum,
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
  const formattedInvoiceNumber = receipt.isProvisional
    ? (receipt.localInvoiceNo ?? "OFFLINE-PENDING")
    : String(receipt.invoiceNumber).padStart(12, "0");
  const shouldShowTaxBreakdown = receipt.vatAmount > 0;
  const receiptPrintPayload = receiptPrintService.buildPayload(receipt);
  const hasCashPayment = receipt.cashTendered > 0;
  const tenderedAmount = hasCashPayment
    ? receipt.cashTendered
    : receipt.totalTendered;
  const tenderedLabel = hasCashPayment ? "Cash Received" : "Tendered";

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
          {receipt.isProvisional ? "Queued Offline Receipt" : "Receipt Generated Successfully"}
        </p>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 py-6 font-mono text-[11px] leading-relaxed sm:max-h-[50vh] sm:p-8">
        <div className="mb-8 text-center">
          <h3 className="mb-1 font-heading text-xl font-black uppercase tracking-tighter text-foreground">
            POSard
          </h3>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            {receipt.isProvisional
              ? "Offline Pending Sync"
              : receipt.isTrainMode
                ? "Training Receipt"
                : "Official Receipt"}
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
            {receipt.isProvisional ? (
              <div className="flex justify-between">
                <span>Sync Status</span>
                <span className="text-foreground">
                  {(receipt.syncStatus ?? "pending").replace("_", " ")}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-dashed pb-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                Payment Summary
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Verify collection and change before finishing.
              </p>
            </div>
            <Receipt className="size-5 text-primary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background px-3 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Total Due
              </p>
              <p className="mt-1 font-heading text-2xl font-black tracking-tighter text-foreground">
                PHP {formatCurrency(receipt.dueAmount)}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                {tenderedLabel}
              </p>
              <p className="mt-1 font-heading text-2xl font-black tracking-tighter text-foreground">
                PHP {formatCurrency(tenderedAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Change
              </p>
              <p className="mt-1 font-heading text-2xl font-black tracking-tighter text-emerald-600">
                PHP {formatCurrency(Math.max(0, receipt.changeAmount))}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex justify-between border-b pb-2 text-[10px] font-black uppercase tracking-widest text-foreground">
            <span>Description</span>
            <span>Subtotal</span>
          </div>
          {receipt.items
            .filter((item) => item.status !== "VOID")
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
          {receipt.otherPayments.map((payment) => (
            <div key={`${payment.name}-${payment.amount}`} className="mt-2 border-t pt-2">
              <div className="flex justify-between font-bold uppercase tracking-widest text-muted-foreground/60">
                <span>{payment.name}</span>
                <span className="text-foreground">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
              {payment.reference ? (
                <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <span>Reference</span>
                  <span className="text-foreground">{payment.reference}</span>
                </div>
              ) : null}
            </div>
          ))}
          {hasCashPayment && (
            <div className="mt-2 flex justify-between border-t pt-2 font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>Cash Tendered</span>
              <span className="text-foreground">
                {formatCurrency(receipt.cashTendered)}
              </span>
            </div>
          )}
          {hasCashPayment && (
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
