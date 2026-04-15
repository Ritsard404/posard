"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createTerminalRequestAction, getTerminalRequestsAction, updateTerminalRequestStatusAction } from "../../_actions/terminal-request.actions";
import {
  createTerminalAction,
  deleteTerminalAction,
  setTerminalActiveAction,
  getTerminalsAction,
  updateTerminalConfigurationAction,
  updateTerminalAction,
  updateTerminalTrainingModeAction,
} from "../../_actions/terminal.actions";
import TerminalFormModal from "../../_components/TerminalFormModal";
import { TerminalRequestDialog } from "../../_components/TerminalRequestDialog";
import { TerminalRequestList } from "../../_components/TerminalRequestList";
import TerminalTable from "../../_components/TerminalTable";
import TerminalDetailPanel from "./TerminalDetailPanel";
import type {
  CreateTerminalRequestInput,
  TerminalRequestDTO,
} from "../../_services/terminal-request.dto";
import type {
  CreateTerminalPayload,
  TerminalConfigurationPayload,
  TerminalDTO,
} from "../../_services/terminal.dto";

interface TerminalsPageClientProps {
  companyId: string;
  role: "admin" | "manager";
}

export default function TerminalsPageClient({ companyId, role }: TerminalsPageClientProps) {
  const [terminals, setTerminals] = useState<TerminalDTO[]>([]);
  const [requests, setRequests] = useState<TerminalRequestDTO[]>([]);
  const [isLoadingTerminals, setIsLoadingTerminals] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [isConfigurationSubmitting, setIsConfigurationSubmitting] = useState(false);
  const [isTrainingModeSubmitting, setIsTrainingModeSubmitting] = useState(false);
  const [modalTerminal, setModalTerminal] = useState<TerminalDTO | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);

  const loadTerminals = useCallback(async () => {
    setIsLoadingTerminals(true);
    const result = await getTerminalsAction(companyId);
    if (result.success) {
      setTerminals(result.data);
      setSelectedTerminalId((current) => {
        if (result.data.length === 0) {
          return null;
        }

        if (current && result.data.some((terminal) => terminal.id === current)) {
          return current;
        }

        return result.data[0]?.id ?? null;
      });
    } else {
      toast.error(result.error);
    }
    setIsLoadingTerminals(false);
  }, [companyId]);

  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    const result = await getTerminalRequestsAction(companyId);
    if (result.success) {
      setRequests(result.data);
    } else {
      toast.error(result.error);
    }
    setIsLoadingRequests(false);
  }, [companyId]);

  useEffect(() => {
    void loadTerminals();
    void loadRequests();
  }, [loadRequests, loadTerminals]);

  const handleAdd = () => {
    setModalTerminal(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (terminal: TerminalDTO) => {
    setModalTerminal(terminal);
    setIsModalOpen(true);
  };

  const handleSelect = (terminal: TerminalDTO) => {
    setSelectedTerminalId(terminal.id);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setModalTerminal(undefined);
  };

  const handleSubmit = async (data: CreateTerminalPayload) => {
    setIsSubmitting(true);
    try {
      const result = modalTerminal
        ? await updateTerminalAction(modalTerminal.id, companyId, data)
        : await createTerminalAction(companyId, data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(modalTerminal ? "Terminal updated successfully" : "Terminal created successfully");
      handleClose();
      await loadTerminals();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {
      return;
    }

    const result = await deleteTerminalAction(deleteTargetId, companyId);
    if (result.success) {
      toast.success("Terminal deleted");
      setDeleteTargetId(null);
      await loadTerminals();
      return;
    }

    toast.error(result.error);
  };

  const handleToggleActive = async (terminal: TerminalDTO) => {
    const result = await setTerminalActiveAction(terminal.id, companyId, {
      isActive: !terminal.isActive,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.data.isActive ? "Terminal enabled" : "Terminal disabled");
    setTerminals((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item)),
    );
  };

  const handleTerminalRequest = async (data: CreateTerminalRequestInput) => {
    setIsRequestSubmitting(true);
    try {
      const result = await createTerminalRequestAction(companyId, data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Terminal request submitted");
      setIsRequestDialogOpen(false);
      await loadRequests();
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const handleTrainingModeChange = async (terminal: TerminalDTO, nextValue: boolean) => {
    setIsTrainingModeSubmitting(true);
    try {
      const result = await updateTerminalTrainingModeAction(terminal.id, companyId, nextValue);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Training mode ${nextValue ? "enabled" : "disabled"}`);
      setTerminals((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
    } finally {
      setIsTrainingModeSubmitting(false);
    }
  };

  const handleConfigurationSubmit = async (
    terminal: TerminalDTO,
    data: TerminalConfigurationPayload,
  ) => {
    setIsConfigurationSubmitting(true);
    try {
      const result = await updateTerminalConfigurationAction(terminal.id, companyId, data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Terminal configuration updated");
      setTerminals((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
    } finally {
      setIsConfigurationSubmitting(false);
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    status: "approved" | "fulfilled" | "rejected",
  ) => {
    const result = await updateTerminalRequestStatusAction(requestId, companyId, { status });
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`Request marked as ${status}`);
    await loadRequests();
  };

  const selectedTerminal = terminals.find((terminal) => terminal.id === selectedTerminalId) ?? null;

  return (
    <div className="space-y-6">
      {role === "manager" ? null : (
        <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Need more terminals?</h2>
            <p className="text-sm text-muted-foreground">
              Managers can request additional devices here. Admins will review and provision them.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={() => setIsRequestDialogOpen(true)}>
              Request Terminal
            </Button>
          </div>
        </Card>
      )}

      <TerminalTable
        terminals={terminals}
        isLoading={isLoadingTerminals}
        addLabel="Add Terminal"
        emptyDescription={
          role === "admin"
            ? "Add a terminal to get started."
            : "No terminals are assigned to this company yet."
        }
        selectedTerminalId={selectedTerminalId}
        onAdd={role === "admin" ? handleAdd : undefined}
        onSelect={role === "manager" ? handleSelect : undefined}
        onEdit={role === "admin" ? handleEdit : undefined}
        onToggleActive={role === "admin" ? (terminal) => void handleToggleActive(terminal) : undefined}
        onDelete={role === "admin" ? (id) => setDeleteTargetId(id) : undefined}
      />

      {role === "manager" ? (
        <TerminalDetailPanel
          terminal={selectedTerminal}
          canUpdateConfiguration
          isSubmittingConfiguration={isConfigurationSubmitting}
          isTogglingTrainingMode={isTrainingModeSubmitting}
          onSubmitConfiguration={(terminal, data) => void handleConfigurationSubmit(terminal, data)}
          onTrainingModeChange={(terminal, nextValue) => void handleTrainingModeChange(terminal, nextValue)}
        />
      ) : (
        <TerminalRequestList
          requests={requests}
          isLoading={isLoadingRequests}
          role={role}
          onApprove={role === "admin" ? (id) => void updateRequestStatus(id, "approved") : undefined}
          onFulfill={role === "admin" ? (id) => void updateRequestStatus(id, "fulfilled") : undefined}
          onReject={role === "admin" ? (id) => void updateRequestStatus(id, "rejected") : undefined}
        />
      )}

      <TerminalFormModal
        terminal={modalTerminal}
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />

      {role === "admin" ? (
        <TerminalRequestDialog
          open={isRequestDialogOpen}
          isSubmitting={isRequestSubmitting}
          onOpenChange={setIsRequestDialogOpen}
          onSubmit={handleTerminalRequest}
        />
      ) : null}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => (!open ? setDeleteTargetId(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the terminal record from the company. Continue only if the terminal should no longer exist in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()}>
              Delete Terminal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
