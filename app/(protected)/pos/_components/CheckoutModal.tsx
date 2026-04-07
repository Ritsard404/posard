import { useState } from 'react';
import { usePOSStore, DiscountType, PaymentMethodType } from '../_store/pos-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Receipt, CreditCard, Banknote, FileText, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
}

export function CheckoutModal({ open, onOpenChange, totalAmount }: CheckoutModalProps) {
  const { cart, discount, setDiscount, paymentMethod, setPaymentMethod, amountTendered, setAmountTendered, clearCart } = usePOSStore();
  const [step, setStep] = useState<'PAYMENT' | 'RECEIPT'>('PAYMENT');

  const change = amountTendered - totalAmount;
  const isTenderValid = paymentMethod !== 'CASH' || amountTendered >= totalAmount;

  const handleQuickCash = (amount: number) => {
    setAmountTendered((amountTendered || 0) + amount);
  };

  const handleComplete = () => {
    if (!isTenderValid) return;
    setStep('RECEIPT');
  };

  const handleClose = () => {
    setStep('PAYMENT');
    setAmountTendered(0);
    setDiscount('NONE');
    setPaymentMethod('CASH');
    clearCart();
    onOpenChange(false);
  };

  const paymentMethods: { id: PaymentMethodType, label: string, icon: any }[] = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'GCASH', label: 'GCash', icon: CreditCard },
    { id: 'MAYA', label: 'Maya', icon: CreditCard },
    { id: 'CARD', label: 'Card', icon: CreditCard },
  ];

  const discounts: { id: DiscountType, label: string }[] = [
    { id: 'NONE', label: 'None' },
    { id: 'PWD', label: 'PWD (20% + VAT Exempt)' },
    { id: 'SENIOR', label: 'Senior (20% + VAT Exempt)' },
  ];

  if (step === 'RECEIPT') {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border/60">
          <div className="bg-primary p-6 text-primary-foreground flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-16 w-16 mb-4 text-green-400" />
            <h2 className="text-2xl font-bold tracking-tight">Payment Successful</h2>
            <p className="text-primary-foreground/80 mt-1">Receipt has been generated.</p>
          </div>
          
          <ScrollArea className="max-h-[50vh] bg-secondary/30 p-6 font-mono text-sm">
            <div className="text-center mb-6">
              <h3 className="font-bold text-lg uppercase">Baisard POS</h3>
              <p className="text-xs text-muted-foreground">123 Business Road, City</p>
              <p className="text-xs text-muted-foreground">TIN: 000-000-000-000</p>
              <div className="mt-4 border-t border-dashed border-border pt-4">
                <p className="text-xs text-left">Date: {new Date().toLocaleString()}</p>
                <p className="text-xs text-left">Terminal: POS-01</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between font-bold border-b border-dashed border-border pb-2">
                <span>ITEM</span>
                <span>AMOUNT</span>
              </div>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="w-2/3 truncate">{item.cartQuantity}x {item.name}</span>
                  <span>{(item.price * item.cartQuantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-6 border-y border-dashed border-border py-4">
              <div className="flex justify-between font-bold text-base">
                <span>TOTAL</span>
                <span>PHP {totalAmount.toFixed(2)}</span>
              </div>
              {discount !== 'NONE' && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>DISCOUNT ({discount})</span>
                  <span>APPLIED</span>
                </div>
              )}
              <div className="flex justify-between text-xs mt-2">
                <span>TENDERED ({paymentMethod})</span>
                <span>{paymentMethod === 'CASH' ? amountTendered.toFixed(2) : totalAmount.toFixed(2)}</span>
              </div>
              {paymentMethod === 'CASH' && (
                <div className="flex justify-between text-xs">
                  <span>CHANGE</span>
                  <span>{change.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-muted-foreground pb-4">
              <p>Thank you for shopping!</p>
              <p>Please come again.</p>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-4 bg-background border-t border-border">
            <Button onClick={handleClose} className="w-full h-12 text-lg">New Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 flex overflow-hidden">
        {/* Left Side: Summary & Settings */}
        <div className="w-1/2 p-6 bg-muted/20 border-r border-border flex flex-col">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Checkout
            </DialogTitle>
            <DialogDescription>
              Complete payment and generate receipt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 flex-grow">
            <div className="bg-background rounded-lg p-4 border border-border shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
              <p className="text-4xl font-black text-primary tracking-tighter">₱ {totalAmount.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider">Discount Type</Label>
              <div className="flex flex-col gap-2">
                {discounts.map(d => (
                  <Button 
                    key={d.id} 
                    variant={discount === d.id ? "default" : "outline"}
                    className={`justify-start ${discount === d.id ? 'ring-2 ring-primary/20 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : ''}`}
                    onClick={() => setDiscount(d.id)}
                  >
                    {discount === d.id && <Check className="h-4 w-4 mr-2" />}
                    <span className={discount !== d.id ? "ml-6" : ""}>{d.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Logic */}
        <div className="w-1/2 flex flex-col p-6 bg-background">
          <div className="space-y-3 mb-6">
             <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider">Payment Method</Label>
             <div className="grid grid-cols-2 gap-2">
               {paymentMethods.map(pm => (
                 <Button
                    key={pm.id}
                    variant={paymentMethod === pm.id ? "default" : "outline"}
                    className="h-14 flex flex-col items-center justify-center gap-1"
                    onClick={() => {
                      setPaymentMethod(pm.id);
                      if (pm.id !== 'CASH') setAmountTendered(totalAmount);
                    }}
                 >
                   <pm.icon className="h-5 w-5" />
                   <span className="text-xs">{pm.label}</span>
                 </Button>
               ))}
             </div>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="space-y-4 mb-6 flex-grow">
              <div className="space-y-2">
                <Label htmlFor="tendered">Amount Tendered</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₱</span>
                  <Input 
                    id="tendered"
                    type="number" 
                    value={amountTendered || ''} 
                    onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                    className="pl-8 text-2xl h-14 font-semibold font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(amt => (
                  <Button key={amt} variant="outline" className="h-12 bg-muted/40" onClick={() => handleQuickCash(amt)}>
                    + {amt}
                  </Button>
                ))}
                <Button variant="outline" className="h-12 bg-muted/40 col-span-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setAmountTendered(0)}>
                  Clear Amount
                </Button>
              </div>

              <div className={`mt-4 p-4 rounded-lg flex justify-between items-center ${change >= 0 ? 'bg-secondary/50 border border-secondary' : 'bg-destructive/10 border border-destructive/20'}`}>
                <span className="font-semibold text-muted-foreground">Change</span>
                <span className={`text-2xl font-bold font-mono ${change < 0 ? 'text-destructive' : 'text-primary'}`}>
                  ₱ {Math.max(0, change).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod !== 'CASH' && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-lg mb-6 bg-muted/10 opacity-70">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium">Waiting for {paymentMethods.find(m => m.id === paymentMethod)?.label} transaction...</p>
              <p className="text-sm text-muted-foreground mt-2">Amount: ₱ {totalAmount.toFixed(2)}</p>
            </div>
          )}

          <div className="mt-auto">
            <Button 
              className="w-full h-14 text-lg font-bold shadow-md"
              size="lg"
              disabled={!isTenderValid}
              onClick={handleComplete}
            >
              Confirm & Render Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
