import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to POSard to access your POS terminal and business workspace.",
  alternates: {
    canonical: "/auth/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginAliasPage() {
  redirect("/auth/login");
}
