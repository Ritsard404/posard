"use client";

import { Bot, CheckCircle2, Loader2, Send, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askAiReportAction } from "../_actions/ai-report.actions";
import type {
  AiReportAnswerDto,
  AiReportCompanyOptionDto,
} from "../_services/_dto/ai-report.dto";

const starters = [
  "Summarize today's sales",
  "What are my top 5 products this week?",
  "Compare this week vs last week",
  "Which payment method is most used today?",
];

function toneClass(tone?: "neutral" | "good" | "warning") {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
  }

  return "border-border bg-muted/30 text-foreground";
}

export function AiReportChat({
  isLiveReady,
  viewerRole,
  companies,
  defaultCompanyId,
}: {
  isLiveReady: boolean;
  viewerRole: "admin" | "manager" | "cashier";
  companies: AiReportCompanyOptionDto[];
  defaultCompanyId: string | null;
}) {
  const [question, setQuestion] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: AiReportAnswerDto }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAdmin = viewerRole === "admin";
  const selectedCompany = companies.find((company) => company.id === companyId) ?? null;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (isAdmin && !companyId) {
      setError("Select a company before asking the admin AI report assistant.");
      return;
    }

    setError(null);
    setQuestion("");
    setAnswers((current) => [
      {
        question: trimmed,
        answer: {
          answer: "",
          mode: "mock",
          factsUsed: [],
          warnings: ["loading"],
        },
      },
      ...current,
    ]);
    startTransition(() => {
      void askAiReportAction({
        question: trimmed,
        preset: trimmed.toLowerCase().includes("week") ? "7d" : "today",
        companyId: isAdmin ? companyId : undefined,
      }).then((result) => {
        if (!result.success) {
          setAnswers((current) =>
            current.filter(
              (entry) =>
                !(
                  entry.question === trimmed &&
                  entry.answer.warnings?.includes("loading")
                ),
            ),
          );
          setError(result.error);
          return;
        }

        setAnswers((current) =>
          current.map((entry) =>
            entry.question === trimmed && entry.answer.warnings?.includes("loading")
              ? { question: trimmed, answer: result.data }
              : entry,
          ),
        );
      });
    });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">AI Report Assistant</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Admin answers scoped to the selected company."
              : "Report-only answers from trusted POSard metrics."}
          </p>
        </div>
        <Badge variant={isLiveReady ? "default" : "secondary"}>
          {isLiveReady ? "Live AI" : "Mock Mode"}
        </Badge>
      </div>

      <Card className="rounded-lg">
        <CardContent className="space-y-3 p-3">
          {isAdmin ? (
            <div className="grid gap-2 sm:max-w-md">
              <label
                htmlFor="ai-report-company"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Company Scope
              </label>
              <select
              id="ai-report-company"
              value={companyId}
              disabled={isPending}
              onChange={(event) => {
                  setCompanyId(event.target.value);
                  setError(null);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {companies.length === 0 ? (
                  <option value="">No companies available</option>
                ) : null}
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {selectedCompany ? (
                <p className="text-xs text-muted-foreground">
                  {selectedCompany.activeTerminalCount} active of{" "}
                  {selectedCompany.terminalCount} terminal
                  {selectedCompany.terminalCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {starters.map((starter) => (
              <Button
                key={starter}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => submit(starter)}
              >
                {starter}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit(question);
            }}
          >
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about sales, products, payments, discounts..."
              maxLength={500}
              disabled={isPending}
              aria-disabled={isPending}
            />
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isPending ? "Analyzing..." : "Ask"}
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {answers.length === 0 ? (
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <Bot className="size-5" />
            Ask a report question to generate an operational summary.
          </CardContent>
        </Card>
      ) : (
        answers.map((entry, index) => (
          <Card key={`${entry.question}-${index}`} className="rounded-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">{entry.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {entry.answer.warnings?.includes("loading") ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Reading trusted report metrics...
                </div>
              ) : (
                <>
                  {entry.answer.presentation ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-primary/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <TrendingUp className="size-4" />
                          Quick Summary
                        </div>
                        <p className="text-sm leading-6">
                          {entry.answer.presentation.quickSummary}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {entry.answer.presentation.keyNumbers.map((item) => (
                          <div
                            key={`${item.label}-${item.value}`}
                            className={`rounded-lg border p-3 ${toneClass(item.tone)}`}
                          >
                            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                              {item.label}
                            </div>
                            <div className="mt-1 text-lg font-bold leading-tight">
                              {item.value}
                            </div>
                            {item.helper ? (
                              <div className="mt-1 text-xs opacity-75">
                                {item.helper}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            What It Means
                          </div>
                          <div className="space-y-2">
                            {entry.answer.presentation.meaning.map((item) => (
                              <div key={item} className="flex gap-2 text-sm leading-5">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Suggested Action
                          </div>
                          <div className="space-y-2">
                            {entry.answer.presentation.suggestedActions.map((item) => (
                              <div key={item} className="flex gap-2 text-sm leading-5">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-6">{entry.answer.answer}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {entry.answer.mode === "live" ? "Live AI" : "Mock Mode"}
                    </Badge>
                  </div>
                  {entry.answer.warnings?.map((warning) => (
                    <p key={warning} className="text-xs text-muted-foreground">
                      {warning}
                    </p>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
