"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import type { CompanyDetailDTO, UpdateCompanyInput } from "../../_services/company.dto";
import { updateCompanyAction } from "../../_actions/company.actions";
import CompanySettingsForm from "../../_components/CompanySettingsForm";

interface SettingsPageClientProps {
  company: CompanyDetailDTO;
}

export default function SettingsPageClient({ company }: SettingsPageClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
          <Settings className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">General Settings</h2>
          <p className="text-xs text-gray-500">Update your company profile information</p>
        </div>
        <Badge variant="outline">Operational Settings</Badge>
      </div>

      <CompanySettingsForm  
        company={company}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
