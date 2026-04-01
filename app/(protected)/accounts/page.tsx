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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounts</h1>
        <p className="text-gray-600 text-sm md:text-base mt-1">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
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
  );
}
