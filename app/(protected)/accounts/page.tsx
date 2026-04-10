"use client";

import { useState, useEffect, useCallback } from "react";
import AccountTable from "@/app/(protected)/accounts/_components/AccountTable";
import {
  findAllProfiles,
  approveProfile,
  rejectProfile,
  activateProfile,
  deactivateProfile,
} from "@/app/(protected)/accounts/_actions/profile.actions";
import type { ProfileListItem } from "@/app/(protected)/accounts/_services/profile.service";
import type { UserStatus } from "@prisma/client";

export default function AccountsPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [allProfiles, setAllProfiles] = useState<ProfileListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filter / pagination state ─────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await findAllProfiles();
      setAllProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profiles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ── Client-side filter + paginate ─────────────────────────────────────────
  const filtered = allProfiles
    .filter((p) => {
      const kw = keyword.toLowerCase();
      const name = p.fullName ?? p.email;
      const matchesKeyword =
        !keyword ||
        name.toLowerCase().includes(kw) ||
        p.company?.name?.toLowerCase().includes(kw);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesKeyword && matchesStatus;
    })
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));

  const totalCount = filtered.length;
  const pageContent = filtered.slice(page * pageSize, page * pageSize + pageSize);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    if (!window.confirm("Approve this profile?")) return;
    try {
      await approveProfile(id);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Reject this profile?")) return;
    try {
      await rejectProfile(id);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm("Activate this profile?")) return;
    try {
      await activateProfile(id);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm("Deactivate this profile?")) return;
    try {
      await deactivateProfile(id);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-20 -right-10 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground font-medium">
            Manage user accounts, permissions, and administrative approvals
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex justify-between animate-in fade-in zoom-in-95">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive hover:underline font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Table container */}
        <div className="relative">
          <AccountTable
            profiles={pageContent}
            isLoading={isLoading}
            onApprove={handleApprove}
            onReject={handleReject}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            itemsPerPage={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            totalCount={totalCount}
            currentPage={page}
            onPageChange={setPage}
            onSearch={(kw) => { setKeyword(kw); setPage(0); }}
            onStatusFilter={(s) => { setStatusFilter(s); setPage(0); }}
            currentStatus={statusFilter}
          />
        </div>
      </div>
    </div>
  );
}
