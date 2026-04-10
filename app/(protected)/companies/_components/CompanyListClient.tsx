"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, ChevronRight, CheckCircle2, XCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  isApproved: boolean;
}

interface CompanyListClientProps {
  initialCompanies: Company[];
}

export function CompanyListClient({ initialCompanies }: CompanyListClientProps) {
  const [keyword, setKeyword] = useState("");

  const filtered = initialCompanies.filter((company) => {
    const kw = keyword.toLowerCase();
    return (
      company.name.toLowerCase().includes(kw) ||
      (company.code?.toLowerCase().includes(kw) ?? false) ||
      (company.email?.toLowerCase().includes(kw) ?? false)
    );
  });

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative w-full max-w-sm group">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
        <Input
          placeholder="Search by name, code, or email..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-11 pl-10 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 focus:ring-0 transition-all font-medium"
        />
        {keyword && (
          <button
            onClick={() => setKeyword("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="glass-card p-20 text-center border-white/5">
          <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Search className="size-8 text-muted-foreground opacity-40" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">No matches found</p>
          <p className="text-muted-foreground font-medium">Try adjusting your search criteria.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setKeyword("")}>
            Clear Search
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`} className="group">
              <Card className="glass-card p-6 flex items-center justify-between border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-accent/40 shadow-xl group-hover:shadow-accent/10">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="flex-shrink-0 size-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 transition-colors group-hover:bg-accent/20">
                    <Building2 className="size-6 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-lg font-bold truncate group-hover:text-accent transition-colors tracking-tight">
                      {company.name}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-widest mt-0.5">
                      {company.code ?? company.email ?? "No Ref Code"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  {company.isApproved ? (
                    <CheckCircle2 className="size-5 text-emerald-500 fill-emerald-500/10" />
                  ) : (
                    <XCircle className="size-5 text-amber-500 fill-amber-500/10" />
                  )}
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-accent transition-all group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
