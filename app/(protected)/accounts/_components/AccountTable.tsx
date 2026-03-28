"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { MemberListItem, MemberApprovalStatus } from "@/app/(protected)/accounts/_services/member.dto";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountTableProps {
  members: MemberListItem[];        // already paginated — pass pageContent, not allMembers
  isLoading?: boolean;
  totalCount?: number;              // total across all pages (for pagination display)
  currentPage?: number;             // controlled by parent
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (keyword: string) => void;
  onStatusFilter?: (status: MemberApprovalStatus | "") => void;
  currentStatus?: MemberApprovalStatus | "";
  onApprove?: (memberId: string) => void;
  onReject?: (memberId: string) => void;
  onActivate?: (memberId: string) => void;
  onDeactivate?: (memberId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MemberApprovalStatus, string> = {
  APPROVED: "text-green-700 bg-green-100 border border-green-200",
  PENDING:  "text-amber-700 bg-amber-100 border border-amber-200",
  REJECTED: "text-red-700   bg-red-100   border border-red-200",
};

const STATUS_ICONS: Record<MemberApprovalStatus, React.ReactNode> = {
  APPROVED: <CheckCircle2 className="w-4 h-4" />,
  PENDING:  <Power        className="w-4 h-4" />,
  REJECTED: <XCircle      className="w-4 h-4" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountTable({
  members,
  isLoading = false,
  totalCount = 0,
  currentPage = 0,
  onPageChange,
  itemsPerPage = 10,
  onPageSizeChange,
  onSearch,
  onStatusFilter,
  currentStatus = "",
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
}: AccountTableProps) {
  const [tempKeyword, setTempKeyword] = useState("");
  const router = useRouter();

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const rangeStart = totalCount === 0 ? 0 : currentPage * itemsPerPage + 1;
  const rangeEnd = Math.min((currentPage + 1) * itemsPerPage, totalCount);

  // ── Search handlers ───────────────────────────────────────────────────────

  const handleSearch = () => {
    onSearch?.(tempKeyword);
  };

  const handleReset = () => {
    setTempKeyword("");
    onSearch?.("");
    onStatusFilter?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // ── Action buttons (shared between desktop + mobile) ──────────────────────

  const renderActions = (member: MemberListItem) => (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {member.approvalStatus === "PENDING" && (
        <>
          {onApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApprove(member.memberId)}
              className="text-xs text-green-600 border-green-200 hover:bg-green-50"
            >
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(member.memberId)}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              Reject
            </Button>
          )}
        </>
      )}

      {member.approvalStatus !== "PENDING" && (
        member.isActive
          ? onDeactivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(member.memberId)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                Deactivate
              </Button>
            )
          : onActivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(member.memberId)}
                className="text-xs text-green-600 border-green-200 hover:bg-green-50"
              >
                Activate
              </Button>
            )
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden">
      {/* Filters Bar */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by identifier, name, or company email..."
              value={tempKeyword}
              onChange={(e) => setTempKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 border-gray-300 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={currentStatus}
              onChange={(e) => onStatusFilter?.(e.target.value as MemberApprovalStatus | "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="md:col-span-3 flex gap-2">
            <Button
              onClick={handleSearch}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Search className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Search</span>
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1" size="sm">
              <X className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 font-medium">No accounts found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  {["User", "Company", "Permission", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-sm font-semibold text-gray-700 ${h === "Actions" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.memberId}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/accounts/${member.memberId}`)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{member.identifier}</div>
                      <div className="text-xs text-gray-500">{member.company?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{member.company?.name ?? "N/A"}</div>
                      <div className="text-xs text-gray-500">{member.company?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 capitalize">
                        {member.permission}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[member.approvalStatus]}`}>
                        {STATUS_ICONS[member.approvalStatus]}
                        {member.approvalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {renderActions(member)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {members.map((member) => (
              <Card
                key={member.memberId}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push(`/accounts/${member.memberId}`)}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{member.identifier}</div>
                      <div className="text-xs text-gray-500">{member.company?.name}</div>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[member.approvalStatus]}`}>
                      {STATUS_ICONS[member.approvalStatus]}
                      {member.approvalStatus}
                    </span>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded capitalize">
                      {member.permission}
                    </span>
                    <span className={`px-2 py-1 rounded ${member.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="pt-1">
                    {renderActions(member)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-t bg-gray-50">
            {/* Page size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>

            {/* Range info */}
            <div className="text-sm text-gray-600">
              {totalCount === 0
                ? "No entries"
                : `Showing ${rangeStart}–${rangeEnd} of ${totalCount} entries`}
            </div>

            {/* Page controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}