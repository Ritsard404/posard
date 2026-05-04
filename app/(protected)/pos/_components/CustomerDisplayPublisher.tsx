"use client";

import { useEffect, useMemo, useRef } from "react";
import { publishCustomerDisplayAction } from "../_actions/customer-display.action";
import { usePOSStore } from "../_store/pos-store";
import type { CustomerDisplayDTO } from "../_services/_dto/customer-display.dto";
import { usePOSPaymentSummary } from "./checkout-shared";

function getPaymentMethodLabel(
  paymentMethod: "cash" | "reference",
  referencePayments: Array<{ saleTypeId: string; amount: number }>,
  epaymentMethods: Array<{ id: string; name: string | null }>,
  amountTendered: number,
) {
  if (referencePayments.length > 0 && amountTendered > 0) {
    return "Split Payment";
  }

  if (referencePayments.length > 1) {
    return "Split Reference";
  }

  if (paymentMethod === "cash") {
    return "Cash";
  }

  const method = epaymentMethods.find(
    (item) => item.id === referencePayments[0]?.saleTypeId,
  );

  return method?.name?.trim() || "Reference Payment";
}

export function CustomerDisplayPublisher() {
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const customerDisplayEnabled = usePOSStore(
    (state) => state.customerDisplayEnabled,
  );
  const paymentMethod = usePOSStore((state) => state.paymentMethod);
  const referencePayments = usePOSStore((state) => state.referencePayments);
  const amountTendered = usePOSStore((state) => state.amountTendered);
  const epaymentMethods = usePOSStore((state) => state.epaymentMethods);
  const customerDisplayMode = usePOSStore((state) => state.customerDisplayMode);
  const activeMobileTab = usePOSStore((state) => state.activeMobileTab);
  const { activeCart, subtotal, discountAmount, total, taxDerived } =
    usePOSPaymentSummary();
  const lastPayloadRef = useRef("");

  const display = useMemo<CustomerDisplayDTO | null>(() => {
    if (!activeTerminal || !customerDisplayEnabled) {
      return null;
    }

    const referencePaymentTotal = referencePayments.reduce(
      (sum, payment) => sum + Math.max(0, payment.amount),
      0,
    );
    const change = Math.max(
      amountTendered - Math.max(total - referencePaymentTotal, 0),
      0,
    );
    const status =
      activeCart.length === 0
        ? "idle"
        : customerDisplayMode === "completed"
          ? "completed"
          : customerDisplayMode === "payment" ||
              activeMobileTab === "tender" ||
              amountTendered > 0 ||
              referencePayments.length > 0
            ? "payment"
            : "cart";

    return {
      terminalId: activeTerminal.id,
      status,
      items: status === "idle"
        ? []
        : activeCart.map((item) => {
            const lineTotal =
              item.customSubtotal ?? item.price * item.cartQuantity;

            return {
              name: item.name,
              qty: item.cartQuantity,
              unitPrice: item.cartQuantity > 0 ? lineTotal / item.cartQuantity : 0,
              lineTotal,
            };
          }),
      subtotal: status === "idle" ? 0 : subtotal,
      discountTotal: status === "idle" ? 0 : discountAmount,
      taxTotal: status === "idle" ? 0 : taxDerived,
      totalDue: status === "idle" ? 0 : total,
      paymentMethod:
        status === "payment" || status === "completed"
          ? getPaymentMethodLabel(
              paymentMethod,
              referencePayments,
              epaymentMethods,
              amountTendered,
            )
          : null,
      cashReceived:
        status === "payment" || status === "completed" ? amountTendered : null,
      change: status === "payment" || status === "completed" ? change : null,
      message:
        status === "completed"
          ? "Payment received. Please come again."
          : status === "idle"
            ? "Ready for next customer"
            : null,
      updatedAt: new Date().toISOString(),
    };
  }, [
    activeCart,
    activeMobileTab,
    activeTerminal,
    amountTendered,
    customerDisplayEnabled,
    customerDisplayMode,
    discountAmount,
    epaymentMethods,
    paymentMethod,
    referencePayments,
    subtotal,
    taxDerived,
    total,
  ]);

  useEffect(() => {
    if (!display) {
      return;
    }

    const payload = JSON.stringify({
      ...display,
      updatedAt: undefined,
    });

    if (lastPayloadRef.current === payload) {
      return;
    }

    lastPayloadRef.current = payload;
    const timeout = window.setTimeout(() => {
      void publishCustomerDisplayAction(display);
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [display]);

  return null;
}
