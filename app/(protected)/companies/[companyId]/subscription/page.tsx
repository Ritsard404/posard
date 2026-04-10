import { connection } from "next/server";
import { CreditCard, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SubscriptionPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function SubscriptionPage({ params }: SubscriptionPageProps) {
  await connection();
  const { companyId } = await params;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Subscription</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your billing plan and subscription status.
          </p>
        </div>
      </div>

      {/* Placeholder content (feature pendiente) */}
      <Card className="p-12 text-center">
        <Construction className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-semibold">Coming Soon</p>
        <p className="text-gray-400 text-sm mt-1">
          Subscription and billing management is under development.
        </p>
        <p className="text-xs text-gray-400 mt-3 font-mono bg-gray-50 inline-block px-3 py-1 rounded">
          Company ID: {companyId}
        </p>
      </Card>
    </div>
  );
}
