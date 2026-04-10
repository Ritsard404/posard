"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CreateTerminalInput, TerminalDTO } from "../../_services/terminal.dto";
import TerminalTable from "../../_components/TerminalTable";
import TerminalFormModal from "../../_components/TerminalFormModal";
import { createTerminalAction, deleteTerminalAction, getTerminalsAction, updateTerminalAction } from "../../_actions/terminal.actions";


interface TerminalsPageClientProps {
  companyId: string;
}

export default function TerminalsPageClient({ companyId }: TerminalsPageClientProps) {
  const [terminals, setTerminals] = useState<TerminalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del modal: null = cerrado, undefined = crear, TerminalDTO = editar
  const [modalTerminal, setModalTerminal] = useState<TerminalDTO | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTerminals = useCallback(async () => {
    setIsLoading(true);
    const result = await getTerminalsAction(companyId);
    if (result.success) {
      setTerminals(result.data);
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadTerminals();
  }, [loadTerminals]);

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

  const handleSubmit = async (data: CreateTerminalInput) => {
    setIsSubmitting(true);
    try {
      if (modalTerminal) {
        // Modo edición
        const result = await updateTerminalAction(modalTerminal.id, companyId, data);
        if (result.success) {
          toast.success("Terminal updated successfully");
          handleClose();
          await loadTerminals();
        } else {
          toast.error(result.error);
        }
      } else {
        // Modo creación
        const result = await createTerminalAction(companyId, data);
        if (result.success) {
          toast.success("Terminal created successfully");
          handleClose();
          await loadTerminals();
        } else {
          toast.error(result.error);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this terminal? This action cannot be undone.");
    if (!confirmed) return;

    const result = await deleteTerminalAction(id, companyId);
    if (result.success) {
      toast.success("Terminal deleted");
      await loadTerminals();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <TerminalTable
        terminals={terminals}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TerminalFormModal
        terminal={modalTerminal}
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </>
  );
}
