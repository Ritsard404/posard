"use client";

import { useState } from "react";
import AccountTable from "@/components/accounts/AccountTable";
import { useMembersQuery } from "@/features/member/member.hooks";
import {
  useApproveMemberMutation,
  useActivateMemberMutation,
  useDeactivateMemberMutation,
} from "@/features/member/member.hooks";

export default function AccountsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<
    "APPROVED" | "PENDING" | "REJECTED" | ""
  >("");

  const { data, isLoading } = useMembersQuery({
    page,
    size: pageSize,
    sortBy: "identifier",
    direction: "asc",
    keyword: keyword || undefined,
    approvalStatus: approvalStatus || undefined,
  });

  const approveMutation = useApproveMemberMutation();
  const activateMutation = useActivateMemberMutation();
  const deactivateMutation = useDeactivateMemberMutation();

  const handleApprove = (memberId: string) => {
    if (window.confirm("Are you sure you want to approve this member?")) {
      approveMutation.mutate(memberId);
    }
  };

  const handleActivate = (memberId: string) => {
    if (window.confirm("Are you sure you want to activate this member?")) {
      activateMutation.mutate(memberId);
    }
  };

  const handleDeactivate = (memberId: string) => {
    if (window.confirm("Are you sure you want to deactivate this member?")) {
      deactivateMutation.mutate(memberId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Accounts
        </h1>
        <p className="text-gray-600 text-sm md:text-base mt-1">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Table with integrated filters */}
      <AccountTable
        members={data?.content || []}
        isLoading={isLoading}
        onApprove={handleApprove}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        itemsPerPage={pageSize}
        onPageSizeChange={setPageSize}
        onSearch={setKeyword}
        onStatusFilter={setApprovalStatus}
        currentStatus={approvalStatus}
      />
    </div>
  );
}
