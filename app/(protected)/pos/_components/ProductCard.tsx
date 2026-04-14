import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product, usePOSStore } from '../_store/pos-store';
import { Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const addToCart = usePOSStore((state) => state.addToCart);
  const categories = usePOSStore((state) => state.categories);
  const categoryName = categories.find(c => c.id === product.categoryId)?.categoryName || 'Uncategorized';
  const isOutOfStock = product.trackInventory && product.quantity <= 0;

  const handleAdd = () => {
    const result = addToCart(product);

    if (!result.success) {
      toast.error(
        result.reason === 'OUT_OF_STOCK' ? 'Wala nang stock.' : 'Naabot na ang stock limit.',
        {
          description: 'Hindi na puwedeng dagdagan ang tracked item na ito.',
          duration: 5000,
        },
      );
    }
  };

  if (viewMode === 'list') {
    return (
      <Card 
        className={cn(
          "flex flex-row items-center justify-between p-3 glass-card border-border transition-all group shadow-sm bg-card/50",
          isOutOfStock ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : "cursor-pointer hover:border-primary/40 hover:scale-[1.01] active:scale-[0.99]"
        )} 
        onClick={() => !isOutOfStock && handleAdd()}
      >
        <div className="flex items-center gap-4">
          <div className="size-14 bg-muted/50 rounded-lg flex items-center justify-center border border-border overflow-hidden relative">
            {product.productImageUrl ? (
              <Image
                src={product.productImageUrl}
                alt={product.name}
                fill
                sizes="56px"
                className="h-full w-full object-cover rounded-lg transition-transform group-hover:scale-110"
              />
            ) : (
              <Package className="size-7 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter -rotate-12 border border-white px-1">WALA</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm lg:text-base leading-tight group-hover:text-primary transition-colors truncate max-w-[150px] lg:max-w-none">{product.name}</h3>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">{categoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 lg:gap-6 pr-1">
          <div className="text-right">
            <p className="font-heading font-black text-xl text-primary tracking-tighter">₱{product.price.toFixed(2)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">
              {product.quantity} {product.baseUnit || 'PCS'}
            </p>
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            disabled={isOutOfStock}
            className="size-9 rounded-lg border-primary/20 bg-primary/5 text-primary shadow-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden group glass-card border-border transition-all duration-300 h-full bg-card/50",
        isOutOfStock ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : "cursor-pointer hover:border-primary/40 hover:shadow-lg"
      )} 
      onClick={() => !isOutOfStock && handleAdd()}
    >
      <CardHeader className="p-0 relative">
        <div className="aspect-square bg-muted/20 w-full flex items-center justify-center overflow-hidden relative">
          {product.productImageUrl ? (
            <Image
              src={product.productImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 767px) 50vw, 25vw"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <Package className="size-12 text-muted-foreground/10 transition-transform duration-500 group-hover:scale-110" />
          )}
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
               <div className="border-4 border-white px-4 py-1 -rotate-12 animate-in zoom-in-50 duration-300">
                 <span className="text-2xl font-black text-white uppercase tracking-tighter">Wala na</span>
               </div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <Badge className="absolute top-2 right-2 bg-background/80 text-foreground backdrop-blur-md border shadow-sm font-bold text-[8px] uppercase tracking-wider px-2 py-0.5" variant="secondary">
            {categoryName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 lg:p-4 flex-grow flex flex-col justify-between">
        <div className="mb-3">
          <h3 className="font-heading font-bold text-sm lg:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors tracking-tight h-10">{product.name}</h3>
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">{product.barcode || 'NO BARCODE'}</p>
        </div>
        
        <div className="space-y-3 pt-3 border-t">
          <div className="flex justify-between items-end">
             <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Stock</span>
              <span className={`text-xs font-black ${product.trackInventory && product.quantity <= 10 ? 'text-amber-500' : 'text-muted-foreground'}`}>{product.quantity}</span>
            </div>
            <div className="text-right">
              <p className="font-heading font-black text-xl text-primary tracking-tighter leading-none">₱{product.price.toFixed(2)}</p>
            </div>
          </div>
          
          <Button 
            size="sm" 
            disabled={isOutOfStock}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 flex items-center justify-center gap-2 group/btn transition-all active:scale-95 disabled:opacity-50" 
            variant="default"
          >
            <Plus className="size-4 group-hover/btn:scale-125 transition-transform" />
            <span className="font-bold text-[10px] uppercase tracking-wider">{isOutOfStock ? 'No Stock' : 'Add to Cart'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
