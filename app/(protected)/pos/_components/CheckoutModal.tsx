import { useEffect, useMemo, useState } from "react";
import {
  usePOSStore,
  type DiscountType,
  type PaymentMethodType,
} from "../_store/pos-store";
import { payOrderAction } from "../_actions/order.action";
import { OrderDto } from "../_services/_dto/order.dto";
import type { ReceiptDto } from "../_services/_dto/receipt.dto";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { InvoiceStatusType } from "@prisma/client";
import { toast } from "sonner";
import { receiptPrintService } from "../_services/receipt-print.service";
import { ReceiptPrintControls } from "./ReceiptPrintControls";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
}

const defaultDiscount = {
  type: "NONE" as const,
  eligibleDiscName: "",
  oscaIdNum: "",
};

const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function CheckoutModal({
  open,
  onOpenChange,
  totalAmount,
}: CheckoutModalProps) {
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
    clearCart,
    applyStockUpdates,
  } = usePOSStore();
  const [step, setStep] = useState<"PAYMENT" | "RECEIPT">("PAYMENT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);

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
    if (open && paymentMethod !== "CASH") {
      setAmountTendered(totalAmount);
    }
  }, [open, paymentMethod, totalAmount, setAmountTendered]);

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

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetCheckoutState(step === "RECEIPT");
    }

    onOpenChange(nextOpen);
  };

  const handleComplete = async () => {
    if (!canComplete) return;

    setIsProcessing(true);

    const orderDto: OrderDto = {
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
            }
          : undefined,
    };

    const res = await payOrderAction(orderDto);
    setIsProcessing(false);

    if (res.success) {
      applyStockUpdates(res.receipt.stockUpdates);
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

  const paymentMethods: {
    id: PaymentMethodType;
    label: string;
    icon: LucideIcon;
  }[] = [
    { id: "CASH", label: "Cash", icon: Banknote },
    { id: "GCASH", label: "GCash", icon: CreditCard },
    { id: "MAYA", label: "Maya", icon: CreditCard },
    { id: "CARD", label: "Card", icon: CreditCard },
  ];

  const discounts: { id: DiscountType; label: string }[] = [
    { id: "NONE", label: "None" },
    { id: "PWD", label: "PWD (20% + VAT Exempt)" },
    { id: "SENIOR", label: "Senior (20% + VAT Exempt)" },
  ];
  const activePaymentMethodLabel =
    paymentMethods.find((method) => method.id === paymentMethod)?.label ??
    paymentMethod;

  const formattedReceiptDate = receipt
    ? new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(receipt.createdAt))
    : "";
  const formattedInvoiceNumber = receipt
    ? String(receipt.invoiceNumber).padStart(12, "0")
    : "";
  const shouldShowTaxBreakdown = (receipt?.vatAmount ?? 0) > 0;
  const receiptPrintPayload = useMemo(
    () => (receipt ? receiptPrintService.buildPayload(receipt) : null),
    [receipt],
  );

  if (step === "RECEIPT" && receipt) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="glass-card flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden border-white/5 p-0 shadow-2xl backdrop-blur-3xl animate-in zoom-in-95 duration-500 sm:h-auto sm:max-w-[425px]">
          <div className="relative flex flex-col items-center overflow-hidden border-b border-white/5 bg-accent/10 px-5 py-6 text-center sm:p-8">
            <div className="pointer-events-none absolute -left-10 top-0 size-32 rounded-full bg-accent/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 size-32 rounded-full bg-emerald-500/10 blur-2xl" />
            {receipt.isTrainMode && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <span className="rotate-[-24deg] text-4xl font-black uppercase tracking-[0.35em] text-foreground/10">
                  TRAINING MODE
                </span>
              </div>
            )}

            <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] sm:mb-6 sm:size-20">
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
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
                {receipt.isTrainMode ? "Training Receipt" : "Official Receipt"}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                123 Business Avenue, Metro Suite
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Registration: 000-000-000-000
              </p>

              <div className="mt-6 flex items-center justify-between border-y border-dashed border-white/10 py-3 text-[10px] font-bold text-muted-foreground/40">
                <span>{formattedReceiptDate}</span>
                <span>{receipt.posTerminalName}</span>
              </div>
              <div className="mt-3 space-y-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <div className="flex justify-between">
                  <span>Invoice No.</span>
                  <span className="text-foreground">{formattedInvoiceNumber}</span>
                </div>
                {/* <div className="flex justify-between gap-3">
                  <span>Invoice ID</span>
                  <span className="truncate text-foreground">{receipt.id}</span>
                </div> */}
              </div>
            </div>

            <div className="mb-8 space-y-3">
              <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground">
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

            <div className="mb-8 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex justify-between font-bold uppercase tracking-widest text-muted-foreground/60">
                <span>Aggregated Total</span>
                <span className="text-foreground">
                  PHP {formatCurrency(receipt.totalAmount)}
                </span>
              </div>
              {discount.type !== "NONE" && (
                <div className="flex justify-between font-bold uppercase tracking-widest text-accent">
                  <span>Applied Adj. ({discount.type})</span>
                  <span>Success</span>
                </div>
              )}
              {requiresDiscountMetadata && (
                <div className="space-y-1 border-t border-white/5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <div className="flex justify-between">
                    <span>Discount Name</span>
                    <span className="text-foreground">
                      {trimmedEligibleName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID Number</span>
                    <span className="text-foreground">{trimmedOscaIdNum}</span>
                  </div>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-white/5 pt-2 font-bold uppercase tracking-widest text-muted-foreground/60">
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
              <div className="mb-8 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex justify-between border-b border-white/5 pb-2 font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span>Tax Breakdown</span>
                  <span className="text-foreground">VAT</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span>VATable Sales</span>
                  <span className="text-foreground">{formatCurrency(receipt.vatSales)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span>VAT-Exempt Sales</span>
                  <span className="text-foreground">
                    {formatCurrency(receipt.vatExempt)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span>Zero-Rated Sales</span>
                  <span className="text-foreground">{formatCurrency(receipt.vatZero)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-accent">
                  <span>VAT Amount</span>
                  <span>{formatCurrency(receipt.vatAmount)}</span>
                </div>
              </div>
            )}

            <div className="pb-2 text-center font-bold uppercase tracking-[0.3em] text-muted-foreground/30 italic">
              Thank you for trusting us!
            </div>
          </div>

          <DialogFooter className="border-t border-white/5 bg-white/[0.02] p-4 sm:p-6">
            <div className="flex w-full flex-col gap-3">
              {receiptPrintPayload ? (
                <ReceiptPrintControls payload={receiptPrintPayload} />
              ) : null}
              <Button
                onClick={() => handleDialogOpenChange(false)}
                className="h-14 w-full rounded-2xl bg-accent px-4 font-heading text-base font-black uppercase tracking-widest text-white shadow-xl shadow-accent/20 transition-all hover:bg-accent/90 active:scale-95 sm:text-lg"
              >
                New Checkout
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="glass-card flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden border-white/5 p-0 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 sm:max-w-[820px] lg:h-[min(92vh,820px)]">
        <div className="relative border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -left-10 top-0 size-40 rounded-full bg-accent/5 blur-3xl" />
          <DialogHeader className="relative z-10 space-y-2 text-left">
            <DialogTitle className="flex items-center gap-3 font-heading text-2xl font-black tracking-tight sm:text-3xl">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              Checkout
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              Review totals, choose a payment method, and complete the sale.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-white/5 bg-white/[0.02] px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-inner backdrop-blur-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/40">
                  Final Amount Due
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="font-heading text-xs font-black uppercase tracking-[0.3em] text-accent/60">
                      PHP
                    </div>
                    <p className="font-heading text-4xl font-black tracking-tighter text-foreground sm:text-5xl">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-background/40 px-3 py-2 text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                      Method
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {activePaymentMethodLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                  Discount Preference
                </Label>
                <div className="grid gap-3">
                  {discounts.map((option) => (
                    <Button
                      key={option.id}
                      variant={
                        discount.type === option.id ? "default" : "outline"
                      }
                      className={`min-h-14 justify-start rounded-2xl px-4 py-3 text-left text-xs font-bold uppercase tracking-widest transition-all duration-300 ${discount.type === option.id ? "border-accent/40 bg-accent/10 text-accent shadow-[0_0_20px_rgba(var(--accent),0.1)]" : "border-white/5 bg-white/5 text-muted-foreground/70 hover:border-white/10 hover:bg-white/10"}`}
                      onClick={() => setDiscountType(option.id)}
                    >
                      <div className="relative mr-3 flex size-5 items-center justify-center">
                        {discount.type === option.id ? (
                          <CheckCircle2 className="h-5 w-5 text-accent animate-in zoom-in duration-300" />
                        ) : (
                          <div className="size-4 rounded-full border-2 border-white/10" />
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
                <div className="space-y-4 rounded-3xl border border-accent/15 bg-accent/5 p-4 sm:p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/70">
                      Discount Holder
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Customer name and ID are required for {discount.type} checkout.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="discount-customer-name"
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60"
                    >
                      Customer Name
                    </Label>
                    <Input
                      id="discount-customer-name"
                      value={discount.eligibleDiscName}
                      onChange={(e) =>
                        updateDiscountDetails({
                          eligibleDiscName: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl border-white/10 bg-white/5 font-semibold"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="discount-id-number"
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60"
                    >
                      OSCA / PWD ID Number
                    </Label>
                    <Input
                      id="discount-id-number"
                      value={discount.oscaIdNum}
                      onChange={(e) =>
                        updateDiscountDetails({
                          oscaIdNum: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl border-white/10 bg-white/5 font-semibold"
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

          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                    Select Payment Method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((pm) => (
                      <Button
                        key={pm.id}
                        variant={paymentMethod === pm.id ? "default" : "outline"}
                        className={`min-h-16 flex-col gap-2 rounded-2xl px-3 py-3 shadow-lg transition-all duration-300 sm:min-h-20 ${paymentMethod === pm.id ? "scale-[1.02] border-transparent bg-accent text-white shadow-xl shadow-accent/20" : "border-white/5 bg-white/5 text-muted-foreground/70 hover:border-white/10 hover:bg-white/10"}`}
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
                        htmlFor="tendered"
                        className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40"
                      >
                        Currency Tendered
                      </Label>
                      <div className="group relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-heading text-lg font-black text-accent/50 transition-colors group-focus-within:text-accent sm:left-6 sm:text-xl">
                          PHP
                        </span>
                        <Input
                          id="tendered"
                          type="number"
                          value={amountTendered || ""}
                          onChange={(e) =>
                            setAmountTendered(parseFloat(e.target.value) || 0)
                          }
                          className="h-16 rounded-3xl border-white/5 bg-white/5 pl-14 pr-5 font-heading text-3xl font-black tracking-tighter transition-all focus:bg-white/10 sm:h-20 sm:pl-16 sm:pr-6 sm:text-4xl"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[100, 500, 1000].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          className="h-12 rounded-2xl border-white/5 bg-white/5 text-sm font-bold transition-colors hover:bg-white/10"
                          onClick={() => handleQuickCash(amount)}
                        >
                          + {amount}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        className="h-12 rounded-2xl border-accent/20 bg-accent/5 text-[10px] font-black uppercase tracking-widest text-accent transition-all hover:bg-accent/10"
                        onClick={() => setAmountTendered(totalAmount)}
                      >
                        Exact Amount
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="h-12 w-full rounded-2xl border border-red-500/10 bg-red-500/5 text-[10px] font-bold uppercase tracking-[0.24em] text-red-500/70 transition-all hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => setAmountTendered(0)}
                    >
                      Clear Tendered Amount
                    </Button>

                    <div
                      className={`rounded-3xl p-5 transition-all duration-500 ${change >= 0 ? "border border-emerald-500/20 bg-emerald-500/10 shadow-xl shadow-emerald-500/5" : "border border-red-500/10 bg-red-500/5 opacity-80"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                            Return Change
                          </span>
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${change < 0 ? "text-red-500/80" : "text-emerald-500"}`}
                          >
                            {change < 0 ? "Insufficient cash received" : "Calculation ready"}
                          </span>
                        </div>
                        <span
                          className={`text-right font-heading text-3xl font-black tracking-tighter sm:text-4xl ${change < 0 ? "text-red-500 opacity-50" : "text-emerald-500"}`}
                        >
                          PHP {formatCurrency(Math.max(0, change))}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02] p-6 text-center animate-in fade-in zoom-in-95 duration-700 sm:min-h-[320px] sm:p-8">
                    <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-white/5 shadow-inner sm:mb-6 sm:size-20">
                      <FileText className="h-8 w-8 text-accent/40 sm:h-10 sm:w-10" />
                    </div>
                    <p className="font-heading text-lg font-bold text-foreground">
                      Waiting for Gateway
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                      Processing {activePaymentMethodLabel} transaction...
                    </p>
                    <div className="mt-6 font-heading text-2xl font-black tracking-tighter text-accent/80">
                      PHP {formatCurrency(totalAmount)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 bg-background/80 px-5 py-4 backdrop-blur-2xl sm:px-6">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
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
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-4 font-heading text-base font-black uppercase tracking-widest text-white shadow-2xl shadow-accent/20 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-20 sm:h-16 sm:text-lg"
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
                    Complete & Render
                    <Check className="size-5 sm:size-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
