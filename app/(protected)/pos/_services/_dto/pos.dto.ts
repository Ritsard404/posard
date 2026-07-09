import type { PrinterConfigDto } from "./print.dto";

export type ItemType = 'RESALE' | 'WHOLESALE';
export type VatType = 'VATABLE' | 'EXEMPT' | 'ZERO';
export type BusinessMode = "RETAIL" | "RESTAURANT" | "HYBRID";
export type FulfillmentType = "WALK_IN" | "DINE_IN" | "TAKE_OUT" | "DELIVERY" | "PICKUP";
export type ModifierGroupType = "VARIANT" | "MODIFIER" | "ADDON" | "INSTRUCTION";
export type ProductExpiryStatus = "none" | "near_expiry" | "expired_only";

export interface ModifierOptionDto {
  id: string;
  name: string;
  priceDelta: number;
  displayOrder: number;
  isDefault: boolean;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  type: ModifierGroupType;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  displayOrder: number;
  options: ModifierOptionDto[];
}

export interface CategoryDto {
  id: string;
  categoryName: string;
}

export interface ProductDto {
  id: string;
  name: string;
  productImageUrl: string | null;
  barcode: string | null;
  genericName: string | null;
  brandName: string | null;
  shelfLocation: string | null;
  prescriptionRequired: boolean;
  posFavorite: boolean;
  recentSoldQuantity: number;
  reorderPoint: number | null;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  hasBatchTracking: boolean;
  nearestExpiryDate: string | null;
  nearExpiryLotCount: number;
  expiredLotCount: number;
  availableLotQuantity: number;
  expiryStatus: ProductExpiryStatus;
  saleBlockedByExpiry: boolean;
  baseUnit: string;
  quantity: number;
  cost: number;
  price: number;
  isAvailable: boolean;
  trackInventory: boolean;
  itemType: ItemType;
  vatType: VatType;
  categoryId: string;
  categoryName: string | null;
  isConfigurable: boolean;
  configurationMode: BusinessMode | null;
  modifierGroups: ModifierGroupDto[];
}

export interface EPaymentMethodDto {
  id: string;
  name: string | null;
  account: string | null;
  paymentQrImageUrl: string | null;
  paymentAccountHolder: string | null;
  paymentAccountNumber: string | null;
  paymentProviderName: string | null;
  paymentInstructions: string | null;
  paymentDisplayEnabled: boolean;
  paymentDisplayOrder: number | null;
  paymentDetailsUpdatedAt: string | null;
}

export interface POSMetaDataDto {
  categories: CategoryDto[];
  products: ProductDto[];
  epaymentMethods: EPaymentMethodDto[];
}

export interface CashTrackReportDto {
  timestampId: string;
  terminalId: string;
  cashierName: string;
  terminalName: string;
  timestampIn: Date;
  timestampOut: Date | null;
  isTrainMode: boolean;
  printerConfig: PrinterConfigDto | null;
  
  // Financials
  openingCash: number;
  totalCashSales: number;
  totalWithdrawals: number;
  withdrawnCount: number;
  expectedDrawerAmount: number;
  
  // Reference (Non-cash)
  totalEPaymentSales: number;
}
