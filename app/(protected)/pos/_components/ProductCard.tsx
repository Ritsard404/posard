import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product, usePOSStore } from '../_store/pos-store';
import { Package, Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const addToCart = usePOSStore((state) => state.addToCart);
  const categories = usePOSStore((state) => state.categories);
  const categoryName = categories.find(c => c.id === product.categoryId)?.categoryName || 'Uncategorized';

  const handleAdd = () => {
    addToCart(product);
  };

  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row items-center justify-between p-4 glass-card border-white/5 cursor-pointer hover:border-accent/40 transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-xl" onClick={handleAdd}>
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden group-hover:border-accent/30 transition-colors">
            {product.productImageUrl ? (
              <img src={product.productImageUrl} alt={product.name} className="h-full w-full object-cover rounded-xl transition-transform group-hover:scale-110" />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground/40 group-hover:text-accent/60 transition-colors" />
            )}
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg leading-tight group-hover:text-accent transition-colors">{product.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">{categoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-8 pr-2">
          <div className="text-right">
            <p className="font-heading font-extrabold text-2xl text-accent tracking-tighter">₱ {product.price.toFixed(2)}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mt-0.5">{product.quantity} {product.baseUnit || 'PCS'} STK</p>
          </div>
          <Button size="icon" variant="secondary" className="size-10 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 border-transparent hover:bg-accent/90">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col cursor-pointer overflow-hidden group glass-card border-white/5 transition-all duration-300 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 h-full relative group shadow-xl" onClick={handleAdd}>
      <CardHeader className="p-0 relative">
        <div className="aspect-[4/3] bg-white/[0.02] w-full flex items-center justify-center overflow-hidden relative">
          {product.productImageUrl ? (
            <img src={product.productImageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <Badge className="absolute top-2 right-2 bg-black/60 text-white backdrop-blur-md border-white/10 shadow-sm font-bold text-[9px] uppercase tracking-widest px-2 py-0.5" variant="secondary">
            {categoryName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="font-heading font-bold text-base leading-tight line-clamp-2 group-hover:text-accent transition-colors tracking-tight h-10">{product.name}</h3>
          <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1.5">{product.barcode || 'NO BARCODE'}</p>
        </div>
        
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex justify-between items-end">
             <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-0.5">Stock</span>
              <span className={`text-xs font-bold ${product.quantity <= 10 ? 'text-amber-500' : 'text-foreground/60'}`}>{product.quantity}</span>
            </div>
            <div className="text-right">
              <p className="font-heading font-extrabold text-xl text-accent tracking-tighter leading-none">₱ {product.price.toFixed(2)}</p>
            </div>
          </div>
          
          <Button size="icon" className="w-full h-10 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 border-transparent hover:bg-accent/90 glow-on-hover flex items-center justify-center gap-2 group/btn" variant="default">
            <Plus className="h-4 w-4 group-hover/btn:scale-125 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">Add to Cart</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
