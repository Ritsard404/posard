"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreateTerminalRequestSchema,
  type CreateTerminalRequestPayload,
} from "../_services/terminal-request.dto";

interface TerminalRequestDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTerminalRequestPayload) => void;
}

export function TerminalRequestDialog({
  open,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: TerminalRequestDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTerminalRequestPayload>({
    resolver: zodResolver(CreateTerminalRequestSchema),
    defaultValues: {
      requestedTerminals: 1,
      notes: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        requestedTerminals: 1,
        notes: null,
      });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Additional Terminals</DialogTitle>
          <DialogDescription>
            Submit a request for new terminals. Admins will review it from the company workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="requestedTerminals">Number of terminals</Label>
            <Input id="requestedTerminals" type="number" min="1" max="50" {...register("requestedTerminals")} />
            {errors.requestedTerminals ? (
              <p className="text-xs text-red-500">{errors.requestedTerminals.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requestNotes">Notes</Label>
            <Input
              id="requestNotes"
              placeholder="Branch launch, replacement units, expansion, etc."
              {...register("notes")}
            />
            {errors.notes ? <p className="text-xs text-red-500">{errors.notes.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
