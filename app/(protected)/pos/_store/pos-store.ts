import { create } from 'zustand';

// Product type derived from Prisma Schema
export type ItemType = 'RESALE' | 'WHOLESALE';
export type VatType = 'VATABLE' | 'EXEMPT' | 'ZERO';

export interface Product {
  id: string;
  name: string;
  productImageUrl: string | null;
  barcode: string | null;
  baseUnit: string;
  quantity: number; // Stored as Decimal in Prisma, using number here for UI
  cost: number;
  price: number;
  isAvailable: boolean;
  itemType: ItemType;
  vatType: VatType;
  categoryId: string;
}

export interface Category {
  id: string;
  categoryName: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
  customSubtotal?: number;
}

export type DiscountType = 'NONE' | 'PWD' | 'SENIOR';
export type PaymentMethodType = 'CASH' | 'GCASH' | 'MAYA' | 'CARD';

interface POSState {
  // Cart & Orders
  cart: CartItem[];
  discount: DiscountType;
  paymentMethod: PaymentMethodType;
  amountTendered: number;

  // View state
  searchQuery: string;
  selectedCategoryId: string | null;
  viewMode: 'grid' | 'list';

  // Pagination (For future backend integration)
  currentPage: number;
  itemsPerPage: number;

  // Actions
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateItemSubtotal: (productId: string, subtotal?: number) => void;
  clearCart: () => void;
  
  setDiscount: (discount: DiscountType) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setAmountTendered: (amount: number) => void;

  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setPage: (page: number) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: 'NONE',
  paymentMethod: 'CASH',
  amountTendered: 0,

  searchQuery: '',
  selectedCategoryId: null,
  viewMode: 'grid',

  currentPage: 1,
  itemsPerPage: 12,

  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      set({
        cart: cart.map(item => 
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        )
      });
    } else {
      set({ cart: [...cart, { ...product, cartQuantity: 1 }] });
    }
  },

  removeFromCart: (productId) => set({
    cart: get().cart.filter(item => item.id !== productId)
  }),

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map(item => 
        item.id === productId ? { ...item, cartQuantity: quantity } : item
      )
    });
  },

  updateItemSubtotal: (productId, subtotal) => {
    set({
      cart: get().cart.map(item =>
        item.id === productId ? { ...item, customSubtotal: subtotal } : item
      )
    });
  },

  clearCart: () => set({ cart: [], amountTendered: 0, discount: 'NONE' }),

  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountTendered: (amountTendered) => set({ amountTendered }),

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId, currentPage: 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  setPage: (currentPage) => set({ currentPage })
}));

// Mock Data Source for UI Prototyping
export const mockCategories: Category[] = [
  { id: '1', categoryName: 'Food & Beverages' },
  { id: '2', categoryName: 'Hardware Tools' },
  { id: '3', categoryName: 'Electronics' },
];

export const mockProducts: Product[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `prod-${i}`,
  name: `Mock Product ${i + 1}`,
  productImageUrl: null,
  barcode: `1000000${i}`,
  baseUnit: 'PCS',
  quantity: 100,
  cost: Number((Math.random() * 50).toFixed(2)),
  price: Number((Math.random() * 100 + 10).toFixed(2)),
  isAvailable: true,
  itemType: 'RESALE',
  vatType: 'VATABLE',
  categoryId: String((i % 3) + 1),
}));
