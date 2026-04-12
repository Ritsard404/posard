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
  const { cart, updateCartQuantity, removeFromCart, clearCart, discount, updateItemSubtotal, activeTerminal } = usePOSStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  // Manager Approval State
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<"VOID_ITEM" | "CANCEL_ORDER">("VOID_ITEM");
  const [approvalRefId, setApprovalRefId] = useState("");
  const [pendingAction, setPendingAction] = useState<((manager: { email: string, name: string }) => void) | null>(null);

  const { activeTimestampId } = usePOSStore();

  const activeCart = cart.filter(item => item.itemStatus !== 'VOID');
  const subtotal = activeCart.reduce((sum, item) => sum + (item.customSubtotal ?? (item.price * item.cartQuantity)), 0);
  
  // ... (omitting calculation logic for brevity in this chunk)
  
  // Update the void button onClick
  // ...
  
  const terminalVat = activeTerminal?.vat ?? 12;
  const vatMultiplier = 1 + (terminalVat / 100);
  const vatRate = terminalVat / 100;

  // Calculate discount logic: 
  // PWD / Senior Citizen generally means VAT exempt (divide by vatMultiplier to remove VAT)
  // And then 20% off from the VAT-exempt amount.
  let discountAmount = 0;
  if (discount === 'PWD' || discount === 'SENIOR') {
    const vatableAmount = activeCart.filter(item => item.vatType === 'VATABLE')
                              .reduce((sum, item) => sum + (item.customSubtotal ?? (item.price * item.cartQuantity)), 0);
    const nonVatableAmount = subtotal - vatableAmount;
    
    // Convert vatable to vatexempt
    const vatExemptAmount = vatableAmount / vatMultiplier;
    // 20% discount on both vat exempt and natively non-vatable
    discountAmount = (vatExemptAmount + nonVatableAmount) * 0.20;
    // Plus the VAT that was removed
    discountAmount += (vatableAmount - vatExemptAmount);
  }

  const taxDerived = (discount === 'PWD' || discount === 'SENIOR' || terminalVat === 0) ? 0 : subtotal - (subtotal / vatMultiplier);
  
  const total = subtotal - discountAmount;

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl w-full relative z-10 border-l shadow-[-20px_0_50px_rgba(0,0,0,0.05)] animate-in slide-in-from-right-4 duration-500">
      <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <ShoppingCart className="size-5 text-primary" />
          </div>
          <h2 className="font-heading font-black text-xl tracking-tight text-foreground">Active Cart</h2>
        </div>
        <Badge variant="secondary" className="bg-primary/5 border-primary/10 px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-primary">
          {activeCart.length} {activeCart.length === 1 ? 'Item' : 'Items'}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 animate-in fade-in zoom-in-95">
            <div className="size-24 rounded-full bg-muted/50 border flex items-center justify-center mb-6">
              <ShoppingCart className="size-10 opacity-20" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground">Cart is empty</p>
            <p className="font-medium mt-1">Start scanning products...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item, idx) => {
              const isVoid = item.itemStatus === 'VOID';
              return (
              <div 
                key={item.cartItemId} 
                className={`flex flex-col glass-card p-4 transition-all animate-in fade-in slide-in-from-right-2 ${isVoid ? 'opacity-40 grayscale blur-[0.5px]' : 'hover:border-primary/20'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4 min-w-0">
                    <h4 className="font-heading font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">{item.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">₱ {item.price.toFixed(2)} / {item.baseUnit || 'PC'}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-lg border">
                      <span className="text-[10px] font-bold text-muted-foreground/40">₱</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`h-7 w-20 border-none bg-transparent p-0 text-right font-black text-sm focus-visible:ring-0 ${item.customSubtotal !== undefined ? 'text-primary' : 'text-foreground/80'}`}
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
                      <span className="text-[8px] text-primary mt-1 mr-1 uppercase font-black tracking-widest animate-pulse">Manual Overwrite</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 rounded-lg ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity - 1)}
                      disabled={isVoid}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <div className={`w-10 text-center font-black text-sm tracking-tighter ${isVoid && 'line-through text-destructive'}`}>
                      {item.cartQuantity}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 rounded-lg ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity + 1)}
                      disabled={isVoid}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {isVoid ? (
                    <Badge variant="destructive" className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5">Voided</Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all border border-destructive/10"
                      onClick={() => {
                        setApprovalType("VOID_ITEM");
                        setApprovalRefId(item.cartItemId);
                        setPendingAction(() => (_manager: any) => removeFromCart(item.cartItemId));
                        setApprovalOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <div className="p-4 lg:p-6 border-t bg-card/80 backdrop-blur-2xl">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            <span>Aggregated Subtotal</span>
            <span className="font-sans font-bold text-foreground">₱ {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-destructive animate-pulse">
              <span>Adjustment ({discount})</span>
              <span className="font-sans font-bold">- ₱ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {discount === 'NONE' && taxDerived > 0 && (
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
               <span>VAT (Int. {terminalVat}%)</span>
               <span className="font-sans">₱ {taxDerived.toFixed(2)}</span>
             </div>
          )}
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-4" />
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary transition-colors">Total Amount</span>
               <span className="text-[10px] text-muted-foreground font-medium italic">Inc. all applicable taxes</span>
            </div>
            <span className="font-heading font-black text-4xl lg:text-5xl text-foreground tracking-tighter drop-shadow-sm">₱ {Math.max(0, total).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="w-1/4 h-14 rounded-xl border-border bg-background text-destructive font-bold uppercase tracking-wider text-[10px] hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm active:scale-95 group"
            onClick={async () => {
              if (cart.length === 0) return;
              
              setApprovalType("CANCEL_ORDER");
              setApprovalRefId(activeTimestampId || "");
              setPendingAction(() => async (manager: { email: string, name: string }) => {
                const reason = prompt("Enter void reason:") || "Manager Cancelled via PIN";
                
                const orderDto: OrderDto = {
                  items: cart.map(i => ({
                    productId: i.id,
                    qty: i.cartQuantity,
                    price: i.price,
                    subTotal: i.itemStatus === 'VOID' ? 0 : (i.customSubtotal ?? (i.price * i.cartQuantity)),
                    status: i.itemStatus || 'PENDING'
                  })),
                  cashTenderAmount: 0
                };
  
                const res = await cancelOrderAction({ 
                  order: orderDto, 
                  managerIdentifier: manager.email, // Use manager's email from modal
                  reason 
                });
                
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
            <div className="flex flex-col items-center">
              <Trash2 className="size-4 mb-1 group-hover:rotate-12 transition-transform" />
              Void
            </div>
          </Button>
          <Button 
            className="flex-1 h-14 lg:h-16 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-black text-lg lg:text-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all group"
            onClick={() => setCheckoutOpen(true)}
            disabled={activeCart.length === 0}
          >
            Checkout
            <ChevronRight className="size-6 ml-2 group-hover:translate-x-1 transition-transform" />
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

// Let's make sure Badge is here.
import { Badge } from '@/components/ui/badge';
import { CheckoutModal } from './CheckoutModal';
import { ChevronRight } from 'lucide-react';

