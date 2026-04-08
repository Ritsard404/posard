"use client";

import { useEffect, useState } from 'react';
import { ProductDisplay } from './_components/ProductDisplay';
import { CartPanel } from './_components/CartPanel';
import { ShoppingCart, Package } from 'lucide-react';
import { fetchPOSMetaDataAction } from './_actions/pos.action';
import { usePOSStore } from './_store/pos-store';

export default function POSPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");

  const setProducts = usePOSStore(state => state.setProducts);
  const setCategories = usePOSStore(state => state.setCategories);

  useEffect(() => {
    async function loadData() {
      const res = await fetchPOSMetaDataAction();
      if (res.success) {
        setProducts(res.data.products);
        setCategories(res.data.categories);
        // If we want to store epayments we can add that to the store later.
      } else {
        console.error("Failed to load POS metadata:", res.error);
      }
      setMounted(true);
      setLoading(false);
    }
    
    loadData();
  }, [setProducts, setCategories]);

  if (!mounted || loading) return <div className="flex w-full h-[calc(100vh-4rem)] items-center justify-center">Loading POS Data...</div>;

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
