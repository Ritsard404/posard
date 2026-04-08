import { z } from "zod";

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
