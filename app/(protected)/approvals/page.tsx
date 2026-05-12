import { redirect } from "next/navigation";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { registrationApprovalService } from "./_services/registration-approval.service";
import { PendingManagerApprovalsClient } from "./_components/PendingManagerApprovalsClient";
import { operationalApprovalService } from "./_services/operational-approval.service";
import { OperationalApprovalsClient } from "./_components/OperationalApprovalsClient";

export default async function ApprovalsPage() {
  let viewer;

  try {
    viewer = await accountsAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  if (viewer.role !== "admin" && viewer.role !== "manager") {
    redirect("/dashboard");
  }

  const operationalApprovals = await operationalApprovalService.listPending(viewer);

  if (viewer.role !== "admin") {
    return <OperationalApprovalsClient approvals={operationalApprovals} />;
  }

  const [pendingManagers, rejectedManagers] = await Promise.all([
    registrationApprovalService.getPendingRequests(viewer),
    registrationApprovalService.getRejectedRequests(viewer),
  ]);

  return (
    <div className="space-y-6">
      <OperationalApprovalsClient approvals={operationalApprovals} />
      <PendingManagerApprovalsClient
        pendingAccounts={pendingManagers}
        rejectedAccounts={rejectedManagers}
      />
    </div>
  );
}
