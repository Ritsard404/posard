import { useState } from "react";
import { usePOSStore } from "../_store/pos-store";
import { cancelOrderAction } from "../_actions/order.action";
import { OrderDto } from "../_services/_dto/order.dto";
import { calculatePayment } from "../_services/payment-calculation.service";
import { ManagerApprovalModal } from "./ManagerApprovalModal";
import { CheckoutModal } from "./CheckoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingCart, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function CartPanel() {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    discount,
    updateItemSubtotal,
    activeTerminal,
  } = usePOSStore();
  const { activeTimestampId } = usePOSStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<"VOID_ITEM" | "CANCEL_ORDER">(
    "VOID_ITEM",
  );
  const [approvalRefId, setApprovalRefId] = useState("");
  const [pendingAction, setPendingAction] = useState<(
    (manager: { email: string; name: string }) => void
  ) | null>(null);

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
          }
        : undefined,
    vatRate: activeTerminal?.vat ?? 12,
    maxDiscount: activeTerminal?.discountMax ?? Number.MAX_SAFE_INTEGER,
  });

  const subtotal = paymentSummary.grossAmount;
  const discountAmount = paymentSummary.discountAmount;
  const total = paymentSummary.totalAmount;
  const taxDerived = paymentSummary.vatAmount;

  const handleCartQuantityChange = (cartItemId: string, quantity: number) => {
    const result = updateCartQuantity(cartItemId, quantity);

    if (!result.success) {
      toast.error(
        result.reason === "OUT_OF_STOCK"
          ? "Wala nang stock."
          : "Naabot na ang stock limit.",
        {
          description: "Hindi na puwedeng dagdagan ang tracked item na ito.",
          duration: 5000,
        },
      );
    }
  };

  return (
    <div className="relative z-10 flex h-full w-full flex-col border-l bg-card/50 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] backdrop-blur-xl animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between border-b bg-muted/20 p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-sm">
            <ShoppingCart className="size-5 text-primary" />
          </div>
          <h2 className="font-heading text-xl font-black tracking-tight text-foreground">
            Active Cart
          </h2>
        </div>
        <Badge
          variant="secondary"
          className="border-primary/10 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
        >
          {activeCart.length} {activeCart.length === 1 ? "Item" : "Items"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in zoom-in-95">
            <div className="mb-6 flex size-24 items-center justify-center rounded-full border bg-muted/50">
              <ShoppingCart className="size-10 opacity-20" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground">
              Cart is empty
            </p>
            <p className="mt-1 font-medium">Start scanning products...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item, idx) => {
              const isVoid = item.itemStatus === "VOID";

              return (
                <div
                  key={item.cartItemId}
                  className={`glass-card flex flex-col p-4 transition-all animate-in fade-in slide-in-from-right-2 ${isVoid ? "grayscale blur-[0.5px] opacity-40" : "hover:border-primary/20"}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="min-w-0 pr-4">
                      <h4 className="truncate font-heading text-sm font-bold tracking-tight transition-colors group-hover:text-primary">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        ₱ {item.price.toFixed(2)} / {item.baseUnit || "PC"}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end">
                      <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 p-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground/40">
                          ₱
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`h-7 w-20 border-none bg-transparent p-0 text-right text-sm font-black focus-visible:ring-0 ${item.customSubtotal !== undefined ? "text-primary" : "text-foreground/80"}`}
                          value={
                            item.customSubtotal !== undefined
                              ? item.customSubtotal
                              : Number((item.price * item.cartQuantity).toFixed(2))
                          }
                          onChange={(e) => {
                            if (e.target.value === "") {
                              updateItemSubtotal(item.cartItemId, undefined);
                              return;
                            }

                            const value = parseFloat(e.target.value);
                            if (!Number.isNaN(value) && value >= 0) {
                              updateItemSubtotal(item.cartItemId, value);
                            }
                          }}
                        />
                      </div>
                      {item.customSubtotal !== undefined && (
                        <span className="mr-1 mt-1 text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">
                          Manual Overwrite
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-lg ${isVoid ? "opacity-50" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        onClick={() =>
                          !isVoid &&
                          handleCartQuantityChange(
                            item.cartItemId,
                            item.cartQuantity - 1,
                          )
                        }
                        disabled={isVoid}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <div
                        className={`w-10 text-center text-sm font-black tracking-tighter ${isVoid ? "text-destructive line-through" : ""}`}
                      >
                        {item.cartQuantity}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-lg ${isVoid ? "opacity-50" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        onClick={() =>
                          !isVoid &&
                          handleCartQuantityChange(
                            item.cartItemId,
                            item.cartQuantity + 1,
                          )
                        }
                        disabled={isVoid}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    {isVoid ? (
                      <Badge
                        variant="destructive"
                        className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                      >
                        Voided
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg border border-destructive/10 bg-destructive/5 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          setApprovalType("VOID_ITEM");
                          setApprovalRefId(item.cartItemId);
                          setPendingAction(
                            () => () => removeFromCart(item.cartItemId),
                          );
                          setApprovalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t bg-card/80 p-4 backdrop-blur-2xl lg:p-6">
        <div className="mb-6 space-y-3">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            <span>Aggregated Subtotal</span>
            <span className="font-sans font-bold text-foreground">
              ₱ {subtotal.toFixed(2)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-destructive animate-pulse">
              <span>Adjustment ({discount.type})</span>
              <span className="font-sans font-bold">
                - ₱ {discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {discount.type === "NONE" && taxDerived > 0 && (
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest italic text-muted-foreground/40">
              <span>VAT (Int. {activeTerminal?.vat ?? 12}%)</span>
              <span className="font-sans">₱ {taxDerived.toFixed(2)}</span>
            </div>
          )}

          <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                Total Amount
              </span>
              <span className="text-[10px] font-medium italic text-muted-foreground">
                Inc. all applicable taxes
              </span>
            </div>
            <span className="font-heading text-4xl font-black tracking-tighter text-foreground drop-shadow-sm lg:text-5xl">
              ₱ {Math.max(0, total).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="group h-14 w-1/4 rounded-xl border-border bg-background text-[10px] font-bold uppercase tracking-wider text-destructive shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
            onClick={async () => {
              if (cart.length === 0) return;

              setApprovalType("CANCEL_ORDER");
              setApprovalRefId(activeTimestampId || "");
              setPendingAction(
                () => async (manager: { email: string; name: string }) => {
                  const reason =
                    prompt("Enter void reason:") || "Manager Cancelled via PIN";

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
                    cashTenderAmount: 0,
                  };

                  const res = await cancelOrderAction({
                    order: orderDto,
                    managerIdentifier: manager.email,
                    reason,
                  });

                  if (res.success) {
                    clearCart();
                    alert("Order cancelled successfully.");
                  } else {
                    alert("Failed to cancel order: " + res.error);
                  }
                },
              );
              setApprovalOpen(true);
            }}
            disabled={cart.length === 0}
          >
            <div className="flex flex-col items-center">
              <Trash2 className="mb-1 size-4 transition-transform group-hover:rotate-12" />
              Void
            </div>
          </Button>

          <Button
            className="group h-14 flex-1 rounded-xl bg-primary text-lg font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95 lg:h-16 lg:text-xl"
            onClick={() => setCheckoutOpen(true)}
            disabled={activeCart.length === 0}
          >
            Checkout
            <ChevronRight className="ml-2 size-6 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={total}
      />

      <ManagerApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        actionType={approvalType}
        referenceId={approvalRefId}
        onSuccess={(manager) => {
          if (pendingAction) {
            pendingAction(manager);
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}
