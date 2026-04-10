import { useState } from "react";
import {
  usePOSStore,
  DiscountType,
  PaymentMethodType,
} from "../_store/pos-store";
import { payOrderAction } from "../_actions/order.action";
import { OrderDto } from "../_services/_dto/order.dto";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Receipt,
  CreditCard,
  Banknote,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { InvoiceStatusType } from "@prisma/client";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
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
    paymentMethod,
    setPaymentMethod,
    amountTendered,
    setAmountTendered,
    clearCart,
  } = usePOSStore();
  const [step, setStep] = useState<"PAYMENT" | "RECEIPT">("PAYMENT");

  const change = amountTendered - totalAmount;
  const isTenderValid =
    paymentMethod !== "CASH" || amountTendered >= totalAmount;

  const handleQuickCash = (amount: number) => {
    setAmountTendered((amountTendered || 0) + amount);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = async () => {
    if (!isTenderValid) return;

    setIsProcessing(true);
    const orderDto: OrderDto = {
      items: cart.map((i) => ({
        productId: i.id,
        qty: i.cartQuantity,
        price: i.price,
        subTotal:
          i.itemStatus === "VOID"
            ? 0
            : (i.customSubtotal ?? i.price * i.cartQuantity),
        status: i.itemStatus || "PENDING",
      })),
      cashTenderAmount: amountTendered,
      discount: discount !== "NONE" ? { discountType: discount } : undefined,
    };

    const res = await payOrderAction(orderDto);
    setIsProcessing(false);

    if (res.success) {
      setStep("RECEIPT");
    } else {
      alert("Payment Failed: " + res.error);
    }
  };

  const handleClose = () => {
    setStep("PAYMENT");
    setAmountTendered(0);
    setDiscount("NONE");
    setPaymentMethod("CASH");
    clearCart();
    onOpenChange(false);
  };

  const paymentMethods: { id: PaymentMethodType; label: string; icon: any }[] =
    [
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

  if (step === "RECEIPT") {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[100vw] h-[100dvh] sm:h-auto sm:max-w-[425px] p-0 overflow-hidden border-white/5 shadow-2xl glass-card backdrop-blur-3xl animate-in zoom-in-95 duration-500">
          <div className="bg-accent/10 p-8 text-center flex flex-col items-center border-b border-white/5 relative overflow-hidden">
            {/* Background blobs for receipt too */}
            <div className="absolute top-0 -left-10 size-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 -right-10 size-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-heading font-black tracking-tight text-foreground">
              Transaction Done
            </h2>
            <p className="text-muted-foreground font-medium mt-2 text-sm uppercase tracking-[0.2em]">
              Receipt Generated Successfully
            </p>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-8 font-mono text-[11px] leading-relaxed relative">
            <div className="text-center mb-8">
              <h3 className="font-heading font-black text-xl uppercase tracking-tighter text-foreground mb-1">
                BAISARD POS
              </h3>
              <p className="text-muted-foreground/60 uppercase text-[9px] tracking-widest font-bold">
                123 Business Avenue, Metro Suite
              </p>
              <p className="text-muted-foreground/60 uppercase text-[9px] tracking-widest font-bold">
                Registration: 000-000-000-000
              </p>

              <div className="mt-6 flex justify-between items-center text-[10px] font-bold text-muted-foreground/40 border-y border-dashed border-white/10 py-3">
                <span>
                  {new Date().toLocaleDateString()}{" "}
                  {new Date().toLocaleTimeString()}
                </span>
                <span>POS-01 / TXN-8293</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between font-black text-foreground border-b border-white/5 pb-2 uppercase tracking-widest text-[10px]">
                <span>DESCRIPTION</span>
                <span>SUBTOTAL</span>
              </div>
              {cart
                .filter((item) => item.itemStatus !== InvoiceStatusType.VOID)
                .map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex justify-between items-start text-muted-foreground italic font-medium"
                  >
                    <span className="w-2/3">
                      {item.cartQuantity}x {item.name}
                    </span>
                    <span className="font-bold text-foreground/80">
                      {(
                        item.customSubtotal ?? item.price * item.cartQuantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="space-y-2 mb-8 bg-white/[0.02] rounded-xl p-4 border border-white/5">
              <div className="flex justify-between font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>Aggregated Total</span>
                <span className="text-foreground">
                  ₱ {totalAmount.toFixed(2)}
                </span>
              </div>
              {discount !== "NONE" && (
                <div className="flex justify-between font-bold text-accent uppercase tracking-widest">
                  <span>Applied Adj. ({discount})</span>
                  <span>SUCCESS</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-muted-foreground/60 uppercase tracking-widest border-t border-white/5 pt-2 mt-2">
                <span>Tendered ({paymentMethod})</span>
                <span className="text-foreground">
                  {paymentMethod === "CASH"
                    ? amountTendered.toFixed(2)
                    : totalAmount.toFixed(2)}
                </span>
              </div>
              {paymentMethod === "CASH" && (
                <div className="flex justify-between font-black text-emerald-500 uppercase tracking-widest pt-1">
                  <span>Change Due</span>
                  <span>PHP {Math.max(0, change).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-muted-foreground/30 font-bold uppercase tracking-[0.3em] pb-2 italic">
              Thank you for trusting us!
            </div>
          </div>

          <DialogFooter className="p-6 bg-white/[0.02] border-t border-white/5">
            <Button
              onClick={handleClose}
              className="w-full h-14 rounded-2xl bg-accent text-white font-heading font-black text-lg uppercase tracking-widest shadow-xl shadow-accent/20 hover:bg-accent/90 glow-on-hover active:scale-95 transition-all"
            >
              New Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] h-[100dvh] sm:h-auto sm:max-w-[800px] p-0 flex flex-col md:flex-row overflow-hidden border-white/5 glass-card backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500">
        {/* Left Side: Summary & Settings */}
        <div className="w-full md:w-[45%] p-8 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 flex flex-col relative overflow-hidden">
          {/* Decorative background for left panel */}
          <div className="absolute top-0 -left-10 size-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          <DialogHeader className="mb-8 relative z-10">
            <DialogTitle className="text-3xl font-heading font-black tracking-tight flex items-center gap-3">
              <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              Billing Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium uppercase tracking-[0.1em] text-[10px] mt-1.5 font-bold">
              Review order subtotal and adjust pricing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 flex-grow relative z-10">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-inner backdrop-blur-sm group hover:border-accent/20 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 ml-0.5">
                Final Amount Due
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-accent opacity-50 font-heading">
                  ₱
                </span>
                <p className="text-5xl font-heading font-black text-foreground tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  {totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="font-black uppercase text-[10px] text-muted-foreground/40 tracking-[0.25em] ml-1">
                Discount Preference
              </Label>
              <div className="flex flex-col gap-3">
                {discounts.map((d) => (
                  <Button
                    key={d.id}
                    variant={discount === d.id ? "default" : "outline"}
                    className={`h-12 justify-start rounded-xl px-4 transition-all duration-300 font-bold text-xs uppercase tracking-widest ${discount === d.id ? "bg-accent/10 text-accent border-accent/40 shadow-[0_0_20px_rgba(var(--accent),0.1)]" : "bg-white/5 border-white/5 text-muted-foreground/60 hover:bg-white/10 hover:border-white/10"}`}
                    onClick={() => setDiscount(d.id)}
                  >
                    <div className="relative size-5 mr-3 flex items-center justify-center">
                      {discount === d.id ? (
                        <CheckCircle2 className="h-5 w-5 text-accent animate-in zoom-in duration-300" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-white/10" />
                      )}
                    </div>
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Logic */}
        <div className="w-full md:w-[55%] flex flex-col p-8 bg-transparent relative overflow-hidden">
          {/* Decorative background for right panel */}
          <div className="absolute bottom-0 -right-10 size-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 mb-8 relative z-10">
            <Label className="font-black uppercase text-[10px] text-muted-foreground/40 tracking-[0.25em] ml-1">
              Select Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => (
                <Button
                  key={pm.id}
                  variant={paymentMethod === pm.id ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-300 border shadow-lg ${paymentMethod === pm.id ? "bg-accent text-white border-transparent shadow-accent/20 shadow-xl scale-[1.02]" : "bg-white/5 border-white/5 text-muted-foreground/60 hover:bg-white/10 hover:border-white/10 opacity-70 hover:opacity-100 hover:scale-[1.01]"}`}
                  onClick={() => {
                    setPaymentMethod(pm.id);
                    if (pm.id !== "CASH") setAmountTendered(totalAmount);
                  }}
                >
                  <pm.icon className="h-6 w-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest transition-opacity">
                    {pm.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-grow flex flex-col relative z-10">
            {paymentMethod === "CASH" ? (
              <div className="space-y-6 flex flex-col h-full">
                <div className="space-y-3">
                  <Label
                    htmlFor="tendered"
                    className="font-black uppercase text-[10px] text-muted-foreground/40 tracking-[0.25em] ml-1"
                  >
                    Currency Tendered
                  </Label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-accent/50 group-focus-within:text-accent transition-colors font-black font-heading text-xl">
                      ₱
                    </span>
                    <Input
                      id="tendered"
                      type="number"
                      value={amountTendered || ""}
                      onChange={(e) =>
                        setAmountTendered(parseFloat(e.target.value) || 0)
                      }
                      className="pl-12 pr-6 text-4xl h-20 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-heading font-black tracking-tighter"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000].map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      className="h-12 bg-white/5 border-white/5 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors"
                      onClick={() => handleQuickCash(amt)}
                    >
                      + {amt}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="h-12 bg-accent/5 rounded-xl font-black text-[10px] uppercase tracking-widest text-accent border-accent/20 hover:bg-accent/10 transition-all"
                    onClick={() => setAmountTendered(totalAmount)}
                  >
                    Exact
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 col-span-4 rounded-xl font-bold text-[9px] uppercase tracking-[0.3em] text-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all mt-1"
                    onClick={() => setAmountTendered(0)}
                  >
                    Clear Transaction Amount
                  </Button>
                </div>

                <div
                  className={`mt-auto p-6 rounded-2xl flex justify-between items-center transition-all duration-500 ${change >= 0 ? "bg-emerald-500/10 border border-emerald-500/20 shadow-xl shadow-emerald-500/5" : "bg-red-500/5 border border-red-500/10 opacity-60"}`}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-1">
                      Return Change
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                      Calculation Ready
                    </span>
                  </div>
                  <span
                    className={`text-4xl font-heading font-black tracking-tighter ${change < 0 ? "text-red-500 opacity-40" : "text-emerald-500"}`}
                  >
                    ₱ {Math.max(0, change).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/5 rounded-3xl mb-6 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-700">
                <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner">
                  <FileText className="h-10 w-10 text-accent/40" />
                </div>
                <p className="font-heading font-bold text-lg text-foreground">
                  Waiting for Gateway
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-2">
                  Processing{" "}
                  {paymentMethods.find((m) => m.id === paymentMethod)?.label}{" "}
                  Transaction...
                </p>
                <div className="mt-6 font-heading font-black text-2xl text-accent/80 tracking-tighter">
                  ₱ {totalAmount.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 relative z-10">
            <Button
              className="w-full h-16 text-lg font-heading font-black uppercase tracking-widest rounded-2xl bg-accent text-white shadow-2xl shadow-accent/20 hover:bg-accent/90 glow-on-hover active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
              size="lg"
              disabled={!isTenderValid || isProcessing}
              onClick={handleComplete}
            >
              {isProcessing ? (
                <>
                  <div className="size-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Complete & Render
                  <Check className="size-6 transition-transform group-hover:scale-110" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
