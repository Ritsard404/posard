"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CreditCard, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CompanyDetailDTO, UpdateCompanyInput } from "../../_services/company.dto";
import { updateCompanyAction } from "../../_actions/company.actions";
import CompanySettingsForm from "../../_components/CompanySettingsForm";

interface SettingsPageClientProps {
  company: CompanyDetailDTO;
  initialView?: "business" | "vat";
}

export default function SettingsPageClient({
  company,
  initialView = "business",
}: SettingsPageClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const businessSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target =
      initialView === "vat" ? businessSectionRef.current : businessSectionRef.current;

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialView]);

  const handleSubmit = async (data: UpdateCompanyInput) => {
    setIsSubmitting(true);
    try {
      const result = await updateCompanyAction(company.id, data);
      if (result.success) {
        toast.success("Company settings saved successfully");
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-background p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Sales Accounts</h2>
                <p className="text-xs text-gray-500">
                  Manage GCash, Maya, card, bank transfer, and other POS payment methods.
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              Navigation Shortcut
            </Badge>
          </div>
          <Button asChild className="rounded-xl">
            <Link href={`/companies/${company.id}/settings/sales-accounts`}>
              Open Sales Accounts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card
        ref={businessSectionRef}
        className="p-6"
      >
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Settings className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              {initialView === "vat" ? "VAT / Discount" : "General Settings"}
            </h2>
            <p className="text-xs text-gray-500">
              {initialView === "vat"
                ? "Review VAT and business information used across terminal configuration."
                : "Update your company profile information"}
            </p>
          </div>
          <Badge variant="outline">
            {initialView === "vat" ? "VAT Focus" : "Operational Settings"}
          </Badge>
        </div>

        <CompanySettingsForm
          company={company}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
