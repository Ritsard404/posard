"use client";

import { useState } from "react";
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
import { ManagerApprovalModal } from "./ManagerApprovalModal";

export function TenderPanel() {
  const { total } = usePOSPaymentSummary();
  const setActiveMobileTab = usePOSStore((state) => state.setActiveMobileTab);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const flow = usePOSCheckoutFlow(total, {
    onFastComplete: () => setActiveMobileTab("menu"),
  });

  const handleReceiptClose = () => {
    flow.resetCheckoutState(true);
    setActiveMobileTab("menu");
  };

  const handleCompleteClick = () => {
    if (flow.requiresManagerApprovalForCheckout) {
      setApprovalOpen(true);
      return;
    }

    flow.handleComplete();
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
        requiresPrescriptionConfirmation={flow.requiresPrescriptionConfirmation}
        prescriptionConfirmed={flow.prescriptionConfirmed}
        setPrescriptionConfirmed={flow.setPrescriptionConfirmed}
        prescriptionReference={flow.prescriptionReference}
        setPrescriptionReference={flow.setPrescriptionReference}
        isPrescriptionValid={flow.isPrescriptionValid}
        prescriptionItems={flow.prescriptionItems}
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

      <Sheet
        open={flow.step === "RECEIPT" && !!flow.receipt}
        onOpenChange={(open) => {
          if (!open) {
            handleReceiptClose();
          }
        }}
      >
        <SheetContent
          data-testid="pos-mobile-receipt-sheet"
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
