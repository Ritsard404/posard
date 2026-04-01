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
import type { UserStatus } from "@prisma/client";
import type { ProfileListItem } from "@/app/(protected)/accounts/_services/profile.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountTableProps {
  profiles: ProfileListItem[];
  isLoading?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (keyword: string) => void;
  onStatusFilter?: (status: UserStatus | "") => void;
  currentStatus?: UserStatus | "";
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onActivate?: (id: string) => void;
  onDeactivate?: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<UserStatus, string> = {
  active:   "text-green-700 bg-green-100 border border-green-200",
  pending:  "text-amber-700 bg-amber-100 border border-amber-200",
  disabled: "text-red-700   bg-red-100   border border-red-200",
};

const STATUS_ICONS: Record<UserStatus, React.ReactNode> = {
  active:   <CheckCircle2 className="w-4 h-4" />,
  pending:  <Power        className="w-4 h-4" />,
  disabled: <XCircle      className="w-4 h-4" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountTable({
  profiles,
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

  const handleSearch = () => onSearch?.(tempKeyword);

  const handleReset = () => {
    setTempKeyword("");
    onSearch?.("");
    onStatusFilter?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // ── Action buttons ────────────────────────────────────────────────────────

  const renderActions = (profile: ProfileListItem) => (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {profile.status === "pending" && (
        <>
          {onApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApprove(profile.id)}
              className="text-xs text-green-600 border-green-200 hover:bg-green-50"
            >
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(profile.id)}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              Reject
            </Button>
          )}
        </>
      )}

      {profile.status !== "pending" && (
        profile.isActive
          ? onDeactivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(profile.id)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                Deactivate
              </Button>
            )
          : onActivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(profile.id)}
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
              placeholder="Search by name or email..."
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
              onChange={(e) => onStatusFilter?.(e.target.value as UserStatus | "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
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
      {profiles.length === 0 ? (
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
                  {["User", "Company", "Role", "Status", "Actions"].map((h) => (
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
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/accounts/${profile.id}`)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {profile.fullName ?? profile.email}
                      </div>
                      <div className="text-xs text-gray-500">{profile.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {profile.company?.name ?? "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 capitalize">
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[profile.status]}`}>
                        {STATUS_ICONS[profile.status]}
                        {profile.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {renderActions(profile)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push(`/accounts/${profile.id}`)}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {profile.fullName ?? profile.email}
                      </div>
                      <div className="text-xs text-gray-500">{profile.company?.name}</div>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[profile.status]}`}>
                      {STATUS_ICONS[profile.status]}
                      {profile.status}
                    </span>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded capitalize">
                      {profile.role}
                    </span>
                    <span className={`px-2 py-1 rounded ${profile.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="pt-1">
                    {renderActions(profile)}
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
