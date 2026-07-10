import { getAppConfig } from "@/lib/app-config";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { HelpCenterClient } from "./HelpCenterClient";

export default async function HelpPage() {
  const [profile, config] = await Promise.all([
    getCurrentProfile(),
    Promise.resolve(getAppConfig()),
  ]);
  const supportEmail = config.email.replyTo || config.email.from;

  return (
    <HelpCenterClient
      currentRole={profile?.role ?? "cashier"}
      supportReady={config.email.ready && Boolean(supportEmail)}
      supportEmail={supportEmail}
    />
  );
}
