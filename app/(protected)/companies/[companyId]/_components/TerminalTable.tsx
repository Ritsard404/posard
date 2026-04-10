"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, Pencil, Trash2, PlusCircle, ShieldCheck } from "lucide-react";
import type { TerminalDTO } from "../_services/terminal.dto";

interface TerminalTableProps {
  terminals: TerminalDTO[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (terminal: TerminalDTO) => void;
  onDelete?: (id: string) => void;
}

export default function TerminalTable({
  terminals,
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
}: TerminalTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Terminal className="w-4 h-4" />
          <span>{terminals.length} Terminal{terminals.length !== 1 ? "s" : ""}</span>
        </div>
        {onAdd && (
          <Button size="sm" onClick={onAdd} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Add Terminal
          </Button>
        )}
      </div>

      {/* Empty state */}
      {terminals.length === 0 ? (
        <div className="p-12 text-center">
          <Terminal className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No terminals found</p>
          <p className="text-gray-400 text-sm mt-1">Add a terminal to get started</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-sm font-semibold text-gray-600">
                  <th className="px-4 py-3">POS Name</th>
                  <th className="px-4 py-3">MIN Number</th>
                  <th className="px-4 py-3">PTU Number</th>
                  <th className="px-4 py-3">Registered Name</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.posName}</td>
                    <td className="px-4 py-3 text-gray-600">{t.minNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{t.ptuNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{t.registeredName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(t.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.isTrainMode
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-green-100 text-green-700 border border-green-200"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {t.isTrainMode ? "Training" : "Live"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(t)}
                            className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(t.id)}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {terminals.map((t) => (
              <Card key={t.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">{t.posName}</div>
                    <div className="text-xs text-gray-500">{t.registeredName}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.isTrainMode
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {t.isTrainMode ? "Training" : "Live"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>MIN: {t.minNumber}</div>
                  <div>PTU: {t.ptuNumber}</div>
                  <div>Valid until: {new Date(t.validUntil).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 pt-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(t)}
                      className="flex-1 text-xs text-blue-600 border-blue-200"
                    >
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(t.id)}
                      className="flex-1 text-xs text-red-600 border-red-200"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
