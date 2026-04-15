import { redirect } from "next/navigation";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { accountsService } from "@/app/(protected)/accounts/_services/accounts.service";
import { PendingManagerApprovalsClient } from "./_components/PendingManagerApprovalsClient";

export default async function ApprovalsPage() {
  let viewer;

  try {
    viewer = await accountsAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  if (viewer.role !== "admin") {
    redirect("/dashboard");
  }

  const pendingManagers = await accountsService.getAccounts(viewer, {
    role: "manager",
    status: "pending",
  });

  return <PendingManagerApprovalsClient accounts={pendingManagers} />;
}

