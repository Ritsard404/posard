"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  setupCompanySchema,
  type SetupCompanyInput,
} from "../_schemas/setup-company.schema";
import { createCompany } from "../_services/setup-company.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function SetupCompanyForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetupCompanyInput>({
    resolver: zodResolver(setupCompanySchema),
    defaultValues: {
      name: "",
      code: "",
      email: "",
      phone: "",
      logoImageUrl: "",
    },
  });

  async function onSubmit(data: SetupCompanyInput) {
    try {
      await createCompany(data);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError("root", { message: err.message });
    }
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Create Company</CardTitle>
        <CardDescription>Set up your company information</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Company Info */}
          <div className="grid gap-4">
            <p className="text-xs font-mono uppercase text-muted-foreground border-b pb-2">
              Company Info
            </p>

            {/* Name */}
            <div className="grid gap-2">
              <Label>Company Name *</Label>
              <Input placeholder="e.g. Brew & Co." {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Code + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input placeholder="e.g. BREW01" {...register("code")} />
                {errors.code && (
                  <p className="text-sm text-destructive">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="company@email.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input placeholder="+63 900 000 0000" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Logo */}
          {/* <div className="grid gap-4">
            <p className="text-xs font-mono uppercase text-muted-foreground border-b pb-2">
              Logo
            </p>

            <div className="grid gap-2">
              <Label>Logo Image URL</Label>
              <Input placeholder="https://..." {...register("logoImageUrl")} />
              {errors.logoImageUrl && (
                <p className="text-sm text-destructive">
                  {errors.logoImageUrl.message}
                </p>
              )}
            </div>
          </div> */}

          {/* Root error */}
          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Company"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
