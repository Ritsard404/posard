import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock3,
  CreditCard,
  Hash,
  Mail,
  Phone,
  BarChart3,
  Settings,
  Terminal,
} from "lucide-react";
import { CompanyBackLink } from "./_components/CompanyBackLink";
import { companyAccessService } from "./_services/company-access.service";
import { companyService } from "./_services/company.service";
import { terminalRequestService } from "./_services/terminal-request.service";
import { terminalService } from "./_services/terminal.service";

interface CompanyOverviewPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanyOverviewPage({ params }: CompanyOverviewPageProps) {
  const { companyId } = await params;

  const [viewer, company, terminals, requests] = await Promise.all([
    companyAccessService.assertCompanyAccess(companyId),
    companyService.getCompanyById(companyId),
    terminalService.getTerminalsByCompany(companyId),
    terminalRequestService.getTerminalRequestsByCompany(companyId),
  ]);

  if (!company) {
    redirect("/companies");
  }

  const backHref = viewer.role === "admin" ? "/companies" : "/dashboard";
  const backLabel = viewer.role === "admin" ? "Back to Companies" : "Back to Dashboard";
  const latestRequests = requests.slice(0, 3);

  const navCards = [
    {
      href: `/companies/${companyId}/report`,
      icon: BarChart3,
      label: viewer.role === "admin" ? "Reports" : "My Reports",
      description:
        viewer.role === "admin"
          ? "Review company-wide sales and terminal drill-down reports."
          : "Open your company-scoped reporting workspace.",
      color: "bg-amber-50 text-amber-600",
    },
    {
      href: `/companies/${companyId}/terminals`,
      icon: Terminal,
      label: "Terminals",
      description: `${terminals.length} terminal${terminals.length === 1 ? "" : "s"} registered`,
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: `/companies/${companyId}/settings`,
      icon: Settings,
      label: viewer.role === "admin" ? "Company Settings" : "My Company Settings",
      description:
        viewer.role === "admin"
          ? "Update company profile and approval."
          : "Review and update your company details.",
      color: "bg-violet-50 text-violet-600",
    },
  ];

  if (viewer.role === "admin") {
    navCards.push({
      href: `/companies/${companyId}/subscription`,
      icon: CreditCard,
      label: "Subscription",
      description: "Manage billing per terminal.",
      color: "bg-emerald-50 text-emerald-600",
    });
  }

  return (
    <div className="space-y-6">
      <CompanyBackLink href={backHref} label={backLabel} />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{company.name}</h1>
                <Badge variant="outline" className="capitalize">
                  {viewer.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {viewer.role === "admin"
                  ? "Company detail view with terminal, settings, and subscription management."
                  : "Your company workspace with terminal visibility and terminal request tracking."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
            <SummaryStat label="Terminals" value={String(company.terminalCount)} />
            <SummaryStat label="Active Terminals" value={String(company.activeTerminalCount)} />
            <SummaryStat label="Active Plans" value={String(company.activeSubscriptionCount)} />
            <SummaryStat label="Pending Requests" value={String(company.pendingTerminalRequestCount)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/companies/${companyId}/report`}>
              <BarChart3 className="size-4" />
              {viewer.role === "admin" ? "Open Reports" : "View Reports"}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/companies/${companyId}/terminals`}>
              <Terminal className="size-4" />
              {viewer.role === "admin" ? "Manage Terminals" : "View Terminals"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/companies/${companyId}/settings`}>
              <Settings className="size-4" />
              {viewer.role === "admin" ? "Manage Settings" : "Update Company Info"}
            </Link>
          </Button>
          {viewer.role === "admin" ? (
            <Button asChild variant="outline">
              <Link href={`/companies/${companyId}/subscription`}>
                <CreditCard className="size-4" />
                Manage Subscriptions
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/companies/${companyId}/terminals`}>
                <Clock3 className="size-4" />
                Request a Terminal
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
          Company Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow icon={Hash} label="Code" value={company.code ?? "Not set"} />
          <DetailRow icon={Mail} label="Email" value={company.email ?? "Not set"} />
          <DetailRow icon={Phone} label="Phone" value={company.phone ?? "Not set"} />
          <DetailRow icon={Building2} label="Workspace" value="Operational company record" />
        </div>
      </Card>

      <div
        className={`grid grid-cols-1 gap-4 ${
          navCards.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : navCards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {navCards.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group h-full cursor-pointer p-5 transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <ArrowRight className="mt-1 w-4 h-4 text-gray-300 transition-colors group-hover:text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="font-semibold text-gray-900">{item.label}</p>
                <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
              Terminal Requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewer.role === "admin"
                ? "Recent requests from this company."
                : "Your latest requests for additional terminals."}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/companies/${companyId}/terminals`}>
              Open Terminal Workspace
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>

        {latestRequests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            No terminal requests yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {latestRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {request.requestedTerminals} terminal{request.requestedTerminals === 1 ? "" : "s"} requested
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requested by {request.requestedByName ?? "Unknown"} on{" "}
                    {request.createdAt.toLocaleDateString()}
                  </p>
                  {request.notes ? (
                    <p className="text-sm text-muted-foreground">{request.notes}</p>
                  ) : null}
                </div>
                <StatusPill status={request.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "pending" | "approved" | "fulfilled" | "rejected" | "cancelled";
}) {
  const classes = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-sky-200 bg-sky-50 text-sky-700",
    fulfilled: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
    cancelled: "border-zinc-200 bg-zinc-100 text-zinc-700",
  } satisfies Record<typeof status, string>;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${classes[status]}`}
    >
      {status}
    </span>
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
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
