"use client";

import { Bot, Send } from "lucide-react";
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
    startTransition(() => {
      void askAiReportAction({
        question: trimmed,
        preset: trimmed.toLowerCase().includes("week") ? "7d" : "today",
        companyId: isAdmin ? companyId : undefined,
      }).then((result) => {
        if (!result.success) {
          setError(result.error);
          return;
        }

        setAnswers((current) => [{ question: trimmed, answer: result.data }, ...current]);
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
            />
            <Button type="submit" disabled={isPending} className="gap-2">
              <Send className="size-4" />
              Ask
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
              <p className="text-sm leading-6">{entry.answer.answer}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{entry.answer.mode === "live" ? "Live AI" : "Mock Mode"}</Badge>
                {entry.answer.factsUsed.map((fact) => (
                  <Badge key={fact} variant="outline">
                    {fact}
                  </Badge>
                ))}
              </div>
              {entry.answer.warnings?.map((warning) => (
                <p key={warning} className="text-xs text-muted-foreground">
                  {warning}
                </p>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
