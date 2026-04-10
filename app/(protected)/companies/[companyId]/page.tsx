import Link from "next/link";
import { notFound } from "next/navigation";
import { companyService } from "./_services/company.service";
import { terminalService } from "./_services/terminal.service";
import { Card } from "@/components/ui/card";
import {
  Building2,
  Terminal,
  Settings,
  CreditCard,
  Mail,
  Phone,
  Hash,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface CompanyOverviewPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanyOverviewPage({ params }: CompanyOverviewPageProps) {
  const { companyId } = await params;

  const [company, terminals] = await Promise.all([
    companyService.getCompanyById(companyId),
    terminalService.getTerminalsByCompany(companyId),
  ]);

  if (!company) notFound();

  const navCards = [
    {
      href: `/companies/${companyId}/terminals`,
      icon: Terminal,
      label: "Terminals",
      description: `${terminals.length} terminal${terminals.length !== 1 ? "s" : ""} registered`,
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: `/companies/${companyId}/settings`,
      icon: Settings,
      label: "Settings",
      description: "Update company details",
      color: "bg-violet-50 text-violet-600",
    },
    {
      href: `/companies/${companyId}/subscription`,
      icon: CreditCard,
      label: "Subscription",
      description: "Manage billing and plan",
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {company.isApproved ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" /> Pending Approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Company details */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
          Company Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow icon={Hash} label="Code" value={company.code ?? "—"} />
          <DetailRow icon={Mail} label="Email" value={company.email ?? "—"} />
          <DetailRow icon={Phone} label="Phone" value={company.phone ?? "—"} />
        </div>
      </Card>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {navCards.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group h-full">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors mt-1" />
              </div>
              <div className="mt-4">
                <p className="font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
