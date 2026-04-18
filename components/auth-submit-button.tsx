"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = React.ComponentProps<typeof Button> & {
  isPending: boolean;
  idleLabel: string;
  pendingLabel: string;
};

export function AuthSubmitButton({
  isPending,
  idleLabel,
  pendingLabel,
  children,
  disabled,
  ...props
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      aria-busy={isPending}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children ?? idleLabel
      )}
    </Button>
  );
}
