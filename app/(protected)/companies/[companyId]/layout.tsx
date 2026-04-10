import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const resolvedParams = await params;
  const companyId = resolvedParams.companyId;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!profile) redirect("/auth/login");
  
  if (profile.role !== "admin") {
    // Managers and cashiers can only access their assigned company
    if (profile.companyId !== companyId) {
       if (profile.companyId) {
         redirect(`/companies/${profile.companyId}`);
       } else {
         redirect("/dashboard");
       }
    }
  }

  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    redirect("/companies");
  }

  return <>{children}</>;
}
