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
  getTerminalsAction,
  updateTerminalAction,
} from "../../_actions/terminal.actions";
import TerminalFormModal from "../../_components/TerminalFormModal";
import { TerminalRequestDialog } from "../../_components/TerminalRequestDialog";
import { TerminalRequestList } from "../../_components/TerminalRequestList";
import TerminalTable from "../../_components/TerminalTable";
import type {
  CreateTerminalRequestInput,
  TerminalRequestDTO,
} from "../../_services/terminal-request.dto";
import type { CreateTerminalPayload, TerminalDTO } from "../../_services/terminal.dto";

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
  const [modalTerminal, setModalTerminal] = useState<TerminalDTO | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadTerminals = useCallback(async () => {
    setIsLoadingTerminals(true);
    const result = await getTerminalsAction(companyId);
    if (result.success) {
      setTerminals(result.data);
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

  return (
    <div className="space-y-6">
      {role === "manager" ? (
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
      ) : null}

      <TerminalTable
        terminals={terminals}
        isLoading={isLoadingTerminals}
        addLabel="Add Terminal"
        emptyDescription={
          role === "admin"
            ? "Add a terminal to get started."
            : "No terminals are assigned to this company yet."
        }
        onAdd={role === "admin" ? handleAdd : undefined}
        onEdit={role === "admin" ? handleEdit : undefined}
        onDelete={role === "admin" ? (id) => setDeleteTargetId(id) : undefined}
      />

      <TerminalRequestList
        requests={requests}
        isLoading={isLoadingRequests}
        role={role}
        onApprove={role === "admin" ? (id) => void updateRequestStatus(id, "approved") : undefined}
        onFulfill={role === "admin" ? (id) => void updateRequestStatus(id, "fulfilled") : undefined}
        onReject={role === "admin" ? (id) => void updateRequestStatus(id, "rejected") : undefined}
      />

      <TerminalFormModal
        terminal={modalTerminal}
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />

      <TerminalRequestDialog
        open={isRequestDialogOpen}
        isSubmitting={isRequestSubmitting}
        onOpenChange={setIsRequestDialogOpen}
        onSubmit={handleTerminalRequest}
      />

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
