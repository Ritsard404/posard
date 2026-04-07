import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function AuthGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return null;
}
