"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { clearProtectedBrowserCaches } from "@/lib/security/protected-cache.client";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } finally {
      await clearProtectedBrowserCaches();
      router.replace("/auth/login");
      router.refresh();
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}
