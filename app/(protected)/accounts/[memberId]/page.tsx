"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  findMemberById,
  approveMember,
  rejectMember,
  activateMember,
  deactivateMember,
} from "@/app/(protected)/accounts/_actions/member.actions";
import { MemberListItem } from "@/app/(protected)/accounts/_services/member.dto";
import MemberFormModal from "@/app/(protected)/accounts/_components/MemberFormModal";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  const router = useRouter();

  const [member, setMember] = useState<MemberListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMember = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await findMemberById(memberId);
      if (!data) {
        setError("Member not found");
      } else {
        setMember(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member");
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleSave = async (data: MemberListItem) => {
    setIsSaving(true);
    try {
      // TODO: memberService.update(data)
      setMember(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!member) return;
    setIsApproving(true);
    try {
      await approveMember(member.memberId);
      await fetchMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!member) return;
    setIsRejecting(true);
    try {
      await rejectMember(member.memberId);
      await fetchMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleActivate = async () => {
    if (!member) return;
    setIsActivating(true);
    try {
      await activateMember(member.memberId);
      await fetchMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!member) return;
    setIsDeactivating(true);
    try {
      await deactivateMember(member.memberId);
      await fetchMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  };

  // ── Derived action visibility (mirrors Java service logic) ─────────────────
  const isPending = member?.approvalStatus === "PENDING";
  const isApproved = member?.approvalStatus === "APPROVED";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/accounts")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {member ? member.identifier : "Member Details"}
          </h1>
          {member && (
            <p className="text-gray-500 text-sm mt-0.5 capitalize">
              {member.permission}
            </p>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <MemberFormModal
        member={member ?? undefined}
        isLoading={isLoading}
        isSaving={isSaving}
        isApprovingPending={isApproving}
        isRejectingPending={isRejecting}
        isActivatingPending={isActivating}
        isDeactivatingPending={isDeactivating}
        onSubmit={handleSave}
        onCancel={() => router.push("/accounts")}
        onApprove={isPending ? handleApprove : undefined}
        onReject={isPending ? handleReject : undefined}
        onActivate={
          isApproved && !member?.isActive ? handleActivate : undefined
        }
        onDeactivate={
          isApproved && member?.isActive ? handleDeactivate : undefined
        }
      />
    </div>
  );
}
