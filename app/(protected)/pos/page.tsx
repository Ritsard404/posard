"use client";

import { useEffect, useState } from 'react';
import { ProductDisplay } from './_components/ProductDisplay';
import { CartPanel } from './_components/CartPanel';

export default function POSPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Basic hydration strategy for mock state if strictly required. 
    // Mostly required to prevent hydration mismatch from local state vs server rendering.
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-muted/10">
      <div className="flex-1 overflow-hidden h-full">
        <ProductDisplay />
      </div>
      <CartPanel />
    </div>
  );
}
