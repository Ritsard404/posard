"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Receipt } from "lucide-react";
import {
  POSReceiptContent,
  POSTenderForm,
  paymentMethods,
  usePOSCheckoutFlow,
} from "./checkout-shared";

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
  const flow = usePOSCheckoutFlow(totalAmount, {
    onFastComplete: () => onOpenChange(false),
  });
  const activePaymentMethodLabel =
    paymentMethods.find((method) => method.id === flow.paymentMethod)?.label ??
    flow.paymentMethod;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      flow.resetCheckoutState(flow.step === "RECEIPT");
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {flow.step === "RECEIPT" && flow.receipt ? (
        <DialogContent className="flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden p-0 sm:h-auto sm:max-w-[425px]">
          <POSReceiptContent
            receipt={flow.receipt}
            discountType={flow.discount.type}
            requiresDiscountMetadata={flow.requiresDiscountMetadata}
            trimmedEligibleName={flow.trimmedEligibleName}
            trimmedOscaIdNum={flow.trimmedOscaIdNum}
            paymentMethod={flow.paymentMethod}
            onNewCheckout={() => handleDialogOpenChange(false)}
          />
        </DialogContent>
      ) : (
        <DialogContent className="flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden p-0 sm:max-w-[820px] lg:h-[min(92vh,820px)]">
          <div className="border-b bg-card px-5 py-4 sm:px-6 sm:py-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-3 font-heading text-2xl font-black tracking-tight sm:text-3xl">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                Checkout
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Review totals, choose a payment method, and complete the sale.
              </DialogDescription>
            </DialogHeader>
          </div>

          <POSTenderForm
            totalAmount={totalAmount}
            activePaymentMethodLabel={activePaymentMethodLabel}
            paymentMethod={flow.paymentMethod}
            amountTendered={flow.amountTendered}
            discountType={flow.discount.type}
            requiresDiscountMetadata={flow.requiresDiscountMetadata}
            discountEligibleDiscName={flow.discount.eligibleDiscName}
            discountOscaIdNum={flow.discount.oscaIdNum}
            isDiscountMetadataValid={flow.isDiscountMetadataValid}
            change={flow.change}
            canComplete={flow.canComplete}
            isProcessing={flow.isProcessing}
            fastCheckout={flow.fastCheckout}
            setDiscountType={flow.setDiscountType}
            setFastCheckout={flow.setFastCheckout}
            updateDiscountDetails={flow.updateDiscountDetails}
            setPaymentMethod={flow.setPaymentMethod}
            setAmountTendered={flow.setAmountTendered}
            handleQuickCash={flow.handleQuickCash}
            handleComplete={flow.handleComplete}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
