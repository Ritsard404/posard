import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product, usePOSStore, mockCategories } from '../_store/pos-store';
import { Package, Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const addToCart = usePOSStore((state) => state.addToCart);
  const categoryName = mockCategories.find(c => c.id === product.categoryId)?.categoryName || 'Uncategorized';

  const handleAdd = () => {
    addToCart(product);
  };

  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row items-center justify-between p-4 cursor-pointer hover:border-primary transition-colors hover:shadow-md" onClick={handleAdd}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center">
            {product.productImageUrl ? (
              <img src={product.productImageUrl} alt={product.name} className="h-full w-full object-cover rounded-md" />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{categoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-bold text-xl text-primary">₱ {product.price.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{product.quantity} {product.baseUnit} in stock</p>
          </div>
          <Button size="icon" variant="secondary" className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col cursor-pointer overflow-hidden group hover:shadow-lg transition-all border-border hover:border-primary h-full" onClick={handleAdd}>
      <CardHeader className="p-0">
        <div className="aspect-[4/3] bg-muted w-full flex items-center justify-center overflow-hidden relative">
          {product.productImageUrl ? (
            <img src={product.productImageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground/50 transition-transform group-hover:scale-110" />
          )}
          <Badge className="absolute top-2 right-2 bg-background/80 text-foreground backdrop-blur-sm shadow-sm" variant="secondary">
            {categoryName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-semibold leading-tight line-clamp-2 mb-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{product.barcode || 'NO BARCODE'}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-end">
        <div>
          <p className="text-xs text-muted-foreground mb-1">In Stock: {product.quantity}</p>
          <p className="font-bold text-lg text-primary">₱ {product.price.toFixed(2)}</p>
        </div>
        <Button size="icon" className="h-8 w-8 rounded-full shadow-sm" variant="default">
          <Plus className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
