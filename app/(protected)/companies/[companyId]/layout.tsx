import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { companyAccessService } from "./_services/company-access.service";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const resolvedParams = await params;
  const companyId = resolvedParams.companyId;

  try {
    const viewer = await companyAccessService.getViewer();

    if (viewer.role !== "admin" && viewer.companyId !== companyId) {
      if (viewer.companyId) {
        redirect(`/companies/${viewer.companyId}`);
      }

      redirect("/dashboard");
    }
  } catch {
    redirect("/dashboard");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    redirect("/companies");
  }

  return <>{children}</>;
}
