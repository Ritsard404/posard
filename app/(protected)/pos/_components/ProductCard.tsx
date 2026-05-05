import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product, usePOSStore } from '../_store/pos-store';
import { Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { StorageImage } from '@/components/storage/StorageImage';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const isMobile = useIsMobile();
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
          "group flex min-w-0 flex-row items-center justify-between gap-2 border bg-card p-2 transition-all",
          isOutOfStock ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : "cursor-pointer border-border active:scale-[0.99]"
        )} 
        onClick={() => !isOutOfStock && handleAdd()}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className={cn(
            "rounded-lg flex items-center justify-center border border-border overflow-hidden relative",
            isMobile ? "size-12" : "size-12 bg-muted/50",
          )}>
            <StorageImage
              src={product.productImageUrl}
              alt={product.name}
              fill
              sizes="48px"
              className="h-full w-full rounded-lg object-cover"
              fallback={<Package className="size-6 text-muted-foreground/30" />}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter -rotate-12 border border-white px-1">WALA</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-sm font-bold leading-tight lg:text-[15px]">{product.name}</h3>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">{categoryName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pr-0.5 sm:gap-2">
          <div className="text-right">
            <p className="font-heading text-lg font-black tracking-tighter text-primary lg:text-xl">₱{product.price.toFixed(2)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">
              {product.quantity} {product.baseUnit || 'PCS'}
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            disabled={isOutOfStock}
            className="h-8 rounded-lg border-primary/20 bg-primary/5 px-2.5 text-primary disabled:opacity-50"
          >
            <Plus className="size-4" />
            <span>Add</span>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden group border-border transition-all duration-300 h-full bg-card",
        isOutOfStock ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : "cursor-pointer hover:border-primary/40"
      )} 
      onClick={() => !isOutOfStock && handleAdd()}
    >
      <CardHeader className="p-0 relative">
        <div className="aspect-[7/4] bg-muted/20 w-full flex items-center justify-center overflow-hidden relative sm:aspect-[5/3]">
          <StorageImage
            src={product.productImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 767px) 50vw, 25vw"
            className="h-full w-full object-cover"
            fallback={<Package className="size-10 text-muted-foreground/10" />}
          />
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
               <div className="border-2 border-white px-3 py-1 -rotate-12 animate-in zoom-in-50 duration-300">
                 <span className="text-lg font-black text-white uppercase tracking-tighter">Wala na</span>
               </div>
            </div>
          )}
          
          <Badge className="absolute right-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate bg-background/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md" variant="secondary">
            {categoryName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col justify-between p-1.5 sm:p-2 lg:p-2.5">
        <div className="mb-1 min-w-0">
          <h3 className="line-clamp-2 min-h-8 font-heading text-[13px] font-bold leading-tight tracking-tight transition-colors group-hover:text-primary sm:text-sm lg:text-[15px]">{product.name}</h3>
          <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">{product.barcode || 'NO BARCODE'}</p>
        </div>
        
        <div className="space-y-1 border-t pt-1 lg:space-y-1.5 lg:pt-2">
          <div className="flex justify-between items-end">
             <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Stock</span>
              <span className={`text-xs font-black ${product.trackInventory && product.quantity <= 10 ? 'text-amber-500' : 'text-muted-foreground'}`}>{product.quantity}</span>
            </div>
            <div className="text-right">
              <p className="font-heading text-base font-black leading-none tracking-tighter text-primary sm:text-lg xl:text-xl">₱{product.price.toFixed(2)}</p>
            </div>
          </div>
          
          <Button 
            size="sm" 
            disabled={isOutOfStock}
            className="group/btn flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 sm:h-9 sm:gap-2"
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
