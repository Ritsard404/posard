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
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl w-full relative z-10 border-l border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.2)] animate-in slide-in-from-right-4 duration-500">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <ShoppingCart className="h-4 w-4 text-accent" />
          </div>
          <h2 className="font-heading font-extrabold text-xl tracking-tight">Active Cart</h2>
        </div>
        <Badge variant="secondary" className="glass-card border-white/10 px-3 py-1 font-bold text-[10px] uppercase tracking-widest text-accent">
          {activeCart.length} {activeCart.length === 1 ? 'Item' : 'Items'}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 animate-in fade-in zoom-in-95">
            <div className="size-24 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
              <ShoppingCart className="h-10 w-10 opacity-20" />
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
                className={`flex flex-col glass-card p-4 border-white/5 transition-all animate-in fade-in slide-in-from-right-2 ${isVoid ? 'opacity-40 grayscale blur-[0.5px]' : 'hover:border-white/10'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4 min-w-0">
                    <h4 className="font-heading font-bold text-sm tracking-tight truncate group-hover:text-accent transition-colors">{item.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">₱ {item.price.toFixed(2)} / {item.baseUnit || 'PC'}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-background/40 p-1.5 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold text-muted-foreground/40">₱</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`h-7 w-20 border-none bg-transparent p-0 text-right font-black text-sm focus-visible:ring-0 ${item.customSubtotal !== undefined ? 'text-accent' : 'text-foreground/80'}`}
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
                      <span className="text-[8px] text-accent mt-1 mr-1 uppercase font-black tracking-widest animate-pulse">Manual Overwrite</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 rounded-lg ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity - 1)}
                      disabled={isVoid}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className={`w-10 text-center font-black text-sm tracking-tighter ${isVoid && 'line-through text-destructive'}`}>
                      {item.cartQuantity}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 rounded-lg ${isVoid ? 'opacity-50' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'}`}
                      onClick={() => !isVoid && updateCartQuantity(item.cartItemId, item.cartQuantity + 1)}
                      disabled={isVoid}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {isVoid ? (
                    <Badge variant="destructive" className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border-transparent">Voided</Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                      onClick={() => {
                        setApprovalType("VOID_ITEM");
                        setApprovalRefId(item.cartItemId);
                        setPendingAction(() => () => removeFromCart(item.cartItemId));
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

      <div className="p-6 border-t border-white/5 bg-white/[0.03] backdrop-blur-2xl">
        <div className="space-y-4 mb-8">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <span>Aggregated Subtotal</span>
            <span className="font-sans font-bold">₱ {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-red-500 animate-pulse">
              <span>Adjustment ({discount})</span>
              <span className="font-sans font-bold">- ₱ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {discount === 'NONE' && taxDerived > 0 && (
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
               <span>VAT (Int. 12%)</span>
               <span className="font-sans">₱ {taxDerived.toFixed(2)}</span>
             </div>
          )}
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent group-hover:text-accent/80 transition-colors">Total Amount</span>
               <span className="text-xs text-muted-foreground font-medium italic">Inc. all applicable taxes</span>
            </div>
            <span className="font-heading font-black text-5xl text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">₱ {Math.max(0, total).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="w-1/4 h-14 rounded-2xl border-white/5 bg-white/5 text-red-500 font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 group"
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
            <div className="flex flex-col items-center">
              <Trash2 className="size-4 mb-1 group-hover:rotate-12 transition-transform" />
              Void
            </div>
          </Button>
          <Button 
            className="flex-1 h-16 rounded-2xl bg-accent hover:bg-accent/90 text-white font-heading font-black text-xl uppercase tracking-widest glow-on-hover shadow-2xl active:scale-95 transition-all group"
            onClick={() => setCheckoutOpen(true)}
            disabled={activeCart.length === 0}
          >
            Checkout Flow
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
import { Badge } from '@/components/ui/badge';
import { CheckoutModal } from './CheckoutModal';
import { ChevronRight } from 'lucide-react';

