import { create } from 'zustand';
import { ProductDto as Product, CategoryDto as Category, VatType, ItemType } from '../_services/_dto/pos.dto';
import { InvoiceStatusType } from '../_services/_dto/order.dto';

export type { Product, Category, VatType, ItemType };

export interface CartItem extends Product {
  cartItemId: string;
  cartQuantity: number;
  customSubtotal?: number;
  itemStatus?: InvoiceStatusType;
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

  // POS Data
  products: Product[];
  categories: Category[];

  // Session Data
  activeSessionId: string | null;
  activeTimestampId: string | null;
  activeTerminal: { id: string, name: string } | null;
  activeUser: { name: string | null, role: string } | null;

  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSession: (data: { sessionId: string | null, timestampId: string | null, terminal: { id: string, name: string } | null, user: { name: string | null, role: string } | null }) => void;

  addToCart: (product: Product) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  updateItemSubtotal: (cartItemId: string, subtotal?: number) => void;
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
  
  products: [],
  categories: [],

  activeSessionId: null,
  activeTimestampId: null,
  activeTerminal: null,
  activeUser: null,

  searchQuery: '',
  selectedCategoryId: null,
  viewMode: 'grid',

  currentPage: 1,
  itemsPerPage: 12,

  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setSession: (data) => set({ 
    activeSessionId: data.sessionId, 
    activeTimestampId: data.timestampId, 
    activeTerminal: data.terminal,
    activeUser: data.user
  }),

  addToCart: (product) => {
    const { cart } = get();
    const existingActive = cart.find(item => item.id === product.id && item.itemStatus !== 'VOID');
    if (existingActive) {
      set({
        cart: cart.map(item => 
          item.cartItemId === existingActive.cartItemId ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        )
      });
    } else {
      set({ cart: [...cart, { ...product, cartItemId: crypto.randomUUID(), cartQuantity: 1, itemStatus: 'PENDING' }] });
    }
  },

  removeFromCart: (cartItemId) => set({
    cart: get().cart.map(item => 
      item.cartItemId === cartItemId ? { ...item, itemStatus: 'VOID' } : item
    )
  }),

  updateCartQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(cartItemId);
      return;
    }
    set({
      cart: get().cart.map(item => 
        item.cartItemId === cartItemId ? { ...item, cartQuantity: quantity } : item
      )
    });
  },

  updateItemSubtotal: (cartItemId, subtotal) => {
    set({
      cart: get().cart.map(item =>
        item.cartItemId === cartItemId ? { ...item, customSubtotal: subtotal } : item
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

