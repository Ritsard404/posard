import type { PrinterConfigDto } from "@/app/(protected)/pos/_services/_dto/print.dto";

export interface ReportViewerDto {
  profileId: string;
  companyId: string | null;
  role: "admin" | "manager" | "cashier";
  fullName: string | null;
}

export interface ReportTerminalOptionDto {
  id: string;
  name: string;
  isActive: boolean;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
}

export interface ReportWorkspaceDto {
  companyId: string | null;
  companyName?: string | null;
  terminals: ReportTerminalOptionDto[];
}

export interface ReportCompanyListItemDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ownerManagerName: string | null;
  createdAt: Date;
  terminalCount: number;
  activeTerminalCount: number;
}

export interface ReportCompaniesWorkspaceDto {
  items: ReportCompanyListItemDto[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
  keyword: string;
}

export interface ReportCompanyContextDto {
  companyId: string;
  companyName: string;
  companyCode: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  terminalCount: number;
  activeTerminalCount: number;
}

export interface ReportTerminalContextDto {
  companyId: string;
  companyName: string;
  terminalId: string;
  terminalName: string;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  isActive: boolean;
}

export interface ReportDateRangeDto {
  from: Date;
  to: Date;
}

export interface ReportPaginationDto {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ReportPaymentBreakdownDto {
  name: string;
  count: number;
  amount: number;
}

export interface ReportTrendPointDto {
  date: string;
  label: string;
  sales: number;
  transactions: number;
}

export interface ReportInventoryHealthDto {
  totalStockValue: number;
  potentialRetailValue: number;
  potentialProfit: number;
  trackedItemCount: number;
  trackedProductCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ReportTopProductDto {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface ReportOverviewDto {
  range: ReportDateRangeDto;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  totalTransactions: number;
  totalReturns: number;
  totalVoids: number;
  totalDiscounts: number;
  totalCashSales: number;
  totalEPaymentSales: number;
  averageTransactionValue: number;
  totalCompositeSold: number;
  compositeProduced: number;
  compositeDisassembled: number;
  compositeNet: number;
  vatCollected: number | null;
  isVatRegistered: boolean;
  salesChangePercent: number;
  salesComparisonLabel: string;
  trendChangePercent: number;
  activeSessionCount: number;
  unreadInvoiceCount: number;
  pendingTerminalRequests: number;
  paymentBreakdown: ReportPaymentBreakdownDto[];
  paymentMethodBreakdown: ReportPaymentBreakdownDto[];
  salesTrend: ReportTrendPointDto[];
  wallet: {
    total: number;
    cash: number;
  };
  inventoryHealth: ReportInventoryHealthDto;
  topProducts: ReportTopProductDto[];
}

export interface XReadingDto {
  generatedAt: Date;
  range: ReportDateRangeDto;
  terminalId: string | null;
  terminalName: string;
  businessName: string;
  operatorName: string;
  addressLine: string;
  vatRegTin: string;
  minNumber: string;
  serialNumber: string;
  isTrainMode: boolean;
  isAcknowledgement: boolean;
  cashierName: string;
  invoiceCount: number;
  beginningOrNumber: string;
  endingOrNumber: string;
  openingFund: number;
  withdrawalAmount: number;
  refundAmount: number;
  refundCount: number;
  voidAmount: number;
  voidCount: number;
  expectedCash: number;
  actualCash: number;
  shortOver: number;
  cashSales: number;
  otherPayments: ReportPaymentBreakdownDto[];
  paymentsReceived: number;
  invoices: XReadingInvoiceDto[];
}

export interface XReadingInvoiceDto {
  invoiceId: string;
  invoiceNumber: number;
  createdAt: Date;
  status: "PENDING" | "PAID" | "RETURNED" | "VOID" | "CANCELLED";
  cashierName: string;
  terminalName: string;
  customerName: string;
  totalAmount: number;
  cashCollected: number;
  referencePayments: ReportPaymentBreakdownDto[];
  referencePaymentAmount: number;
  discountAmount: number;
  returnedAmount: number;
  isTrainMode: boolean;
}

export interface ZReadingDto {
  generatedAt: Date;
  range: ReportDateRangeDto;
  terminalId: string | null;
  terminalName: string;
  businessName: string;
  operatorName: string;
  addressLine: string;
  vatRegTin: string;
  minNumber: string;
  serialNumber: string;
  isTrainMode: boolean;
  isAcknowledgement: boolean;
  beginningSI: string;
  endingSI: string;
  beginningVoid: string;
  endingVoid: string;
  beginningReturn: string;
  endingReturn: string;
  invoiceCount: number;
  returnCount: number;
  grossSales: number;
  netSales: number;
  totalReturns: number;
  totalVoids: number;
  totalDiscounts: number;
  cashSales: number;
  ePaymentSales: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  vatZeroSales: number;
  openingFund: number;
  drawerCash: number;
  withdrawalAmount: number;
  shortOver: number;
  resetCounter: number;
  zCounter: number;
  previousAccumulatedSales: number;
  salesForTheDay: number;
  lessVatAdjustment: number;
  vatOnReturn: number;
  otherVatAdjustments: number;
  paymentsReceived: number;
  presentAccumulatedSales: number;
  seniorDiscount: number;
  seniorCount: number;
  pwdDiscount: number;
  pwdCount: number;
  otherDiscount: number;
  otherCount: number;
  paymentBreakdown: ReportPaymentBreakdownDto[];
}

export interface TransactionHistoryItemDto {
  invoiceId: string;
  invoiceNumber: number;
  localInvoiceNo: string | null;
  createdAt: Date;
  status: "PENDING" | "PAID" | "RETURNED" | "VOID" | "CANCELLED";
  cashierName: string;
  terminalName: string;
  customerName: string;
  totalAmount: number;
  discountAmount: number;
  returnedAmount: number;
  cashCollected: number;
  ePaymentAmount: number;
  paymentMethods: ReportPaymentBreakdownDto[];
}

export interface TransactionHistoryDto {
  range: ReportDateRangeDto;
  items: TransactionHistoryItemDto[];
  pagination: ReportPaginationDto;
  totalTransactions: number;
  grossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  totalNetSales: number;
}

export interface AuditTrailItemDto {
  occurredAt: Date;
  actorName: string;
  actorRole: string;
  terminalName: string | null;
  action: string;
  amount: number | null;
  referenceId: string | null;
  changes: string | null;
  source: "audit_log" | "timestamp";
}

export interface AuditTrailDto {
  range: ReportDateRangeDto;
  items: AuditTrailItemDto[];
  pagination: ReportPaginationDto;
}

export interface DailyTransactionItemDto {
  businessDate: Date;
  terminalName: string;
  invoiceCount: number;
  grossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  totalVoids: number;
  netSales: number;
  cashSales: number;
  ePaymentSales: number;
}

export interface DailyTransactionsDto {
  range: ReportDateRangeDto;
  items: DailyTransactionItemDto[];
  pagination: ReportPaginationDto;
}

export interface TransactionListItemDto {
  invoiceId: string;
  invoiceNumber: number;
  localInvoiceNo: string | null;
  entryDate: Date;
  source: "BASE" | "VOIDED" | "REFUNDED";
  status: "PENDING" | "PAID" | "RETURNED" | "VOID" | "CANCELLED";
  terminalName: string;
  cashierName: string;
  managerName: string | null;
  customerName: string;
  discountType: string | null;
  discountPercent: number | null;
  subTotal: number;
  amountDue: number;
  grossSales: number;
  returns: number;
  netOfReturns: number;
  lessDiscount: number;
  netOfSales: number;
  vatable: number;
  zeroRated: number;
  exempt: number;
  vat: number;
  returnedAmount: number;
  reason: string | null;
  isTrainMode: boolean;
}

export interface TransactionListTotalsDto {
  totalGrossSales: number;
  totalReturns: number;
  totalNetOfReturns: number;
  totalDiscounts: number;
  totalNetSales: number;
  totalVatable: number;
  totalExempt: number;
  totalVat: number;
}

export interface TransactionListDto {
  range: ReportDateRangeDto;
  items: TransactionListItemDto[];
  pagination: ReportPaginationDto;
  totals: TransactionListTotalsDto;
}

export interface VoidedLineItemDto {
  itemId: string;
  itemName: string;
  barcode: string | null;
  quantity: number;
  price: number;
  amount: number;
}

export interface VoidedListItemDto {
  invoiceId: string;
  invoiceNumber: number;
  transactionDate: Date;
  voidedDate: Date;
  cashierName: string;
  cancelledBy: string | null;
  terminalName: string;
  discountType: string | null;
  grossSales: number;
  discountAmount: number;
  amountDue: number;
  vatable: number;
  zeroRated: number;
  exempt: number;
  vat: number;
  reason: string | null;
  items: VoidedLineItemDto[];
}

export interface VoidedListTotalsDto {
  totalGross: number;
  totalDiscount: number;
  totalAmountDue: number;
  totalVatable: number;
  totalVatZero: number;
  totalExempt: number;
  totalVat: number;
}

export interface VoidedListDto {
  range: ReportDateRangeDto;
  items: VoidedListItemDto[];
  pagination: ReportPaginationDto;
  totals: VoidedListTotalsDto;
}

export interface DiscountReportDto {
  range: ReportDateRangeDto;
  type: "PWD" | "SENIOR";
  items: TransactionListItemDto[];
  pagination: ReportPaginationDto;
  totals: TransactionListTotalsDto;
}

export interface SalesBookItemDto {
  businessDate: Date;
  terminalName: string;
  invoiceCount: number;
  grossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  totalVoids: number;
  netSales: number;
  vatableSales: number;
  vatAmount: number;
}

export interface SalesBookTotalsDto {
  grossSales: number;
  totalDiscounts: number;
  totalReturns: number;
  totalVoids: number;
  netSales: number;
  vatableSales: number;
  vatAmount: number;
}

export interface SalesBookDto {
  range: ReportDateRangeDto;
  items: SalesBookItemDto[];
  pagination: ReportPaginationDto;
  totals: SalesBookTotalsDto;
}

export interface RefundInvoiceItemDto {
  invoiceId: string;
  invoiceNumber: number;
  transactionDate: Date;
  refundDate: Date;
  cashierName: string;
  managerName: string | null;
  terminalName: string;
  customerName: string;
  totalAmount: number;
  returnedAmount: number;
  itemCount: number;
  refundRatio: number;
  reason: string | null;
  isFullRefund: boolean;
  isTrainMode: boolean;
}

export interface RefundInvoicesDto {
  range: ReportDateRangeDto;
  items: RefundInvoiceItemDto[];
  pagination: ReportPaginationDto;
  totalRefundAmount: number;
}

export interface ReturnedItemDto {
  invoiceId: string;
  invoiceNumber: number;
  itemId: string;
  itemName: string;
  barcode: string | null;
  quantity: number;
  price: number;
  lineSubtotal: number;
  returnAmount: number;
  transactionDate: Date;
  returnDate: Date;
  terminalName: string;
  cashierName: string;
  managerName: string | null;
  isTrainMode: boolean;
}

export interface ReturnedItemsDto {
  range: ReportDateRangeDto;
  items: ReturnedItemDto[];
  pagination: ReportPaginationDto;
  totalReturnAmount: number;
}

export interface ReturnedInvoiceRecordItemDto {
  invoiceId: string;
  invoiceNumber: number;
  transactionDate: Date;
  recordDate: Date;
  terminalName: string;
  cashierName: string;
  managerName: string | null;
  customerName: string;
  totalAmount: number;
  returnedAmount: number;
  itemCount: number;
  reason: string | null;
  recordType: "FULL_RETURN" | "PARTIAL_RETURN";
}

export interface ReturnedInvoiceRecordsDto {
  range: ReportDateRangeDto;
  items: ReturnedInvoiceRecordItemDto[];
  pagination: ReportPaginationDto;
  totalReturnedAmount: number;
}

export interface SalesReportItemDto {
  invoiceId: string;
  invoiceNumber: number;
  invoiceDate: Date;
  itemId: string;
  itemName: string;
  baseUnit: string;
  quantity: number;
  cost: number;
  price: number;
  itemGroup: string;
  barcode: string | null;
  isReturned: boolean;
  returnAmount: number;
  totalCost: number;
  revenue: number;
  profit: number;
}

export interface SalesReportTotalsDto {
  totalCost: number;
  totalPrice: number;
  overallTotalCost: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface SalesReportDto {
  range: ReportDateRangeDto;
  items: SalesReportItemDto[];
  pagination: ReportPaginationDto;
  totals: SalesReportTotalsDto;
}

export interface DebtOutstandingItemDto {
  debtId: string;
  invoiceId: string;
  invoiceNumber: number;
  customerId: string;
  customerName: string;
  terminalName: string;
  createdByName: string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  createdAt: Date;
  notes: string | null;
}

export interface DebtOutstandingDto {
  range: ReportDateRangeDto;
  items: DebtOutstandingItemDto[];
  pagination: ReportPaginationDto;
  totalOutstanding: number;
  dueToday: number;
  overdue: number;
}

export interface DebtCollectionItemDto {
  paymentId: string;
  debtId: string;
  invoiceId: string;
  invoiceNumber: number;
  customerName: string;
  terminalName: string;
  receivedByName: string;
  method: string;
  referenceNo: string | null;
  amount: number;
  createdAt: Date;
  remainingAmount: number;
}

export interface DebtCollectionsDto {
  range: ReportDateRangeDto;
  items: DebtCollectionItemDto[];
  pagination: ReportPaginationDto;
  totalCollected: number;
  cashCollected: number;
  referenceCollected: number;
}

export interface InvoiceDocumentItemDto {
  documentId: string;
  type: "INVOICE" | "XREPORT" | "ZREPORT";
  invoiceId: string | null;
  invoiceNumber: number | null;
  localInvoiceNo: string | null;
  terminalName: string | null;
  isTrainMode: boolean;
  reprintCount: number;
  createdAt: Date;
}

export interface InvoiceDocumentsDto {
  range: ReportDateRangeDto;
  items: InvoiceDocumentItemDto[];
  pagination: ReportPaginationDto;
  totals: {
    all: number;
    invoice: number;
    xReport: number;
    zReport: number;
    trainMode: number;
  };
}

export type ReportPrintableView =
  | "overview"
  | "invoice-documents"
  | "x-reading"
  | "z-reading"
  | "daily-transactions"
  | "transaction-list"
  | "voided-list"
  | "pwd-list"
  | "senior-list"
  | "sales"
  | "sales-book"
  | "refund-invoices"
  | "returned-items"
  | "returned-records"
  | "debt-outstanding"
  | "debt-collections"
  | "audit"
  | "transactions";

export interface ReportPrintPayloadDto {
  title: string;
  view: ReportPrintableView;
  printerAvailable: boolean;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  terminalName: string | null;
  generatedAtLabel: string;
  message: string;
  previewContent: string;
  printSegments: string[];
  archiveContent: string;
  archiveType: "XREPORT" | "ZREPORT" | null;
  isTrainMode: boolean;
}

export interface ReportInvoicePrintPayloadDto {
  invoiceId: string;
  invoiceNumber: number;
  printerAvailable: boolean;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  message: string;
  previewContent: string;
  printSegments: string[];
  archiveContent: string;
  archiveDocumentId: string | null;
  isTrainMode: boolean;
}

export interface InvoiceDocumentPrintPayloadDto {
  documentId: string;
  type: "INVOICE" | "XREPORT" | "ZREPORT";
  title: string;
  printerConfig: PrinterConfigDto | null;
  previewContent: string;
  printSegments: string[];
  reprintCount: number;
}
