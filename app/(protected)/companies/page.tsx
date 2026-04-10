import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { companyService } from "./[companyId]/_services/company.service";
import { Card } from "@/components/ui/card";
import { Building2, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { CompanyListClient } from "./_components/CompanyListClient";

// Solo administradores pueden ver el listado completo de empresas
export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { role: true, companyId: true },
  });

  if (!profile) redirect("/auth/login");

  // El manager se redirige a su propia empresa
  if (profile.role !== "admin") {
    if (profile.companyId) {
      redirect(`/companies/${profile.companyId}`);
    }
    redirect("/dashboard");
  }

  const companies = await companyService.getCompanies();

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-20 -right-10 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">Companies</h1>
          <p className="text-muted-foreground font-medium">Manage all merchant profiles and organizational settings</p>
        </div>

        {/* Company list */}
        <CompanyListClient initialCompanies={companies} />
      </div>
    </div>
  );
}
