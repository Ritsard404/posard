"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type AuthFeedbackState = {
  kind: "idle" | "pending" | "success" | "error";
  message?: string;
};

type AuthFeedbackProps = {
  state: AuthFeedbackState;
  className?: string;
};

export function AuthFeedback({ state, className }: AuthFeedbackProps) {
  if (state.kind === "idle" || !state.message) {
    return null;
  }

  const Icon =
    state.kind === "pending"
      ? Loader2
      : state.kind === "success"
        ? CheckCircle2
        : AlertCircle;

  return (
    <p
      aria-live="polite"
      role={state.kind === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center justify-center gap-2 text-center text-xs font-bold",
        state.kind === "pending" && "text-muted-foreground",
        state.kind === "success" && "text-emerald-500",
        state.kind === "error" && "text-destructive",
        className,
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", state.kind === "pending" && "animate-spin")}
      />
      <span>{state.message}</span>
    </p>
  );
}
