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
}

export interface ReportWorkspaceDto {
  companyId: string | null;
  terminals: ReportTerminalOptionDto[];
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

export interface ReportOverviewDto {
  range: ReportDateRangeDto;
  totalSales: number;
  totalTransactions: number;
  totalReturns: number;
  totalVoids: number;
  totalDiscounts: number;
  totalCashSales: number;
  totalEPaymentSales: number;
  activeSessionCount: number;
  unreadInvoiceCount: number;
  pendingTerminalRequests: number;
  paymentBreakdown: ReportPaymentBreakdownDto[];
}

export interface XReadingDto {
  generatedAt: Date;
  range: ReportDateRangeDto;
  terminalId: string | null;
  terminalName: string;
  cashierName: string;
  invoiceCount: number;
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
}

export interface ZReadingDto {
  generatedAt: Date;
  range: ReportDateRangeDto;
  terminalId: string | null;
  terminalName: string;
  invoiceCount: number;
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

export type ReportPrintableView =
  | "overview"
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
  | "audit"
  | "transactions";

export interface ReportPrintPayloadDto {
  title: string;
  view: ReportPrintableView;
  printerAvailable: boolean;
  printerName: string | null;
  terminalName: string | null;
  generatedAtLabel: string;
  message: string;
  previewContent: string;
}

export interface ReportInvoicePrintPayloadDto {
  invoiceId: string;
  invoiceNumber: number;
  printerAvailable: boolean;
  printerName: string | null;
  message: string;
  previewContent: string;
}
