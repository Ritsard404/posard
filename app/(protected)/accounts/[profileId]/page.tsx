"use client";

import { use, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  findProfileById,
  approveProfile,
  rejectProfile,
  activateProfile,
  deactivateProfile,
} from "@/app/(protected)/accounts/_actions/profile.actions";
import ProfileFormModal from "@/app/(protected)/accounts/_components/ProfileFormModal";
import type { ProfileListItem } from "@/app/(protected)/accounts/_services/profile.service";

// ─────────────────────────────────────────────────────────────────
// Inner component — uses use(params), must be inside <Suspense>
// ─────────────────────────────────────────────────────────────────

function ProfileDetailInner({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await findProfileById(profileId);
      if (!data) {
        setError("Profile not found");
      } else {
        setProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Mutations ────────────────────────────────────────────────────
  const handleSave = async (data: ProfileListItem) => {
    setIsSaving(true);
    try {
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!profile) return;
    setIsApproving(true);
    try {
      await approveProfile(profile.id);
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!profile) return;
    setIsRejecting(true);
    try {
      await rejectProfile(profile.id);
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleActivate = async () => {
    if (!profile) return;
    setIsActivating(true);
    try {
      await activateProfile(profile.id);
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!profile) return;
    setIsDeactivating(true);
    try {
      await deactivateProfile(profile.id);
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setIsDeactivating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
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
            {profile ? (profile.fullName ?? profile.email) : "Profile Details"}
          </h1>
          {profile && (
            <p className="text-gray-500 text-sm mt-0.5 capitalize">
              {profile.role}
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
      <ProfileFormModal
        profile={profile ?? undefined}
        isLoading={isLoading}
        isSaving={isSaving}
        isApprovingPending={isApproving}
        isRejectingPending={isRejecting}
        isActivatingPending={isActivating}
        isDeactivatingPending={isDeactivating}
        onSubmit={handleSave}
        onCancel={() => router.push("/accounts")}
        onApprove={profile?.status === "pending" ? handleApprove : undefined}
        onReject={profile?.status === "pending" ? handleReject : undefined}
        onActivate={profile?.status === "disabled" ? handleActivate : undefined}
        onDeactivate={
          profile?.status === "active" ? handleDeactivate : undefined
        }
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Public page export — wraps inner component in <Suspense>
// ─────────────────────────────────────────────────────────────────

export default function ProfileDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      }
    >
      <ProfileDetailInner params={params} />
    </Suspense>
  );
}
