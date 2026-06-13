"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AccountCompanyOptionDto,
  AccountsViewerRole,
  CreateAccountInputDto,
  ManagedAccountRole,
  UpdateAccountInputDto,
  UpdateOwnProfileInputDto,
} from "../_services/_dto/accounts.dto";
import {
  CreateAccountSchema,
  UpdateAccountSchema,
  UpdateOwnProfileSchema,
} from "../_services/_validators/accounts.validator";

type CreateFormInput = z.input<typeof CreateAccountSchema>;
type CreateFormValues = z.output<typeof CreateAccountSchema>;
type EditFormInput = z.input<typeof UpdateAccountSchema>;
type EditFormValues = z.output<typeof UpdateAccountSchema>;
type SelfFormInput = z.input<typeof UpdateOwnProfileSchema>;
type SelfFormValues = z.output<typeof UpdateOwnProfileSchema>;

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const HELP_TEXT_CLASS = "text-xs leading-5 text-muted-foreground";
const ERROR_TEXT_CLASS = "text-xs leading-5 text-destructive";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "self";
  isPending?: boolean;
  title: string;
  description: string;
  viewerRole: AccountsViewerRole;
  companyOptions: AccountCompanyOptionDto[];
  allowedRoles?: ManagedAccountRole[];
  initialValues?: {
    email?: string;
    fullName?: string | null;
    role?: ManagedAccountRole;
    companyId?: string | null;
    branchId?: string | null;
  };
  onCreateSubmit?: (values: CreateAccountInputDto) => void;
  onEditSubmit?: (values: UpdateAccountInputDto) => void;
  onSelfSubmit?: (values: UpdateOwnProfileInputDto) => void;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className={ERROR_TEXT_CLASS}>{message}</p> : null;
}

function CreateAccountDialog(props: AccountDialogProps) {
  const form = useForm<CreateFormInput, undefined, CreateFormValues>({
    resolver: zodResolver(CreateAccountSchema),
    defaultValues: {
      email: props.initialValues?.email ?? "",
      fullName: props.initialValues?.fullName ?? "",
      role: props.initialValues?.role ?? props.allowedRoles?.[0] ?? "cashier",
      companyId:
        props.initialValues?.companyId ?? props.companyOptions[0]?.id ?? "",
      branchId: props.initialValues?.branchId ?? "",
      password: "",
    },
  });

  const selectedRole = form.watch("role");
  const selectedCompanyId = form.watch("companyId");
  const selectedCompany = props.companyOptions.find(
    (company) =>
      company.id ===
      (props.viewerRole === "manager"
        ? props.companyOptions[0]?.id
        : selectedCompanyId),
  );
  const branchOptions = selectedCompany?.branches ?? [];
  const cashierLimitReached =
    selectedRole === "cashier" &&
    selectedCompany !== undefined &&
    selectedCompany.cashierSlotsAvailable <= 0;

  useEffect(() => {
    form.reset({
      email: props.initialValues?.email ?? "",
      fullName: props.initialValues?.fullName ?? "",
      role: props.initialValues?.role ?? props.allowedRoles?.[0] ?? "cashier",
      companyId:
        props.initialValues?.companyId ?? props.companyOptions[0]?.id ?? "",
      branchId: props.initialValues?.branchId ?? "",
      password: "",
    });
  }, [form, props.companyOptions, props.initialValues, props.allowedRoles, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            props.onCreateSubmit?.({
              email: values.email,
              fullName: values.fullName,
              role: values.role,
              companyId:
                props.viewerRole === "manager"
                  ? props.companyOptions[0]?.id ?? values.companyId
                  : values.companyId,
              password: values.password,
              branchId: values.role === "cashier" ? values.branchId : null,
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              disabled={props.isPending}
              {...form.register("email")}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Juan dela Cruz"
              disabled={props.isPending}
              {...form.register("fullName")}
            />
            <FieldError message={form.formState.errors.fullName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className={SELECT_CLASS}
              disabled={props.isPending || props.allowedRoles?.length === 1}
              {...form.register("role")}
            >
              {(props.allowedRoles ?? ["cashier"]).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Company</Label>
            <select
              id="companyId"
              className={SELECT_CLASS}
              disabled={props.isPending || props.viewerRole === "manager"}
              {...form.register("companyId")}
            >
              <option value="">Select a company</option>
              {props.companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.companyId?.message} />
            {selectedRole === "cashier" && selectedCompany ? (
              <p
                className={`text-xs leading-5 ${
                  cashierLimitReached ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                Cashier slots: {selectedCompany.cashierSlotsAvailable} available
                of {selectedCompany.cashierLimit}. {selectedCompany.cashierCount} used
                across {selectedCompany.terminalCount} terminal
                {selectedCompany.terminalCount === 1 ? "" : "s"}.
              </p>
            ) : null}
          </div>

          {selectedRole === "cashier" ? (
            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <select
                id="branchId"
                className={SELECT_CLASS}
                disabled={props.isPending}
                {...form.register("branchId")}
              >
                <option value="">No branch assigned</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.branchId?.message} />
            </div>
          ) : null}

          {selectedRole === "cashier" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                disabled={props.isPending}
                {...form.register("password")}
              />
              <FieldError message={form.formState.errors.password?.message} />
              {!form.formState.errors.password ? (
                <p className={HELP_TEXT_CLASS}>
                  Cashier accounts need a login password at creation.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={props.isPending || cashierLimitReached}
            >
              {props.isPending ? "Saving..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog(props: AccountDialogProps) {
  const form = useForm<EditFormInput, undefined, EditFormValues>({
    resolver: zodResolver(UpdateAccountSchema),
    defaultValues: {
      fullName: props.initialValues?.fullName ?? "",
      companyId:
        props.initialValues?.companyId ?? props.companyOptions[0]?.id ?? "",
      branchId: props.initialValues?.branchId ?? "",
      password: "",
    },
  });

  useEffect(() => {
    form.reset({
      fullName: props.initialValues?.fullName ?? "",
      companyId:
        props.initialValues?.companyId ?? props.companyOptions[0]?.id ?? "",
      branchId: props.initialValues?.branchId ?? "",
      password: "",
    });
  }, [form, props.companyOptions, props.initialValues, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            props.onEditSubmit?.({
              fullName: values.fullName,
              companyId:
                props.viewerRole === "manager"
                  ? props.companyOptions[0]?.id ?? values.companyId
                  : values.companyId,
              password: values.password,
              branchId: values.branchId,
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input
              id="edit-fullName"
              autoComplete="name"
              disabled={props.isPending}
              {...form.register("fullName")}
            />
            <FieldError message={form.formState.errors.fullName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-companyId">Company</Label>
            <select
              id="edit-companyId"
              className={SELECT_CLASS}
              disabled={props.isPending || props.viewerRole === "manager"}
              {...form.register("companyId")}
            >
              <option value="">Select a company</option>
              {props.companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <FieldError message={form.formState.errors.companyId?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-branchId">Branch</Label>
            <select
              id="edit-branchId"
              className={SELECT_CLASS}
              disabled={props.isPending}
              {...form.register("branchId")}
            >
              <option value="">No branch assigned</option>
              {props.companyOptions
                .find(
                  (company) =>
                    company.id ===
                    (props.viewerRole === "manager"
                      ? props.companyOptions[0]?.id
                      : form.watch("companyId")),
                )
                ?.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </select>
            <FieldError message={form.formState.errors.branchId?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">New Password</Label>
            <Input
              id="edit-password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              disabled={props.isPending}
              {...form.register("password")}
            />
            <FieldError message={form.formState.errors.password?.message} />
            {!form.formState.errors.password ? (
              <p className={HELP_TEXT_CLASS}>
                Set a new login password for this account if needed.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={props.isPending}
            >
              {props.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelfAccountDialog(props: AccountDialogProps) {
  const form = useForm<SelfFormInput, undefined, SelfFormValues>({
    resolver: zodResolver(UpdateOwnProfileSchema),
    defaultValues: {
      email: props.initialValues?.email ?? "",
      fullName: props.initialValues?.fullName ?? "",
      password: "",
      pin: "",
    },
  });

  useEffect(() => {
    form.reset({
      email: props.initialValues?.email ?? "",
      fullName: props.initialValues?.fullName ?? "",
      password: "",
      pin: "",
    });
  }, [form, props.initialValues, props.open]);

  const watchedEmail = form.watch("email");
  const emailValue = typeof watchedEmail === "string" ? watchedEmail : "";
  const emailWillChange =
    Boolean(emailValue) && emailValue !== props.initialValues?.email;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            props.onSelfSubmit?.({
              email:
                values.email && values.email !== props.initialValues?.email
                  ? values.email
                  : undefined,
              fullName: values.fullName,
              password: values.password,
              pin:
                props.viewerRole === "manager" || props.viewerRole === "admin"
                  ? values.pin
                  : undefined,
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="self-fullName">Full Name</Label>
            <Input
              id="self-fullName"
              autoComplete="name"
              disabled={props.isPending}
              {...form.register("fullName")}
            />
            <FieldError message={form.formState.errors.fullName?.message} />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/25 p-3">
            <div className="space-y-2">
              <Label htmlFor="self-email">Verified Email</Label>
            <Input
              id="self-email"
              type="email"
              autoComplete="email"
                disabled={props.isPending}
              {...form.register("email")}
            />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            {emailWillChange ? (
              <p className={HELP_TEXT_CLASS}>
                POSard will send a verification link to {emailValue}. Your
                current login email stays active until that link is confirmed.
              </p>
            ) : (
              <p className={HELP_TEXT_CLASS}>
                Use a real inbox so password resets and future POSard messages
                can reach this account.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="self-password">New Password</Label>
            <Input
              id="self-password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              disabled={props.isPending}
              {...form.register("password")}
            />
            <FieldError message={form.formState.errors.password?.message} />
            {!form.formState.errors.password ? (
              <p className={HELP_TEXT_CLASS}>
                Enter a new password only if you want to change it now.
              </p>
            ) : null}
          </div>

          {props.viewerRole === "manager" || props.viewerRole === "admin" ? (
            <div className="space-y-2">
              <Label htmlFor="self-pin">Access PIN</Label>
              <Input
                id="self-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4 to 6 digits"
                maxLength={6}
                disabled={props.isPending}
                {...form.register("pin")}
              />
              <FieldError message={form.formState.errors.pin?.message} />
              {!form.formState.errors.pin ? (
                <p className={HELP_TEXT_CLASS}>
                  Update the POS manager approval PIN used for protected actions.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={props.isPending}
            >
              {props.isPending
                ? "Saving..."
                : emailWillChange
                  ? "Send Verification"
                  : "Save Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountDialog(props: AccountDialogProps) {
  if (props.mode === "create") {
    return <CreateAccountDialog {...props} />;
  }

  if (props.mode === "edit") {
    return <EditAccountDialog {...props} />;
  }

  return <SelfAccountDialog {...props} />;
}
