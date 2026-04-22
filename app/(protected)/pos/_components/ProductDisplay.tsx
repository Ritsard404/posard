import { useMemo } from 'react';
import { usePOSStore } from '../_store/pos-store';
import { ProductCard } from './ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LayoutGrid, List, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarcodeScannerPanel } from './BarcodeScannerPanel';

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
    <div className="flex h-full min-h-0 flex-col border-r bg-background animate-in fade-in duration-300">
      <div className="shrink-0 space-y-2 border-b bg-background p-2.5 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="group relative min-w-[12rem] flex-[1_1_16rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary sm:left-4 sm:size-5" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-xl pl-10 text-sm font-medium transition-all sm:pl-12 sm:text-base"
            />
          </div>
          <BarcodeScannerPanel className="min-w-[9.75rem] flex-[1_1_9.75rem] sm:flex-none" />
          <div className="grid h-11 shrink-0 grid-cols-2 rounded-xl border bg-card p-1">
            <Button 
              variant={activeViewMode === 'grid' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('grid')}
              className="h-9 rounded-lg px-2 sm:px-3"
            >
              <LayoutGrid className="size-4" />
              <span className="text-xs sm:text-sm">Grid</span>
            </Button>
            <Button 
              variant={activeViewMode === 'list' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('list')}
              className="h-9 rounded-lg px-2 sm:px-3"
            >
              <List className="size-4" />
              <span className="text-xs sm:text-sm">List</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="scroll-pb-1 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              className="h-8 shrink-0 rounded-full px-3.5 text-[10px] font-bold uppercase tracking-wider"
              onClick={() => {
                setSelectedCategoryId(null);
                setPage(1);
              }}
            >
              All Items
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                className="h-8 max-w-[14rem] shrink-0 rounded-full px-3.5 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setPage(1);
                }}
              >
                <span className="truncate">{cat.categoryName}</span>
              </Button>
            ))}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-background to-transparent" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
        {paginatedProducts.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in zoom-in-95">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Package className="size-10 opacity-20" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground">No matches found</p>
            <p className="font-medium mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className={
            activeViewMode === 'grid' 
              ? "grid grid-cols-2 gap-2.5 pb-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "flex flex-col gap-2 pb-3"
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
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 flex-col gap-2 border-t bg-card p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:p-3">
          <span>
            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of {filteredProducts.length}
          </span>
          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
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
