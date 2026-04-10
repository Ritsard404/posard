import { usePOSStore, CartItem } from '../_store/pos-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingCart, Info } from 'lucide-react';
import { useState } from 'react';
import { cancelOrderAction } from '../_actions/order.action';
import { OrderDto } from '../_services/_dto/order.dto';
import { ManagerApprovalModal } from './ManagerApprovalModal';

export function CartPanel() {
  const { cart, updateCartQuantity, removeFromCart, clearCart, discount, updateItemSubtotal } = usePOSStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  // Manager Approval State
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<"VOID_ITEM" | "CANCEL_ORDER">("VOID_ITEM");
  const [approvalRefId, setApprovalRefId] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const activeCart = cart.filter(item => item.itemStatus !== 'VOID');
  const subtotal = activeCart.reduce((sum, item) => sum + (item.customSubtotal ?? (item.price * item.cartQuantity)), 0);
  
  // Calculate discount logic: 
  // PWD / Senior Citizen generally means VAT exempt (divide by 1.12 to remove 12% VAT)
  // And then 20% off from the VAT-exempt amount.
  let discountAmount = 0;
  if (discount === 'PWD' || discount === 'SENIOR') {
    const vatableAmount = activeCart.filter(item => item.vatType === 'VATABLE')
                              .reduce((sum, item) => sum + (item.customSubtotal ?? (item.price * item.cartQuantity)), 0);
    const nonVatableAmount = subtotal - vatableAmount;
    
    // Convert vatable to vatexempt
    const vatExemptAmount = vatableAmount / 1.12;
    // 20% discount on both vat exempt and natively non-vatable
    discountAmount = (vatExemptAmount + nonVatableAmount) * 0.20;
    // Plus the VAT that was removed
    discountAmount += (vatableAmount - vatExemptAmount);
  }

  const taxAmount = (discount === 'PWD' || discount === 'SENIOR') ? 0 : subtotal * 0.12; // Assuming 12% VAT embedded or added? If price is inclusive of VAT, tax is derived. Let's do inclusive.
  const taxDerived = taxAmount > 0 ? subtotal - (subtotal / 1.12) : 0;
  
  const total = subtotal - discountAmount;

  return (
    <div className="flex flex-col h-full bg-card w-full relative z-10">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Current Order</h2>
        </div>
        <Badge variant="secondary" className="font-mono text-sm">
          {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 py-20">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">Cart is Empty</p>
            <p className="text-sm">Add products to start an order</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => {
              const isVoid = item.itemStatus === 'VOID';
              return (
              <div key={item.cartItemId} className={`flex flex-col border-b border-border pb-4 last:border-0 last:pb-0 ${isVoid ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-4">
                    <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-1">₱ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-muted-foreground">₱</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`h-10 w-24 text-right font-bold text-base focus-visible:ring-1 ${item.customSubtotal !== undefined ? 'border-primary text-primary bg-primary/5' : ''}`}
                        value={item.customSubtotal !== undefined ? item.customSubtotal : Number((item.price * item.cartQuantity).toFixed(2))}
                        onChange={(e) => {
                          if (e.target.value === '') {
                             updateItemSubtotal(item.cartItemId, undefined);
                          } else {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              updateItemSubtotal(item.cartItemId, val);
                            }
                          }
                        }}
                      />
                    </div>
                    {item.customSubtotal !== undefined && (
                      <span className="text-[10px] text-primary mt-1 mr-1 uppercase font-bold tracking-wider">Edited</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-muted rounded-md p-1 border border-border/50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-10 w-10 sm:h-8 sm:w-8 rounded-sm ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity - 1)}
                      disabled={isVoid}
                    >
                      <Minus className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                    <div className={`w-12 text-center font-semibold text-base sm:text-sm ${isVoid && 'line-through text-destructive'}`}>
                      {item.cartQuantity}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-10 w-10 sm:h-8 sm:w-8 rounded-sm ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity + 1)}
                      disabled={isVoid}
                    >
                      <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  {isVoid ? (
                    <Badge variant="destructive" className="uppercase text-[10px]">Voided</Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 sm:h-8 sm:w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setApprovalType("VOID_ITEM");
                        setApprovalRefId(item.cartItemId);
                        setPendingAction(() => () => removeFromCart(item.cartItemId));
                        setApprovalOpen(true);
                      }}
                    >
                      <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>₱ {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-destructive font-medium">
              <span>Discount ({discount})</span>
              <span>- ₱ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {discount === 'NONE' && taxDerived > 0 && (
             <div className="flex justify-between text-muted-foreground text-xs">
               <span>VAT (12% Included)</span>
               <span>₱ {taxDerived.toFixed(2)}</span>
             </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between items-end">
            <span className="font-semibold text-lg">Total</span>
            <span className="font-extrabold text-3xl text-primary tracking-tight">₱ {Math.max(0, total).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="w-1/3 h-14 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={async () => {
              if (cart.length === 0) return;
              
              setApprovalType("CANCEL_ORDER");
              setApprovalRefId("CART_CANCELLATION");
              setPendingAction(() => async () => {
                const reason = prompt("Enter void reason:") || "Manager Cancelled via PIN";
                
                const orderDto: OrderDto = {
                  items: cart.map(i => ({
                    productId: i.id, // Keep productId mapped from the product
                    qty: i.cartQuantity,
                    price: i.price,
                    subTotal: i.itemStatus === 'VOID' ? 0 : (i.customSubtotal ?? (i.price * i.cartQuantity)),
                    status: i.itemStatus || 'PENDING'
                  })),
                  cashTenderAmount: 0
                };
  
                const res = await cancelOrderAction({ order: orderDto, managerIdentifier: "Manager via PIN", reason });
                if (res.success) {
                  clearCart();
                  alert("Order cancelled successfully.");
                } else {
                  alert("Failed to cancel order: " + res.error);
                }
              });
              setApprovalOpen(true);
            }}
            disabled={cart.length === 0}
          >
            Void
          </Button>
          <Button 
            className="w-2/3 md:text-lg h-14 shadow-lg hover:shadow-xl transition-shadow font-semibold"
            onClick={() => setCheckoutOpen(true)}
            disabled={activeCart.length === 0}
          >
            Checkout
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
        onSuccess={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}

// Let's make sure Badge is here.
import { Badge } from '@/components/ui/badge';import { CheckoutModal } from './CheckoutModal';

