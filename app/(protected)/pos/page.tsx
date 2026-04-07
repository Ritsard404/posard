"use client";

import { useEffect, useState } from 'react';
import { ProductDisplay } from './_components/ProductDisplay';
import { CartPanel } from './_components/CartPanel';
import { ShoppingCart, Package } from 'lucide-react';

export default function POSPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");

  useEffect(() => {
    // Basic hydration strategy for mock state if strictly required. 
    // Mostly required to prevent hydration mismatch from local state vs server rendering.
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-muted/10">
      <div className="flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className={`flex-1 h-full overflow-hidden ${activeTab === 'products' ? 'block' : 'hidden md:block'}`}>
          <ProductDisplay />
        </div>
        
        {/* Cart Section */}
        <div className={`w-full md:w-[400px] xl:w-[450px] h-full border-t md:border-t-0 md:border-l ${activeTab === 'cart' ? 'block' : 'hidden md:block'}`}>
          <CartPanel />
        </div>
      </div>

      {/* Bottom Nav Mobile */}
      <div className="md:hidden flex-none h-[60px] flex border-t bg-background">
        <button 
          onClick={() => setActiveTab("products")} 
          className={`flex-1 flex flex-col items-center justify-center p-2 transition-colors ${activeTab === "products" ? "text-primary border-t-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          <Package className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Products</span>
        </button>
        <button 
          onClick={() => setActiveTab("cart")} 
          className={`flex-1 flex flex-col items-center justify-center p-2 transition-colors ${activeTab === "cart" ? "text-primary border-t-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          <ShoppingCart className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Cart</span>
        </button>
      </div>
    </div>
  );
}
