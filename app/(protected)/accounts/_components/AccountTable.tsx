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
  active:   "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]",
  pending:  "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]",
  disabled: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]",
};

const STATUS_ICONS: Record<UserStatus, React.ReactNode> = {
  active:   <CheckCircle2 className="size-3.5" />,
  pending:  <Power        className="size-3.5 animate-pulse" />,
  disabled: <XCircle      className="size-3.5" />,
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
              className="h-8 rounded-lg text-xs font-bold text-emerald-500 border-white/5 bg-white/5 hover:bg-emerald-500/10 transition-colors"
            >
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(profile.id)}
              className="h-8 rounded-lg text-xs font-bold text-red-500 border-white/5 bg-white/5 hover:bg-red-500/10 transition-colors"
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
                className="h-8 rounded-lg text-xs font-bold text-red-500 border-white/5 bg-white/5 hover:bg-red-500/10 transition-colors"
              >
                Deactivate
              </Button>
            )
          : onActivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(profile.id)}
                className="h-8 rounded-lg text-xs font-bold text-emerald-500 border-white/5 bg-white/5 hover:bg-emerald-500/10 transition-colors"
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
      <Card className="glass-card border-white/5 p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-accent" />
        <p className="text-muted-foreground font-medium animate-pulse">Syncing accounts...</p>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden glass-card border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      {/* Filters Bar */}
      <div className="p-5 bg-white/[0.03] border-b border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-6 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input
              placeholder="Search by name or email..."
              value={tempKeyword}
              onChange={(e) => setTempKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11 pl-11 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 focus:ring-0 transition-all font-medium"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={currentStatus}
              onChange={(e) => onStatusFilter?.(e.target.value as UserStatus | "")}
              className="w-full h-11 px-4 border border-white/10 rounded-xl text-sm font-bold bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer appearance-none"
            >
              <option value="" className="bg-popover">All Status</option>
              <option value="pending" className="bg-popover">Pending</option>
              <option value="active" className="bg-popover">Active Only</option>
              <option value="disabled" className="bg-popover">Disabled Only</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="md:col-span-3 flex gap-2">
            <Button
              onClick={handleSearch}
              className="flex-1 h-11 rounded-xl font-bold bg-accent hover:bg-accent/80 transition-all glow-on-hover px-4"
              size="sm"
            >
              <Search className="size-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1 h-11 rounded-xl font-bold border-white/10 bg-white/5 hover:bg-white/10" size="sm">
              <X className="size-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {profiles.length === 0 ? (
        <div className="p-20 text-center">
          <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Search className="size-8 text-muted-foreground opacity-20" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">No matching accounts</p>
          <p className="text-muted-foreground font-medium mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["User Details", "Organization", "Access Level", "Account Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-4 font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 ${h === "Actions" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="group border-white/5 transition-all hover:bg-white/[0.04] cursor-pointer"
                    onClick={() => router.push(`/accounts/${profile.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-sm tracking-tight group-hover:text-accent transition-colors">
                        {profile.fullName ?? profile.email}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground/60">{profile.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-sm tracking-tight text-foreground/80">
                        {profile.company?.name ?? "Independent"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${STATUS_STYLES[profile.status]}`}>
                        {STATUS_ICONS[profile.status]}
                        {profile.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
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
          <div className="md:hidden p-4 space-y-4 bg-white/[0.01]">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="p-5 glass-card border-white/5 cursor-pointer hover:border-accent/30 transition-all active:scale-[0.98]"
                onClick={() => router.push(`/accounts/${profile.id}`)}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg tracking-tight text-foreground">
                        {profile.fullName ?? profile.email}
                      </div>
                      <div className="text-xs font-bold text-accent uppercase tracking-wider mt-0.5">{profile.company?.name}</div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[profile.status]}`}>
                      {STATUS_ICONS[profile.status]}
                      {profile.status}
                    </span>
                  </div>

                  <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <span className="px-2 py-1 bg-accent/10 text-accent rounded-lg border border-accent/20">
                      {profile.role}
                    </span>
                    <span className={`px-2 py-1 rounded-lg border ${profile.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    {renderActions(profile)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-5 border-t border-white/5 bg-white/[0.01]">
            {/* Page size */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Show</span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-xs font-bold bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer appearance-none pr-8"
                >
                  {[5, 10, 20, 50, 100].map((size) => (
                    <option key={size} value={size} className="bg-popover">{size}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="size-3 rotate-90 text-muted-foreground" />
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">entries</span>
            </div>

            {/* Range info */}
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
              {totalCount === 0
                ? "No entries available"
                : `Viewing ${rangeStart}–${rangeEnd} of ${totalCount} entries`}
            </div>

            {/* Page controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Page {currentPage + 1} <span className="text-muted-foreground font-medium lowercase tracking-normal mx-1">of</span> {totalPages}
              </span>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
