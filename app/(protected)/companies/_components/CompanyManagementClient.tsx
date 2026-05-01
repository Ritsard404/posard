"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, CreditCard, Pencil, Plus, Search, Settings, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPaginationControls } from "./AdminPaginationControls";
import { CompanyAdminDialog } from "./CompanyAdminDialog";
import { StorageImage } from "@/components/storage/StorageImage";
import type { PageResult } from "../_services/_dto/common.dto";
import type { AdminCompanyListItemDto } from "../_services/_dto/admin-company.dto";
import type { CompanyDTO } from "../[companyId]/_services/company.dto";
import { createAdminCompanyAction, deleteAdminCompanyAction, updateAdminCompanyAction } from "../_actions/company-admin.actions";

interface CompanyManagementClientProps {
  title: string;
  description: string;
  pageData: PageResult<AdminCompanyListItemDto>;
  keyword?: string;
}

export function CompanyManagementClient({
  title,
  description,
  pageData,
  keyword = "",
}: CompanyManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [dialogCompany, setDialogCompany] = useState<CompanyDTO | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateQuery(next: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function openEditor(company?: AdminCompanyListItemDto) {
    setDialogCompany(
      company
        ? {
            id: company.id,
            name: company.name,
            code: company.code,
            email: company.email,
            phone: company.phone,
            address: company.address,
            logoImageUrl: company.logoImageUrl,
            createdAt: company.createdAt,
            updatedAt: company.createdAt,
          }
        : null,
    );
    setIsEditorOpen(true);
  }

  function mutate(task: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(() => {
      void (async () => {
        const result = await task();
        if (!result.success) {
          toast.error(result.error ?? "Request failed");
          return;
        }

        toast.success(successMessage);
        setIsEditorOpen(false);
        router.refresh();
      })();
    });
  }

  const summary = useMemo(() => ({
    totalCompanies: pageData.totalCount,
    totalTerminals: pageData.items.reduce((sum, item) => sum + item.terminalCount, 0),
    activeSubscriptions: pageData.items.reduce((sum, item) => sum + item.activeSubscriptionCount, 0),
    pendingRequests: pageData.items.reduce((sum, item) => sum + item.pendingTerminalRequestCount, 0),
  }), [pageData]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Companies" value={String(summary.totalCompanies)} />
        <StatCard label="Visible Terminals" value={String(summary.totalTerminals)} accent="text-sky-600" />
        <StatCard label="Active Subscriptions" value={String(summary.activeSubscriptions)} accent="text-emerald-600" />
        <StatCard label="Pending Requests" value={String(summary.pendingRequests)} accent="text-amber-600" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <Button onClick={() => openEditor()}>
            <Plus className="size-4" />
            Create Company
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updateQuery({ keyword: draftKeyword || null, page: "0" });
                  }
                }}
                placeholder="Search by company name or email"
                className="pl-9"
              />
            </div>
            <Button type="button" onClick={() => updateQuery({ keyword: draftKeyword || null, page: "0" })}>
              Search
            </Button>
          </div>

          <Button type="button" variant="outline" onClick={() => {
            setDraftKeyword("");
            updateQuery({ keyword: null, page: "0", size: "10" });
          }}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {pageData.items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold">No companies found</p>
            <p className="text-sm text-muted-foreground">Adjust the search or create a new company.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {["Company Name", "Manager / Owner", "Contact Info", "Total Terminals", "Subscription Summary", "Created Date", "Actions"].map((label) => (
                      <th key={label} className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((company) => (
                    <tr key={company.id} className="border-b align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                            <StorageImage
                              src={company.logoImageUrl}
                              alt={company.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              fallback={<Building2 className="size-4 text-muted-foreground/40" />}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{company.name}</div>
                            <div className="text-xs text-muted-foreground">{company.code ?? "No code"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{company.ownerManagerName ?? "Unassigned"}</div>
                        <div className="text-xs text-muted-foreground">{company.ownerManagerEmail ?? "No active manager"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{company.email ?? "No email"}</div>
                        <div className="text-xs text-muted-foreground">{company.phone ?? "No phone"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{company.terminalCount}</div>
                        <div className="text-xs text-muted-foreground">{company.activeTerminalCount} active</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{company.activeSubscriptionCount} active plans</div>
                        <div className="text-xs text-muted-foreground">{company.pendingTerminalRequestCount} pending requests</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(company.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/companies/${company.id}`}>View</Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditor(company)}>
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/companies/${company.id}/terminals`}>
                              <Terminal className="size-4" />
                              Terminals
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/companies/${company.id}/subscription`}>
                              <CreditCard className="size-4" />
                              Subscriptions
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/companies/${company.id}/settings`}>
                              <Settings className="size-4" />
                              Settings
                            </Link>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => mutate(() => deleteAdminCompanyAction(company.id), "Company deleted")}>
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageData.items.map((company) => (
                <Card key={company.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                          <StorageImage
                            src={company.logoImageUrl}
                            alt={company.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            fallback={<Building2 className="size-4 text-muted-foreground/40" />}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{company.name}</div>
                          <div className="text-xs text-muted-foreground">{company.email ?? company.phone ?? "No contact info"}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{company.terminalCount} terminals</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Manager: {company.ownerManagerName ?? "Unassigned"}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" asChild><Link href={`/companies/${company.id}`}>View</Link></Button>
                      <Button variant="outline" size="sm" onClick={() => openEditor(company)}>Edit</Button>
                      <Button variant="outline" size="sm" asChild><Link href={`/companies/${company.id}/terminals`}>Terminals</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link href={`/companies/${company.id}/subscription`}>Subscriptions</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link href={`/companies/${company.id}/settings`}>Settings</Link></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <AdminPaginationControls
              page={pageData.page}
              size={pageData.size}
              totalCount={pageData.totalCount}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateQuery({ page: String(page) })}
              onSizeChange={(size) => updateQuery({ size: String(size), page: "0" })}
            />
          </>
        )}
      </Card>

      <CompanyAdminDialog
        open={isEditorOpen}
        company={dialogCompany}
        isSubmitting={isPending}
        onOpenChange={setIsEditorOpen}
        onSubmit={(values) =>
          mutate(
            () => dialogCompany ? updateAdminCompanyAction(dialogCompany.id, values) : createAdminCompanyAction(values),
            dialogCompany ? "Company updated" : "Company created",
          )
        }
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? ""}`}>{value}</p>
    </Card>
  );
}
