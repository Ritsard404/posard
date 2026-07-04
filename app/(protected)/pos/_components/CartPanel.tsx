import { useState } from "react";
import { usePOSStore } from "../_store/pos-store";
import { cancelOrderAction } from "../_actions/order.action";
import { OrderDto } from "../_services/_dto/order.dto";
import { ManagerApprovalModal } from "./ManagerApprovalModal";
import { CheckoutModal } from "./CheckoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePOSPaymentSummary } from "./checkout-shared";
import { ProductConfigurationDialog } from "./ProductConfigurationDialog";
import {
  enqueueOfflineAction,
  getOfflineQueueSnapshot,
} from "../_services/offline-sync.client";

type ApprovalManager = { id: string; email: string; name: string };

export function CartPanel() {
  const isMobile = useIsMobile();
  const {
    cart,
    discount,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    updateItemSubtotal,
    addConfiguredItemToCart,
    setActiveMobileTab,
    setCustomerDisplayMode,
    activeDeviceId,
    activeCompanyId,
    activeProfileId,
    activeTerminal,
    isOnline,
  } = usePOSStore();
  const { activeTimestampId } = usePOSStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<
    "VOID_ITEM" | "CANCEL_ORDER"
  >("VOID_ITEM");
  const [approvalRefId, setApprovalRefId] = useState("");
  const [pendingAction, setPendingAction] = useState<
    ((manager: ApprovalManager) => void | Promise<void>) | null
  >(null);

  const [isVoiding, setIsVoiding] = useState(false);
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const { activeCart, subtotal, discountAmount, total, taxDerived } =
    usePOSPaymentSummary();
  const editingItem = cart.find((item) => item.cartItemId === editingItemId) ?? null;

  const buildVoidOrderDto = (): OrderDto => ({
    timestampId: activeTimestampId ?? "",
    deviceId: activeDeviceId ?? undefined,
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
  });

  const handlePrepareCancelOrder = () => {
    if (cart.length === 0 || isVoiding) return;

    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Void reason is required.");
      return;
    }

    setApprovalType("CANCEL_ORDER");
    setApprovalRefId(activeTimestampId || "");
    setPendingAction(
      () => async (manager: ApprovalManager) => {
        setIsVoiding(true);
        try {
          const orderDto = buildVoidOrderDto();

          if (!isOnline) {
            if (
              !activeTimestampId ||
              !activeTerminal ||
              !activeDeviceId ||
              !activeCompanyId ||
              !activeProfileId
            ) {
              toast.error("Offline void needs an active synced session.");
              return;
            }

            const queue = await getOfflineQueueSnapshot();
            await enqueueOfflineAction({
              localId: crypto.randomUUID(),
              type: "VOID_ORDER",
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
                order: orderDto,
                managerProfileId: manager.id,
                managerEmail: manager.email,
                managerName: manager.name,
                reason,
              },
            });

            usePOSStore.getState().setSyncCounts({
              pendingSyncCount: queue.pendingCount + 1,
              syncingCount: queue.syncingCount,
              needsReviewCount: queue.needsReviewCount,
              lastSyncMessage: "Void queued for sync.",
            });
            clearCart();
            toast.success("Order void queued offline.");
            return;
          }

          const res = await cancelOrderAction({
            order: orderDto,
            managerIdentifier: manager.email,
            reason,
          });

          if (res.success) {
            clearCart();
            toast.success("Order cancelled successfully.");
          } else {
            toast.error(res.error ?? "Failed to cancel order.");
          }
        } finally {
          setIsVoiding(false);
        }
      },
    );
    setCancelReasonOpen(false);
    setApprovalOpen(true);
  };

  const handleCartQuantityChange = (cartItemId: string, quantity: number) => {
    if (isVoiding) return;

    const result = updateCartQuantity(cartItemId, quantity);

    if (!result.success) {
      toast.error(
        result.reason === "EXPIRED_STOCK"
          ? "Expired batch only."
          : result.reason === "OUT_OF_STOCK"
            ? "Wala nang stock."
            : "Naabot na ang stock limit.",
        {
          description:
            result.reason === "EXPIRED_STOCK"
              ? "Receive a non-expired batch before selling this item."
              : "Hindi na puwedeng dagdagan ang tracked item na ito.",
          duration: 5000,
        },
      );
      return;
    }

    if (result.warning === "NEGATIVE_STOCK") {
      const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);
      toast.warning("Inventory will go negative.", {
        description: `${item?.name ?? "This item"} is tracked and the quantity exceeds available stock.`,
        duration: 5000,
      });
    }
  };

  return (
    <div data-testid="pos-cart-panel" className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-card animate-in slide-in-from-right-4 duration-300">
      {isVoiding ? (
        <div className="fixed inset-0 z-[100] flex cursor-wait flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex min-h-40 w-[min(22rem,calc(100vw-2rem))] flex-col items-center justify-center rounded-xl border bg-card p-6 text-center shadow-lg">
            <Loader2 className="mb-4 size-8 animate-spin text-primary" />
            <p className="font-heading text-lg font-black tracking-tight text-foreground">
              Voiding order
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Please wait until the transaction is complete.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-between border-b p-2 xl:p-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <ShoppingCart className="size-4 text-primary" />
          </div>
          <h2 className="truncate font-heading text-[15px] font-black tracking-tight text-foreground xl:text-lg">
            Active Cart
          </h2>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"
        >
          {activeCart.length} {activeCart.length === 1 ? "Item" : "Items"}
        </Badge>
      </div>

      <div data-testid="pos-cart-items" className="min-h-0 flex-1 overflow-y-auto p-2 xl:p-3">
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
          <div className="space-y-2">
            {cart.map((item) => {
              const isVoid = item.itemStatus === "VOID";

              return (
                <div
                  key={item.cartItemId}
                  className={`flex min-w-0 flex-col rounded-lg border bg-background p-2 transition-all animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none ${isVoid ? "grayscale opacity-40" : ""}`}
                  onClick={() => {
                    if (!isVoid && item.isConfigurable && item.modifierGroups.length > 0) {
                      setEditingItemId(item.cartItemId);
                    }
                  }}
                >
                  <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-heading text-[13px] font-bold tracking-tight transition-colors group-hover:text-primary sm:text-sm">
                        {item.name}
                      </h4>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        ₱ {item.price.toFixed(2)} / {item.baseUnit || "PC"}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end">
                      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 px-1.5 py-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/40">
                          ₱
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={isVoid || isVoiding}
                          className={`h-10 w-20 border-none bg-transparent p-0 text-right text-sm font-black focus-visible:ring-0 sm:h-7 sm:w-14 ${item.customSubtotal !== undefined ? "text-primary" : "text-foreground/80"}`}
                          value={
                            item.customSubtotal !== undefined
                              ? item.customSubtotal
                              : Number(
                                  (item.price * item.cartQuantity).toFixed(2),
                                )
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

                  <div className="flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-lg sm:h-8 sm:w-8 ${isVoid ? "opacity-50" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isVoid) {
                              handleCartQuantityChange(
                                item.cartItemId,
                                item.cartQuantity - 1,
                              );
                            }
                          }}
                        disabled={isVoid || isVoiding}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        disabled={isVoid || isVoiding}
                        value={item.cartQuantity}
                        className={`h-10 w-12 border-none bg-transparent p-0 text-center text-sm font-black tracking-tighter focus-visible:ring-0 sm:h-8 sm:w-10 ${isVoid ? "text-destructive line-through" : ""}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation();
                          const nextQuantity = Number.parseInt(
                            event.target.value || "0",
                            10,
                          );

                          if (!Number.isNaN(nextQuantity)) {
                            handleCartQuantityChange(
                              item.cartItemId,
                              nextQuantity,
                            );
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-lg sm:h-8 sm:w-8 ${isVoid ? "opacity-50" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                            if (!isVoid) {
                              handleCartQuantityChange(
                                item.cartItemId,
                                item.cartQuantity + 1,
                              );
                            }
                        }}
                        disabled={isVoid || isVoiding}
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
                        className="h-10 w-10 rounded-lg border border-destructive/10 bg-destructive/5 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground sm:h-8 sm:w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isVoiding) return;

                          setApprovalType("VOID_ITEM");
                          setApprovalRefId(item.cartItemId);
                          setPendingAction(
                            () => () => removeFromCart(item.cartItemId),
                          );
                          setApprovalOpen(true);
                        }}
                        disabled={isVoiding}
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

      <div className="shrink-0 border-t bg-card p-2 xl:p-3">
        <div className={isMobile ? "mb-2 space-y-1 rounded-lg border bg-background/80 p-2" : "mb-2 space-y-1"}>
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
              <span>VAT Included</span>
              <span className="font-sans">₱ {taxDerived.toFixed(2)}</span>
            </div>
          )}

          <div className="my-2 h-px w-full bg-border" />

          <div className="flex min-w-0 items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                Total Amount
              </span>
              <span className="text-[9px] font-medium italic text-muted-foreground">
                Inc. all applicable taxes
              </span>
            </div>
            <span className="min-w-0 shrink font-heading text-xl font-black tracking-tighter text-foreground drop-shadow-sm xl:text-3xl">
              ₱ {Math.max(0, total).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="group h-12 w-20 shrink-0 rounded-lg text-[9px] font-bold uppercase tracking-wider text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95 sm:h-10 sm:w-14 xl:h-12 xl:w-20"
            onClick={() => {
              if (cart.length === 0 || isVoiding) return;

              setCancelReason("");
              setCancelReasonOpen(true);
            }}
            disabled={cart.length === 0 || isVoiding}
          >
            <div className="flex flex-col items-center">
              <Trash2 className="mb-0.5 size-4 transition-transform group-hover:rotate-12" />
              Void
            </div>
          </Button>

          <Button
            className="group h-12 min-w-0 flex-1 rounded-lg bg-primary text-sm font-black uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 sm:h-10 xl:h-12 xl:text-base"
            onClick={() => {
              setCustomerDisplayMode("payment");
              if (isMobile) {
                setActiveMobileTab("tender");
                return;
              }
              setCheckoutOpen(true);
            }}
            disabled={activeCart.length === 0 || isVoiding}
          >
            {isMobile ? "Go to Tender" : "Checkout"}
            <ChevronRight className="ml-1.5 size-5 transition-transform group-hover:translate-x-1 xl:size-6" />
          </Button>
        </div>
      </div>

      {!isMobile && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          totalAmount={total}
        />
      )}

      <Dialog open={cancelReasonOpen} onOpenChange={setCancelReasonOpen}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))] rounded-xl">
          <DialogHeader>
            <DialogTitle>Void order reason</DialogTitle>
            <DialogDescription>
              Add the reason before manager approval. This will be attached to the void record.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handlePrepareCancelOrder();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="cancel-order-reason">Reason</Label>
              <Input
                id="cancel-order-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="h-12 rounded-lg text-base"
                placeholder="Wrong order, customer cancelled, duplicate entry..."
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg"
                onClick={() => setCancelReasonOpen(false)}
              >
                Keep Order
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-lg"
                disabled={!cancelReason.trim()}
              >
                Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ManagerApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        actionType={approvalType}
        referenceId={approvalRefId}
        onSuccess={(manager) => {
          if (!pendingAction) {
            return;
          }

          const action = pendingAction;
          return Promise.resolve(action(manager)).finally(() => {
            setPendingAction(null);
          });
        }}
      />
      <ProductConfigurationDialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItemId(null);
        }}
        product={editingItem}
        mode="edit"
        onSave={(data) => {
          if (!editingItem) return;
          addConfiguredItemToCart(editingItem, {
            ...data,
            cartItemId: editingItem.cartItemId,
          });
          setEditingItemId(null);
        }}
        onRemove={() => {
          if (!editingItem) return;
          removeFromCart(editingItem.cartItemId);
          setEditingItemId(null);
        }}
      />
    </div>
  );
}
