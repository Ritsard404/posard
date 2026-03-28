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
import {
  MemberListItem,
  MemberApprovalStatus,
  PermissionType,
} from "@/app/(protected)/accounts/_services/member.dto";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberFormModalProps {
  member?: MemberListItem;
  isLoading?: boolean;
  isSaving?: boolean;
  isApprovingPending?: boolean;
  isRejectingPending?: boolean;
  isActivatingPending?: boolean;
  isDeactivatingPending?: boolean;
  onSubmit: (data: MemberListItem) => void;
  onCancel?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_MEMBER: MemberListItem = {
  memberId: "",
  identifier: "",
  approvalStatus: "PENDING",
  isActive: false,
  permission: "cashier",
  company: {
    code: null,
    email: null,
    logoImageUrl: null,
    name: null,
    phone: null,
    uuid: null,
  },
};

const STATUS_CONFIG: Record<
  MemberApprovalStatus,
  { icon: React.ReactNode; label: string; className: string }
> = {
  APPROVED: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Approved",
    className: "text-green-700 bg-green-50 border border-green-200",
  },
  PENDING: {
    icon: <Power className="w-4 h-4" />,
    label: "Pending Approval",
    className: "text-amber-700 bg-amber-50 border border-amber-200",
  },
  REJECTED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Rejected",
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

export default function MemberFormModal({
  member,
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
}: MemberFormModalProps) {
  const [formData, setFormData] = useState<MemberListItem>(
    member ?? EMPTY_MEMBER
  );

  // Sync when member prop changes (e.g. after refetch)
  useEffect(() => {
    if (member) setFormData(member);
  }, [member]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("company.")) {
      const field = name.replace("company.", "") as keyof MemberListItem["company"];
      setFormData((prev) => ({
        ...prev,
        company: { ...prev.company, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500">Loading member details...</p>
        </div>
      </div>
    );
  }

  const statusConfig = formData.approvalStatus
    ? STATUS_CONFIG[formData.approvalStatus]
    : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Main Form ── */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Member Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Identifier">
            <Input
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="e.g. cashier_001"
            />
          </FormField>

          <FormField label="Permission" required>
            <select
              name="permission"
              value={formData.permission}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {(["cashier", "manager", "admin"] as PermissionType[]).map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </FormField>

          {/* Action Buttons */}
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

          <div className="space-y-4">
            {formData.company?.logoImageUrl && (
              <img
                src={formData.company.logoImageUrl}
                alt={formData.company.name ?? "Company"}
                className="h-14 w-14 object-contain rounded border border-gray-100"
              />
            )}
            <FormField label="Name">
              <Input
                name="company.name"
                value={formData.company?.name ?? ""}
                onChange={handleChange}
                placeholder="Company name"
              />
            </FormField>
            <FormField label="Code">
              <Input
                name="company.code"
                value={formData.company?.code ?? ""}
                onChange={handleChange}
                placeholder="Company code"
              />
            </FormField>
            <FormField label="Email">
              <Input
                name="company.email"
                value={formData.company?.email ?? ""}
                onChange={handleChange}
                placeholder="Company email"
              />
            </FormField>
            <FormField label="Phone">
              <Input
                name="company.phone"
                value={formData.company?.phone ?? ""}
                onChange={handleChange}
                placeholder="Company phone"
              />
            </FormField>
          </div>
        </Card>

        {/* Status & Actions Card */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b">
            Status & Actions
          </h3>

          <div className="space-y-4">
            {/* Approval status badge */}
            {statusConfig && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Approval</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.className}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
              </div>
            )}

            {/* Active status badge */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Account</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                formData.isActive
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : "text-gray-600 bg-gray-100 border border-gray-200"
              }`}>
                <span className={`w-2 h-2 rounded-full ${formData.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                {formData.isActive ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2 border-t">
              {/* Approve — only when PENDING */}
              {onApprove && (
                <ActionButton
                  onClick={onApprove}
                  isLoading={isApprovingPending}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Approve Member"
                  loadingLabel="Approving..."
                  className="bg-green-600 hover:bg-green-700 text-white"
                />
              )}

              {/* Reject — only when PENDING */}
              {onReject && (
                <ActionButton
                  onClick={onReject}
                  isLoading={isRejectingPending}
                  icon={<XCircle className="w-4 h-4" />}
                  label="Reject Member"
                  loadingLabel="Rejecting..."
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                />
              )}

              {/* Deactivate — when active */}
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

              {/* Activate — when inactive */}
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