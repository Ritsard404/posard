"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { clearProtectedBrowserCaches } from "@/lib/security/protected-cache.client";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearProtectedBrowserCaches();
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
