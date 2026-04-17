"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  updateTerminalConfigurationAction,
  updateTerminalTrainingModeAction,
} from "@/app/(protected)/companies/[companyId]/_actions/terminal.actions";
import type {
  TerminalConfigurationPayload,
  TerminalDTO,
} from "@/app/(protected)/companies/[companyId]/_services/terminal.dto";
import TerminalDetailPanel from "@/app/(protected)/companies/[companyId]/terminals/_components/TerminalDetailPanel";

interface TerminalWorkspaceClientProps {
  companyId: string;
  role: "admin" | "manager";
  initialTerminal: TerminalDTO;
}

export default function TerminalWorkspaceClient({
  companyId,
  role,
  initialTerminal,
}: TerminalWorkspaceClientProps) {
  const [terminal, setTerminal] = useState(initialTerminal);
  const [isConfigurationSubmitting, setIsConfigurationSubmitting] = useState(false);
  const [isTrainingModeSubmitting, setIsTrainingModeSubmitting] = useState(false);

  const canUpdateConfiguration = role === "manager";

  const handleConfigurationSubmit = async (
    currentTerminal: TerminalDTO,
    data: TerminalConfigurationPayload,
  ) => {
    setIsConfigurationSubmitting(true);

    try {
      const result = await updateTerminalConfigurationAction(currentTerminal.id, companyId, data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setTerminal(result.data);
      toast.success("Terminal configuration updated");
    } finally {
      setIsConfigurationSubmitting(false);
    }
  };

  const handleTrainingModeChange = async (
    currentTerminal: TerminalDTO,
    nextValue: boolean,
  ) => {
    setIsTrainingModeSubmitting(true);

    try {
      const result = await updateTerminalTrainingModeAction(
        currentTerminal.id,
        companyId,
        nextValue,
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setTerminal(result.data);
      toast.success(`Training mode ${nextValue ? "enabled" : "disabled"}`);
    } finally {
      setIsTrainingModeSubmitting(false);
    }
  };

  return (
    <TerminalDetailPanel
      terminal={terminal}
      canUpdateConfiguration={canUpdateConfiguration}
      isSubmittingConfiguration={isConfigurationSubmitting}
      isTogglingTrainingMode={isTrainingModeSubmitting}
      onSubmitConfiguration={
        canUpdateConfiguration
          ? (currentTerminal, data) => void handleConfigurationSubmit(currentTerminal, data)
          : undefined
      }
      onTrainingModeChange={
        canUpdateConfiguration
          ? (currentTerminal, nextValue) =>
              void handleTrainingModeChange(currentTerminal, nextValue)
          : undefined
      }
    />
  );
}
