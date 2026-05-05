"use client";

import { useState } from "react";
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
  usePOSCheckoutFlow,
} from "./checkout-shared";
import { ManagerApprovalModal } from "./ManagerApprovalModal";

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
  const [approvalOpen, setApprovalOpen] = useState(false);
  const flow = usePOSCheckoutFlow(totalAmount, {
    onFastComplete: () => onOpenChange(false),
  });

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      flow.resetCheckoutState(flow.step === "RECEIPT");
    }

    onOpenChange(nextOpen);
  };

  const handleCompleteClick = () => {
    if (flow.requiresManagerApprovalForCheckout) {
      setApprovalOpen(true);
      return;
    }

    flow.handleComplete();
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
            onNewCheckout={() => handleDialogOpenChange(false)}
          />
        </DialogContent>
      ) : (
        <DialogContent className="flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden p-0 sm:max-w-[960px] xl:max-w-[1080px] lg:h-[min(92vh,840px)]">
          <div className="border-b bg-card px-4 py-3 sm:px-5 sm:py-4">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2.5 font-heading text-xl font-black tracking-tight sm:text-2xl">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Receipt className="h-[18px] w-[18px] text-primary" />
                </div>
                Checkout
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Review totals, choose a payment method, and complete the sale.
              </DialogDescription>
            </DialogHeader>
          </div>

          <POSTenderForm
            totalAmount={totalAmount}
            activePaymentMethodLabel={flow.activePaymentMethodLabel}
            paymentMethod={flow.paymentMethod}
            selectedEPaymentMethodId={flow.selectedEPaymentMethodId}
            paymentReference={flow.paymentReference}
            referencePayments={flow.referencePayments}
            epaymentMethods={flow.epaymentMethods}
            amountTendered={flow.amountTendered}
            referencePaymentTotal={flow.referencePaymentTotal}
            totalTendered={flow.totalTendered}
            remainingDue={flow.remainingDue}
            referenceOverpayAmount={flow.referenceOverpayAmount}
            discountType={flow.discount.type}
            requiresDiscountMetadata={flow.requiresDiscountMetadata}
            discountEligibleDiscName={flow.discount.eligibleDiscName}
            discountOscaIdNum={flow.discount.oscaIdNum}
            isDiscountMetadataValid={flow.isDiscountMetadataValid}
            isReferencePaymentValid={flow.isReferencePaymentValid}
            change={flow.change}
            canComplete={flow.canComplete}
            isBillingLocked={flow.isBillingLocked}
            billingMessage={flow.billingMessage}
            terminalDiscountCapSummary={flow.terminalDiscountCapSummary}
            settlementMode={flow.settlementMode}
            setSettlementMode={flow.setSettlementMode}
            debtCustomers={flow.debtCustomers}
            selectedDebtCustomerId={flow.selectedDebtCustomerId}
            setSelectedDebtCustomerId={flow.setSelectedDebtCustomerId}
            newDebtCustomerName={flow.newDebtCustomerName}
            setNewDebtCustomerName={flow.setNewDebtCustomerName}
            debtDueDate={flow.debtDueDate}
            setDebtDueDate={flow.setDebtDueDate}
            debtNotes={flow.debtNotes}
            setDebtNotes={flow.setDebtNotes}
            debtManagerPin={flow.debtManagerPin}
            setDebtManagerPin={flow.setDebtManagerPin}
            isProcessing={flow.isProcessing}
            fastCheckout={flow.fastCheckout}
            setDiscountType={flow.setDiscountType}
            setFastCheckout={flow.setFastCheckout}
            updateDiscountDetails={flow.updateDiscountDetails}
            setPaymentReference={flow.setPaymentReference}
            addReferencePayment={flow.addReferencePayment}
            updateReferencePayment={flow.updateReferencePayment}
            removeReferencePayment={flow.removeReferencePayment}
            selectCashPayment={flow.selectCashPayment}
            selectReferencePayment={flow.selectReferencePayment}
            setAmountTendered={flow.setAmountTendered}
            handleComplete={handleCompleteClick}
          />
          <ManagerApprovalModal
            open={approvalOpen}
            onOpenChange={setApprovalOpen}
            actionType={flow.checkoutApprovalActionType}
            referenceId={flow.activeTimestampId ?? "checkout"}
            onSuccess={(_, pin) => flow.handleComplete(pin)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
