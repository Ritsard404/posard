import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Access Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have permission to open this page.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
