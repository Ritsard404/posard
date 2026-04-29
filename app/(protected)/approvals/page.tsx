import { redirect } from "next/navigation";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { registrationApprovalService } from "./_services/registration-approval.service";
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

  const [pendingManagers, rejectedManagers] = await Promise.all([
    registrationApprovalService.getPendingRequests(viewer),
    registrationApprovalService.getRejectedRequests(viewer),
  ]);

  return (
    <PendingManagerApprovalsClient
      pendingAccounts={pendingManagers}
      rejectedAccounts={rejectedManagers}
    />
  );
}
