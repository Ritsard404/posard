import { create } from "zustand";
import {
  ProductDto as Product,
  CategoryDto as Category,
  VatType,
  ItemType,
} from "../_services/_dto/pos.dto";
import { InvoiceStatusType } from "../_services/_dto/order.dto";
import type { PrinterConfigDto } from "../_services/_dto/print.dto";

export type { Product, Category, VatType, ItemType };

export interface CartItem extends Product {
  cartItemId: string;
  cartQuantity: number;
  customSubtotal?: number;
  itemStatus?: InvoiceStatusType;
}

export type DiscountType = "NONE" | "PWD" | "SENIOR";
export interface POSDiscount {
  type: DiscountType;
  eligibleDiscName: string;
  oscaIdNum: string;
}
export type PaymentMethodType = "CASH" | "GCASH" | "MAYA" | "CARD";
export type CartMutationFailureReason = "OUT_OF_STOCK" | "LIMIT_REACHED";

export interface CartMutationResult {
  success: boolean;
  reason?: CartMutationFailureReason;
}

export type POSMobileTab = "menu" | "cart" | "tender";

export interface ProductStockUpdate {
  productId: string;
  remainingQuantity: number;
}

interface ActiveTerminalState {
  id: string;
  name: string;
  vat: number;
  discountMax: number;
  printerConfig?: PrinterConfigDto | null;
}

const defaultDiscount: POSDiscount = {
  type: "NONE",
  eligibleDiscName: "",
  oscaIdNum: "",
};

interface POSState {
  // Cart & Orders
  cart: CartItem[];
  discount: POSDiscount;
  paymentMethod: PaymentMethodType;
  amountTendered: number;

  // View state
  searchQuery: string;
  selectedCategoryId: string | null;
  viewMode: "grid" | "list";
  mobileProductView: "grid" | "list";
  activeMobileTab: POSMobileTab;

  // Pagination (For future backend integration)
  currentPage: number;
  itemsPerPage: number;

  // POS Data
  products: Product[];
  categories: Category[];

  // Session Data
  activeSessionId: string | null;
  activeTimestampId: string | null;
  activeTerminal: ActiveTerminalState | null;
  activeUser: { name: string | null; role: string } | null;

  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSession: (data: {
    sessionId: string | null;
    timestampId: string | null;
    terminal: ActiveTerminalState | null;
    user: { name: string | null; role: string } | null;
  }) => void;

  addToCart: (product: Product) => CartMutationResult;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (
    cartItemId: string,
    quantity: number,
  ) => CartMutationResult;
  updateItemSubtotal: (cartItemId: string, subtotal?: number) => void;
  clearCart: () => void;
  applyStockUpdates: (updates: ProductStockUpdate[]) => void;

  setDiscount: (discount: POSDiscount) => void;
  setDiscountType: (type: DiscountType) => void;
  updateDiscountDetails: (
    details: Partial<Pick<POSDiscount, "eligibleDiscName" | "oscaIdNum">>,
  ) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setAmountTendered: (amount: number) => void;

  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setMobileProductView: (mode: "grid" | "list") => void;
  setActiveMobileTab: (tab: POSMobileTab) => void;
  setPage: (page: number) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: defaultDiscount,
  paymentMethod: "CASH",
  amountTendered: 0,

  products: [],
  categories: [],

  activeSessionId: null,
  activeTimestampId: null,
  activeTerminal: null,
  activeUser: null,

  searchQuery: "",
  selectedCategoryId: null,
  viewMode: "grid",
  mobileProductView: "list",
  activeMobileTab: "menu",

  currentPage: 1,
  itemsPerPage: 12,

  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setSession: (data) =>
    set({
      activeSessionId: data.sessionId,
      activeTimestampId: data.timestampId,
      activeTerminal: data.terminal,
      activeUser: data.user,
    }),

  addToCart: (product) => {
    const { cart } = get();
    const activeQuantityForProduct = cart
      .filter((item) => item.id === product.id && item.itemStatus !== "VOID")
      .reduce((sum, item) => sum + item.cartQuantity, 0);
    const availableQuantity = Math.max(0, Number(product.quantity ?? 0));

    if (product.trackInventory && availableQuantity <= 0) {
      return { success: false, reason: "OUT_OF_STOCK" };
    }

    if (product.trackInventory && activeQuantityForProduct >= availableQuantity) {
      return { success: false, reason: "LIMIT_REACHED" };
    }

    const existingActive = cart.find(
      (item) => item.id === product.id && item.itemStatus !== "VOID",
    );
    if (existingActive) {
      set({
        cart: cart.map((item) =>
          item.cartItemId === existingActive.cartItemId
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            ...product,
            cartItemId: crypto.randomUUID(),
            cartQuantity: 1,
            itemStatus: "PENDING",
          },
        ],
      });
    }

    return { success: true };
  },

  removeFromCart: (cartItemId) =>
    set({
      cart: get().cart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, itemStatus: "VOID" } : item,
      ),
    }),

  updateCartQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(cartItemId);
      return { success: true };
    }
    const { cart, products } = get();
    const targetItem = cart.find((item) => item.cartItemId === cartItemId);

    if (!targetItem || targetItem.itemStatus === "VOID") {
      return { success: false, reason: "OUT_OF_STOCK" };
    }

    const sourceProduct =
      products.find((product) => product.id === targetItem.id) ?? targetItem;
    const availableQuantity = Math.max(0, Number(sourceProduct.quantity ?? 0));
    const otherActiveQuantity = cart
      .filter(
        (item) =>
          item.id === targetItem.id &&
          item.cartItemId !== cartItemId &&
          item.itemStatus !== "VOID",
      )
      .reduce((sum, item) => sum + item.cartQuantity, 0);

    if (sourceProduct.trackInventory && availableQuantity <= 0) {
      return { success: false, reason: "OUT_OF_STOCK" };
    }

    if (
      sourceProduct.trackInventory &&
      quantity + otherActiveQuantity > availableQuantity
    ) {
      return { success: false, reason: "LIMIT_REACHED" };
    }

    set({
      cart: cart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, cartQuantity: quantity }
          : item,
      ),
    });

    return { success: true };
  },

  updateItemSubtotal: (cartItemId, subtotal) => {
    set({
      cart: get().cart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, customSubtotal: subtotal }
          : item,
      ),
    });
  },

  clearCart: () =>
    set({
      cart: [],
      amountTendered: 0,
      discount: defaultDiscount,
      paymentMethod: "CASH",
    }),
  applyStockUpdates: (updates) => {
    if (updates.length === 0) return;

    const updateMap = new Map(
      updates.map((update) => [update.productId, update.remainingQuantity]),
    );

    set((state) => ({
      products: state.products.map((product) =>
        updateMap.has(product.id)
          ? { ...product, quantity: updateMap.get(product.id)! }
          : product,
      ),
      cart: state.cart.map((item) =>
        updateMap.has(item.id)
          ? { ...item, quantity: updateMap.get(item.id)! }
          : item,
      ),
    }));
  },

  setDiscount: (discount) => set({ discount }),
  setDiscountType: (type) =>
    set((state) => ({
      discount:
        type === "NONE"
          ? defaultDiscount
          : { ...state.discount, type },
    })),
  updateDiscountDetails: (details) =>
    set((state) => ({
      discount: {
        ...state.discount,
        ...details,
      },
    })),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountTendered: (amountTendered) =>
    set({ amountTendered: Math.round(amountTendered * 100) / 100 }),

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedCategoryId: (selectedCategoryId) =>
    set({ selectedCategoryId, currentPage: 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  setMobileProductView: (mobileProductView) => set({ mobileProductView }),
  setActiveMobileTab: (activeMobileTab) => set({ activeMobileTab }),
  setPage: (currentPage) => set({ currentPage }),
}));
