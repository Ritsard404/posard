import "server-only";

import { getAppConfig } from "@/lib/app-config";
import type {
  AiReportAnswerDto,
  AiReportProvider,
  AiReportProviderInput,
} from "./_dto/ai-report.dto";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

class MockAiReportProvider implements AiReportProvider {
  readonly mode = "mock" as const;

  async answer(input: AiReportProviderInput): Promise<AiReportAnswerDto> {
    const facts = input.facts;
    const topProduct = facts.topProducts[0];
    const topPayment = facts.paymentMethods[0];

    return {
      mode: this.mode,
      factsUsed: ["summary", "topProducts", "paymentMethods"],
      warnings: ["Mock mode is active because live AI is disabled or missing an API key."],
      answer: `Sales for ${facts.range.label} reached ${money(facts.summary.totalSales)} from ${facts.summary.totalTransactions} transactions.`,
      presentation: {
        quickSummary: `For ${facts.range.label}, the store made ${money(facts.summary.totalSales)} from ${facts.summary.totalTransactions} transaction${facts.summary.totalTransactions === 1 ? "" : "s"}.`,
        keyNumbers: [
          {
            label: "Total Sales",
            value: money(facts.summary.totalSales),
            helper: facts.summary.salesComparisonLabel,
            tone: facts.summary.salesChangePercent >= 0 ? "good" : "warning",
          },
          {
            label: "Transactions",
            value: String(facts.summary.totalTransactions),
            helper: `${money(facts.summary.averageTransactionValue)} average sale`,
          },
          {
            label: "Discounts",
            value: money(facts.summary.totalDiscounts),
            helper: "Total discount given",
          },
          {
            label: "Top Payment",
            value: topPayment?.name ?? "No data",
            helper: topPayment ? money(topPayment.amount) : "No payments recorded",
          },
        ],
        meaning: [
          topProduct
            ? `${topProduct.name} is driving the most product revenue.`
            : "There is not enough product movement yet for a clear top product.",
          topPayment
            ? `${topPayment.name} is the strongest payment channel for this period.`
            : "Payment method usage is not available for this period.",
        ],
        suggestedActions: [
          topProduct
            ? `Keep ${topProduct.name} stocked and visible during busy hours.`
            : "Review product setup if sales were expected in this period.",
          facts.summary.totalDiscounts > 0
            ? "Check whether discounts are helping sales or reducing margin too much."
            : "No discount pressure detected for this period.",
        ],
      },
    };
  }
}

class OpenAiReportProvider implements AiReportProvider {
  readonly mode = "live" as const;

  constructor(private readonly apiKey: string) {}

  async answer(input: AiReportProviderInput): Promise<AiReportAnswerDto> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        instructions:
          "You answer only POS report analytics questions for non-technical store owners. Use only the supplied facts. Do not suggest database queries, mutations, or cross-company access. Keep the answer concise, simple, and operational. Return plain text with: Quick Summary, Key Numbers, What It Means, Suggested Action.",
        input: JSON.stringify({
          question: input.question,
          facts: input.facts,
        }),
      }),
    });
    const data = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      usage?: { total_tokens?: number };
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? "OpenAI request failed.");
    }

    const answer =
      data.output
        ?.flatMap((item) => item.content ?? [])
        .find((content) => content.type === "output_text")?.text ??
      "No answer was returned.";

    return {
      answer,
      mode: this.mode,
      factsUsed: ["summary", "topProducts", "paymentMethods"],
      presentation: buildFallbackPresentation(input, answer),
      tokensUsed: data.usage?.total_tokens,
    };
  }
}

function buildFallbackPresentation(
  input: AiReportProviderInput,
  answer: string,
): AiReportAnswerDto["presentation"] {
  const facts = input.facts;
  const topProduct = facts.topProducts[0];
  const topPayment = facts.paymentMethods[0];

  return {
    quickSummary:
      answer ||
      `Sales for ${facts.range.label} reached ${money(facts.summary.totalSales)}.`,
    keyNumbers: [
      {
        label: "Total Sales",
        value: money(facts.summary.totalSales),
        helper: facts.summary.salesComparisonLabel,
        tone: facts.summary.salesChangePercent >= 0 ? "good" : "warning",
      },
      {
        label: "Transactions",
        value: String(facts.summary.totalTransactions),
        helper: `${money(facts.summary.averageTransactionValue)} average sale`,
      },
      {
        label: "Cash Sales",
        value: money(facts.summary.totalCashSales),
        helper: "Cash collected from sales",
      },
      {
        label: "Reference Payments",
        value: money(facts.summary.totalEPaymentSales),
        helper: "Card or e-payment sales",
      },
    ],
    meaning: [
      topProduct
        ? `${topProduct.name} is the top product in this report period.`
        : "No clear top product is available for this report period.",
      topPayment
        ? `${topPayment.name} is the leading payment method.`
        : "No payment method stands out yet.",
    ],
    suggestedActions: [
      topProduct
        ? `Protect stock availability for ${topProduct.name}.`
        : "Review the selected date range if you expected sales data.",
      "Use the report filters to compare another period before making major changes.",
    ],
  };
}

export function resolveAiReportProvider(): AiReportProvider {
  const config = getAppConfig();

  if (
    config.aiReport.enabled &&
    config.aiReport.provider === "openai" &&
    config.aiReport.openAiApiKey
  ) {
    return new OpenAiReportProvider(config.aiReport.openAiApiKey);
  }

  return new MockAiReportProvider();
}
