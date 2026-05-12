import { redirect } from "next/navigation";
import { accountsAccessService } from "@/app/(protected)/accounts/_services/accounts-access.service";
import { permissionMatrixService } from "./_services/permission-matrix.service";
import { PermissionMatrixClient } from "./_components/PermissionMatrixClient";

export default async function PermissionMatrixPage() {
  let viewer;

  try {
    viewer = await accountsAccessService.getViewer();
  } catch {
    redirect("/dashboard");
  }

  if (viewer.role !== "admin") {
    redirect("/dashboard");
  }

  const matrix = await permissionMatrixService.getMatrix(viewer);

  return <PermissionMatrixClient matrix={matrix} />;
}
