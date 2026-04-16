import { useMemo } from 'react';
import { usePOSStore } from '../_store/pos-store';
import { ProductCard } from './ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LayoutGrid, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

export function ProductDisplay() {
  const isMobile = useIsMobile();
  const { 
    searchQuery, setSearchQuery, 
    selectedCategoryId, setSelectedCategoryId,
    viewMode, setViewMode,
    mobileProductView, setMobileProductView,
    currentPage, setPage, itemsPerPage,
    products, categories
  } = usePOSStore();

  const activeViewMode = isMobile ? mobileProductView : viewMode;
  const setActiveViewMode = isMobile ? setMobileProductView : setViewMode;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.barcode && p.barcode.includes(searchQuery));
      const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategoryId, products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-background border-r animate-in fade-in duration-300">
      <div className="border-b bg-background p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 w-full rounded-xl h-12 text-base transition-all font-medium"
            />
          </div>
          <div className="flex rounded-xl border bg-card p-1">
            <Button 
              variant={activeViewMode === 'grid' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('grid')}
              className="h-10 rounded-lg px-3"
            >
              <LayoutGrid className="size-5" />
              Grid
            </Button>
            <Button 
              variant={activeViewMode === 'list' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('list')}
              className="h-10 rounded-lg px-3"
            >
              <List className="size-5" />
              List
            </Button>
          </div>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 pb-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              className="rounded-full px-5 h-9 font-bold text-[10px] uppercase tracking-wider"
              onClick={() => setSelectedCategoryId(null)}
            >
              All Items
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                className="rounded-full px-5 h-9 font-bold text-[10px] uppercase tracking-wider"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.categoryName}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 p-4 lg:p-6">
        {paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 animate-in fade-in zoom-in-95">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Package className="size-10 opacity-20" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground">No matches found</p>
            <p className="font-medium mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className={
            activeViewMode === 'grid' 
              ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10" 
              : "flex flex-col gap-3 pb-10"
          }>
            {paginatedProducts.map((product, idx) => (
              <div 
                key={product.id} 
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                <ProductCard product={product} viewMode={activeViewMode} />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between bg-card text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>
            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of {filteredProducts.length}
          </span>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-3 rounded-lg font-bold"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </Button>
            <div className="flex items-center px-2 font-heading text-foreground text-xs">
              Page {currentPage} <span className="text-muted-foreground/40 lowercase mx-2 italic font-sans font-medium">of</span> {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-3 rounded-lg font-bold"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Ensure Package icon is imported even if we fallback to error block
import { Package } from 'lucide-react';
