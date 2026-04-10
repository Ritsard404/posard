import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { companyService } from "./[companyId]/_services/company.service";
import { Card } from "@/components/ui/card";
import { Building2, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Companies
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage all registered companies and their settings.
        </p>
      </div>

      {/* Company list */}
      {companies.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No companies registered yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="p-5 flex items-center justify-between hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {company.code ?? company.email ?? "No details"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {company.isApproved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
