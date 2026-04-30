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
  };
  onCreateSubmit?: (values: CreateAccountInputDto) => void;
  onEditSubmit?: (values: UpdateAccountInputDto) => void;
  onSelfSubmit?: (values: UpdateOwnProfileInputDto) => void;
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
      password: "",
    });
  }, [form, props.companyOptions, props.initialValues, props.allowedRoles, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.fullName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={props.allowedRoles?.length === 1}
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={props.viewerRole === "manager"}
              {...form.register("companyId")}
            >
              <option value="">Select a company</option>
              {props.companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {form.formState.errors.companyId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            ) : null}
            {selectedRole === "cashier" && selectedCompany ? (
              <p
                className={`text-xs ${
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cashier accounts need a login password at creation.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={props.isPending || cashierLimitReached}>
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
      password: "",
    },
  });

  useEffect(() => {
    form.reset({
      fullName: props.initialValues?.fullName ?? "",
      companyId:
        props.initialValues?.companyId ?? props.companyOptions[0]?.id ?? "",
      password: "",
    });
  }, [form, props.companyOptions, props.initialValues, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input id="edit-fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.fullName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-companyId">Company</Label>
            <select
              id="edit-companyId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={props.viewerRole === "manager"}
              {...form.register("companyId")}
            >
              <option value="">Select a company</option>
              {props.companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {form.formState.errors.companyId ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">New Password</Label>
            <Input
              id="edit-password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Set a new login password for this account if needed.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={props.isPending}>
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
      fullName: props.initialValues?.fullName ?? "",
      password: "",
      pin: "",
    },
  });

  useEffect(() => {
    form.reset({
      fullName: props.initialValues?.fullName ?? "",
      password: "",
      pin: "",
    });
  }, [form, props.initialValues, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            props.onSelfSubmit?.({
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
            <Input id="self-fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.fullName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="self-password">New Password</Label>
            <Input
              id="self-password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enter a new password only if you want to change it now.
              </p>
            )}
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
                {...form.register("pin")}
              />
              {form.formState.errors.pin ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.pin.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Update the POS manager approval PIN used for protected actions.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={props.isPending}>
              {props.isPending ? "Saving..." : "Save Profile"}
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
