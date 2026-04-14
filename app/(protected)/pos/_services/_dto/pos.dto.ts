export type ItemType = 'RESALE' | 'WHOLESALE';
export type VatType = 'VATABLE' | 'EXEMPT' | 'ZERO';

export interface CategoryDto {
  id: string;
  categoryName: string;
}

export interface ProductDto {
  id: string;
  name: string;
  productImageUrl: string | null;
  barcode: string | null;
  baseUnit: string;
  quantity: number;
  cost: number;
  price: number;
  isAvailable: boolean;
  trackInventory: boolean;
  itemType: ItemType;
  vatType: VatType;
  categoryId: string;
}

export interface EPaymentMethodDto {
  id: string;
  name: string | null;
  account: string | null;
}

export interface POSMetaDataDto {
  categories: CategoryDto[];
  products: ProductDto[];
  epaymentMethods: EPaymentMethodDto[];
}

export interface CashTrackReportDto {
  timestampId: string;
  cashierName: string;
  terminalName: string;
  timestampIn: Date;
  isTrainMode: boolean;
  
  // Financials
  openingCash: number;
  totalCashSales: number;
  totalWithdrawals: number;
  withdrawnCount: number;
  expectedDrawerAmount: number;
  
  // Reference (Non-cash)
  totalEPaymentSales: number;
}
