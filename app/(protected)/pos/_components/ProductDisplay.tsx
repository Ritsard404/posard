import { useEffect, useMemo, useState } from 'react';
import { usePOSStore } from '../_store/pos-store';
import { ProductCard } from './ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Search, LayoutGrid, List, Package, ScanLine, Tags, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarcodeScannerPanel } from './BarcodeScannerPanel';
import { useHardwareBarcodeScanner } from '@/lib/scanning/use-hardware-barcode-scanner';
import { findProductByScanValue, normalizeScanValue } from '../_services/scan-product.service';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function ProductDisplay() {
  const isMobile = useIsMobile();
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryBrowserOpen, setCategoryBrowserOpen] = useState(false);
  const [hardwareScannerEnabled, setHardwareScannerEnabled] = useState(false);
  const { 
    searchQuery, setSearchQuery, 
    selectedCategoryId, setSelectedCategoryId,
    viewMode, setViewMode,
    mobileProductView, setMobileProductView,
    currentPage, setPage, itemsPerPage,
    products, categories,
    addToCart,
  } = usePOSStore();

  useHardwareBarcodeScanner({
    enabled: hardwareScannerEnabled,
    onScan: (result) => {
      const scanValue = normalizeScanValue(result.value);
      const product = findProductByScanValue(products, scanValue);

      if (!product) {
        setSearchQuery(scanValue);
        setPage(1);
        toast.error('Barcode not found.', {
          description: `No product matches ${scanValue}.`,
        });
        return;
      }

      const addResult = addToCart(product);

      if (!addResult.success) {
        setSearchQuery(scanValue);
        setPage(1);
        toast.error(
          addResult.reason === 'EXPIRED_STOCK'
            ? 'Expired batch only.'
            : addResult.reason === 'OUT_OF_STOCK'
              ? 'Product is out of stock.'
              : 'Open the product to configure it first.',
          { description: product.name },
        );
        return;
      }

      toast.success('Scanned item added.', {
        description: product.name,
      });
    },
  });

  useEffect(() => {
    if (categoryBrowserOpen) {
      setHardwareScannerEnabled(false);
    }
  }, [categoryBrowserOpen]);

  const activeViewMode = isMobile ? mobileProductView : viewMode;
  const setActiveViewMode = isMobile ? setMobileProductView : setViewMode;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((p) => {
      const matchesSearch =
        !query ||
        [
          p.name,
          p.barcode,
          p.genericName,
          p.brandName,
          p.categoryName,
          p.preferredSupplierName,
        ].some((field) => field?.toLowerCase().includes(query));
      const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategoryId, products]);

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) {
      return categories;
    }

    return categories.filter((cat) =>
      cat.categoryName.toLowerCase().includes(query),
    );
  }, [categories, categorySearch]);

  const hasManyCategories = categories.length > 12;
  const quickCategories = useMemo(() => categories.slice(0, 8), [categories]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div data-testid="pos-product-panel" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r bg-background animate-in fade-in duration-300">
      <div className="shrink-0 space-y-1.5 border-b bg-background p-1.5 sm:p-2.5 lg:p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:gap-2">
          <div className="group relative min-w-0 flex-[1_1_14rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input 
              placeholder="Search name, barcode, generic, brand..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg pl-9 text-sm font-medium transition-all sm:h-10"
            />
          </div>
          <BarcodeScannerPanel className="h-9 min-w-0 flex-[1_1_8.75rem] rounded-lg px-2.5 text-sm sm:h-10 sm:flex-none sm:px-3" />
          <Button
            type="button"
            variant={hardwareScannerEnabled ? 'secondary' : 'outline'}
            className="h-9 min-w-0 flex-[1_1_9rem] rounded-lg px-2.5 text-sm font-bold sm:h-10 sm:flex-none sm:px-3"
            onClick={() => setHardwareScannerEnabled((enabled) => !enabled)}
          >
            <ScanLine className="size-4" />
            {hardwareScannerEnabled ? 'Scanner On' : 'Scanner Off'}
          </Button>
          <div className="grid h-9 shrink-0 grid-cols-2 rounded-lg border bg-card p-0.5 sm:h-10">
            <Button 
              variant={activeViewMode === 'grid' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('grid')}
              className="h-8 rounded-md px-2 sm:h-9"
            >
              <LayoutGrid className="size-4" />
              <span className="text-xs">Grid</span>
            </Button>
            <Button 
              variant={activeViewMode === 'list' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveViewMode('list')}
              className="h-8 rounded-md px-2 sm:h-9"
            >
              <List className="size-4" />
              <span className="text-xs">List</span>
            </Button>
          </div>
        </div>

        {hasManyCategories ? (
          <div className="space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet open={categoryBrowserOpen} onOpenChange={setCategoryBrowserOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 min-w-0 flex-1 justify-between rounded-lg px-3 text-left text-xs font-bold uppercase tracking-wider sm:max-w-80"
                  >
                    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                      <Tags className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {selectedCategory?.categoryName ?? 'All Items'}
                      </span>
                    </span>
                    <ChevronDown className="ml-2 size-4 shrink-0" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isMobile ? 'bottom' : 'right'}
                  className={`flex gap-0 p-0 ${isMobile ? 'h-[78vh] rounded-t-3xl' : 'w-full max-w-md'}`}
                >
                  <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
                    <SheetTitle className="text-base font-bold">Browse Categories</SheetTitle>
                    <SheetDescription>
                      Filter products faster when your category list gets large.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div
                      className="shrink-0 border-b p-4"
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Input
                        value={categorySearch}
                        onChange={(event) => setCategorySearch(event.target.value)}
                        placeholder="Search categories..."
                        className="h-10 rounded-xl text-sm"
                      />
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {filteredCategories.length} visible
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {categories.length} total
                        </p>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <div className="space-y-2">
                          <Button
                            variant={selectedCategoryId === null ? 'default' : 'outline'}
                            className="h-11 w-full justify-start rounded-xl px-3 text-left text-sm font-semibold"
                            onClick={() => {
                              setSelectedCategoryId(null);
                              setPage(1);
                              setCategoryBrowserOpen(false);
                            }}
                          >
                            <Check
                              className={
                                selectedCategoryId === null ? 'mr-2 size-4 opacity-100' : 'mr-2 size-4 opacity-0'
                              }
                            />
                            <span className="truncate">All Items</span>
                          </Button>
                          {filteredCategories.length === 0 ? (
                            <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                              No categories found.
                            </div>
                          ) : (
                            filteredCategories.map((cat) => (
                              <Button
                                key={cat.id}
                                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                                className="h-11 w-full justify-start rounded-xl px-3 text-left text-sm font-semibold"
                                onClick={() => {
                                  setSelectedCategoryId(cat.id);
                                  setPage(1);
                                  setCategoryBrowserOpen(false);
                                }}
                              >
                                <Check
                                  className={
                                    selectedCategoryId === cat.id
                                      ? 'mr-2 size-4 opacity-100'
                                      : 'mr-2 size-4 opacity-0'
                                  }
                                />
                                <span className="truncate">{cat.categoryName}</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {categories.length} categories
              </span>
            </div>

            <div className="relative min-w-0 overflow-hidden">
              <div className="scroll-pb-1 overflow-x-auto pb-1">
                <div className="flex w-max min-w-full gap-1.5">
                  <Button
                    variant={selectedCategoryId === null ? 'default' : 'outline'}
                    className="h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setPage(1);
                    }}
                  >
                    All Items
                  </Button>
                  {selectedCategory && !quickCategories.some((cat) => cat.id === selectedCategory.id) ? (
                    <Button
                      variant="default"
                      className="h-7 max-w-[10rem] shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3 lg:max-w-[12rem]"
                      onClick={() => setCategoryBrowserOpen(true)}
                    >
                      <span className="truncate">{selectedCategory.categoryName}</span>
                    </Button>
                  ) : null}
                  {quickCategories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                      className="h-7 max-w-[10rem] shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3 lg:max-w-[12rem]"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setPage(1);
                      }}
                    >
                      <span className="truncate">{cat.categoryName}</span>
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3"
                    onClick={() => setCategoryBrowserOpen(true)}
                  >
                    Browse All
                  </Button>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-background to-transparent" />
            </div>

            {selectedCategoryId !== null ? (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setPage(1);
                  }}
                >
                  <X className="mr-1 size-3" />
                  Clear Filter
                </Button>
                <span className="truncate">Filtered by {selectedCategory?.categoryName}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative min-w-0 max-w-full overflow-hidden">
            <div className="scroll-pb-1 overflow-x-auto pb-1">
              <div className="flex w-max min-w-full gap-1.5">
              <Button
                variant={selectedCategoryId === null ? 'default' : 'outline'}
                className="h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3"
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
                  className="h-7 max-w-[10rem] shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider sm:h-8 sm:px-3 lg:max-w-[12rem]"
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
        )}
      </div>

      <div data-testid="pos-product-scroll" className="min-h-0 flex-1 overflow-y-auto p-1.5 sm:p-2.5 lg:p-3">
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
              ? "grid min-w-0 grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-1.5 pb-2 sm:gap-2 xl:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
              : "flex flex-col gap-1.5 pb-2 sm:gap-2"
          }>
            {paginatedProducts.map((product, idx) => (
              <div 
                key={product.id} 
                className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                <ProductCard product={product} viewMode={activeViewMode} />
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 flex-col gap-2 border-t bg-card p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:p-2.5">
          <span className="min-w-0 truncate">
            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of {filteredProducts.length}
          </span>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 rounded-lg px-3 font-bold"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </Button>
            <div className="flex items-center px-1 font-heading text-xs text-foreground">
              Page {currentPage} <span className="mx-1.5 font-sans font-medium lowercase italic text-muted-foreground/40">of</span> {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 rounded-lg px-3 font-bold"
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
