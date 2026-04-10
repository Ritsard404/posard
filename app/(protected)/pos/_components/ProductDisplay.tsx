import { useMemo } from 'react';
import { usePOSStore } from '../_store/pos-store';
import { ProductCard } from './ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LayoutGrid, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ProductDisplay() {
  const { 
    searchQuery, setSearchQuery, 
    selectedCategoryId, setSelectedCategoryId,
    viewMode, setViewMode,
    currentPage, setPage, itemsPerPage,
    products, categories
  } = usePOSStore();

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
    <div className="flex flex-col h-full bg-transparent border-r border-white/5 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="p-6 border-b border-white/5 space-y-6 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              placeholder="Search products or scan barcode..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 w-full bg-background/50 rounded-2xl h-12 text-base border-white/10 focus:border-accent/50 focus:ring-0 transition-all font-medium"
            />
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <Button 
              variant={viewMode === 'grid' ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode('list')}
              className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 pb-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              className={`rounded-full px-6 h-10 font-bold text-xs uppercase tracking-widest transition-all ${selectedCategoryId === null ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'}`}
              onClick={() => setSelectedCategoryId(null)}
            >
              All Items
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                className={`rounded-full px-6 h-10 font-bold text-xs uppercase tracking-widest transition-all ${selectedCategoryId === cat.id ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'}`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.categoryName}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Grid/List */}
      <ScrollArea className="flex-1 p-6 bg-white/[0.01]">
        {paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 animate-in fade-in zoom-in-95">
            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Package className="h-10 w-10 opacity-20" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground">No matches found</p>
            <p className="font-medium mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10" 
              : "flex flex-col gap-4 pb-10"
          }>
            {paginatedProducts.map((product, idx) => (
              <div 
                key={product.id} 
                className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <ProductCard product={product} viewMode={viewMode} />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-md text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>
            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of {filteredProducts.length}
          </span>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </Button>
            <div className="flex items-center px-4 font-heading text-foreground text-sm">
              Page {currentPage} <span className="text-muted-foreground/40 lowercase mx-2 italic font-sans font-medium">of</span> {totalPages}
            </div>
            <Button 
              variant="outline" 
              className="h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
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
