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
      answer: [
        `Mock insight for ${facts.range.label}: total sales are ${money(facts.summary.totalSales)} across ${facts.summary.totalTransactions} transactions.`,
        `Average transaction value is ${money(facts.summary.averageTransactionValue)} with discounts of ${money(facts.summary.totalDiscounts)}.`,
        topProduct
          ? `Top product is ${topProduct.name} with ${topProduct.quantitySold} sold and ${money(topProduct.revenue)} revenue.`
          : "No top product data is available for this range.",
        topPayment
          ? `Most-used payment method by amount is ${topPayment.name} at ${money(topPayment.amount)}.`
          : "No payment method breakdown is available for this range.",
      ].join(" "),
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
          "You answer only POS report analytics questions. Use only the supplied facts. Do not suggest database queries, mutations, or cross-company access. Keep the answer concise and operational.",
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
      tokensUsed: data.usage?.total_tokens,
    };
  }
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
