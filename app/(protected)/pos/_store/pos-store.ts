import { create } from "zustand";
import {
  ProductDto as Product,
  CategoryDto as Category,
  EPaymentMethodDto,
  VatType,
  ItemType,
} from "../_services/_dto/pos.dto";
import { InvoiceStatusType } from "../_services/_dto/order.dto";
import type {
  PrinterCapabilityDto,
  PrinterConnectionStatusDto,
  PrinterConfigDto,
} from "../_services/_dto/print.dto";
import type { ManagerVerifierDto, OfflineSyncStatus } from "../_services/_dto/offline.dto";

export type { Product, Category, VatType, ItemType };

export interface CartItem extends Product {
  cartItemId: string;
  cartQuantity: number;
  customSubtotal?: number;
  itemStatus?: InvoiceStatusType;
}

export type DiscountType = "NONE" | "OTHERS" | "PWD" | "SENIOR";
export interface POSDiscount {
  type: DiscountType;
  eligibleDiscName: string;
  oscaIdNum: string;
}
export type PaymentMethodType = "cash" | "reference";
export type CartMutationFailureReason = "OUT_OF_STOCK" | "LIMIT_REACHED";
export type CartMutationWarningReason = "NEGATIVE_STOCK";

export interface POSReferencePayment {
  id: string;
  saleTypeId: string;
  reference: string;
  amount: number;
}

export interface CartMutationResult {
  success: boolean;
  reason?: CartMutationFailureReason;
  warning?: CartMutationWarningReason;
}

export type POSMobileTab = "menu" | "cart" | "tender";
export type CustomerDisplayMode = "payment" | "completed" | null;

export interface ProductStockUpdate {
  productId: string;
  remainingQuantity: number;
}

interface ActiveTerminalState {
  id: string;
  name: string;
  vat: number;
  discountCapType: "amount" | "percent";
  discountMax: number;
  allowCashierDebtCreate: boolean;
  allowCashierDebtCollect: boolean;
  requireManagerApprovalForDebt: boolean;
  defaultDebtDueDays: number | null;
  printerConfig?: PrinterConfigDto | null;
  billingLocked?: boolean;
  billingMessage?: string | null;
}

interface OfflineReceiptState {
  localId: string;
  receiptId: string;
  localInvoiceNo: string;
  syncStatus: OfflineSyncStatus;
}

const defaultDiscount: POSDiscount = {
  type: "NONE",
  eligibleDiscName: "",
  oscaIdNum: "",
};

const FAST_CHECKOUT_STORAGE_KEY = "posard.fast-checkout-enabled";
const CUSTOMER_DISPLAY_STORAGE_KEY = "posard.customer-display-enabled";
const initialPrinterConnectionStatus: PrinterConnectionStatusDto = {
  state: "idle",
  message: null,
  printerName: null,
  updatedAt: null,
};

function readFastCheckoutPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(FAST_CHECKOUT_STORAGE_KEY) === "true";
}

function readCustomerDisplayPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CUSTOMER_DISPLAY_STORAGE_KEY) === "true";
}

interface POSState {
  // Cart & Orders
  cart: CartItem[];
  discount: POSDiscount;
  paymentMethod: PaymentMethodType;
  selectedEPaymentMethodId: string | null;
  paymentReference: string;
  referencePayments: POSReferencePayment[];
  amountTendered: number;
  fastCheckoutEnabled: boolean;

  // View state
  searchQuery: string;
  selectedCategoryId: string | null;
  viewMode: "grid" | "list";
  mobileProductView: "grid" | "list";
  activeMobileTab: POSMobileTab;
  customerDisplayEnabled: boolean;
  customerDisplayMode: CustomerDisplayMode;

  // Pagination (For future backend integration)
  currentPage: number;
  itemsPerPage: number;

  // POS Data
  products: Product[];
  categories: Category[];
  epaymentMethods: EPaymentMethodDto[];
  printerCapabilities: PrinterCapabilityDto[];
  printerConnectionStatus: PrinterConnectionStatusDto;

  // Session Data
  activeSessionId: string | null;
  activeTimestampId: string | null;
  activeDeviceId: string | null;
  activeCompanyId: string | null;
  activeProfileId: string | null;
  activeTerminal: ActiveTerminalState | null;
  activeUser: { name: string | null; role: string } | null;
  isOnline: boolean;
  offlineReady: boolean;
  pendingSyncCount: number;
  syncingCount: number;
  needsReviewCount: number;
  lastSyncMessage: string | null;
  offlineReceipts: OfflineReceiptState[];
  managerVerifiers: ManagerVerifierDto[];

  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setEPaymentMethods: (methods: EPaymentMethodDto[]) => void;
  setSession: (data: {
    sessionId: string | null;
    timestampId: string | null;
    deviceId?: string | null;
    profileId?: string | null;
    terminal: ActiveTerminalState | null;
    user: { name: string | null; role: string } | null;
  }) => void;
  setCompanyId: (companyId: string | null) => void;
  setDeviceId: (deviceId: string | null) => void;
  setActiveTerminalPrinterConfig: (printerConfig: PrinterConfigDto | null) => void;
  setPrinterCapabilities: (capabilities: PrinterCapabilityDto[]) => void;
  setPrinterConnectionStatus: (status: PrinterConnectionStatusDto) => void;
  setNetworkStatus: (isOnline: boolean) => void;
  setOfflineReady: (ready: boolean) => void;
  setSyncCounts: (data: {
    pendingSyncCount: number;
    syncingCount: number;
    needsReviewCount: number;
    lastSyncMessage?: string | null;
  }) => void;
  setManagerVerifiers: (verifiers: ManagerVerifierDto[]) => void;
  upsertOfflineReceipt: (receipt: OfflineReceiptState) => void;
  updateOfflineReceiptStatus: (
    receiptId: string,
    syncStatus: OfflineSyncStatus,
  ) => void;
  clearOfflineReceipts: () => void;

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
  setSelectedEPaymentMethodId: (id: string | null) => void;
  setPaymentReference: (reference: string) => void;
  addReferencePayment: (payment?: Partial<Omit<POSReferencePayment, "id">>) => void;
  updateReferencePayment: (
    id: string,
    payment: Partial<Omit<POSReferencePayment, "id">>,
  ) => void;
  removeReferencePayment: (id: string) => void;
  clearReferencePayments: () => void;
  setAmountTendered: (amount: number) => void;
  setFastCheckoutEnabled: (enabled: boolean) => void;

  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setMobileProductView: (mode: "grid" | "list") => void;
  setActiveMobileTab: (tab: POSMobileTab) => void;
  setCustomerDisplayEnabled: (enabled: boolean) => void;
  setCustomerDisplayMode: (mode: CustomerDisplayMode) => void;
  setPage: (page: number) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: defaultDiscount,
  paymentMethod: "cash",
  selectedEPaymentMethodId: null,
  paymentReference: "",
  referencePayments: [],
  amountTendered: 0,
  fastCheckoutEnabled: readFastCheckoutPreference(),

  products: [],
  categories: [],
  epaymentMethods: [],
  printerCapabilities: [],
  printerConnectionStatus: initialPrinterConnectionStatus,

  activeSessionId: null,
  activeTimestampId: null,
  activeDeviceId: null,
  activeCompanyId: null,
  activeProfileId: null,
  activeTerminal: null,
  activeUser: null,
  isOnline: true,
  offlineReady: false,
  pendingSyncCount: 0,
  syncingCount: 0,
  needsReviewCount: 0,
  lastSyncMessage: null,
  offlineReceipts: [],
  managerVerifiers: [],

  searchQuery: "",
  selectedCategoryId: null,
  viewMode: "grid",
  mobileProductView: "list",
  activeMobileTab: "menu",
  customerDisplayEnabled: readCustomerDisplayPreference(),
  customerDisplayMode: null,

  currentPage: 1,
  itemsPerPage: 12,

  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setEPaymentMethods: (epaymentMethods) => set({ epaymentMethods }),
  setSession: (data) =>
    set({
      activeSessionId: data.sessionId,
      activeTimestampId: data.timestampId,
      activeDeviceId:
        data.sessionId === null ? data.deviceId ?? null : data.deviceId ?? get().activeDeviceId,
      activeProfileId:
        data.sessionId === null ? data.profileId ?? null : data.profileId ?? get().activeProfileId,
      activeTerminal: data.terminal,
      activeUser: data.user,
    }),
  setCompanyId: (activeCompanyId) => set({ activeCompanyId }),
  setDeviceId: (activeDeviceId) => set({ activeDeviceId }),
  setPrinterCapabilities: (printerCapabilities) => set({ printerCapabilities }),
  setPrinterConnectionStatus: (printerConnectionStatus) =>
    set({ printerConnectionStatus }),
  setActiveTerminalPrinterConfig: (printerConfig) =>
    set((state) => ({
      activeTerminal: state.activeTerminal
        ? {
            ...state.activeTerminal,
            printerConfig,
          }
        : null,
    })),
  setNetworkStatus: (isOnline) => set({ isOnline }),
  setOfflineReady: (offlineReady) => set({ offlineReady }),
  setSyncCounts: (data) =>
    set({
      pendingSyncCount: data.pendingSyncCount,
      syncingCount: data.syncingCount,
      needsReviewCount: data.needsReviewCount,
      lastSyncMessage: data.lastSyncMessage ?? null,
    }),
  setManagerVerifiers: (managerVerifiers) => set({ managerVerifiers }),
  upsertOfflineReceipt: (receipt) =>
    set((state) => ({
      offlineReceipts: [
        ...state.offlineReceipts.filter(
          (item) => item.receiptId !== receipt.receiptId,
        ),
        receipt,
      ],
    })),
  updateOfflineReceiptStatus: (receiptId, syncStatus) =>
    set((state) => ({
      offlineReceipts: state.offlineReceipts.map((receipt) =>
        receipt.receiptId === receiptId ? { ...receipt, syncStatus } : receipt,
      ),
    })),
  clearOfflineReceipts: () => set({ offlineReceipts: [] }),

  addToCart: (product) => {
    const { cart } = get();
    const activeQuantityForProduct = cart
      .filter((item) => item.id === product.id && item.itemStatus !== "VOID")
      .reduce((sum, item) => sum + item.cartQuantity, 0);
    const availableQuantity = Math.max(0, Number(product.quantity ?? 0));

    const willGoNegative =
      product.trackInventory && activeQuantityForProduct + 1 > availableQuantity;

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
        customerDisplayMode: null,
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
        customerDisplayMode: null,
      });
    }

    return {
      success: true,
      warning: willGoNegative ? "NEGATIVE_STOCK" : undefined,
    };
  },

  removeFromCart: (cartItemId) =>
    set({
      cart: get().cart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, itemStatus: "VOID" } : item,
      ),
      customerDisplayMode: null,
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

    const willGoNegative =
      sourceProduct.trackInventory &&
      quantity + otherActiveQuantity > availableQuantity;

    set({
      cart: cart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, cartQuantity: quantity }
          : item,
      ),
      customerDisplayMode: null,
    });

    return {
      success: true,
      warning: willGoNegative ? "NEGATIVE_STOCK" : undefined,
    };
  },

  updateItemSubtotal: (cartItemId, subtotal) => {
    set({
      cart: get().cart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, customSubtotal: subtotal }
          : item,
      ),
      customerDisplayMode: null,
    });
  },

  clearCart: () =>
    set({
      cart: [],
      amountTendered: 0,
      discount: defaultDiscount,
      paymentMethod: "cash",
      selectedEPaymentMethodId: null,
      paymentReference: "",
      referencePayments: [],
      customerDisplayMode: null,
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
  setPaymentMethod: (paymentMethod) =>
    set((state) => ({
      paymentMethod,
      customerDisplayMode: "payment",
      ...(paymentMethod === "cash"
        ? { selectedEPaymentMethodId: null, paymentReference: "" }
        : {
            selectedEPaymentMethodId:
              state.selectedEPaymentMethodId ?? state.epaymentMethods[0]?.id ?? null,
          }),
    })),
  setSelectedEPaymentMethodId: (selectedEPaymentMethodId) =>
    set({ selectedEPaymentMethodId, customerDisplayMode: "payment" }),
  setPaymentReference: (paymentReference) =>
    set({ paymentReference, customerDisplayMode: "payment" }),
  addReferencePayment: (payment) =>
    set((state) => {
      const saleTypeId =
        payment?.saleTypeId ??
        state.selectedEPaymentMethodId ??
        state.epaymentMethods[0]?.id ??
        "";

      if (!saleTypeId) {
        return { paymentMethod: "reference", customerDisplayMode: "payment" };
      }

      return {
        paymentMethod: "reference",
        customerDisplayMode: "payment",
        selectedEPaymentMethodId: saleTypeId,
        referencePayments: [
          ...state.referencePayments,
          {
            id: crypto.randomUUID(),
            saleTypeId,
            reference: payment?.reference ?? "",
            amount: Math.round((payment?.amount ?? 0) * 100) / 100,
          },
        ],
      };
    }),
  updateReferencePayment: (id, payment) =>
    set((state) => ({
      referencePayments: state.referencePayments.map((item) =>
        item.id === id
          ? {
              ...item,
              ...payment,
              amount:
                payment.amount === undefined
                  ? item.amount
                  : Math.round(payment.amount * 100) / 100,
            }
          : item,
      ),
      customerDisplayMode: "payment",
    })),
  removeReferencePayment: (id) =>
    set((state) => ({
      referencePayments: state.referencePayments.filter((item) => item.id !== id),
      customerDisplayMode: "payment",
      paymentMethod:
        state.referencePayments.length <= 1 && state.amountTendered > 0
          ? "cash"
          : state.paymentMethod,
    })),
  clearReferencePayments: () =>
    set({
      referencePayments: [],
      selectedEPaymentMethodId: null,
      paymentReference: "",
    }),
  setAmountTendered: (amountTendered) =>
    set({
      amountTendered: Math.round(amountTendered * 100) / 100,
      customerDisplayMode: "payment",
    }),
  setFastCheckoutEnabled: (fastCheckoutEnabled) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        FAST_CHECKOUT_STORAGE_KEY,
        fastCheckoutEnabled ? "true" : "false",
      );
    }

    set({ fastCheckoutEnabled });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedCategoryId: (selectedCategoryId) =>
    set({ selectedCategoryId, currentPage: 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  setMobileProductView: (mobileProductView) => set({ mobileProductView }),
  setActiveMobileTab: (activeMobileTab) => set({ activeMobileTab }),
  setCustomerDisplayEnabled: (customerDisplayEnabled) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CUSTOMER_DISPLAY_STORAGE_KEY,
        customerDisplayEnabled ? "true" : "false",
      );
    }

    set({ customerDisplayEnabled });
  },
  setCustomerDisplayMode: (customerDisplayMode) => set({ customerDisplayMode }),
  setPage: (currentPage) => set({ currentPage }),
}));
