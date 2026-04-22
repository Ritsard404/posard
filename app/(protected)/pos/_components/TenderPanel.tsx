"use client";

import { usePOSStore } from "../_store/pos-store";
import {
  POSReceiptContent,
  POSTenderForm,
  usePOSCheckoutFlow,
  usePOSPaymentSummary,
} from "./checkout-shared";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function TenderPanel() {
  const { total } = usePOSPaymentSummary();
  const setActiveMobileTab = usePOSStore((state) => state.setActiveMobileTab);
  const flow = usePOSCheckoutFlow(total, {
    onFastComplete: () => setActiveMobileTab("menu"),
  });

  const handleReceiptClose = () => {
    flow.resetCheckoutState(true);
    setActiveMobileTab("menu");
  };

  return (
    <>
      <POSTenderForm
        variant="mobile"
        totalAmount={total}
        activePaymentMethodLabel={flow.activePaymentMethodLabel}
        paymentMethod={flow.paymentMethod}
        selectedEPaymentMethodId={flow.selectedEPaymentMethodId}
        paymentReference={flow.paymentReference}
        epaymentMethods={flow.epaymentMethods}
        amountTendered={flow.amountTendered}
        discountType={flow.discount.type}
        requiresDiscountMetadata={flow.requiresDiscountMetadata}
        discountEligibleDiscName={flow.discount.eligibleDiscName}
        discountOscaIdNum={flow.discount.oscaIdNum}
        isDiscountMetadataValid={flow.isDiscountMetadataValid}
        isReferencePaymentValid={flow.isReferencePaymentValid}
        change={flow.change}
        canComplete={flow.canComplete}
        isProcessing={flow.isProcessing}
        fastCheckout={flow.fastCheckout}
        setDiscountType={flow.setDiscountType}
        setFastCheckout={flow.setFastCheckout}
        updateDiscountDetails={flow.updateDiscountDetails}
        setPaymentReference={flow.setPaymentReference}
        selectCashPayment={flow.selectCashPayment}
        selectReferencePayment={flow.selectReferencePayment}
        setAmountTendered={flow.setAmountTendered}
        handleQuickCash={flow.handleQuickCash}
        handleComplete={flow.handleComplete}
      />

      <Sheet
        open={flow.step === "RECEIPT" && !!flow.receipt}
        onOpenChange={(open) => {
          if (!open) {
            handleReceiptClose();
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="flex h-[92dvh] flex-col gap-0 rounded-t-[2rem] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Receipt</SheetTitle>
            <SheetDescription>Completed mobile checkout receipt.</SheetDescription>
          </SheetHeader>
          {flow.receipt ? (
            <POSReceiptContent
              receipt={flow.receipt}
              discountType={flow.discount.type}
              requiresDiscountMetadata={flow.requiresDiscountMetadata}
              trimmedEligibleName={flow.trimmedEligibleName}
              trimmedOscaIdNum={flow.trimmedOscaIdNum}
              onNewCheckout={handleReceiptClose}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
