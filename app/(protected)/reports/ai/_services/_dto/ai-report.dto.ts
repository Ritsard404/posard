export interface AiReportFactsDto {
  scope: {
    profileId: string;
    role: "admin" | "manager" | "cashier";
    companyId: string | null;
    terminalId: string | null;
  };
  range: {
    from: string;
    to: string;
    label: string;
  };
  summary: {
    totalSales: number;
    totalTransactions: number;
    totalDiscounts: number;
    totalCashSales: number;
    totalEPaymentSales: number;
    averageTransactionValue: number;
    salesChangePercent: number;
    salesComparisonLabel: string;
  };
  topProducts: Array<{ name: string; quantitySold: number; revenue: number }>;
  paymentMethods: Array<{ name: string; count: number; amount: number }>;
}

export interface AiReportCompanyOptionDto {
  id: string;
  name: string;
  terminalCount: number;
  activeTerminalCount: number;
}

export interface AiReportAnswerDto {
  answer: string;
  mode: "mock" | "live";
  factsUsed: string[];
  presentation?: {
    quickSummary: string;
    keyNumbers: Array<{
      label: string;
      value: string;
      helper?: string;
      tone?: "neutral" | "good" | "warning";
    }>;
    meaning: string[];
    suggestedActions: string[];
  };
  warnings?: string[];
  tokensUsed?: number;
}

export interface AiReportProviderInput {
  question: string;
  facts: AiReportFactsDto;
}

export interface AiReportProvider {
  readonly mode: "mock" | "live";
  answer(input: AiReportProviderInput): Promise<AiReportAnswerDto>;
}
