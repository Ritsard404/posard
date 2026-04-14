import { redirect } from "next/navigation";
import { AccountDetailClient } from "../_components/AccountDetailClient";
import { accountsAccessService } from "../_services/accounts-access.service";
import { accountsService } from "../_services/accounts.service";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  let viewer;

  try {
    viewer = await accountsAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  let account;
  let companyOptions;

  try {
    [account, companyOptions] = await Promise.all([
      accountsService.getAccountById(viewer, profileId),
      accountsService.getCompanyOptions(viewer),
    ]);
  } catch {
    redirect("/accounts");
  }

  if (!account) {
    redirect("/accounts");
  }

  return (
    <AccountDetailClient
      viewer={viewer}
      account={account}
      companyOptions={companyOptions}
    />
  );
}
