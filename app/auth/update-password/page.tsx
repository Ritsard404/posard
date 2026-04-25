import { AuthShell } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Secure password update"
      title="Set a new password and continue."
      description="Choose a new password for your POSard account, then return to your dashboard and terminal workflow."
    >
      <div className="w-full max-w-md">
        <UpdatePasswordForm />
      </div>
    </AuthShell>
  );
}
