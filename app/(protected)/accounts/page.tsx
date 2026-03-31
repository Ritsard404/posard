"use client";

import { useState, useEffect, useCallback } from "react";
import AccountTable from "@/app/(protected)/accounts/_components/AccountTable";
import {
  findAllMembers,
  approveMember,
  rejectMember,
  activateMember,
  deactivateMember,
} from "@/app/(protected)/accounts/_actions/member.actions";
import { MemberListItem, MemberApprovalStatus } from "@/app/(protected)/accounts/_services/member.dto";

export default function AccountsPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [allMembers, setAllMembers] = useState<MemberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filter / pagination state ─────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<MemberApprovalStatus | "">("");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await findAllMembers();
      setAllMembers(data);
      console.log("Fetched members:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ── Client-side filter + paginate ─────────────────────────────────────────
  const filtered = allMembers
    .filter((m) => {
      const kw = keyword.toLowerCase();
      const matchesKeyword =
        !keyword ||
        m.identifier.toLowerCase().includes(kw) ||
        m.company?.name?.toLowerCase().includes(kw) ||
        m.company?.email?.toLowerCase().includes(kw);
      const matchesStatus = !approvalStatus || m.approvalStatus === approvalStatus;
      return matchesKeyword && matchesStatus;
    })
    .sort((a, b) => a.identifier.localeCompare(b.identifier));

  const totalCount = filtered.length;
  const pageContent = filtered.slice(page * pageSize, page * pageSize + pageSize);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const handleApprove = async (memberId: string) => {
    if (!window.confirm("Approve this member?")) return;
    try {
      await approveMember(memberId);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve member");
    }
  };

  const handleReject = async (memberId: string) => {
    if (!window.confirm("Reject this member?")) return;
    try {
      await rejectMember(memberId);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject member");
    }
  };

  const handleActivate = async (memberId: string) => {
    if (!window.confirm("Activate this member?")) return;
    try {
      await activateMember(memberId);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate member");
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!window.confirm("Deactivate this member?")) return;
    try {
      await deactivateMember(memberId);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate member");
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
        members={pageContent}
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
        onStatusFilter={(s) => { setApprovalStatus(s); setPage(0); }}
        currentStatus={approvalStatus}
      />
    </div>
  );
}