import { useMemo } from 'react';
import { usePOSStore, mockProducts, mockCategories } from '../_store/pos-store';
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
    currentPage, setPage, itemsPerPage
  } = usePOSStore();

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.barcode && p.barcode.includes(searchQuery));
      const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategoryId]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header & Controls */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products by name or barcode..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full bg-muted/50 rounded-full"
            />
          </div>
          <div className="flex bg-muted/50 rounded-lg p-1">
            <Button 
              variant={viewMode === 'grid' ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-md"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? "default" : "ghost"} 
              size="icon" 
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-md"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex w-max space-x-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              className="rounded-full px-6"
              onClick={() => setSelectedCategoryId(null)}
            >
              All Items
            </Button>
            {mockCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                className="rounded-full px-6"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.categoryName}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Grid/List */}
      <ScrollArea className="flex-1 p-4 bg-muted/30">
        {paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p>No products found.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4" 
              : "flex flex-col gap-3 pb-4"
          }>
            {paginatedProducts.map(product => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between bg-card text-sm">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </Button>
            <div className="flex items-center px-4 font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
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
