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
      managerPin: "",
    },
  });

  async function onSubmit(data: SetupCompanyInput) {
    try {
      await createCompany(data);
      // router.refresh();
      // router.push("/dashboard");
    } catch (err: any) {
      setError("root", { message: err.message });
    }
  }

  return (
    <Card className="glass-card max-w-2xl mx-auto border-white/5 shadow-2xl">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">Create Your Workspace</CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          Set up your company profile to start managing your point of sale
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/80 px-2">Company Essentials</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="grid gap-6">
              {/* Name */}
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legal Company Name *</Label>
                <Input 
                  placeholder="e.g. Brew & Co." 
                  {...register("name")} 
                  className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 transition-all"
                />
                {errors.name && (
                  <p className="text-xs font-bold text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Code + Email */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Code</Label>
                  <Input 
                    placeholder="e.g. BREW01" 
                    {...register("code")} 
                    className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 transition-all"
                  />
                  {errors.code && (
                    <p className="text-xs font-bold text-destructive">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Public Email Address</Label>
                  <Input
                    type="email"
                    placeholder="contact@brewco.com"
                    {...register("email")}
                    className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 transition-all"
                  />
                  {errors.email && (
                    <p className="text-xs font-bold text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                <Input 
                  placeholder="+63 912 345 6789" 
                  {...register("phone")} 
                  className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 transition-all"
                />
                {errors.phone && (
                  <p className="text-xs font-bold text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 px-2">Security & Access</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manager Master PIN *</Label>
              <Input 
                type="password" 
                maxLength={6}
                inputMode="numeric"
                placeholder="Secure 4-6 digit numeric PIN" 
                {...register("managerPin")} 
                className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-emerald-500/50 transition-all font-mono tracking-widest text-center text-lg"
              />
              <p className="text-[10px] text-muted-foreground text-center">Required for high-level operations like voids and terminal overrides.</p>
              {errors.managerPin && (
                <p className="text-xs font-bold text-destructive text-center">
                  {errors.managerPin.message}
                </p>
              )}
            </div>
          </div>

          <div className="pt-8">
            {/* Root error */}
            {errors.root && (
              <p className="text-xs font-bold text-destructive text-center mb-4">{errors.root.message}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-bold text-lg glow-on-hover shadow-xl shadow-accent/20 transition-all">
              {isSubmitting ? "Initialising Workspace..." : "Launch My Workspace"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
