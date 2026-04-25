import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your POSard password."
      description="Enter the email connected to your account and we will send a secure reset link so you can regain access."
    >
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
