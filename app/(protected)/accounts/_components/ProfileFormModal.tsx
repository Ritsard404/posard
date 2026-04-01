"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Power,
  Building2,
  User,
} from "lucide-react";
import type { UserRole, UserStatus } from "@prisma/client";
import type { ProfileListItem } from "@/app/(protected)/accounts/_services/profile.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileFormModalProps {
  profile?: ProfileListItem;
  isLoading?: boolean;
  isSaving?: boolean;
  isApprovingPending?: boolean;
  isRejectingPending?: boolean;
  isActivatingPending?: boolean;
  isDeactivatingPending?: boolean;
  onSubmit: (data: ProfileListItem) => void;
  onCancel?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_PROFILE: ProfileListItem = {
  id: "",
  email: "",
  fullName: null,
  role: "cashier",
  status: "pending",
  isActive: false,
  company: { id: null, name: null },
};

const STATUS_CONFIG: Record<
  UserStatus,
  { icon: React.ReactNode; label: string; className: string }
> = {
  active: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Active",
    className: "text-green-700 bg-green-50 border border-green-200",
  },
  pending: {
    icon: <Power className="w-4 h-4" />,
    label: "Pending Approval",
    className: "text-amber-700 bg-amber-50 border border-amber-200",
  },
  disabled: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Disabled",
    className: "text-red-700 bg-red-50 border border-red-200",
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  isLoading,
  icon,
  label,
  loadingLabel,
  className,
  variant = "default",
}: {
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  icon: React.ReactNode;
  label: string;
  loadingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "destructive";
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      className={`w-full ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel ?? label}
        </>
      ) : (
        <>
          <span className="mr-2 h-4 w-4">{icon}</span>
          {label}
        </>
      )}
    </Button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfileFormModal({
  profile,
  isLoading = false,
  isSaving = false,
  isApprovingPending = false,
  isRejectingPending = false,
  isActivatingPending = false,
  isDeactivatingPending = false,
  onSubmit,
  onCancel,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
}: ProfileFormModalProps) {
  const [formData, setFormData] = useState<ProfileListItem>(
    profile ?? EMPTY_PROFILE,
  );

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500">Loading profile details...</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[formData.status];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Main Form ── */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Email">
            <Input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              type="email"
            />
          </FormField>

          <FormField label="Full Name">
            <Input
              name="fullName"
              value={formData.fullName ?? ""}
              onChange={handleChange}
              placeholder="Full name"
            />
          </FormField>

          <FormField label="Role" required>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {(["cashier", "manager", "admin"] as UserRole[]).map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSaving} className="flex-1 md:flex-none">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* ── Sidebar ── */}
      <div className="space-y-5">
        {/* Company Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Company</h3>
          </div>
          <p className="text-sm text-gray-700">
            {formData.company?.name ?? <span className="text-gray-400">No company</span>}
          </p>
        </Card>

        {/* Status & Actions Card */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b">
            Status & Actions
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.className}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              {onApprove && (
                <ActionButton
                  onClick={onApprove}
                  isLoading={isApprovingPending}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Approve"
                  loadingLabel="Approving..."
                  className="bg-green-600 hover:bg-green-700 text-white"
                />
              )}

              {onReject && (
                <ActionButton
                  onClick={onReject}
                  isLoading={isRejectingPending}
                  icon={<XCircle className="w-4 h-4" />}
                  label="Reject"
                  loadingLabel="Rejecting..."
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                />
              )}

              {onDeactivate && (
                <ActionButton
                  onClick={onDeactivate}
                  isLoading={isDeactivatingPending}
                  icon={<XCircle className="w-4 h-4" />}
                  label="Deactivate"
                  loadingLabel="Deactivating..."
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                />
              )}

              {onActivate && (
                <ActionButton
                  onClick={onActivate}
                  isLoading={isActivatingPending}
                  icon={<Power className="w-4 h-4" />}
                  label="Activate"
                  loadingLabel="Activating..."
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
